import { z } from 'zod';

export interface ZodDtoClass<T extends z.ZodType = z.ZodType> {
  new (...args: unknown[]): z.output<T>;
  schema: T;
}

export function createZodDto<T extends z.ZodType>(schema: T): ZodDtoClass<T> {
  class ZodDto {
    static readonly schema: T = schema;
  }
  return ZodDto as unknown as ZodDtoClass<T>;
}
