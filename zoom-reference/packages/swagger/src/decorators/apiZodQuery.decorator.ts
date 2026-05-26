import { applyDecorators } from '@nestjs/common';
import { ApiQuery } from '@nestjs/swagger';
import type * as z from 'zod';
import { zodToOpenApi } from '../utils/zodToOpenApi';

/**
 * Applies @ApiQuery with an inline schema derived from a Zod schema.
 * Use instead of @ApiQuery on endpoints that already validate via Zod DTOs.
 */
function isOptionalField(field: z.ZodTypeAny): boolean {
  const type = (field as unknown as { type: string }).type;
  return type === 'optional' || type === 'default';
}

export function ApiZodQuery(
  schema: Record<string, z.ZodTypeAny>
): MethodDecorator {
  return applyDecorators(
    ...Object.entries(schema).map(([name, field]) =>
      ApiQuery({
        name,
        required: !isOptionalField(field),
        description: field.description,
        schema: zodToOpenApi(field),
      })
    )
  );
}
