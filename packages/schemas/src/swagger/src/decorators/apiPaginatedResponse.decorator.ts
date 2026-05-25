import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import type * as z from 'zod';
import { buildPaginatedEnvelope } from '../schemas/pagination.schema';
import { buildSuccessEnvelope } from '../schemas/safeResponse.schema';
import { zodToOpenApi } from '../utils/zodToOpenApi';

/**
 * Applies @ApiResponse with a paginated success envelope wrapping the given item schema.
 * Shape: { success: true, data: { items: T[], total, page, limit } }
 */
export function ApiPaginatedResponse(
  itemSchema: z.ZodTypeAny,
  description = 'Paginated list'
): MethodDecorator {
  const openApiItemSchema = zodToOpenApi(itemSchema);
  const paginatedSchema = buildPaginatedEnvelope(openApiItemSchema);
  const envelopeSchema = buildSuccessEnvelope(paginatedSchema);

  return applyDecorators(
    ApiResponse({
      status: 200,
      description,
      schema: envelopeSchema,
    })
  );
}
