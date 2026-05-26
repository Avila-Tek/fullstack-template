import { describe, expect, it } from 'vitest';
import { Password } from '../../../src/domain/value-objects/password.value-object';

describe('Password value object', () => {
	it('creates successfully from a valid password', () => {
		const pwd = Password.create('ValidPas1!');
		expect(pwd).toBeDefined();
		expect(pwd.value).toBe('ValidPas1!');
	});

	it('rejects a password shorter than 8 characters', () => {
		expect(() => Password.create('Abc1!')).toThrow('at least 8 characters');
	});

	it('rejects a password longer than 32 characters', () => {
		const long = `A1!${'a'.repeat(30)}`; // 33 chars
		expect(() => Password.create(long)).toThrow('must not exceed 32');
	});

	it('rejects a password without an uppercase letter', () => {
		expect(() => Password.create('lowercase1!')).toThrow('uppercase');
	});

	it('rejects a password without a lowercase letter', () => {
		expect(() => Password.create('UPPERCASE1!')).toThrow('lowercase');
	});

	it('rejects a password without a digit', () => {
		expect(() => Password.create('NoDigitHere!')).toThrow('digit');
	});

	it('rejects a password without a special character', () => {
		expect(() => Password.create('NoSymbol1A')).toThrow('special character');
	});

	// Boundary: exactly 8 chars
	it('accepts an 8-character boundary password', () => {
		const pwd = Password.create('Abcd1!GH'); // exactly 8 chars
		expect(pwd.value).toBe('Abcd1!GH');
	});

	// Boundary: exactly 32 chars
	it('accepts a 32-character boundary password', () => {
		const pwd = Password.create(`A1!${'a'.repeat(29)}`); // exactly 32 chars
		expect(pwd.value).toHaveLength(32);
	});

	it('throws with the first error message when multiple rules fail', () => {
		// "weak" is 4 chars — triggers at-least-8 first
		expect(() => Password.create('weak')).toThrow('at least 8 characters');
	});
});
