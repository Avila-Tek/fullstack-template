import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import type { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import { errorResponseSchema } from '../schemas/errorResponse.schema';

type SupportedErrorCode =
  | 400
  | 401
  | 403
  | 404
  | 409
  | 422
  | 429
  | 500
  | 502
  | 503
  | 504;

const ERROR_DESCRIPTIONS: Record<SupportedErrorCode, string> = {
  400: 'Bad Request — Zod validation failure',
  401: 'Unauthorized — missing or invalid credentials',
  403: 'Forbidden — insufficient role',
  404: 'Not Found — resource does not exist',
  409: 'Conflict — resource already exists (e.g. duplicate email)',
  422: 'Unprocessable Entity — business rule violation',
  429: 'Too Many Requests — rate limit exceeded',
  500: 'Internal Server Error — unexpected failure',
  502: 'Bad Gateway — upstream service unavailable',
  503: 'Service Unavailable — dependency temporarily unavailable',
  504: 'Gateway Timeout — upstream service timed out',
};

function schemaForCode(code: SupportedErrorCode): SchemaObject {
  if (code === 400) return errorResponseSchema;
  return {
    type: 'object',
    properties: {
      statusCode: { type: 'number', example: code },
      message: { type: 'string' },
    },
    required: ['statusCode', 'message'],
  };
}

/**
 * Applies standard @ApiResponse decorators for each provided HTTP error code.
 * Only document codes the handler can actually return.
 */
export function ApiErrorResponses(
  ...codes: SupportedErrorCode[]
): MethodDecorator {
  const decorators = codes.map((code) =>
    ApiResponse({
      status: code,
      description: ERROR_DESCRIPTIONS[code],
      schema: schemaForCode(code),
    })
  );
  return applyDecorators(...decorators);
}
