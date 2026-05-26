import { describe, expect, it } from 'vitest';
import { collaboratorEditContextSchema } from '../../src/users/collaborator-edit-context.schema';

const baseContext = {
  businessAccountId: '550e8400-e29b-41d4-a716-446655440000',
  documentType: 'cedula',
  documentNumber: '12345678',
  firstName: 'Juan',
  lastName: 'Pérez',
  legalName: null,
  accountEmail: 'user@example.com',
  phonePrefixValue: '0412',
  phoneNumber: '1234567',
};

describe('collaboratorEditContextSchema', () => {
  it('accepts a full context with address', () => {
    const input = {
      ...baseContext,
      billingAddress: {
        addressLine1: 'Av. Principal',
        formattedAddress: 'Av. Principal, Caracas',
        countryId: '550e8400-e29b-41d4-a716-446655440001',
        stateId: '550e8400-e29b-41d4-a716-446655440002',
        cityId: '550e8400-e29b-41d4-a716-446655440003',
        municipalityId: null,
        parishId: null,
        postalCodeId: null,
      },
    };
    const result = collaboratorEditContextSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('accepts context with null billingAddress', () => {
    const result = collaboratorEditContextSchema.safeParse({
      ...baseContext,
      billingAddress: null,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.billingAddress).toBeNull();
    }
  });

  it('accepts context with null email and phone', () => {
    const result = collaboratorEditContextSchema.safeParse({
      ...baseContext,
      accountEmail: null,
      phoneNumber: null,
      billingAddress: null,
    });
    expect(result.success).toBe(true);
  });

  it('rejects non-UUID businessAccountId', () => {
    const result = collaboratorEditContextSchema.safeParse({
      ...baseContext,
      businessAccountId: 'not-a-uuid',
      billingAddress: null,
    });
    expect(result.success).toBe(false);
  });

  it('accepts billingAddress with all nullable fields set to null', () => {
    const result = collaboratorEditContextSchema.safeParse({
      ...baseContext,
      billingAddress: {
        addressLine1: 'Calle 1',
        formattedAddress: null,
        countryId: null,
        stateId: null,
        cityId: null,
        municipalityId: null,
        parishId: null,
        postalCodeId: null,
      },
    });
    expect(result.success).toBe(true);
  });
});
