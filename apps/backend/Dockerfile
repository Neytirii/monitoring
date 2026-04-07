# ── Stage 1: install dependencies ──────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /monorepo

# Copy workspace manifests only (layer-cached until they change)
COPY package.json ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY apps/backend/package.json           ./apps/backend/

RUN npm install --ignore-scripts

# ── Stage 2: build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /monorepo

COPY --from=deps /monorepo/node_modules              ./node_modules
COPY --from=deps /monorepo/apps/backend/node_modules ./apps/backend/node_modules

COPY tsconfig.base.json                   ./
COPY packages/shared-types                ./packages/shared-types
COPY apps/backend                         ./apps/backend

WORKDIR /monorepo/apps/backend

RUN npx prisma generate
RUN npx tsc --build

# ── Stage 3: production image ────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Prisma needs the query engine binary and migration files at runtime
COPY --from=builder /monorepo/apps/backend/dist        ./dist
COPY --from=builder /monorepo/apps/backend/prisma      ./prisma
COPY --from=builder /monorepo/apps/backend/package.json ./package.json
COPY --from=builder /monorepo/apps/backend/node_modules ./node_modules

EXPOSE 3000

# db push syncs the schema without requiring pre-generated migration files.
# Switch to `prisma migrate deploy` once you generate a migration history.
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && node dist/index.js"]
