import type { TermsVersionServicePort } from '../../application/ports/out/terms-version-service.port';

export class EnvTermsVersionAdapter implements TermsVersionServicePort {
	async resolveCurrentVersion(): Promise<string | null> {
		const raw = process.env.TERMS_VERSION;
		if (raw === undefined) return null;
		const trimmed = raw.trim();
		return trimmed.length === 0 ? null : trimmed;
	}
}

export const envTermsVersionService = new EnvTermsVersionAdapter();
