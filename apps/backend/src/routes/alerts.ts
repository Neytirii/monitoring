import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireRole } from '../middleware/rbac.js';

const alertQuerySchema = z.object({
  state: z.enum(['OK', 'FIRING', 'RESOLVED']).optional(),
  hostId: z.string().optional(),
  severity: z.enum(['INFO', 'WARNING', 'HIGH', 'DISASTER']).optional(),
  limit: z.string().optional(),
  offset: z.string().optional(),
});

export async function alertRoutes(fastify: FastifyInstance) {
  const auth = { preHandler: [fastify.authenticate] };

  fastify.get('/', auth, async (request, reply) => {
    const query = alertQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send({ error: 'Validation error', details: query.error.errors });
    }

    const { state, hostId, severity, limit, offset } = query.data;
    const take = parseInt(limit ?? '50', 10);
    const skip = parseInt(offset ?? '0', 10);

    const alerts = await fastify.prisma.alert.findMany({
      where: {
        host: { tenantId: request.user.tenantId },
        ...(state ? { state } : {}),
        ...(hostId ? { hostId } : {}),
        ...(severity ? { trigger: { severity } } : {}),
      },
      include: {
        trigger: true,
        host: { select: { id: true, name: true, hostname: true } },
      },
      orderBy: { firedAt: 'desc' },
      take,
      skip,
    });

    const total = await fastify.prisma.alert.count({
      where: {
        host: { tenantId: request.user.tenantId },
        ...(state ? { state } : {}),
        ...(hostId ? { hostId } : {}),
        ...(severity ? { trigger: { severity } } : {}),
      },
    });

    return { alerts, total, limit: take, offset: skip };
  });

  fastify.patch(
    '/:id/resolve',
    { preHandler: [fastify.authenticate, requireRole('EDITOR')] },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const alert = await fastify.prisma.alert.findFirst({
        where: {
          id,
          host: { tenantId: request.user.tenantId },
        },
      });

      if (!alert) {
        return reply.status(404).send({ error: 'Alert not found' });
      }

      if (alert.state === 'RESOLVED') {
        return reply.status(400).send({ error: 'Alert already resolved' });
      }

      const resolved = await fastify.prisma.alert.update({
        where: { id },
        data: {
          state: 'RESOLVED',
          resolvedAt: new Date(),
        },
        include: {
          trigger: true,
          host: { select: { id: true, name: true, hostname: true } },
        },
      });

      return { alert: resolved };
    },
  );
}
