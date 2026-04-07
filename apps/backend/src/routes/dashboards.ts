import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireRole } from '../middleware/rbac.js';

const createDashboardSchema = z.object({
  name: z.string().min(1).max(200),
  layout: z.array(z.unknown()).optional(),
});

const updateDashboardSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  layout: z.array(z.unknown()).optional(),
});

const createWidgetSchema = z.object({
  type: z.string(),
  title: z.string().min(1).max(200),
  config: z.record(z.unknown()),
  position: z.object({
    x: z.number(),
    y: z.number(),
    w: z.number(),
    h: z.number(),
  }),
});

const updateWidgetSchema = createWidgetSchema.partial();

export async function dashboardRoutes(fastify: FastifyInstance) {
  const auth = { preHandler: [fastify.authenticate] };
  const editorAuth = { preHandler: [fastify.authenticate, requireRole('EDITOR')] };

  // Dashboards
  fastify.get('/', auth, async (request) => {
    const dashboards = await fastify.prisma.dashboard.findMany({
      where: { tenantId: request.user.tenantId },
      include: { widgets: true },
      orderBy: { createdAt: 'desc' },
    });
    return { dashboards };
  });

  fastify.post('/', editorAuth, async (request, reply) => {
    const body = createDashboardSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Validation error', details: body.error.errors });
    }

    const dashboard = await fastify.prisma.dashboard.create({
      data: {
        name: body.data.name,
        layout: body.data.layout ?? [],
        tenantId: request.user.tenantId,
      },
    });

    return reply.status(201).send({ dashboard });
  });

  fastify.get('/:id', auth, async (request, reply) => {
    const { id } = request.params as { id: string };

    const dashboard = await fastify.prisma.dashboard.findFirst({
      where: { id, tenantId: request.user.tenantId },
      include: { widgets: true },
    });

    if (!dashboard) {
      return reply.status(404).send({ error: 'Dashboard not found' });
    }

    return { dashboard };
  });

  fastify.put('/:id', editorAuth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = updateDashboardSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Validation error', details: body.error.errors });
    }

    const existing = await fastify.prisma.dashboard.findFirst({
      where: { id, tenantId: request.user.tenantId },
    });

    if (!existing) {
      return reply.status(404).send({ error: 'Dashboard not found' });
    }

    const dashboard = await fastify.prisma.dashboard.update({
      where: { id },
      data: body.data,
      include: { widgets: true },
    });

    return { dashboard };
  });

  fastify.delete('/:id', editorAuth, async (request, reply) => {
    const { id } = request.params as { id: string };

    const existing = await fastify.prisma.dashboard.findFirst({
      where: { id, tenantId: request.user.tenantId },
    });

    if (!existing) {
      return reply.status(404).send({ error: 'Dashboard not found' });
    }

    await fastify.prisma.dashboard.delete({ where: { id } });

    return reply.status(204).send();
  });

  // Widgets
  fastify.post('/:dashboardId/widgets', editorAuth, async (request, reply) => {
    const { dashboardId } = request.params as { dashboardId: string };
    const body = createWidgetSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Validation error', details: body.error.errors });
    }

    const dashboard = await fastify.prisma.dashboard.findFirst({
      where: { id: dashboardId, tenantId: request.user.tenantId },
    });

    if (!dashboard) {
      return reply.status(404).send({ error: 'Dashboard not found' });
    }

    const widget = await fastify.prisma.widget.create({
      data: {
        dashboardId,
        type: body.data.type,
        title: body.data.title,
        config: body.data.config,
        position: body.data.position,
      },
    });

    return reply.status(201).send({ widget });
  });

  fastify.put('/:dashboardId/widgets/:widgetId', editorAuth, async (request, reply) => {
    const { dashboardId, widgetId } = request.params as {
      dashboardId: string;
      widgetId: string;
    };
    const body = updateWidgetSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Validation error', details: body.error.errors });
    }

    const dashboard = await fastify.prisma.dashboard.findFirst({
      where: { id: dashboardId, tenantId: request.user.tenantId },
    });

    if (!dashboard) {
      return reply.status(404).send({ error: 'Dashboard not found' });
    }

    const widget = await fastify.prisma.widget.update({
      where: { id: widgetId },
      data: body.data,
    });

    return { widget };
  });

  fastify.delete('/:dashboardId/widgets/:widgetId', editorAuth, async (request, reply) => {
    const { dashboardId, widgetId } = request.params as {
      dashboardId: string;
      widgetId: string;
    };

    const dashboard = await fastify.prisma.dashboard.findFirst({
      where: { id: dashboardId, tenantId: request.user.tenantId },
    });

    if (!dashboard) {
      return reply.status(404).send({ error: 'Dashboard not found' });
    }

    await fastify.prisma.widget.delete({ where: { id: widgetId } });

    return reply.status(204).send();
  });
}
