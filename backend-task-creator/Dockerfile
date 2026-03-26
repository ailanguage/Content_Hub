# ── Stage 1: Build ──
FROM node:20-slim AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

# VITE_* vars are baked into the Vue client bundle at build time
ARG VITE_FRONTEND_URL
ARG VITE_BACKEND_API_KEY
ENV VITE_FRONTEND_URL=${VITE_FRONTEND_URL}
ENV VITE_BACKEND_API_KEY=${VITE_BACKEND_API_KEY}

RUN pnpm build

# ── Stage 2: Runner ──
FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production

# Copy built Vue SPA
COPY --from=builder /app/dist ./dist

# Copy server and dependencies
COPY --from=builder /app/server.ts ./
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3003
CMD ["node", "--import", "tsx", "server.ts"]
