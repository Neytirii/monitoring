import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { alertQueue } from '../services/alertProcessor.js';

const metricSchema = z.object({
  name: z.string(),
  value: z.number(),
  tags: z.record(z.string()).optional(),
});

const ingestSchema = z.object({
  host_id: z.string(),
  metrics: z.array(metricSchema),
  timestamp: z.string(),
});

const registerSchema = z.object({
  hostname: z.string(),
  os: z.string().optional(),
  ipAddress: z.string().optional(),
});

export async function agentRoutes(fastify: FastifyInstance) {
  fastify.post('/register', async (request, reply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Missing agent token' });
    }

    const token = authHeader.slice(7);

    const host = await fastify.prisma.host.findUnique({
      where: { agentToken: token },
      include: { tenant: true },
    });

    if (!host) {
      return reply.status(401).send({ error: 'Invalid agent token' });
    }

    const body = registerSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Validation error', details: body.error.errors });
    }

    const updated = await fastify.prisma.host.update({
      where: { id: host.id },
      data: {
        hostname: body.data.hostname,
        os: body.data.os,
        ipAddress: body.data.ipAddress,
        status: 'ONLINE',
        lastSeen: new Date(),
      },
    });

    const agentToken = fastify.jwt.sign(
      {
        sub: host.id,
        hostId: host.id,
        tenantId: host.tenantId,
        scope: 'agent',
      },
      { key: config.jwtAgentSecret, expiresIn: '30d' },
    );

    return { host: updated, agentToken };
  });

  fastify.post('/ingest', async (request, reply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Missing token' });
    }

    const token = authHeader.slice(7);

    let hostId: string;
    let tenantId: string;

    try {
      const payload = fastify.jwt.verify<{
        hostId: string;
        tenantId: string;
        scope: string;
      }>(token, { key: config.jwtAgentSecret });

      if (payload.scope !== 'agent') {
        throw new Error('Invalid scope');
      }

      hostId = payload.hostId;
      tenantId = payload.tenantId;
    } catch {
      const host = await fastify.prisma.host.findUnique({
        where: { agentToken: token },
      });

      if (!host) {
        return reply.status(401).send({ error: 'Invalid token' });
      }

      hostId = host.id;
      tenantId = host.tenantId;
    }

    const body = ingestSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Validation error', details: body.error.errors });
    }

    const timestamp = new Date(body.data.timestamp);

    await fastify.prisma.host.update({
      where: { id: hostId },
      data: { status: 'ONLINE', lastSeen: new Date() },
    });

    if (body.data.metrics.length > 0) {
      // Bulk-insert all metrics in a single SQL statement
      const values = body.data.metrics
        .map((_, i) => {
          const base = i * 6;
          return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}::jsonb)`;
        })
        .join(', ');

      const params: unknown[] = [];
      for (const metric of body.data.metrics) {
        params.push(timestamp, hostId, tenantId, metric.name, metric.value, JSON.stringify(metric.tags ?? {}));
      }

      await fastify.prisma.$executeRawUnsafe(
        `INSERT INTO metrics (time, host_id, tenant_id, name, value, tags)
         VALUES ${values}
         ON CONFLICT DO NOTHING`,
        ...params,
      );
    }

    const message = JSON.stringify({
      type: 'metrics',
      hostId,
      timestamp: timestamp.toISOString(),
      metrics: body.data.metrics,
    });

    await fastify.redis.publish(`tenant:${tenantId}:metrics`, message);

    // Enqueue alert evaluation for each metric
    if (body.data.metrics.length > 0) {
      const jobs = body.data.metrics.map((metric) => ({
        name: 'evaluate',
        data: {
          tenantId,
          hostId,
          metricName: metric.name,
          value: metric.value,
          timestamp: body.data.timestamp,
        },
      }));
      await alertQueue.addBulk(jobs);
    }

    logger.debug(`Ingested ${body.data.metrics.length} metrics for host ${hostId}`);

    return reply.status(204).send();
  });
}
