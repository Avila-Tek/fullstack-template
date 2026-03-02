import { authDTO } from '@repo/schemas';
import { z } from 'zod';
import { createZodDto } from '@shared/utils/createZodDto';
import type { SignInWithProviderDto } from '../../../application/ports/in/SignInWithProviderPort';

const signInWithProviderSchema = authDTO.signInInput;

export type TSignInWithProviderRequest = z.infer<
	typeof signInWithProviderSchema
>;

export class SignInWithProviderRequest extends createZodDto(
	signInWithProviderSchema,
) {
	static toDto(req: TSignInWithProviderRequest): SignInWithProviderDto {
		return {
			email: req.email,
			password: req.password,
		};
	}
}
