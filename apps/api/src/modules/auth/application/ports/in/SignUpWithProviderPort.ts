import { UseCase } from '@shared/application/UseCase';
import type { AuthResult } from '../../../domain/types/AuthResult';

export interface SignUpWithProviderDto {
	email: string;
	password: string;
	firstName: string;
	lastName: string;
}

export abstract class SignUpWithProviderPort extends UseCase<
	SignUpWithProviderDto,
	AuthResult
> {}
