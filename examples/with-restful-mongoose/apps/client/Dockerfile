### Builder
FROM node:18-alpine AS builder
# Updates and dependencies
RUN apk add --no-cache git libc6-compat tzdata g++ make py3-pip
RUN apk update
ENV TZ=America/Caracas
# Args
ARG SCOPE
ARG APP_PATH
ENV SCOPE=$SCOPE
ENV APP_PATH=$APP_PATH
# Install and generate partial monorepo to have only the necessary to build ${SCOPE} app
WORKDIR /app
RUN npm i -g turbo 
COPY . .
RUN turbo prune --scope=${SCOPE} --docker


### Intaller
FROM node:18-alpine AS installer
RUN apk add --no-cache git libc6-compat tzdata g++ make py3-pip
RUN apk update
ENV TZ=America/Caracas
# Image args
ARG SCOPE
ARG APP_PATH
ENV SCOPE=$SCOPE
ENV APP_PATH=$APP_PATH
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
ARG RELEASE
ARG SENTRY_ORG
ARG SENTRY_PROJECT
ARG SENTRY_TOKEN
ENV TURBO_TEAM=$TURBO_TEAM
ENV TURBO_TOKEN=$TURBO_TOKEN
ENV RELEASE=$RELEASE
ENV SENTRY_ORG=$SENTRY_ORG
ENV SENTRY_PROJECT=$SENTRY_PROJECT
ENV SENTRY_AUTH_TOKEN=$SENTRY_TOKEN
# Sentry 
RUN npm i -g @sentry/cli turbo
RUN turbo run build --filter=${SCOPE}
RUN sentry-cli releases new ${RELEASE} || echo "❌ Error creating new release ${RELEASE} to Sentry"
RUN sentry-cli releases files ${RELEASE} upload-sourcemaps ./dist || echo "❌ Error sending data to Sentry"
RUN sentry-cli releases finalize ${RELEASE} || echo "❌ Error sending data to Sentry"


## Runner
FROM node:18-alpine AS runner
# Image args
ARG SCOPE
ARG APP_PATH
ENV SCOPE=$SCOPE
ENV APP_PATH=$APP_PATH
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
COPY --from=installer /app/node_modules ./node_modules
COPY --from=installer /app/${APP_PATH}/package.json /app/${APP_PATH}/package.json
COPY --from=installer /app/${APP_PATH}/.env.local /app/${APP_PATH}/.env.local

ARG PORT
ENV PORT=$PORT
EXPOSE $PORT
WORKDIR /app/${APP_PATH}

CMD ["npm", "start"]
