import { describe, expect, it } from '@jest/globals';
import { createLoginDefaultValues } from '@/src/features/auth/infrastructure/auth.form';

describe('createLoginDefaultValues', () => {
  it('returns empty strings by default', () => {
    const values = createLoginDefaultValues();
    expect(values.email).toBe('');
    expect(values.password).toBe('');
  });

  it('merges partial values', () => {
    const values = createLoginDefaultValues({ email: 'admin@test.com' });
    expect(values.email).toBe('admin@test.com');
    expect(values.password).toBe('');
  });
});
