import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import type * as z from 'zod';
import {
  buildSuccessEnvelope,
  failureEnvelopeSchema,
} from '../schemas/safeResponse.schema';
import { zodToOpenApi } from '../utils/zodToOpenApi';

/**
 * Applies @ApiResponse wrapping the given Zod schema inside the
 * AdapterResponse<T> success envelope ({ success: true, data: T }).
 * Also registers the failure variant ({ success: false, error: string }).
 */
export function ApiSafeResponse(
  schema: z.ZodTypeAny,
  statusCode = 200,
  description?: string
): MethodDecorator {
  const openApiSchema = zodToOpenApi(schema);
  const successSchema = buildSuccessEnvelope(openApiSchema);

  return applyDecorators(
    ApiResponse({
      status: statusCode,
      description: description ?? 'Success',
      schema: { oneOf: [successSchema, failureEnvelopeSchema] },
    })
  );
}
