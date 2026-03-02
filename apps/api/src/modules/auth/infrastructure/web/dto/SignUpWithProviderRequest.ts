import { z } from 'zod';
import { createZodDto } from '@shared/utils/createZodDto';
import type { SignUpWithProviderDto } from '../../../application/ports/in/SignUpWithProviderPort';

const signUpWithProviderSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});

export type TSignUpWithProviderRequest = z.infer<
  typeof signUpWithProviderSchema
>;

export class SignUpWithProviderRequest extends createZodDto(
  signUpWithProviderSchema
) {
  static toDto(req: TSignUpWithProviderRequest): SignUpWithProviderDto {
    return {
      email: req.email,
      password: req.password,
      firstName: req.firstName,
      lastName: req.lastName,
    };
  }
}
