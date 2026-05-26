import { ApiBody, ApiResponse } from '@nestjs/swagger';
import { z } from 'zod';

type JsonSchemaObject = Record<string, unknown>;

function toSwaggerSchema(schema: z.ZodType): JsonSchemaObject {
  return z.toJSONSchema(schema, {
    // turns unrepresentable pieces (transforms) into "any"
    unrepresentable: 'any',
    // often helpful with pipelines: documents input shape
    io: 'input',
  }) as JsonSchemaObject;
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
