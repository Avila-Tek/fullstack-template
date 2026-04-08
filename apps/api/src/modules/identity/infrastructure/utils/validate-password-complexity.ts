import { passwordComplexitySchema } from '@repo/schemas';

export interface PasswordValidationResult {
	valid: boolean;
	errors: string[];
}

// Spec §18: enforce complexity rules before hashing.
// Called from password.hash wrapper so it applies to sign-up, reset, and change flows.
export function validatePasswordComplexity(
	password: string,
): PasswordValidationResult {
	const result = passwordComplexitySchema.safeParse(password);
	if (result.success) return { valid: true, errors: [] };
	return {
		valid: false,
		errors: result.error.issues.map((issue) => issue.message),
	};
}
