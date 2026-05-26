import { describe, expect, it } from 'vitest';
import { onboardingInputSchema } from '../../src/onboarding/onboarding.dto';

const COUNTRY_UUID = '550e8400-e29b-41d4-a716-446655440099';

const validBillingAddress = {
  addressLine1: 'Av. Principal 123',
  countryId: COUNTRY_UUID,
};

const naturalBase = {
  profile: {
    firstName: 'Juan',
    lastName: 'Pérez',
    phonePrefix: '0412',
    phoneNumber: '1234567',
  },
  billingAddress: validBillingAddress,
};

const entityBase = {
  profile: {
    legalName: 'Empresa ABC C.A.',
    phonePrefix: '0412',
    phoneNumber: '1234567',
  },
  billingAddress: validBillingAddress,
};

describe('onboardingInputSchema', () => {
  // --- Natural person types ---
  it('accepts a valid V-type payload', () => {
    const result = onboardingInputSchema.safeParse({
      ...naturalBase,
      profile: {
        ...naturalBase.profile,
        documentType: 'V',
        documentNumber: '12345678',
      },
    });
    expect(result.success).toBe(true);
  });

  it('accepts a valid E-type payload', () => {
    const result = onboardingInputSchema.safeParse({
      ...naturalBase,
      profile: {
        ...naturalBase.profile,
        documentType: 'E',
        documentNumber: '1234567890',
      },
    });
    expect(result.success).toBe(true);
  });

  it('accepts a valid P-type payload', () => {
    const result = onboardingInputSchema.safeParse({
      ...naturalBase,
      profile: {
        ...naturalBase.profile,
        documentType: 'P',
        documentNumber: '1234567890',
      },
    });
    expect(result.success).toBe(true);
  });

  it('rejects natural person type missing firstName', () => {
    const { firstName: _, ...profileWithout } = naturalBase.profile;
    const result = onboardingInputSchema.safeParse({
      profile: {
        ...profileWithout,
        documentType: 'V',
        documentNumber: '12345678',
      },
      billingAddress: validBillingAddress,
    });
    expect(result.success).toBe(false);
  });

  it('rejects natural person type missing lastName', () => {
    const { lastName: _, ...profileWithout } = naturalBase.profile;
    const result = onboardingInputSchema.safeParse({
      profile: {
        ...profileWithout,
        documentType: 'V',
        documentNumber: '12345678',
      },
      billingAddress: validBillingAddress,
    });
    expect(result.success).toBe(false);
  });

  // --- Entity types ---
  it('accepts a valid J-type payload with legalName', () => {
    const result = onboardingInputSchema.safeParse({
      ...entityBase,
      profile: {
        ...entityBase.profile,
        documentType: 'J',
        documentNumber: '123456789',
      },
    });
    expect(result.success).toBe(true);
  });

  it('accepts a valid G-type payload with legalName', () => {
    const result = onboardingInputSchema.safeParse({
      ...entityBase,
      profile: {
        ...entityBase.profile,
        documentType: 'G',
        documentNumber: '1234567890',
      },
    });
    expect(result.success).toBe(true);
  });

  it('rejects J-type missing legalName', () => {
    const result = onboardingInputSchema.safeParse({
      profile: {
        documentType: 'J',
        documentNumber: '123456789',
        phonePrefix: '0412',
        phoneNumber: '1234567',
      },
      billingAddress: validBillingAddress,
    });
    expect(result.success).toBe(false);
  });

  it('rejects G-type missing legalName', () => {
    const result = onboardingInputSchema.safeParse({
      profile: {
        documentType: 'G',
        documentNumber: '1234567890',
        phonePrefix: '0412',
        phoneNumber: '1234567',
      },
      billingAddress: validBillingAddress,
    });
    expect(result.success).toBe(false);
  });

  // --- documentNumber format ---
  it('rejects documentNumber with non-alphanumeric characters', () => {
    const result = onboardingInputSchema.safeParse({
      ...naturalBase,
      profile: {
        ...naturalBase.profile,
        documentType: 'V',
        documentNumber: '1234-5678',
      },
    });
    expect(result.success).toBe(false);
  });

  it('rejects documentNumber longer than 20 characters', () => {
    const result = onboardingInputSchema.safeParse({
      ...naturalBase,
      profile: {
        ...naturalBase.profile,
        documentType: 'V',
        documentNumber: 'A'.repeat(21),
      },
    });
    expect(result.success).toBe(false);
  });

  // --- Phone validation ---
  it('rejects invalid phone prefix', () => {
    const result = onboardingInputSchema.safeParse({
      ...naturalBase,
      profile: {
        ...naturalBase.profile,
        documentType: 'V',
        documentNumber: '12345678',
        phonePrefix: '9999',
      },
    });
    expect(result.success).toBe(false);
  });

  it('rejects phone number not exactly 7 digits', () => {
    const result = onboardingInputSchema.safeParse({
      ...naturalBase,
      profile: {
        ...naturalBase.profile,
        documentType: 'V',
        documentNumber: '12345678',
        phoneNumber: '123456',
      },
    });
    expect(result.success).toBe(false);
  });

  // --- Billing address ---
  it('accepts billingAddress without countryId (defaults to Venezuela)', () => {
    const { countryId: _, ...withoutCountry } = validBillingAddress;
    const result = onboardingInputSchema.safeParse({
      ...naturalBase,
      profile: {
        ...naturalBase.profile,
        documentType: 'V',
        documentNumber: '12345678',
      },
      billingAddress: withoutCountry,
    });
    expect(result.success).toBe(true);
  });

  // --- master-table driven documentType ---
  it('accepts unknown documentType as natural person (requires firstName/lastName)', () => {
    const result = onboardingInputSchema.safeParse({
      ...naturalBase,
      profile: {
        ...naturalBase.profile,
        documentType: 'X',
        documentNumber: '12345678',
      },
    });
    expect(result.success).toBe(true);
  });
});
