import cors, { FastifyCorsOptions } from '@fastify/cors';
import { envs } from '@/config';

export const autoConfig: FastifyCorsOptions = {
  origin: JSON.parse(envs.cors.origins),
  credentials: true,
};

export default cors;
