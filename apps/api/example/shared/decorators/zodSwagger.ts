import { ApiBody, ApiResponse, type SchemaObject } from '@nestjs/swagger';
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
