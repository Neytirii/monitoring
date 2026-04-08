import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import websocket from '@fastify/websocket';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { config } from './config.js';
import { logger } from './logger.js';

import { prismaPlugin } from './plugins/prisma.js';
import { authPlugin } from './plugins/auth.js';
import { websocketPlugin } from './plugins/websocket.js';

import { authRoutes } from './routes/auth.js';
import { hostRoutes } from './routes/hosts.js';
import { metricRoutes } from './routes/metrics.js';
import { dashboardRoutes } from './routes/dashboards.js';
import { alertRoutes } from './routes/alerts.js';
import { agentRoutes } from './routes/agent.js';
import { triggerRoutes } from './routes/triggers.js';
import { startAlertProcessor } from './services/alertProcessor.js';

// Resolved relative to the compiled output (dist/) or the TypeScript source (src/),
// both of which sit one level above the scripts/ folder in apps/backend/.
const INSTALL_SCRIPT = readFileSync(resolve(__dirname, '../scripts/install-agent-linux.sh'), 'utf8');

const app = Fastify({
  logger: false,
  trustProxy: true,
});

async function bootstrap() {
  await app.register(cors, {
    origin: config.isDevelopment ? true : config.publicUrl,
    credentials: true,
  });

  await app.register(helmet, { contentSecurityPolicy: false });

  await app.register(jwt, { secret: config.jwtSecret });

  await app.register(websocket);

  await app.register(prismaPlugin);
  await app.register(authPlugin);
  await app.register(websocketPlugin);

  await app.register(authRoutes, { prefix: '/api/v1/auth' });
  await app.register(hostRoutes, { prefix: '/api/v1/hosts' });
  await app.register(metricRoutes, { prefix: '/api/v1/metrics' });
  await app.register(dashboardRoutes, { prefix: '/api/v1/dashboards' });
  await app.register(alertRoutes, { prefix: '/api/v1/alerts' });
  await app.register(agentRoutes, { prefix: '/api/v1/agent' });
  await app.register(triggerRoutes, { prefix: '/api/v1/triggers' });

  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  app.get('/install.sh', async (_request, reply) => {
    reply.header('Content-Type', 'text/x-shellscript; charset=utf-8');
    reply.header('Content-Disposition', 'inline; filename="install.sh"');
    return reply.send(INSTALL_SCRIPT);
  });

  await app.listen({ port: config.port, host: config.host });

  // Start the BullMQ worker that evaluates alert triggers after the DB is ready
  startAlertProcessor(app.prisma);

  logger.info(`Server listening on ${config.host}:${config.port}`);
}

const shutdown = async () => {
  logger.info('Shutting down server...');
  await app.close();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

bootstrap().catch((err) => {
  logger.error('Failed to start server', err);
  process.exit(1);
});
