import { describe, expect, it } from 'vitest';
import { normalizeEmail } from '@/shared/utils/normalize-email';

describe('normalizeEmail', () => {
	it('lowercases and trims', () => {
		expect(normalizeEmail('  TEST@Example.COM  ')).toBe('test@example.com');
	});

	it('handles already normalized email', () => {
		expect(normalizeEmail('a@b.com')).toBe('a@b.com');
	});

	it('handles empty string', () => {
		expect(normalizeEmail('')).toBe('');
	});
});
