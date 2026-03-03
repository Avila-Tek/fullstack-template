### Base Image
FROM node:24-alpine AS base
RUN apk add --no-cache git libc6-compat tzdata g++ make py3-pip && \
    apk update
ENV TZ=America/Caracas

ENV SCOPE=@repo/api
ENV APP_PATH=apps/api


### Builder
FROM base AS builder
WORKDIR /app
COPY . .
RUN npx turbo prune --scope=${SCOPE} --docker

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
RUN npm ci --omit=dev --no-audit

### Runner
FROM node:24-alpine AS runner
RUN apk add --no-cache tzdata
ENV TZ=America/Caracas
ENV NODE_ENV=production
ENV APP_PATH=apps/api
WORKDIR /app

RUN addgroup --system --gid 1001 avilatek && \
    adduser --system --uid 1001 nestjs
USER nestjs

COPY --from=prod-deps --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=installer --chown=nestjs:nodejs /app/packages ./packages
COPY --from=installer --chown=nestjs:nodejs /app/${APP_PATH}/dist ./${APP_PATH}/dist
COPY --from=installer --chown=nestjs:nodejs /app/${APP_PATH}/package.json ./${APP_PATH}/package.json
COPY --from=installer --chown=nestjs:nodejs /app/package.json ./package.json

ENV PORT=3000
EXPOSE 3000

WORKDIR /app/${APP_PATH}
CMD ["node", "dist/src/main.js"]