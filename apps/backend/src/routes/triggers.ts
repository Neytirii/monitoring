import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireRole } from '../middleware/rbac.js';

const expressionSchema = z.object({
  metric: z.string().min(1),
  operator: z.enum(['>', '>=', '<', '<=', '==', '!=']),
  threshold: z.number(),
});

const createTriggerSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  expression: expressionSchema,
  severity: z.enum(['INFO', 'WARNING', 'HIGH', 'DISASTER']).default('WARNING'),
  enabled: z.boolean().default(true),
});

const updateTriggerSchema = createTriggerSchema.partial();

export async function triggerRoutes(fastify: FastifyInstance) {
  const auth = { preHandler: [fastify.authenticate] };
  const editorAuth = { preHandler: [fastify.authenticate, requireRole('EDITOR')] };

  fastify.get('/', auth, async (request) => {
    const triggers = await fastify.prisma.trigger.findMany({
      where: { tenantId: request.user.tenantId },
      include: {
        _count: { select: { alerts: { where: { state: 'FIRING' } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return { triggers };
  });

  fastify.post('/', editorAuth, async (request, reply) => {
    const body = createTriggerSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Validation error', details: body.error.errors });
    }

    const trigger = await fastify.prisma.trigger.create({
      data: {
        name: body.data.name,
        description: body.data.description,
        expression: body.data.expression,
        severity: body.data.severity,
        enabled: body.data.enabled,
        tenantId: request.user.tenantId,
      },
    });

    return reply.status(201).send({ trigger });
  });

  fastify.get('/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string };

    const trigger = await fastify.prisma.trigger.findFirst({
      where: { id, tenantId: request.user.tenantId },
      include: {
        alerts: {
          where: { state: 'FIRING' },
          take: 10,
          orderBy: { firedAt: 'desc' },
          include: { host: { select: { id: true, name: true, hostname: true } } },
        },
      },
    });

    if (!trigger) {
      return reply.status(404).send({ error: 'Trigger not found' });
    }

    return { trigger };
  });

  fastify.put('/:id', editorAuth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = updateTriggerSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Validation error', details: body.error.errors });
    }

    const existing = await fastify.prisma.trigger.findFirst({
      where: { id, tenantId: request.user.tenantId },
    });

    if (!existing) {
      return reply.status(404).send({ error: 'Trigger not found' });
    }

    const trigger = await fastify.prisma.trigger.update({
      where: { id },
      data: body.data,
    });

    return { trigger };
  });

  fastify.patch('/:id/toggle', editorAuth, async (request, reply) => {
    const { id } = request.params as { id: string };

    const existing = await fastify.prisma.trigger.findFirst({
      where: { id, tenantId: request.user.tenantId },
    });

    if (!existing) {
      return reply.status(404).send({ error: 'Trigger not found' });
    }

    const trigger = await fastify.prisma.trigger.update({
      where: { id },
      data: { enabled: !existing.enabled },
    });

    return { trigger };
  });

  fastify.delete(
    '/:id',
    { preHandler: [fastify.authenticate, requireRole('ADMIN')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const existing = await fastify.prisma.trigger.findFirst({
        where: { id, tenantId: request.user.tenantId },
      });

      if (!existing) {
        return reply.status(404).send({ error: 'Trigger not found' });
      }

      await fastify.prisma.trigger.delete({ where: { id } });

      return reply.status(204).send();
    },
  );
}
