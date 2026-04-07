import type { INestApplication } from '@nestjs/common';
import {
	type ArgumentMetadata,
	applyDecorators,
	BadRequestException,
	Injectable,
	type PipeTransform,
} from '@nestjs/common';
import { ApiResponse, DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { ZodSchema } from 'zod';

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
	_schema: ZodSchema,
	status: number,
	description: string,
): MethodDecorator {
	return applyDecorators(ApiResponse({ status, description }));
}
