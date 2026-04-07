// Spec §3: normalized_email = trim(lowercase(email))
// Used to enforce the one-canonical-identity-per-email guarantee.
export function normalizeEmail(email: string): string {
	return email.trim().toLowerCase();
}
