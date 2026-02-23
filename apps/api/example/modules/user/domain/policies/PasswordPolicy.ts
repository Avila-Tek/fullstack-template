export interface PasswordValidationError {
	field: string;
	message: string;
}

export class InvalidPasswordError extends Error {
	constructor(public readonly errors: PasswordValidationError[]) {
		super('Password validation failed');
		this.name = 'InvalidPasswordError';
	}
}

export class PasswordPolicy {
	validate(password: string): void {
		const errors: PasswordValidationError[] = [];

		if (!password || password.length < 8) {
			errors.push({
				field: 'password',
				message: 'Password must be at least 8 characters long',
			});
		}

		if (!/[A-Z]/.test(password)) {
			errors.push({
				field: 'password',
				message: 'Password must contain at least one uppercase letter',
			});
		}

		if (!/[a-z]/.test(password)) {
			errors.push({
				field: 'password',
				message: 'Password must contain at least one lowercase letter',
			});
		}

		if (!/\d/.test(password)) {
			errors.push({
				field: 'password',
				message: 'Password must contain at least one digit',
			});
		}

		if (!/[@$!%*?&]/.test(password)) {
			errors.push({
				field: 'password',
				message:
					'Password must contain at least one special character (@$!%*?&)',
			});
		}

		if (errors.length > 0) {
			throw new InvalidPasswordError(errors);
		}
	}

	isValid(password: string): boolean {
		try {
			this.validate(password);
			return true;
		} catch {
			return false;
		}
	}
}
