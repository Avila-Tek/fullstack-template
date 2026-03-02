import { UseCase } from '@shared/application/UseCase';
import type { AuthResult } from '../../../domain/types/AuthResult';

export interface SignInWithProviderDto {
	email: string;
	password: string;
}

export abstract class SignInWithProviderPort extends UseCase<
	SignInWithProviderDto,
	AuthResult
> {}
