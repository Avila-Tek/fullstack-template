import { describe, it, expect } from 'vitest';
import { Argon2HashAdapter } from '@/auth/infrastructure/adapters/argon2-hash.adapter.js';

describe('Argon2HashAdapter', () => {
  const adapter = new Argon2HashAdapter();

  it('hashes a password (result is different from plain)', async () => {
    const hash = await adapter.hash('Str0ng!Pass');
    expect(hash).not.toBe('Str0ng!Pass');
    expect(hash.startsWith('$argon2')).toBe(true);
  });

  it('verifies correct password returns true', async () => {
    const hash = await adapter.hash('Str0ng!Pass');
    const result = await adapter.verify(hash, 'Str0ng!Pass');
    expect(result).toBe(true);
  });

  it('verifies wrong password returns false', async () => {
    const hash = await adapter.hash('Str0ng!Pass');
    const result = await adapter.verify(hash, 'WrongPass1!');
    expect(result).toBe(false);
  });
});
