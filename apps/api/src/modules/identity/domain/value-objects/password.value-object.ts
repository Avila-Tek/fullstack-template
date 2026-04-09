import { passwordComplexitySchema } from '@repo/schemas';
import { InvalidPasswordException } from '../exceptions/invalid-password.exception';

// Password VO enforces complexity rules on construction.
// Only the plaintext is held — hashing is an infrastructure concern (IPasswordHashServicePort).
export class Password {
	readonly value: string;

	private constructor(value: string) {
		this.value = value;
	}

	static create(plaintext: string): Password {
		const result = passwordComplexitySchema.safeParse(plaintext);
		if (!result.success) {
			throw new InvalidPasswordException({ reason: result.error.issues[0].message });
		}
		return new Password(plaintext);
	}
}
