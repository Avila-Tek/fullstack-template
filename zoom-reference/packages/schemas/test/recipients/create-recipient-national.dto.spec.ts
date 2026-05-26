import { describe, expect, it } from 'vitest';
import {
  createRecipientNationalInputSchema,
  createRecipientNationalOutputSchema,
} from '../../src/recipients/create-recipient-national.dto';

const validInput = {
  name: 'Acme Corp',
  document_type_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  document_number: 'J12345678',
  state_id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
  city_id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13',
  address_long: 'Av. Principal, Edificio Zoom, Piso 3',
  contact_name: 'Juan Pérez',
  cellphone_prefix_id: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14',
  cellphone_number: '4141234567',
};

describe('createRecipientNationalInputSchema', () => {
  it('accepts a valid full payload', () => {
    const result = createRecipientNationalInputSchema.safeParse({
      ...validInput,
      alias: 'Main Warehouse',
      locality: 'Los Palos Grandes',
      phone_prefix_id: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15',
      phone_number: '2123334455',
      email: 'contact@acme.com',
      observation: 'Ring the bell twice',
    });
    expect(result.success).toBe(true);
  });

  it('accepts a payload with only required fields (optionals omitted)', () => {
    const result = createRecipientNationalInputSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('rejects when name is missing', () => {
    const { name: _, ...rest } = validInput;
    const result = createRecipientNationalInputSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects when document_type_id is missing', () => {
    const { document_type_id: _, ...rest } = validInput;
    const result = createRecipientNationalInputSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects when document_number is missing', () => {
    const { document_number: _, ...rest } = validInput;
    const result = createRecipientNationalInputSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects when state_id is missing', () => {
    const { state_id: _, ...rest } = validInput;
    const result = createRecipientNationalInputSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects when city_id is missing', () => {
    const { city_id: _, ...rest } = validInput;
    const result = createRecipientNationalInputSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects when address_long is missing', () => {
    const { address_long: _, ...rest } = validInput;
    const result = createRecipientNationalInputSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects when contact_name is missing', () => {
    const { contact_name: _, ...rest } = validInput;
    const result = createRecipientNationalInputSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects when cellphone_prefix_id is missing', () => {
    const { cellphone_prefix_id: _, ...rest } = validInput;
    const result = createRecipientNationalInputSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects when cellphone_number is missing', () => {
    const { cellphone_number: _, ...rest } = validInput;
    const result = createRecipientNationalInputSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects an invalid email format', () => {
    const result = createRecipientNationalInputSchema.safeParse({
      ...validInput,
      email: 'not-an-email',
    });
    expect(result.success).toBe(false);
  });

  it('rejects name exceeding max length of 150', () => {
    const result = createRecipientNationalInputSchema.safeParse({
      ...validInput,
      name: 'A'.repeat(151),
    });
    expect(result.success).toBe(false);
  });

  it('rejects alias exceeding max length of 150', () => {
    const result = createRecipientNationalInputSchema.safeParse({
      ...validInput,
      alias: 'A'.repeat(151),
    });
    expect(result.success).toBe(false);
  });

  it('rejects document_number exceeding max length of 30', () => {
    const result = createRecipientNationalInputSchema.safeParse({
      ...validInput,
      document_number: 'A'.repeat(31),
    });
    expect(result.success).toBe(false);
  });

  it('rejects cellphone_number exceeding max length of 20', () => {
    const result = createRecipientNationalInputSchema.safeParse({
      ...validInput,
      cellphone_number: '1'.repeat(21),
    });
    expect(result.success).toBe(false);
  });

  it('rejects phone_number exceeding max length of 20', () => {
    const result = createRecipientNationalInputSchema.safeParse({
      ...validInput,
      phone_number: '1'.repeat(21),
    });
    expect(result.success).toBe(false);
  });

  it('rejects email exceeding max length of 320', () => {
    const result = createRecipientNationalInputSchema.safeParse({
      ...validInput,
      email: `${'a'.repeat(315)}@b.com`,
    });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid UUID for document_type_id', () => {
    const result = createRecipientNationalInputSchema.safeParse({
      ...validInput,
      document_type_id: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });
});

describe('createRecipientNationalOutputSchema', () => {
  it('parses a valid output record', () => {
    const result = createRecipientNationalOutputSchema.safeParse({
      id: 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16',
      name: 'Acme Corp',
      alias: null,
      delivery_type: 'guia',
      service_scope: 'national',
      status: 'active',
      business_account_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      created_at: new Date().toISOString(),
    });
    expect(result.success).toBe(true);
  });
});
