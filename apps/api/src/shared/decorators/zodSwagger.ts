import { ApiBody, ApiResponse } from '@nestjs/swagger';
import type { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import { z } from 'zod';

function toSwaggerSchema(schema: z.ZodType): SchemaObject {
  return z.toJSONSchema(schema, {
    // turns unrepresentable pieces (transforms) into "any"
    unrepresentable: 'any',
    // often helpful with pipelines: documents input shape
    io: 'input',
  }) as unknown as SchemaObject;
}

export function ZodApiBody(schema: z.ZodType): MethodDecorator {
  return ApiBody({ schema: toSwaggerSchema(schema) });
}

export function ZodApiResponse(
  status: number,
  schema: z.ZodType,
  description?: string
): MethodDecorator {
  return ApiResponse({
    status,
    description,
    schema: toSwaggerSchema(schema),
  });
}
