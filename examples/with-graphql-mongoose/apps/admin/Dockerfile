FROM node:22-alpine AS base

ENV SCOPE=@repo/admin
ARG APP_PATH
ENV APP_PATH=$APP_PATH

### Builder
FROM base AS builder
# Updates and dependencies
RUN apk add --no-cache git libc6-compat tzdata g++ make py3-pip
RUN apk update
ENV TZ=America/Caracas

# Install and generate partial monorepo to have only the necessary to build ${SCOPE} app
WORKDIR /app
RUN npm i -g turbo 
COPY . .
RUN turbo prune --scope=${SCOPE} --docker


### Intaller
FROM base AS installer
RUN apk add --no-cache git libc6-compat tzdata g++ make py3-pip
RUN apk update
ENV TZ=America/Caracas

# Install
WORKDIR /app
RUN npm i -g turbo
COPY .gitignore .gitignore
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/package-lock.json ./package-lock.json
RUN npm ci
# Build project
COPY --from=builder /app/out/full/ .
COPY --from=builder /app/out/full/turbo.json turbo.json

# Build arguments
ARG TURBO_TEAM
ARG TURBO_TOKEN
ENV TURBO_TEAM=$TURBO_TEAM
ENV TURBO_TOKEN=$TURBO_TOKEN

RUN npx turbo build --filter=${SCOPE}
## Runner
FROM base AS runner
# Environment and dependencies
ENV NODE_ENV production
RUN apk add --no-cache tzdata
RUN apk update
ENV TZ=America/Caracas
WORKDIR /app

# User
RUN addgroup --system --gid 1001 avilatek
RUN adduser --system --uid 1001 nextjs
USER nextjs
# Copy dist
COPY --from=installer /app/package*.json .
COPY --from=installer /app/${APP_PATH}/next.config.* /app/${APP_PATH}/next.config.*
COPY --from=installer /app/packages/ui /app/packages/ui
COPY --from=installer /app/${APP_PATH}/public /app/${APP_PATH}/public
COPY --from=installer --chown=nextjs:avilatek /app/${APP_PATH}/.next /app/${APP_PATH}/.next 

COPY --from=installer /app/${APP_PATH}/package.json /app/${APP_PATH}/package.json
COPY --from=installer /app/${APP_PATH}/.env.local /app/${APP_PATH}/.env.local

ARG PORT
ENV PORT=$PORT
EXPOSE $PORT
WORKDIR /app/${APP_PATH}

CMD ["npm", "start"]
