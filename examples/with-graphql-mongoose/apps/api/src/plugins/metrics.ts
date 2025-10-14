import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { register, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client';

// Enable default metrics collection
collectDefaultMetrics();

// Custom metrics
const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
});

const httpRequestTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

const activeConnections = new Gauge({
  name: 'active_connections',
  help: 'Number of active connections',
});

const graphqlOperations = new Counter({
  name: 'graphql_operations_total',
  help: 'Total number of GraphQL operations',
  labelNames: ['operation_type', 'operation_name'],
});

const graphqlOperationDuration = new Histogram({
  name: 'graphql_operation_duration_seconds',
  help: 'Duration of GraphQL operations in seconds',
  labelNames: ['operation_type', 'operation_name'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
});

// Export metrics for use in other parts of the application
export {
  httpRequestDuration,
  httpRequestTotal,
  activeConnections,
  graphqlOperations,
  graphqlOperationDuration,
};

export default async function metricsPlugin(
  fastify: FastifyInstance,
  options: FastifyPluginOptions
) {
  // Metrics endpoint
  fastify.get('/metrics', async (request, reply) => {
    reply.type('text/plain');
    return register.metrics();
  });

  // Health check endpoint
  fastify.get('/health', async (request, reply) => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Add request logging middleware
  fastify.addHook('onRequest', async (request, reply) => {
    request.startTime = Date.now();
  });

  fastify.addHook('onResponse', async (request, reply) => {
    const duration = (Date.now() - request.startTime) / 1000;
    const route = request.routerPath || request.url;
    
    httpRequestDuration
      .labels({
        method: request.method,
        route,
        status_code: reply.statusCode.toString(),
      })
      .observe(duration);

    httpRequestTotal
      .labels({
        method: request.method,
        route,
        status_code: reply.statusCode.toString(),
      })
      .inc();
  });

  // Track active connections
  fastify.addHook('onReady', async () => {
    activeConnections.set(0);
  });

  fastify.addHook('onRequest', async () => {
    activeConnections.inc();
  });

  fastify.addHook('onResponse', async () => {
    activeConnections.dec();
  });
}
