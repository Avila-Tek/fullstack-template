import swagger, { FastifyDynamicSwaggerOptions } from '@fastify/swagger';
import fp from 'fastify-plugin';
import { jsonSchemaTransform } from 'fastify-type-provider-zod';

export const autoConfig: FastifyDynamicSwaggerOptions = {
  mode: 'dynamic',
  openapi: {
    info: {
      title: '@repo/api',
      description: '@repo backend services',
      version: '1.0.0',
    },
    servers: [],
  },
  transform: jsonSchemaTransform,
};

export default fp(swagger, { name: 'swagger' });
