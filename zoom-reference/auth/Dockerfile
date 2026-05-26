### Base Image
FROM node:24.15.0-bookworm-slim AS base
ENV TZ=America/Caracas
RUN npm install -g turbo@2.5.6
ENV HUSKY=0
ENV SCOPE=@zoom/auth-service
ENV APP_PATH=apps/auth

### Builder
FROM base AS builder
WORKDIR /app
COPY . .
RUN turbo prune --scope=${SCOPE} --docker

### Installer
FROM base AS installer
WORKDIR /app

# Install deps
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/package-lock.json ./package-lock.json
RUN npm ci --no-audit

# Build project
COPY --from=builder /app/out/full/ .
COPY --from=builder /app/out/full/turbo.json turbo.json
RUN npx turbo build --filter=${SCOPE}

### Production Dependencies
FROM base AS prod-deps
WORKDIR /app
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/package-lock.json ./package-lock.json
# Drop the root `prepare` script (husky) — devDependency, not present with --omit=dev.
RUN npm pkg delete scripts.prepare
RUN npm ci --omit=dev --no-audit
# Some runtime deps live under the workspace's own node_modules when peer-dep
# version conflicts prevent npm from hoisting to root. Ensure the dir exists so
# the runner stage's COPY succeeds even when nothing landed here.
RUN mkdir -p ${APP_PATH}/node_modules

### Runner
FROM node:24.15.0-bookworm-slim AS runner
ENV TZ=America/Caracas
ENV NODE_ENV=production
ENV APP_PATH=apps/auth
ENV HUSKY=0
WORKDIR /app

RUN addgroup --system --gid 1001 avilatek && \
    adduser --system --uid 1001 nestjs
USER nestjs

COPY --from=prod-deps --chown=nestjs:avilatek /app/node_modules ./node_modules
COPY --from=prod-deps --chown=nestjs:avilatek /app/${APP_PATH}/node_modules ./${APP_PATH}/node_modules
COPY --from=installer --chown=nestjs:avilatek /app/packages ./packages
COPY --from=installer --chown=nestjs:avilatek /app/${APP_PATH}/dist ./${APP_PATH}/dist
COPY --from=installer --chown=nestjs:avilatek /app/${APP_PATH}/drizzle ./${APP_PATH}/drizzle
COPY --from=installer --chown=nestjs:avilatek /app/${APP_PATH}/package.json ./${APP_PATH}/package.json
COPY --from=installer --chown=nestjs:avilatek /app/package.json ./package.json

ENV PORT=3001
EXPOSE 3001

WORKDIR /app/${APP_PATH}

COPY --chown=nestjs:avilatek ${APP_PATH}/scripts/start.sh ./scripts/start.sh
RUN chmod +x ./scripts/start.sh

CMD ["./scripts/start.sh"]
