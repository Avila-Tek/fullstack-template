import { describe, expect, it } from 'vitest';
import {
	type PasswordValidationResult,
	validatePasswordComplexity,
} from '../../../src/shared/utils/validate-password-complexity';

describe('validatePasswordComplexity', () => {
	it('accepts a valid password with all required character classes', () => {
		const result = validatePasswordComplexity('Secure@1');
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	// Boundary: exactly 8 chars must pass
	it('accepts a password exactly 8 characters long', () => {
		const result = validatePasswordComplexity('Sec@re1x'); // exactly 8
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	// Boundary: exactly 32 chars must pass
	it('accepts a password exactly 32 characters long', () => {
		const exact32 = `Aa1@${'x'.repeat(28)}`; // 32 chars
		const result = validatePasswordComplexity(exact32);
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	// Boundary: 7 chars must fail
	it('rejects a password shorter than 8 characters (7 chars)', () => {
		const result = validatePasswordComplexity('Sh0rt@1'); // exactly 7 chars
		expect(result.valid).toBe(false);
		expect(result.errors).toContain('Password must be at least 8 characters');
	});

	// Boundary: 33 chars must fail
	it('rejects a password longer than 32 characters (33 chars)', () => {
		const long = `Aa1@${'x'.repeat(29)}`; // 33 chars
		const result = validatePasswordComplexity(long);
		expect(result.valid).toBe(false);
		expect(result.errors).toContain('Password must not exceed 32 characters');
	});

	it('rejects a password without an uppercase letter', () => {
		const result = validatePasswordComplexity('nouppercase1@');
		expect(result.valid).toBe(false);
		expect(result.errors).toContain(
			'Password must contain at least one uppercase letter',
		);
	});

	it('rejects a password without a lowercase letter', () => {
		const result = validatePasswordComplexity('NOLOWERCASE1@');
		expect(result.valid).toBe(false);
		expect(result.errors).toContain(
			'Password must contain at least one lowercase letter',
		);
	});

	it('rejects a password without a digit', () => {
		const result = validatePasswordComplexity('NoDigitHere@');
		expect(result.valid).toBe(false);
		expect(result.errors).toContain('Password must contain at least one digit');
	});

	it('rejects a password without a special character', () => {
		const result = validatePasswordComplexity('NoSymbol1');
		expect(result.valid).toBe(false);
		expect(result.errors).toContain(
			'Password must contain at least one special character',
		);
	});

	it('accumulates multiple errors when several rules are violated', () => {
		const result = validatePasswordComplexity('short'); // too short, no upper, no digit, no symbol
		expect(result.valid).toBe(false);
		expect(result.errors.length).toBeGreaterThan(1);
	});

	it('returns the PasswordValidationResult shape', () => {
		const result: PasswordValidationResult =
			validatePasswordComplexity('Test@Pa1');
		expect(result).toHaveProperty('valid');
		expect(result).toHaveProperty('errors');
		expect(Array.isArray(result.errors)).toBe(true);
	});
});
