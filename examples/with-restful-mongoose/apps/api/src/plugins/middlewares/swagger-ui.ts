import swaggerUI, { FastifySwaggerUiOptions } from '@fastify/swagger-ui';
import fp from 'fastify-plugin';

export const autoConfig: FastifySwaggerUiOptions = {
  routePrefix: '/docs',
};

export default fp(swaggerUI, { name: 'swagger-ui', dependencies: ['swagger'] });
