import { ApiBody, ApiResponse } from '@nestjs/swagger';
import type { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import { z } from 'zod';

export function ZodApiBody(schema: z.ZodType): MethodDecorator {
	return ApiBody({ schema: z.toJSONSchema(schema) as SchemaObject });
}

export function ZodApiResponse(
	status: number,
	schema: z.ZodType,
	description?: string,
): MethodDecorator {
	return ApiResponse({
		status,
		description,
		schema: z.toJSONSchema(schema) as SchemaObject,
	});
}
