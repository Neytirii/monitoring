const isProd = process.env.NODE_ENV === 'production';

function requireEnv(name: string, fallback?: string): string {
  const val = process.env[name] ?? fallback;
  if (!val && isProd) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return val ?? '';
}

export const config = {
  port: parseInt(process.env.PORT ?? '3000', 10),
  host: process.env.HOST ?? '0.0.0.0',
  publicUrl: process.env.PUBLIC_URL ?? 'http://localhost:3000',

  databaseUrl: requireEnv('DATABASE_URL', 'postgresql://monitoring:monitoring@localhost:5432/monitoring'),
  redisUrl: requireEnv('REDIS_URL', 'redis://localhost:6379'),

  jwtSecret: requireEnv('JWT_SECRET', 'dev-jwt-secret-change-in-production'),
  jwtAgentSecret: requireEnv('JWT_AGENT_SECRET', 'dev-agent-secret-change-in-production'),

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
