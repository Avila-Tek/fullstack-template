import { z } from 'zod';

const fieldErrorSchema = z.object({
  error: z.string(),
  field: z.string().optional(),
  message: z.string(),
});

export const apiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    code: z.number(),
    data: dataSchema.nullable(),
    error: z.string().nullable(),
    errors: z.array(fieldErrorSchema).optional(),
    message: z.string().nullable(),
    success: z.boolean(),
  });

export type FieldError = z.infer<typeof fieldErrorSchema>;

export type ApiResponse<T> =
  | {
      success: true;
      code: number;
      data: T;
      error: null;
      errors?: undefined;
      message: string | null;
    }
  | {
      success: false;
      code: number;
      data: null;
      error: string;
      errors?: FieldError[];
      message: string | null;
    };
