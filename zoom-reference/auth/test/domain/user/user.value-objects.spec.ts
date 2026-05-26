import { describe, expect, it } from 'vitest';
import { Email } from '../../../src/domain/value-objects/user.value-object';

describe('Email', () => {
	it('normalizes on construction (trim + lowercase)', () => {
		const email = Email.create('  Alice@EXAMPLE.COM  ');
		expect(email.value).toBe('alice@example.com');
	});

	it('throws on invalid format — no @', () => {
		expect(() => Email.create('notanemail')).toThrow();
	});

	it('throws on empty string', () => {
		expect(() => Email.create('')).toThrow();
	});

	it('throws on whitespace-only string', () => {
		expect(() => Email.create('   ')).toThrow();
	});

	it('equals another Email with the same normalized value', () => {
		const a = Email.create('alice@example.com');
		const b = Email.create('Alice@Example.Com');
		expect(a.equals(b)).toBe(true);
	});

	it('does not equal an Email with a different value', () => {
		const a = Email.create('alice@example.com');
		const b = Email.create('bob@example.com');
		expect(a.equals(b)).toBe(false);
	});

	it('exposes the normalized .value', () => {
		const email = Email.create('User@Domain.ORG');
		expect(email.value).toBe('user@domain.org');
	});
});
