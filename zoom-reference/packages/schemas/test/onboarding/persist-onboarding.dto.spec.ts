import { describe, expect, it } from 'vitest';
import {
  persistOnboardingCommandSchema,
  persistOnboardingOutputSchema,
} from '../../src/onboarding/persist-onboarding.dto';

const validPersistBillingAddress = {
  addressLine1: 'Av. Principal 123',
  countryId: '550e8400-e29b-41d4-a716-446655440099',
  formattedAddress: 'Av. Principal 123, Caracas, Miranda',
  rawQuery: 'Av Principal Caracas',
  geoLat: 10.4806,
  geoLng: -66.9036,
  geolocationProvider: 'GO',
  providerAddressId: '12345',
};

describe('persistOnboardingCommandSchema', () => {
  const validProfile = {
    userId: '550e8400-e29b-41d4-a716-446655440000',
    email: 'user@example.com',
    documentTypeId: '550e8400-e29b-41d4-a716-446655440001',
    phonePrefixId: '550e8400-e29b-41d4-a716-446655440002',
    documentType: 'V',
    phonePrefix: '0412',
    documentNumber: '12345678',
    firstName: 'Juan',
    lastName: 'Pérez',
    legalName: 'Juan Pérez',
    phoneNumber: '1234567',
  };

  const validCommand = {
    profile: validProfile,
    billingAddress: validPersistBillingAddress,
    clientCode: 'CLI-001',
    clientStatus: 'active',
  };

  it('accepts a valid persist command', () => {
    const result = persistOnboardingCommandSchema.safeParse(validCommand);
    expect(result.success).toBe(true);
  });

  it('accepts command without firstName/lastName for entity types', () => {
    const { firstName: _, lastName: __, ...entityProfile } = validProfile;
    const result = persistOnboardingCommandSchema.safeParse({
      ...validCommand,
      profile: {
        ...entityProfile,
        documentType: 'J',
        legalName: 'Empresa ABC C.A.',
      },
    });
    expect(result.success).toBe(true);
  });

  it('accepts clientStatus "inactive"', () => {
    const result = persistOnboardingCommandSchema.safeParse({
      ...validCommand,
      clientStatus: 'inactive',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid clientStatus', () => {
    const result = persistOnboardingCommandSchema.safeParse({
      ...validCommand,
      clientStatus: 'pending',
    });
    expect(result.success).toBe(false);
  });

  it('rejects when profile.userId is not a UUID', () => {
    const result = persistOnboardingCommandSchema.safeParse({
      ...validCommand,
      profile: { ...validProfile, userId: 'not-a-uuid' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects when profile.email is invalid', () => {
    const result = persistOnboardingCommandSchema.safeParse({
      ...validCommand,
      profile: { ...validProfile, email: 'not-an-email' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects when profile.documentType is missing', () => {
    const { documentType: _, ...profileWithout } = validProfile;
    const result = persistOnboardingCommandSchema.safeParse({
      ...validCommand,
      profile: profileWithout,
    });
    expect(result.success).toBe(false);
  });

  it('rejects when profile.phonePrefix is missing', () => {
    const { phonePrefix: _, ...profileWithout } = validProfile;
    const result = persistOnboardingCommandSchema.safeParse({
      ...validCommand,
      profile: profileWithout,
    });
    expect(result.success).toBe(false);
  });
});

describe('persistOnboardingOutputSchema', () => {
  it('accepts a valid UUID businessAccountId', () => {
    const result = persistOnboardingOutputSchema.safeParse({
      businessAccountId: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a non-UUID businessAccountId', () => {
    const result = persistOnboardingOutputSchema.safeParse({
      businessAccountId: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });
});
