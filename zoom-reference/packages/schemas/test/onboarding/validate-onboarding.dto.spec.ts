import { describe, expect, it } from 'vitest';
import {
  validateOnboardingInputSchema,
  validateOnboardingOutputSchema,
} from '../../src/onboarding/validate-onboarding.dto';

const COUNTRY_UUID = '550e8400-e29b-41d4-a716-446655440099';

describe('validateOnboardingInputSchema', () => {
  it('accepts valid input', () => {
    const result = validateOnboardingInputSchema.safeParse({
      userId: '550e8400-e29b-41d4-a716-446655440000',
      profile: {
        documentType: 'V',
        documentNumber: '12345678',
        phonePrefix: '0412',
      },
      billingAddress: {},
    });
    expect(result.success).toBe(true);
  });

  it('rejects when userId is not a UUID', () => {
    const result = validateOnboardingInputSchema.safeParse({
      userId: 'not-a-uuid',
      profile: {
        documentType: 'V',
        documentNumber: '12345678',
        phonePrefix: '0412',
      },
      billingAddress: {},
    });
    expect(result.success).toBe(false);
  });

  it('rejects when profile.phonePrefix is missing', () => {
    const result = validateOnboardingInputSchema.safeParse({
      userId: '550e8400-e29b-41d4-a716-446655440000',
      profile: {
        documentType: 'V',
        documentNumber: '12345678',
      },
      billingAddress: {},
    });
    expect(result.success).toBe(false);
  });

  it('accepts optional billingAddress.countryId as UUID', () => {
    const result = validateOnboardingInputSchema.safeParse({
      userId: '550e8400-e29b-41d4-a716-446655440000',
      profile: {
        documentType: 'V',
        documentNumber: '12345678',
        phonePrefix: '0412',
      },
      billingAddress: { countryId: COUNTRY_UUID },
    });
    expect(result.success).toBe(true);
  });

  it('rejects billingAddress.countryId that is not a UUID', () => {
    const result = validateOnboardingInputSchema.safeParse({
      userId: '550e8400-e29b-41d4-a716-446655440000',
      profile: {
        documentType: 'V',
        documentNumber: '12345678',
        phonePrefix: '0412',
      },
      billingAddress: { countryId: 'not-a-uuid' },
    });
    expect(result.success).toBe(false);
  });
});

describe('validateOnboardingOutputSchema', () => {
  const validOutput = {
    countryId: COUNTRY_UUID,
    profile: {
      documentTypeId: '550e8400-e29b-41d4-a716-446655440001',
      phonePrefixId: '550e8400-e29b-41d4-a716-446655440002',
      documentType: 'V',
      phonePrefix: '0412',
    },
  };

  it('accepts valid output', () => {
    const result = validateOnboardingOutputSchema.safeParse(validOutput);
    expect(result.success).toBe(true);
  });

  it('rejects when profile.documentTypeId is not a UUID', () => {
    const result = validateOnboardingOutputSchema.safeParse({
      ...validOutput,
      profile: { ...validOutput.profile, documentTypeId: 'not-a-uuid' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects when countryId is missing', () => {
    const { countryId: _, ...missing } = validOutput;
    const result = validateOnboardingOutputSchema.safeParse(missing);
    expect(result.success).toBe(false);
  });

  it('rejects when countryId is not a UUID', () => {
    const result = validateOnboardingOutputSchema.safeParse({
      ...validOutput,
      countryId: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('rejects when profile.documentType is missing', () => {
    const { documentType: _, ...profileWithout } = validOutput.profile;
    const result = validateOnboardingOutputSchema.safeParse({
      ...validOutput,
      profile: profileWithout,
    });
    expect(result.success).toBe(false);
  });

  it('rejects when profile.phonePrefix is missing', () => {
    const { phonePrefix: _, ...profileWithout } = validOutput.profile;
    const result = validateOnboardingOutputSchema.safeParse({
      ...validOutput,
      profile: profileWithout,
    });
    expect(result.success).toBe(false);
  });
});
