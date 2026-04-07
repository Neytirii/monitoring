import { FastifyRequest, FastifyReply } from 'fastify';

export type Role = 'ADMIN' | 'EDITOR' | 'VIEWER';

const roleHierarchy: Record<Role, number> = {
  ADMIN: 3,
  EDITOR: 2,
  VIEWER: 1,
};

const validRoles = new Set<string>(['ADMIN', 'EDITOR', 'VIEWER']);

export function requireRole(requiredRole: Role) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const user = request.user;

    if (!user) {
      reply.status(401).send({ error: 'Unauthorized' });
      return;
    }

    if (!validRoles.has(user.role)) {
      reply.status(403).send({ error: 'Forbidden', message: 'Invalid user role' });
      return;
    }

    const userLevel = roleHierarchy[user.role as Role];
    const requiredLevel = roleHierarchy[requiredRole];

    if (userLevel < requiredLevel) {
      reply.status(403).send({
        error: 'Forbidden',
        message: `Requires ${requiredRole} role or higher`,
      });
    }
  };
}
