import { describe, expect, it } from 'vitest';
import { Email } from './user.value-object';

describe('Email', () => {
	it('normalizes to lowercase and trimmed', () => {
		const email = Email.create('  Test@Example.COM  ');
		expect(email.value).toBe('test@example.com');
	});

	it('throws on empty string', () => {
		expect(() => Email.create('')).toThrow('Invalid email address');
	});

	it('throws on whitespace-only string', () => {
		expect(() => Email.create('   ')).toThrow('Invalid email address');
	});

	it('throws on malformed email', () => {
		expect(() => Email.create('not-an-email')).toThrow('Invalid email address');
	});

	it('equals returns true for same normalized email', () => {
		const a = Email.create('test@example.com');
		const b = Email.create('TEST@example.com');
		expect(a.equals(b)).toBe(true);
	});

	it('equals returns false for different emails', () => {
		const a = Email.create('a@example.com');
		const b = Email.create('b@example.com');
		expect(a.equals(b)).toBe(false);
	});
});
