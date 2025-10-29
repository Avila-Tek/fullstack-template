import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { register, Counter, Histogram, collectDefaultMetrics } from 'prom-client';

// Create metrics
const httpRequestCounter = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
});

const graphqlRequestCounter = new Counter({
  name: 'graphql_requests_total',
  help: 'Total number of GraphQL requests',
  labelNames: ['operation_name', 'operation_type'],
});

// Collect default metrics (CPU, memory, etc.)
collectDefaultMetrics({ register });

const metricsPlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Hook to track all HTTP requests
  fastify.addHook('onRequest', async (request, reply) => {
    // Store start time for duration calculation
    request.requestStartTime = Date.now();
  });

  fastify.addHook('onResponse', async (request, reply) => {
    const duration = (Date.now() - (request.requestStartTime || Date.now())) / 1000;
    
    const route = request.routeOptions?.url || request.url;
    const method = request.method;
    const statusCode = reply.statusCode.toString();

    // Increment request counter
    httpRequestCounter.inc({
      method,
      route,
      status_code: statusCode,
    });

    // Record request duration
    httpRequestDuration.observe(
      {
        method,
        route,
        status_code: statusCode,
      },
      duration
    );
  });

  // Endpoint to expose metrics
  fastify.get('/metrics', async (request, reply) => {
    reply.header('Content-Type', register.contentType);
    return register.metrics();
  });

  // Health check endpoint
  fastify.get('/health', async (request, reply) => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });
};

// Extend FastifyRequest type to include requestStartTime
declare module 'fastify' {
  interface FastifyRequest {
    requestStartTime?: number;
  }
}

export default fp(metricsPlugin, {
  name: 'metrics',
});

export { httpRequestCounter, httpRequestDuration, graphqlRequestCounter, register };
