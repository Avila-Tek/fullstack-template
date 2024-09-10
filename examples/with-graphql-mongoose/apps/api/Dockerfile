### Builder
FROM node:22-alpine AS builder
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
FROM node:22-alpine AS installer
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
RUN npm install
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

## Runner
FROM node:22-alpine AS runner
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
RUN adduser --system --uid 1001 avilatek
USER avilatek
# Copy dist
COPY --from=installer /app/package*.json .
COPY --from=installer /app/${APP_PATH}/dist ./${APP_PATH}/dist
COPY --from=installer /app/${APP_PATH}/src/*.env* ./${APP_PATH}/src/*.env*
COPY --from=installer /app/node_modules ./node_modules
COPY --from=installer /app/${APP_PATH}/package.json ./${APP_PATH}/package.json

ARG PORT
ENV PORT=$PORT
EXPOSE $PORT
WORKDIR /app/${APP_PATH}

CMD ["npm", "start"]
