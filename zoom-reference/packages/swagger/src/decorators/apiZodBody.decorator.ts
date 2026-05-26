import { applyDecorators } from '@nestjs/common';
import { ApiBody } from '@nestjs/swagger';
import type * as z from 'zod';
import { zodToOpenApi } from '../utils/zodToOpenApi';

/**
 * Applies @ApiBody with an inline schema derived from a Zod schema.
 * Use instead of @ApiBody on endpoints that already validate via Zod DTOs.
 */
export function ApiZodBody(
  schema: z.ZodTypeAny,
  description?: string
): MethodDecorator {
  return applyDecorators(
    ApiBody({
      description,
      schema: zodToOpenApi(schema),
    })
  );
}
