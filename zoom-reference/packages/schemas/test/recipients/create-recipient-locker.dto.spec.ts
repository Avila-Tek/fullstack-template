import { describe, expect, it } from 'vitest';
import {
  createRecipientLockerInputSchema,
  createRecipientLockerInternalSchema,
  createRecipientLockerOutputSchema,
} from '../../src/recipients/create-recipient-locker.dto';

const validInput = {
  siglas: 'VLP',
  locker_number: 800001,
  contact_name: 'María García',
  cellphone_prefix_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  cellphone_number: '4141234567',
};

describe('createRecipientLockerInputSchema', () => {
  it('accepts a valid full payload', () => {
    const result = createRecipientLockerInputSchema.safeParse({
      ...validInput,
      alias: 'Mi casillero',
      observation: 'Dejar en recepción',
    });
    expect(result.success).toBe(true);
  });

  it('accepts a payload with only required fields', () => {
    const result = createRecipientLockerInputSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('rejects siglas shorter than 3 characters', () => {
    const result = createRecipientLockerInputSchema.safeParse({
      ...validInput,
      siglas: 'UI',
    });
    expect(result.success).toBe(false);
  });

  it('rejects siglas longer than 3 characters', () => {
    const result = createRecipientLockerInputSchema.safeParse({
      ...validInput,
      siglas: 'UIOX',
    });
    expect(result.success).toBe(false);
  });

  it('rejects locker_number less than 1', () => {
    const result = createRecipientLockerInputSchema.safeParse({
      ...validInput,
      locker_number: 0,
    });
    expect(result.success).toBe(false);
  });

  it('coerces a string locker_number to integer', () => {
    const result = createRecipientLockerInputSchema.safeParse({
      ...validInput,
      locker_number: '42',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.locker_number).toBe(42);
    }
  });

  it('rejects missing contact_name', () => {
    const { contact_name: _, ...rest } = validInput;
    const result = createRecipientLockerInputSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects empty contact_name', () => {
    const result = createRecipientLockerInputSchema.safeParse({
      ...validInput,
      contact_name: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing cellphone_prefix_id', () => {
    const { cellphone_prefix_id: _, ...rest } = validInput;
    const result = createRecipientLockerInputSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects invalid UUID for cellphone_prefix_id', () => {
    const result = createRecipientLockerInputSchema.safeParse({
      ...validInput,
      cellphone_prefix_id: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing cellphone_number', () => {
    const { cellphone_number: _, ...rest } = validInput;
    const result = createRecipientLockerInputSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects alias exceeding max length of 150', () => {
    const result = createRecipientLockerInputSchema.safeParse({
      ...validInput,
      alias: 'A'.repeat(151),
    });
    expect(result.success).toBe(false);
  });

  it('rejects cellphone_number exceeding max length of 20', () => {
    const result = createRecipientLockerInputSchema.safeParse({
      ...validInput,
      cellphone_number: '1'.repeat(21),
    });
    expect(result.success).toBe(false);
  });

  it('rejects whitespace-only contact_name', () => {
    const result = createRecipientLockerInputSchema.safeParse({
      ...validInput,
      contact_name: '   ',
    });
    expect(result.success).toBe(false);
  });

  it('rejects whitespace-only cellphone_number', () => {
    const result = createRecipientLockerInputSchema.safeParse({
      ...validInput,
      cellphone_number: '   ',
    });
    expect(result.success).toBe(false);
  });
});

describe('createRecipientLockerInternalSchema', () => {
  const validInternal = {
    ...validInput,
    user_id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    business_account_id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    owner_business_profile_id: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    is_business_account_owner: false,
  };

  it('accepts a valid internal payload', () => {
    const result = createRecipientLockerInternalSchema.safeParse(validInternal);
    expect(result.success).toBe(true);
  });

  it('rejects missing user_id', () => {
    const { user_id: _, ...rest } = validInternal;
    const result = createRecipientLockerInternalSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects missing business_account_id', () => {
    const { business_account_id: _, ...rest } = validInternal;
    const result = createRecipientLockerInternalSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects invalid UUID for user_id', () => {
    const result = createRecipientLockerInternalSchema.safeParse({
      ...validInternal,
      user_id: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });
});

describe('createRecipientLockerOutputSchema', () => {
  it('parses a valid output record', () => {
    const result = createRecipientLockerOutputSchema.safeParse({
      id: 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16',
      name: 'María García',
      alias: null,
      delivery_type: 'locker',
      service_scope: 'national',
      status: 'active',
      business_account_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      created_at: new Date().toISOString(),
    });
    expect(result.success).toBe(true);
  });

  it('rejects delivery_type other than locker', () => {
    const result = createRecipientLockerOutputSchema.safeParse({
      id: 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16',
      name: 'María García',
      alias: null,
      delivery_type: 'guia',
      service_scope: 'national',
      status: 'active',
      business_account_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      created_at: new Date().toISOString(),
    });
    expect(result.success).toBe(false);
  });
});
