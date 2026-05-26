import { describe, expect, it } from 'vitest';
import { memberProfileDetailSchema } from '../../src/users/member-profile-detail.schema';

describe('memberProfileDetailSchema', () => {
  const validProfile = {
    firstName: 'John',
    lastName: 'Doe',
    legalName: 'John A. Doe',
    email: 'john@example.com',
    phoneNumber: '+1234567890',
    phonePrefixId: '550e8400-e29b-41d4-a716-446655440000',
    phonePrefix: '0414',
    documentTypeId: '550e8400-e29b-41d4-a716-446655440001',
    documentType: 'V',
    documentNumber: 'A123456',
  };

  const validAddress = {
    billingAddressLine1: '123 Main St',
    billingAddressCountryId: '550e8400-e29b-41d4-a716-446655440002',
    billingAddressStateId: '550e8400-e29b-41d4-a716-446655440003',
    billingAddressCityId: '550e8400-e29b-41d4-a716-446655440004',
    countryText: 'Venezuela',
    stateText: 'Miranda',
    cityText: 'Caracas',
  };

  it('parses a valid object with all fields present', () => {
    const input = {
      profile: validProfile,
      address: validAddress,
      role: 'member',
      status: 'active',
      roleTemplateName: 'Admin',
    };

    const result = memberProfileDetailSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.role).toBe('member');
      expect(result.data.status).toBe('active');
      expect(result.data.roleTemplateName).toBe('Admin');
    }
  });

  it('accepts roleTemplateName as null', () => {
    const input = {
      profile: validProfile,
      address: validAddress,
      role: 'member',
      status: 'invited',
      roleTemplateName: null,
    };

    const result = memberProfileDetailSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.roleTemplateName).toBeNull();
    }
  });

  it('accepts role = owner', () => {
    const input = {
      profile: validProfile,
      address: validAddress,
      role: 'owner',
      status: 'active',
      roleTemplateName: null,
    };

    const result = memberProfileDetailSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('rejects invalid role value', () => {
    const input = {
      profile: validProfile,
      address: validAddress,
      role: 'superadmin',
      status: 'active',
      roleTemplateName: null,
    };

    const result = memberProfileDetailSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects invalid status value', () => {
    const input = {
      profile: validProfile,
      address: validAddress,
      role: 'member',
      status: 'deleted',
      roleTemplateName: null,
    };

    const result = memberProfileDetailSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('accepts all valid status values', () => {
    const statuses = ['active', 'invited', 'suspended'] as const;
    for (const status of statuses) {
      const input = {
        profile: validProfile,
        address: validAddress,
        role: 'member',
        status,
        roleTemplateName: null,
      };
      const result = memberProfileDetailSchema.safeParse(input);
      expect(result.success).toBe(true);
    }
  });

  it('allows nullable profile fields', () => {
    const input = {
      profile: {
        firstName: null,
        lastName: null,
        legalName: null,
        email: null,
        phoneNumber: null,
        phonePrefixId: null,
        phonePrefix: null,
        documentTypeId: '550e8400-e29b-41d4-a716-446655440001',
        documentType: 'V',
        documentNumber: 'A123456',
      },
      address: {
        billingAddressLine1: null,
        billingAddressCountryId: null,
        billingAddressStateId: null,
        billingAddressCityId: null,
        countryText: null,
        stateText: null,
        cityText: null,
      },
      role: 'member',
      status: 'invited',
      roleTemplateName: null,
    };

    const result = memberProfileDetailSchema.safeParse(input);
    expect(result.success).toBe(true);
  });
});
