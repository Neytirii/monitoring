import fp from 'fastify-plugin';
import { FastifyRequest, FastifyReply } from 'fastify';
import { config } from '../config.js';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  tenantId: string;
  iat?: number;
  exp?: number;
}

export interface AgentJwtPayload {
  sub: string;
  hostId: string;
  tenantId: string;
  scope: 'agent';
  iat?: number;
  exp?: number;
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    authenticateAgent: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
  interface FastifyRequest {
    user: JwtPayload;
    agent: AgentJwtPayload;
  }
}

export const authPlugin = fp(async (fastify) => {
  fastify.decorate(
    'authenticate',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const payload = await request.jwtVerify<JwtPayload>();
        request.user = payload;
      } catch {
        reply.status(401).send({ error: 'Unauthorized' });
      }
    },
  );

  fastify.decorate(
    'authenticateAgent',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const authHeader = request.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
          return reply.status(401).send({ error: 'Missing agent token' });
        }
        const token = authHeader.slice(7);
        const payload = fastify.jwt.verify<AgentJwtPayload>(token, {
          key: config.jwtAgentSecret,
        });
        if (payload.scope !== 'agent') {
          return reply.status(401).send({ error: 'Invalid token scope' });
        }
        request.agent = payload;
      } catch {
        reply.status(401).send({ error: 'Invalid agent token' });
      }
    },
  );
});
