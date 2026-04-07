import { FastifyInstance } from 'fastify';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

const querySchema = z.object({
  hostId: z.string().optional(),
  metric: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.string().optional(),
});

type MetricRow = { time: Date; host_id: string; name: string; value: number; tags: unknown };
type MetricRowHost = { time: Date; name: string; value: number; tags: unknown };

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

    // Use null-safe parameterized conditions to avoid dynamic SQL construction
    const rows = await fastify.prisma.$queryRaw<MetricRow[]>(
      Prisma.sql`
        SELECT time, host_id, name, value, tags
        FROM metrics
        WHERE tenant_id = ${tenantId}
          AND time >= ${fromDate}
          AND time <= ${toDate}
          AND (${hostId ?? null}::text IS NULL OR host_id = ${hostId ?? null}::text)
          AND (${metric ?? null}::text IS NULL OR name = ${metric ?? null}::text)
        ORDER BY time DESC
        LIMIT ${rowLimit}
      `,
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

    // Use null-safe parameterized conditions — no dynamic SQL
    const rows = await fastify.prisma.$queryRaw<MetricRowHost[]>(
      Prisma.sql`
        SELECT time, name, value, tags
        FROM metrics
        WHERE host_id = ${hostId}
          AND time >= ${fromDate}
          AND time <= ${toDate}
          AND (${metric ?? null}::text IS NULL OR name = ${metric ?? null}::text)
        ORDER BY time DESC
        LIMIT ${rowLimit}
      `,
    );

    return { metrics: rows, hostId, from: fromDate, to: toDate };
  });
}
