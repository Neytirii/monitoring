export const config = {
  port: parseInt(process.env.PORT ?? '3000', 10),
  host: process.env.HOST ?? '0.0.0.0',
  publicUrl: process.env.PUBLIC_URL ?? 'http://localhost:3000',

  databaseUrl: process.env.DATABASE_URL ?? 'postgresql://monitoring:monitoring@localhost:5432/monitoring',
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',

  jwtSecret: process.env.JWT_SECRET ?? 'change-me-in-production-very-long-secret',
  jwtAgentSecret: process.env.JWT_AGENT_SECRET ?? 'change-me-agent-secret',

  smtp: {
    host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT ?? '587', 10),
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASS ?? '',
    from: process.env.SMTP_FROM ?? 'noreply@monitoring.example.com',
  },

  nodeEnv: process.env.NODE_ENV ?? 'development',
  isDevelopment: (process.env.NODE_ENV ?? 'development') === 'development',
  isProduction: process.env.NODE_ENV === 'production',
} as const;

export type Config = typeof config;
