FROM node:24-alpine AS base

ENV SCOPE=@repo/api
ENV APP_PATH=apps/api

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
RUN npm install
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
RUN apk add --no-cache tzdata curl bash unzip libc6-compat libstdc++
RUN apk update
ENV TZ=America/Caracas
WORKDIR /app

# Install Grafana Alloy (detect architecture)
RUN ARCH=$(uname -m) && \
    if [ "$ARCH" = "x86_64" ]; then \
    ALLOY_ARCH="amd64"; \
    elif [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then \
    ALLOY_ARCH="arm64"; \
    else \
    echo "Unsupported architecture: $ARCH" && exit 1; \
    fi && \
    curl -L -o /tmp/alloy.zip "https://github.com/grafana/alloy/releases/latest/download/alloy-linux-${ALLOY_ARCH}.zip" && \
    unzip /tmp/alloy.zip -d /tmp && \
    mv /tmp/alloy-linux-${ALLOY_ARCH} /usr/local/bin/alloy && \
    chmod +x /usr/local/bin/alloy && \
    rm /tmp/alloy.zip

# User
RUN addgroup --system --gid 1001 avilatek
RUN adduser --system --uid 1001 avilatek

# Copy dist and dependencies
COPY --from=installer /app/package*.json .
COPY --from=installer /app/node_modules ./node_modules
COPY --from=installer /app/packages ./packages
COPY --from=installer /app/${APP_PATH}/dist ./${APP_PATH}/dist
COPY --from=installer /app/${APP_PATH}/src/*.env* ./${APP_PATH}/src/*.env*

COPY --from=installer /app/${APP_PATH}/package.json ./${APP_PATH}/package.json

# Ensure all Sentry dependencies are available
RUN ls -la /app/node_modules/@sentry/ || echo "Sentry modules not found"

# Copy Alloy configuration
COPY --from=builder /app/${APP_PATH}/alloy.config ./${APP_PATH}/alloy.config

# Copy startup script
COPY --from=builder /app/${APP_PATH}/start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Give permissions to alloy storage path and startup script
RUN mkdir -p /tmp/alloy && \
    chown -R avilatek:avilatek /tmp/alloy && \
    chown avilatek:avilatek /app/start.sh

USER avilatek

ARG PORT
ENV PORT=$PORT
EXPOSE $PORT
WORKDIR /app/${APP_PATH}

CMD ["/bin/bash", "/app/start.sh"]
