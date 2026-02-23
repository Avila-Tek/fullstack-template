import type { z } from 'zod';

export interface ZodDtoClass<T extends z.ZodType = z.ZodType> {
	new (...args: unknown[]): z.output<T>;
	schema: T;
}

export function createZodDto<T extends z.ZodType>(schema: T): ZodDtoClass<T> {
	// biome-ignore lint/complexity/noStaticOnlyClass: class is required as NestJS metatype for DI and validation pipe
	class ZodDto {
		static schema: T = schema;
	}
	return ZodDto as unknown as ZodDtoClass<T>;
}
