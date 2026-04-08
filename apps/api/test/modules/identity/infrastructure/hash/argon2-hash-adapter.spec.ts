import { describe, expect, it, vi } from 'vitest';
import type { IStructuredLogger } from '@/shared/domain-utils';
import { Argon2HashAdapter } from '@/modules/identity/infrastructure/security/argon2-hash.adapter';

function makeLogger(): IStructuredLogger {
	return {
		error: vi.fn(),
		warn: vi.fn(),
		info: vi.fn(),
		debug: vi.fn(),
	} as unknown as IStructuredLogger;
}

describe('Argon2HashAdapter', () => {
	it('hash returns a string starting with $argon2id$', async () => {
		const adapter = new Argon2HashAdapter(makeLogger());
		const hashed = await adapter.hash('Str0ng!Pass');
		expect(hashed).toMatch(/^\$argon2id\$/);
	});

	it('verify returns true for matching password', async () => {
		const adapter = new Argon2HashAdapter(makeLogger());
		const hashed = await adapter.hash('Str0ng!Pass');
		const result = await adapter.verify(hashed, 'Str0ng!Pass');
		expect(result).toBe(true);
	});

	it('verify returns false for non-matching password', async () => {
		const adapter = new Argon2HashAdapter(makeLogger());
		const hashed = await adapter.hash('Str0ng!Pass');
		const result = await adapter.verify(hashed, 'WrongPass1!');
		expect(result).toBe(false);
	});
});
