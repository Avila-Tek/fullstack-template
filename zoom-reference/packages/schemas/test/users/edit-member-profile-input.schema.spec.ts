import { describe, expect, it } from 'vitest';
import { editMemberProfileInputSchema } from '../../src/users/edit-member-profile-input.schema';

describe('editMemberProfileInputSchema', () => {
  it('accepts an empty object (all fields optional)', () => {
    const result = editMemberProfileInputSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts a full valid payload', () => {
    const input = {
      firstName: 'Juan',
      lastName: 'Pérez',
      legalName: 'Juan Pérez S.A.',
      dniType: 'V',
      dniNumber: '12345678',
      mobilePhone: {
        prefixId: '550e8400-e29b-41d4-a716-446655440000',
        number: '4161234567',
      },
      billingAddress: {
        addressLine1: 'Av. Principal 123',
        stateId: '550e8400-e29b-41d4-a716-446655440001',
        cityId: '550e8400-e29b-41d4-a716-446655440002',
      },
    };
    const result = editMemberProfileInputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('rejects non-UUID prefixId', () => {
    const input = {
      mobilePhone: {
        prefixId: 'not-a-uuid',
        number: '4161234567',
      },
    };
    const result = editMemberProfileInputSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('accepts partial payload with only firstName', () => {
    const result = editMemberProfileInputSchema.safeParse({
      firstName: 'Ana',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty string for firstName', () => {
    const result = editMemberProfileInputSchema.safeParse({
      firstName: '',
    });
    expect(result.success).toBe(false);
  });

  it('accepts billingAddress without optional fields', () => {
    const result = editMemberProfileInputSchema.safeParse({
      billingAddress: {
        addressLine1: 'Calle 1',
      },
    });
    expect(result.success).toBe(true);
  });
});
