import helmet, { FastifyHelmetOptions } from '@fastify/helmet';

export const autoConfig: FastifyHelmetOptions = {
  contentSecurityPolicy:
    process.env.NODE_ENV === 'production' ? undefined : false,
};

export default helmet;
