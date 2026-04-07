import { FastifyInstance } from 'fastify';
import { z } from 'zod';

const querySchema = z.object({
  hostId: z.string().optional(),
  metric: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.string().optional(),
});

export async function metricRoutes(fastify: FastifyInstance) {
  const auth = { preHandler: [fastify.authenticate] };

  fastify.get('/', auth, async (request, reply) => {
    const query = querySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send({ error: 'Validation error', details: query.error.errors });
    }

    const { hostId, metric, from, to, limit } = query.data;
    const fromDate = from ? new Date(from) : new Date(Date.now() - 3600_000);
    const toDate = to ? new Date(to) : new Date();
    const rowLimit = parseInt(limit ?? '1000', 10);
    const tenantId = request.user.tenantId;

    const params: unknown[] = [fromDate, toDate, rowLimit, tenantId];
    let paramIndex = 5;

    let extraConditions = '';
    if (hostId) {
      extraConditions += ` AND host_id = $${paramIndex}`;
      params.push(hostId);
      paramIndex++;
    }
    if (metric) {
      extraConditions += ` AND name = $${paramIndex}`;
      params.push(metric);
      paramIndex++;
    }

    const rows = await fastify.prisma.$queryRawUnsafe<
      Array<{ time: Date; host_id: string; name: string; value: number; tags: unknown }>
    >(
      `SELECT time, host_id, name, value, tags
       FROM metrics
       WHERE tenant_id = $4
         AND time >= $1
         AND time <= $2${extraConditions}
       ORDER BY time DESC
       LIMIT $3`,
      ...params,
    );

    return { metrics: rows, from: fromDate, to: toDate };
  });

  fastify.get('/hosts/:hostId', auth, async (request, reply) => {
    const { hostId } = request.params as { hostId: string };
    const query = querySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send({ error: 'Validation error', details: query.error.errors });
    }

    const host = await fastify.prisma.host.findFirst({
      where: { id: hostId, tenantId: request.user.tenantId },
    });

    if (!host) {
      return reply.status(404).send({ error: 'Host not found' });
    }

    const { metric, from, to, limit } = query.data;
    const fromDate = from ? new Date(from) : new Date(Date.now() - 3600_000);
    const toDate = to ? new Date(to) : new Date();
    const rowLimit = parseInt(limit ?? '1000', 10);

    const params2: unknown[] = [fromDate, toDate, rowLimit, hostId];
    let paramIdx = 5;

    let extraConditions2 = '';
    if (metric) {
      extraConditions2 += ` AND name = $${paramIdx}`;
      params2.push(metric);
      paramIdx++;
    }

    const rows = await fastify.prisma.$queryRawUnsafe<
      Array<{ time: Date; name: string; value: number; tags: unknown }>
    >(
      `SELECT time, name, value, tags
       FROM metrics
       WHERE host_id = $4
         AND time >= $1
         AND time <= $2${extraConditions2}
       ORDER BY time DESC
       LIMIT $3`,
      ...params2,
    );

    return { metrics: rows, hostId, from: fromDate, to: toDate };
  });
}
