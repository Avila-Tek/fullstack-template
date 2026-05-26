import { describe, expect, it } from 'vitest';
import { editMemberProfileCommandSchema } from '../../src/users/edit-member-profile-command.schema';

const callerUserId = '550e8400-e29b-41d4-a716-446655440000';
const collaboratorProfileId = '550e8400-e29b-41d4-a716-446655440001';

describe('editMemberProfileCommandSchema', () => {
  it('accepts a minimal valid command (only required IDs)', () => {
    const result = editMemberProfileCommandSchema.safeParse({
      callerUserId,
      collaboratorProfileId,
    });
    expect(result.success).toBe(true);
  });

  it('accepts a full command with enriched address', () => {
    const input = {
      callerUserId,
      collaboratorProfileId,
      firstName: 'Juan',
      lastName: 'Pérez',
      legalName: 'Juan Pérez S.A.',
      dniType: 'V',
      dniNumber: '12345678',
      mobilePhone: {
        prefixId: '550e8400-e29b-41d4-a716-446655440002',
        prefixValue: '0416',
        number: '4161234567',
      },
      billingAddress: {
        addressLine1: 'Av. Principal 123',
        countryId: '550e8400-e29b-41d4-a716-446655440003',
      },
    };
    const result = editMemberProfileCommandSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('accepts command without billingAddress (address unchanged)', () => {
    const result = editMemberProfileCommandSchema.safeParse({
      callerUserId,
      collaboratorProfileId,
      firstName: 'Maria',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.billingAddress).toBeUndefined();
    }
  });

  it('rejects non-UUID callerUserId', () => {
    const result = editMemberProfileCommandSchema.safeParse({
      callerUserId: 'not-a-uuid',
      collaboratorProfileId,
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-UUID collaboratorProfileId', () => {
    const result = editMemberProfileCommandSchema.safeParse({
      callerUserId,
      collaboratorProfileId: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-UUID prefixId in mobilePhone', () => {
    const result = editMemberProfileCommandSchema.safeParse({
      callerUserId,
      collaboratorProfileId,
      mobilePhone: {
        prefixId: 'not-a-uuid',
        prefixValue: '0416',
        number: '1234567',
      },
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty string firstName', () => {
    const result = editMemberProfileCommandSchema.safeParse({
      callerUserId,
      collaboratorProfileId,
      firstName: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty string lastName', () => {
    const result = editMemberProfileCommandSchema.safeParse({
      callerUserId,
      collaboratorProfileId,
      lastName: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty string legalName', () => {
    const result = editMemberProfileCommandSchema.safeParse({
      callerUserId,
      collaboratorProfileId,
      legalName: '',
    });
    expect(result.success).toBe(false);
  });
});
