import {
	BadRequestException,
	Injectable,
	type PipeTransform,
	type ArgumentMetadata,
} from '@nestjs/common';
import type { ZodDtoClass } from '../utils/createZodDto';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
	transform(value: unknown, metadata: ArgumentMetadata): unknown {
		const { metatype } = metadata;
		if (!metatype || !('schema' in metatype)) return value;
		const schema = (metatype as ZodDtoClass).schema;
		const result = schema.safeParse(value);
		if (!result.success) throw new BadRequestException(result.error.flatten());
		return result.data;
	}
}
