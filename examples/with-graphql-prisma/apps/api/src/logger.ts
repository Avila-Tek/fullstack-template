// import { createLogger, transports, format, Logger } from 'winston';
// import LokiTransport from 'winston-loki';
import pino from 'pino';
import type { LokiOptions } from 'pino-loki';

const transport = pino.transport<LokiOptions>({
  target: 'pino-loki',
  options: {
    batching: true,
    interval: 5,
    labels: {
      app: process.env.LOKI_APP_NAME,
    },
    host: process.env.LOKI_HOST,
    basicAuth: {
      username: process.env.LOKI_USERNAME,
      password: process.env.LOKE_PASSWORD,
    },
  },
});
const logger = pino(transport);
export const getLogger = () => {
  return logger;
};
