import type { Result } from '@repo/utils';
import type { InvalidCredentialsException } from '../../../domain/exceptions/invalid-credentials.exception';
import type { InvalidPasswordException } from '../../../domain/exceptions/invalid-password.exception';
import type { NoPasswordAccountException } from '../../../domain/exceptions/no-password-account.exception';
import type { PasswordReuseException } from '../../../domain/exceptions/password-reuse.exception';

export type ChangePasswordResult = Result<
	null,
	| InvalidCredentialsException
	| InvalidPasswordException
	| NoPasswordAccountException
	| PasswordReuseException
>;

export abstract class ChangePasswordUseCasePort {
	abstract execute(
		userId: string,
		currentPassword: string,
		newPassword: string,
	): Promise<ChangePasswordResult>;
}
