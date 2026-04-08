import { describe, expect, it } from 'vitest';
import { Password } from '@/modules/identity/domain/value-objects/password.value-object';

describe('Password', () => {
	it('creates a valid password that meets all complexity rules', () => {
		const pw = Password.create('Str0ng!Pass');
		expect(pw.value).toBe('Str0ng!Pass');
	});

	it('throws on too short password', () => {
		expect(() => Password.create('Ab1!')).toThrow();
	});

	it('throws on missing uppercase', () => {
		expect(() => Password.create('lowercase1!')).toThrow();
	});

	it('throws on missing lowercase', () => {
		expect(() => Password.create('UPPERCASE1!')).toThrow();
	});

	it('throws on missing digit', () => {
		expect(() => Password.create('NoDigits!!')).toThrow();
	});

	it('throws on missing special character', () => {
		expect(() => Password.create('NoSpecial1A')).toThrow();
	});
});
