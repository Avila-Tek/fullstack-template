import { describe, expect, it } from 'vitest';
import {
  createRecipientInternationalInputSchema,
  createRecipientInternationalOutputSchema,
} from '../../src/recipients/create-recipient-international.dto';

const validInput = {
  name: 'Global Imports LLC',
  international_shipping_country_code: 'US',
  international_shipping_country_name: 'ESTADOS UNIDOS',
  international_shipping_city_name: 'MIAMI',
  international_shipping_city_zip_code: '33101',
  international_shipping_city_suburb: 'Downtown',
  address_long: '123 Brickell Ave, Suite 400',
  contact_name: 'John Smith',
  international_cellphone_prefix_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  cellphone_number: '3051234567',
};

describe('createRecipientInternationalInputSchema', () => {
  it('accepts a valid full payload', () => {
    const result = createRecipientInternationalInputSchema.safeParse({
      ...validInput,
      alias: 'Miami Office',
      international_document: 'P12345678',
      locality: 'Brickell',
      international_phone_prefix_id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
      phone_number: '3059876543',
      email: 'john@globalimports.com',
      observation: 'Leave at reception',
    });
    expect(result.success).toBe(true);
  });

  it('accepts a payload with only required fields (optionals omitted)', () => {
    const result =
      createRecipientInternationalInputSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('accepts international_document omitted (optional free text, no type prefix)', () => {
    const { international_document: _, ...rest } = { ...validInput };
    const result = createRecipientInternationalInputSchema.safeParse(rest);
    expect(result.success).toBe(true);
  });

  it('accepts empty international_shipping_city_zip_code', () => {
    const result = createRecipientInternationalInputSchema.safeParse({
      ...validInput,
      international_shipping_city_zip_code: '',
    });
    expect(result.success).toBe(true);
  });

  it('accepts empty international_shipping_city_suburb', () => {
    const result = createRecipientInternationalInputSchema.safeParse({
      ...validInput,
      international_shipping_city_suburb: '',
    });
    expect(result.success).toBe(true);
  });

  it('rejects when name is missing', () => {
    const { name: _, ...rest } = validInput;
    const result = createRecipientInternationalInputSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects when international_shipping_country_code is missing', () => {
    const { international_shipping_country_code: _, ...rest } = validInput;
    const result = createRecipientInternationalInputSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects when international_shipping_country_name is missing', () => {
    const { international_shipping_country_name: _, ...rest } = validInput;
    const result = createRecipientInternationalInputSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects when international_shipping_city_name is missing', () => {
    const { international_shipping_city_name: _, ...rest } = validInput;
    const result = createRecipientInternationalInputSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects when address_long is missing', () => {
    const { address_long: _, ...rest } = validInput;
    const result = createRecipientInternationalInputSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects when contact_name is missing', () => {
    const { contact_name: _, ...rest } = validInput;
    const result = createRecipientInternationalInputSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects when international_cellphone_prefix_id is missing', () => {
    const { international_cellphone_prefix_id: _, ...rest } = validInput;
    const result = createRecipientInternationalInputSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects when cellphone_number is missing', () => {
    const { cellphone_number: _, ...rest } = validInput;
    const result = createRecipientInternationalInputSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects an invalid email format', () => {
    const result = createRecipientInternationalInputSchema.safeParse({
      ...validInput,
      email: 'not-an-email',
    });
    expect(result.success).toBe(false);
  });

  it('rejects name exceeding max length of 150', () => {
    const result = createRecipientInternationalInputSchema.safeParse({
      ...validInput,
      name: 'A'.repeat(151),
    });
    expect(result.success).toBe(false);
  });

  it('rejects alias exceeding max length of 150', () => {
    const result = createRecipientInternationalInputSchema.safeParse({
      ...validInput,
      alias: 'A'.repeat(151),
    });
    expect(result.success).toBe(false);
  });

  it('rejects international_document exceeding max length of 30', () => {
    const result = createRecipientInternationalInputSchema.safeParse({
      ...validInput,
      international_document: 'A'.repeat(31),
    });
    expect(result.success).toBe(false);
  });

  it('rejects contact_name exceeding max length of 150', () => {
    const result = createRecipientInternationalInputSchema.safeParse({
      ...validInput,
      contact_name: 'A'.repeat(151),
    });
    expect(result.success).toBe(false);
  });

  it('rejects cellphone_number exceeding max length of 20', () => {
    const result = createRecipientInternationalInputSchema.safeParse({
      ...validInput,
      cellphone_number: '1'.repeat(21),
    });
    expect(result.success).toBe(false);
  });

  it('rejects phone_number exceeding max length of 20', () => {
    const result = createRecipientInternationalInputSchema.safeParse({
      ...validInput,
      phone_number: '1'.repeat(21),
    });
    expect(result.success).toBe(false);
  });

  it('rejects email exceeding max length of 320', () => {
    const result = createRecipientInternationalInputSchema.safeParse({
      ...validInput,
      email: `${'a'.repeat(315)}@b.com`,
    });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid UUID for international_cellphone_prefix_id', () => {
    const result = createRecipientInternationalInputSchema.safeParse({
      ...validInput,
      international_cellphone_prefix_id: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid UUID for international_phone_prefix_id', () => {
    const result = createRecipientInternationalInputSchema.safeParse({
      ...validInput,
      international_phone_prefix_id: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('rejects international_shipping_country_code shorter than 2 chars', () => {
    const result = createRecipientInternationalInputSchema.safeParse({
      ...validInput,
      international_shipping_country_code: 'U',
    });
    expect(result.success).toBe(false);
  });

  it('rejects international_shipping_country_code longer than 5 chars', () => {
    const result = createRecipientInternationalInputSchema.safeParse({
      ...validInput,
      international_shipping_country_code: 'ABCDEF',
    });
    expect(result.success).toBe(false);
  });
});

describe('createRecipientInternationalOutputSchema', () => {
  it('parses a valid output record', () => {
    const result = createRecipientInternationalOutputSchema.safeParse({
      id: 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16',
      name: 'Global Imports LLC',
      alias: null,
      delivery_type: 'guia',
      service_scope: 'international',
      status: 'active',
      business_account_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      created_at: new Date().toISOString(),
    });
    expect(result.success).toBe(true);
  });

  it('rejects service_scope other than international', () => {
    const result = createRecipientInternationalOutputSchema.safeParse({
      id: 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16',
      name: 'Global Imports LLC',
      delivery_type: 'guia',
      service_scope: 'national',
      status: 'active',
      business_account_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      created_at: new Date().toISOString(),
    });
    expect(result.success).toBe(false);
  });
});
