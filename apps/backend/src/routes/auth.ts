import { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const registerSchema = z.object({
  tenantName: z.string().min(2).max(100),
  tenantSlug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/),
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/register', async (request, reply) => {
    const body = registerSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Validation error', details: body.error.errors });
    }

    const { tenantName, tenantSlug, name, email, password } = body.data;

    const existingTenant = await fastify.prisma.tenant.findUnique({ where: { slug: tenantSlug } });
    if (existingTenant) {
      return reply.status(409).send({ error: 'Tenant slug already taken' });
    }

    const existingUser = await fastify.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return reply.status(409).send({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const tenant = await fastify.prisma.tenant.create({
      data: {
        name: tenantName,
        slug: tenantSlug,
        users: {
          create: {
            email,
            name,
            passwordHash,
            role: 'ADMIN',
          },
        },
      },
      include: { users: true },
    });

    const user = tenant.users[0]!;

    const token = fastify.jwt.sign(
      { sub: user.id, email: user.email, role: user.role, tenantId: tenant.id },
      { expiresIn: '7d' },
    );

    return reply.status(201).send({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
    });
  });

  fastify.post('/login', async (request, reply) => {
    const body = loginSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Validation error', details: body.error.errors });
    }

    const { email, password } = body.data;

    const user = await fastify.prisma.user.findUnique({
      where: { email },
      include: { tenant: true },
    });

    if (!user) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    const token = fastify.jwt.sign(
      { sub: user.id, email: user.email, role: user.role, tenantId: user.tenantId },
      { expiresIn: '7d' },
    );

    return {
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      tenant: { id: user.tenant.id, name: user.tenant.name, slug: user.tenant.slug },
    };
  });

  fastify.get('/me', { preHandler: [fastify.authenticate] }, async (request) => {
    const user = await fastify.prisma.user.findUniqueOrThrow({
      where: { id: request.user.sub },
      include: { tenant: true },
    });

    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      tenant: { id: user.tenant.id, name: user.tenant.name, slug: user.tenant.slug },
    };
  });
}
