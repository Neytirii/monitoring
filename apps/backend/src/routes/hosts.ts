import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireRole } from '../middleware/rbac.js';
import { config } from '../config.js';

const createHostSchema = z.object({
  name: z.string().min(1).max(200),
  hostname: z.string().min(1).max(255),
  ipAddress: z.string().optional(),
  os: z.string().optional(),
});

export async function hostRoutes(fastify: FastifyInstance) {
  const auth = { preHandler: [fastify.authenticate] };

  fastify.get('/', auth, async (request) => {
    const hosts = await fastify.prisma.host.findMany({
      where: { tenantId: request.user.tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return { hosts };
  });

  fastify.post(
    '/',
    { preHandler: [fastify.authenticate, requireRole('EDITOR')] },
    async (request, reply) => {
      const body = createHostSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({ error: 'Validation error', details: body.error.errors });
      }

      const host = await fastify.prisma.host.create({
        data: {
          ...body.data,
          tenantId: request.user.tenantId,
        },
      });

      const installCommand = `curl -fsSL ${config.publicUrl}/install.sh | sudo bash -s -- --server-url ${config.publicUrl} --token ${host.agentToken}`;

      return reply.status(201).send({ host, installCommand });
    },
  );

  fastify.get('/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string };

    const host = await fastify.prisma.host.findFirst({
      where: { id, tenantId: request.user.tenantId },
      include: {
        alerts: {
          where: { state: 'FIRING' },
          take: 5,
          orderBy: { firedAt: 'desc' },
        },
      },
    });

    if (!host) {
      return reply.status(404).send({ error: 'Host not found' });
    }

    return { host };
  });

  fastify.delete(
    '/:id',
    { preHandler: [fastify.authenticate, requireRole('ADMIN')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const host = await fastify.prisma.host.findFirst({
        where: { id, tenantId: request.user.tenantId },
      });

      if (!host) {
        return reply.status(404).send({ error: 'Host not found' });
      }

      await fastify.prisma.host.delete({ where: { id } });

      return reply.status(204).send();
    },
  );

  fastify.get('/:id/install-script', auth, async (request, reply) => {
    const { id } = request.params as { id: string };

    const host = await fastify.prisma.host.findFirst({
      where: { id, tenantId: request.user.tenantId },
    });

    if (!host) {
      return reply.status(404).send({ error: 'Host not found' });
    }

    const linuxCommand = `curl -fsSL ${config.publicUrl}/install.sh | sudo bash -s -- --server-url ${config.publicUrl} --token ${host.agentToken}`;
    const windowsCommand = `Invoke-WebRequest -Uri "${config.publicUrl}/install.ps1" -OutFile install.ps1; .\\install.ps1 -ServerUrl "${config.publicUrl}" -Token "${host.agentToken}"`;

    return {
      linux: linuxCommand,
      windows: windowsCommand,
      agentToken: host.agentToken,
    };
  });
}
