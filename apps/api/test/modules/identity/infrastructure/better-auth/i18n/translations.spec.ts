import { describe, expect, it } from 'vitest';
import { esBetterAuthTranslations } from '@/modules/identity/infrastructure/better-auth/i18n/translations';

const MUST_TRANSLATE: string[] = [
	// Authentication
	'INVALID_EMAIL_OR_PASSWORD',
	'INVALID_EMAIL',
	'INVALID_PASSWORD',
	'PASSWORD_TOO_SHORT',
	'PASSWORD_TOO_LONG',
	// Users
	'USER_NOT_FOUND',
	'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL',
	// Credential
	'CREDENTIAL_ACCOUNT_NOT_FOUND',
	// Email
	'EMAIL_NOT_VERIFIED',
	'EMAIL_ALREADY_VERIFIED',
	// Sessions & tokens
	'SESSION_EXPIRED',
	'SESSION_NOT_FRESH',
	'INVALID_TOKEN',
	'TOKEN_EXPIRED',
	// Two-Factor Authentication
	'OTP_NOT_ENABLED',
	'OTP_HAS_EXPIRED',
	'TOTP_NOT_ENABLED',
	'TWO_FACTOR_NOT_ENABLED',
	'BACKUP_CODES_NOT_ENABLED',
	'INVALID_BACKUP_CODE',
	'INVALID_CODE',
	'TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE',
	'INVALID_TWO_FACTOR_COOKIE',
];

const SHOULD_TRANSLATE: string[] = [
	'PASSWORD_ALREADY_SET',
	'EMAIL_CAN_NOT_BE_UPDATED',
	'EMAIL_MISMATCH',
	'FAILED_TO_UNLINK_LAST_ACCOUNT',
	'INVALID_ORIGIN',
	'CROSS_SITE_NAVIGATION_LOGIN_BLOCKED',
];

// Spanish characters: á é í ó ú ü ñ Á É Í Ó Ú Ü Ñ ¿ ¡
const SPANISH_CHAR_RE = /[áéíóúüñÁÉÍÓÚÜÑ¿¡]/;

describe('esBetterAuthTranslations', () => {
	it('contains all must-translate keys', () => {
		for (const key of MUST_TRANSLATE) {
			expect(
				esBetterAuthTranslations,
				`Missing must-translate key: ${key}`,
			).toHaveProperty(key);
		}
	});

	it('contains all should-translate keys', () => {
		for (const key of SHOULD_TRANSLATE) {
			expect(
				esBetterAuthTranslations,
				`Missing should-translate key: ${key}`,
			).toHaveProperty(key);
		}
	});

	it('has no empty string values', () => {
		for (const [key, value] of Object.entries(esBetterAuthTranslations)) {
			expect(value, `Empty value for key: ${key}`).not.toBe('');
		}
	});

	it('has no value identical to its key (no untranslated keys)', () => {
		for (const [key, value] of Object.entries(esBetterAuthTranslations)) {
			expect(value, `Value equals key (untranslated?): ${key}`).not.toBe(key);
		}
	});

	it('most values contain at least one Spanish character or accent', () => {
		// Server error codes use a generic message without accents — exempt those.
		// Some valid Spanish words also lack accents (e.g. "Usuario no encontrado.").
		// The heuristic: at least 70% of non-server-error entries must contain a
		// Spanish character, catching wholesale copy-paste of English keys as values.
		const serverErrorKeys = new Set([
			'FAILED_TO_CREATE_SESSION',
			'FAILED_TO_CREATE_USER',
			'FAILED_TO_GET_SESSION',
			'FAILED_TO_GET_USER_INFO',
			'FAILED_TO_UPDATE_USER',
		]);

		const relevant = Object.entries(esBetterAuthTranslations).filter(
			([key]) => !serverErrorKeys.has(key),
		);
		const withSpanishChars = relevant.filter(([, value]) =>
			SPANISH_CHAR_RE.test(value),
		);

		const ratio = withSpanishChars.length / relevant.length;
		expect(
			ratio,
			`Only ${withSpanishChars.length}/${relevant.length} entries contain Spanish characters — catalog may not be translated`,
		).toBeGreaterThanOrEqual(0.7);
	});
});
