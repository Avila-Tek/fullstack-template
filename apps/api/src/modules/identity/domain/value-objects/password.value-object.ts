import { z } from 'zod';

// Password complexity rules — enforced before hashing (sign-up, reset, change flows).
const passwordComplexitySchema = z
	.string()
	.min(8, 'Password must be at least 8 characters')
	.regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
	.regex(/[a-z]/, 'Password must contain at least one lowercase letter')
	.regex(/\d/, 'Password must contain at least one number')
	.regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

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
			throw new Error(result.error.issues[0].message);
		}
		return new Password(plaintext);
	}
}
