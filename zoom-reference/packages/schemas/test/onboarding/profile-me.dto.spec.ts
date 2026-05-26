import { describe, expect, it } from 'vitest';
import { profileMeOutputSchema } from '../../src/onboarding/profile-me.dto';

describe('profileMeOutputSchema', () => {
  it('accepts onboardingComplete true with a businessAccountId', () => {
    const result = profileMeOutputSchema.safeParse({
      onboardingComplete: true,
      businessAccountId: '550e8400-e29b-41d4-a716-446655440000',
      pendingInvitation: null,
    });
    expect(result.success).toBe(true);
  });

  it('accepts onboardingComplete false with null businessAccountId', () => {
    const result = profileMeOutputSchema.safeParse({
      onboardingComplete: false,
      businessAccountId: null,
      pendingInvitation: null,
    });
    expect(result.success).toBe(true);
  });

  it('accepts a pending invitation object', () => {
    const result = profileMeOutputSchema.safeParse({
      onboardingComplete: false,
      businessAccountId: null,
      pendingInvitation: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        businessAccountName: 'Acme',
        role: 'member',
      },
    });
    expect(result.success).toBe(true);
  });

  it('rejects when onboardingComplete is missing', () => {
    const result = profileMeOutputSchema.safeParse({
      businessAccountId: null,
      pendingInvitation: null,
    });
    expect(result.success).toBe(false);
  });
});
