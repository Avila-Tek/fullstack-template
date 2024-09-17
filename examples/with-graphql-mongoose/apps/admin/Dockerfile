### Base Image
FROM node:22-alpine AS base
# Updates and dependencies
RUN apk add --no-cache git libc6-compat tzdata g++ make py3-pip
RUN apk update
ENV TZ=America/Caracas

ENV SCOPE=@repo/admin
ENV APP_PATH=apps/admin
ENV TURBO_TEAM=$TURBO_TEAM
ENV TURBO_TOKEN=$TURBO_TOKEN

### Builder
FROM base AS builder
# Install and generate partial monorepo to have only the necessary to build ${SCOPE} app
WORKDIR /app
COPY . .
RUN npx turbo prune --scope=${SCOPE} --docker


### Intaller
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

### Runner
FROM base AS runner

ENV NODE_ENV=production
WORKDIR /app

# User
RUN addgroup --system --gid 1001 avilatek
RUN adduser --system --uid 1001 nextjs
USER nextjs
# Copy dist
COPY --from=installer --chown=nextjs:nodejs /app/${APP_PATH}/.next/standalone ./
COPY --from=installer --chown=nextjs:nodejs /app/${APP_PATH}/.next/static ./${APP_PATH}/.next/static
COPY --from=installer --chown=nextjs:nodejs /app/${APP_PATH}/public ./${APP_PATH}/public

ENV PORT=3000
ENV HOSTNAME=0.0.0.0
CMD node ${APP_PATH}/server.js
