import { validatePasswordComplexity } from '../../shared/utils/validate-password-complexity';

// Password VO enforces complexity rules on construction.
// Only the plaintext is held — hashing is an infrastructure concern (IPasswordHashServicePort).
export class Password {
	readonly value: string;

	private constructor(value: string) {
		this.value = value;
	}

	static create(plaintext: string): Password {
		const { valid, errors } = validatePasswordComplexity(plaintext);
		if (!valid) {
			throw new Error(errors[0]);
		}
		return new Password(plaintext);
	}
}
