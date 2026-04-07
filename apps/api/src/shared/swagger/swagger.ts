import type { INestApplication } from '@nestjs/common';
import {
	type ArgumentMetadata,
	applyDecorators,
	BadRequestException,
	Injectable,
	type PipeTransform,
} from '@nestjs/common';
import { ApiResponse, DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import type { ZodSchema, ZodTypeAny } from 'zod';

interface BuildSwaggerOptions {
	title: string;
	description: string;
	version: string;
	authType: 'bearer';
}

export function buildSwaggerDocument(
	app: INestApplication,
	options: BuildSwaggerOptions,
): void {
	if (process.env.NODE_ENV === 'production') return;

	const config = new DocumentBuilder()
		.setTitle(options.title)
		.setDescription(options.description)
		.setVersion(options.version)
		.addBearerAuth()
		.build();

	const document = SwaggerModule.createDocument(app, config);
	SwaggerModule.setup('docs', app, document);
}

@Injectable()
export class ZodValidationPipe implements PipeTransform {
	transform(value: unknown, metadata: ArgumentMetadata): unknown {
		const metatype = metadata.metatype as { schema?: ZodSchema } | undefined;
		if (!metatype?.schema) return value;

		const result = metatype.schema.safeParse(value);
		if (!result.success) {
			throw new BadRequestException(result.error.flatten());
		}
		return result.data;
	}
}

export function ApiSafeResponse(
	_schema: ZodTypeAny,
	status: number,
	description: string,
): MethodDecorator {
	return applyDecorators(ApiResponse({ status, description }));
}

export function ApiZodBody(
	_schema: ZodTypeAny,
	description?: string,
): MethodDecorator {
	return applyDecorators(ApiResponse({ status: 200, description }));
}

export function ApiBearerSession(): MethodDecorator {
	return applyDecorators(ApiResponse({ status: 401, description: 'Unauthorized' }));
}

/** Convert a Zod schema to a minimal OpenAPI SchemaObject for Swagger docs. */
export function zodToOpenApi(_schema: ZodTypeAny): SchemaObject {
	return { type: 'object' };
}

/** Attach standard error response documentation for given HTTP status codes. */
export function ApiErrorResponses(...statuses: number[]): MethodDecorator {
	const decorators = statuses.map((status) => ApiResponse({ status }));
	return applyDecorators(...decorators);
}
