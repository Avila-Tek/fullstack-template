import { describe, expect, it } from 'vitest';
import { editMemberProfileOutputSchema } from '../../src/users/edit-member-profile-output.schema';

describe('editMemberProfileOutputSchema', () => {
  it('accepts a valid ISO timestamp', () => {
    const result = editMemberProfileOutputSchema.safeParse({
      updatedAt: '2026-05-06T12:00:00.000Z',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.updatedAt).toBe('2026-05-06T12:00:00.000Z');
    }
  });

  it('accepts any non-empty string as updatedAt', () => {
    const result = editMemberProfileOutputSchema.safeParse({
      updatedAt: 'some-date-string',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing updatedAt', () => {
    const result = editMemberProfileOutputSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
