# ── Stage 1: install dependencies ──────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /monorepo

COPY package.json ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY apps/frontend/package.json          ./apps/frontend/

RUN npm install --ignore-scripts

# ── Stage 2: build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /monorepo

COPY --from=deps /monorepo/node_modules               ./node_modules
COPY --from=deps /monorepo/apps/frontend/node_modules ./apps/frontend/node_modules

COPY tsconfig.base.json                    ./
COPY packages/shared-types                 ./packages/shared-types
COPY apps/frontend                         ./apps/frontend

WORKDIR /monorepo/apps/frontend

RUN npm run build

# ── Stage 3: serve with nginx ────────────────────────────────────────────────
FROM nginx:alpine AS runner

COPY --from=builder /monorepo/apps/frontend/dist /usr/share/nginx/html
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
