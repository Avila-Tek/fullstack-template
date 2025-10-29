import type { FastifyReply, FastifyRequest } from 'fastify';
import { generateCleanStackTrace } from './stack';
import { Exception } from './exception';
import { languageNegotiation } from './language';
import { errorRegistry } from './dictionaries';
import { logError } from './logs';

function injectParams(detail: string, params: Record<string, any>) {
  return Object.entries(params).reduce((acc, [key, value]) => {
    return acc.replace(`<${key}>`, value);
  }, detail);
}

const productionEnv = process.env.APP_ENV === 'production';

export function handleError(
  error: Error | Exception,
  request: FastifyRequest,
  reply: FastifyReply
) {
  console.log('Error detected');
  const date = new Date();
  const language = languageNegotiation(request);
  const stack = generateCleanStackTrace(error);

  // TODO: HTTP Error handler
  // TODO: Common error handlers

  let title = 'Unhandled server error';
  let status = 500;
  let message = 'An unexpected error appeared';
  let type = 'default';
  let silent = false;

  if (error instanceof Exception) {
    silent = error.silent && productionEnv;
    const data = error.data;
    title = error.data.title[language];
    status = error.data.status;
    type = error.data.type;
    message = injectParams(data.message[language], error.params);
  }

  logError({
    title,
    status,
    message,
    type,
    stack,
    date,
    body: request?.body,
    query: request?.query,
    headers: request?.headers,
  });

  const genericError = errorRegistry.getError('internal', 'default');
  const response = {
    title: silent ? genericError.title[language] : title,
    message: silent ? genericError.message[language] : message,
    status: silent ? genericError.status : status,
    stack: !productionEnv && status === 500 ? stack : undefined,
  };

  // Send error response
  reply.status(status).send(response);
}
