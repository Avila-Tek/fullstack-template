import { describe, expect, it } from 'vitest';
import {
  listRecipientsQuerySchema,
  listRecipientsResponseSchema,
  recipientListItemSchema,
  toggleFavoriteInputSchema,
} from '../../src/recipients/list-recipients.dto';

// ── listRecipientsQuerySchema ──

describe('listRecipientsQuerySchema', () => {
  it('defaults page=1, limit=10, status="active" when no input', () => {
    const result = listRecipientsQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(10);
      expect(result.data.status).toBe('active');
    }
  });

  it('coerces string numbers to integers', () => {
    const result = listRecipientsQuerySchema.safeParse({
      page: '2',
      limit: '20',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(20);
    }
  });

  it('rejects page < 1', () => {
    const result = listRecipientsQuerySchema.safeParse({ page: '0' });
    expect(result.success).toBe(false);
  });

  it('rejects limit < 1', () => {
    const result = listRecipientsQuerySchema.safeParse({ limit: '0' });
    expect(result.success).toBe(false);
  });

  it('rejects limit > 50', () => {
    const result = listRecipientsQuerySchema.safeParse({ limit: '51' });
    expect(result.success).toBe(false);
  });

  it('accepts limit = 50', () => {
    const result = listRecipientsQuerySchema.safeParse({ limit: '50' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.limit).toBe(50);
  });

  it('accepts recipientType = guia', () => {
    const result = listRecipientsQuerySchema.safeParse({
      recipientType: 'guia',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.recipientType).toBe('guia');
  });

  it('accepts recipientType = locker', () => {
    const result = listRecipientsQuerySchema.safeParse({
      recipientType: 'locker',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.recipientType).toBe('locker');
  });

  it('rejects invalid recipientType', () => {
    const result = listRecipientsQuerySchema.safeParse({
      recipientType: 'invalid',
    });
    expect(result.success).toBe(false);
  });

  it('accepts serviceScope = national', () => {
    const result = listRecipientsQuerySchema.safeParse({
      serviceScope: 'national',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.serviceScope).toBe('national');
  });

  it('accepts serviceScope = international', () => {
    const result = listRecipientsQuerySchema.safeParse({
      serviceScope: 'international',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.serviceScope).toBe('international');
  });

  it('rejects invalid serviceScope', () => {
    const result = listRecipientsQuerySchema.safeParse({
      serviceScope: 'local',
    });
    expect(result.success).toBe(false);
  });

  it('accepts status = active', () => {
    const result = listRecipientsQuerySchema.safeParse({ status: 'active' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.status).toBe('active');
  });

  it('accepts status = suspended', () => {
    const result = listRecipientsQuerySchema.safeParse({ status: 'suspended' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.status).toBe('suspended');
  });

  it('accepts status = all', () => {
    const result = listRecipientsQuerySchema.safeParse({ status: 'all' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.status).toBe('all');
  });

  it('rejects invalid status', () => {
    const result = listRecipientsQuerySchema.safeParse({ status: 'deleted' });
    expect(result.success).toBe(false);
  });

  it('coerces starred "true" string to boolean true', () => {
    const result = listRecipientsQuerySchema.safeParse({ starred: 'true' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.starred).toBe(true);
  });

  it('coerces starred "false" string to boolean false', () => {
    const result = listRecipientsQuerySchema.safeParse({ starred: 'false' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.starred).toBe(false);
  });

  it('leaves starred undefined when not provided', () => {
    const result = listRecipientsQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.starred).toBeUndefined();
  });

  it('accepts optional search string', () => {
    const result = listRecipientsQuerySchema.safeParse({ search: 'acme' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.search).toBe('acme');
  });

  it('leaves search undefined when not provided', () => {
    const result = listRecipientsQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.search).toBeUndefined();
  });

  it('accepts a full query with all params', () => {
    const result = listRecipientsQuerySchema.safeParse({
      page: '2',
      limit: '20',
      search: 'warehouse',
      recipientType: 'guia',
      serviceScope: 'national',
      status: 'all',
      starred: 'true',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        page: 2,
        limit: 20,
        search: 'warehouse',
        recipientType: 'guia',
        serviceScope: 'national',
        status: 'all',
        starred: true,
      });
    }
  });
});

// ── recipientListItemSchema ──

describe('recipientListItemSchema', () => {
  const validItem = {
    id: 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16',
    alias: 'Main Warehouse',
    name: 'Acme Corp',
    recipientType: 'guia' as const,
    serviceScope: 'national' as const,
    status: 'active' as const,
    starred: false,
    stateName: 'Miranda',
    cityName: 'Caracas',
    formattedAddress: null,
    internationalCityText: null,
    countryName: null,
    lockerPrefix: null,
    lockerCode: null,
    ownerBusinessProfileId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    ownerName: 'Juan Pérez',
    isBusinessAccountOwner: false,
    createdAt: '2026-05-14T12:00:00.000Z',
  };

  it('accepts a valid guia item with geography fields', () => {
    expect(recipientListItemSchema.safeParse(validItem).success).toBe(true);
  });

  it('accepts a valid locker item with locker fields', () => {
    const lockerItem = {
      ...validItem,
      recipientType: 'locker' as const,
      serviceScope: 'national' as const,
      stateName: null,
      cityName: null,
      lockerPrefix: 'CCS',
      lockerCode: '12345',
    };
    expect(recipientListItemSchema.safeParse(lockerItem).success).toBe(true);
  });

  it('accepts null alias', () => {
    expect(
      recipientListItemSchema.safeParse({ ...validItem, alias: null }).success
    ).toBe(true);
  });

  it('accepts null ownerName', () => {
    expect(
      recipientListItemSchema.safeParse({ ...validItem, ownerName: null })
        .success
    ).toBe(true);
  });

  it('rejects missing id', () => {
    const { id: _, ...without } = validItem;
    expect(recipientListItemSchema.safeParse(without).success).toBe(false);
  });

  it('rejects invalid recipientType', () => {
    expect(
      recipientListItemSchema.safeParse({
        ...validItem,
        recipientType: 'express',
      }).success
    ).toBe(false);
  });

  it('rejects invalid serviceScope', () => {
    expect(
      recipientListItemSchema.safeParse({
        ...validItem,
        serviceScope: 'local',
      }).success
    ).toBe(false);
  });

  it('rejects invalid status', () => {
    expect(
      recipientListItemSchema.safeParse({ ...validItem, status: 'deleted' })
        .success
    ).toBe(false);
  });

  it('rejects non-uuid id', () => {
    expect(
      recipientListItemSchema.safeParse({ ...validItem, id: 'not-a-uuid' })
        .success
    ).toBe(false);
  });

  it('rejects non-uuid ownerBusinessProfileId', () => {
    expect(
      recipientListItemSchema.safeParse({
        ...validItem,
        ownerBusinessProfileId: 'bad',
      }).success
    ).toBe(false);
  });
});

// ── listRecipientsResponseSchema ──

describe('listRecipientsResponseSchema', () => {
  const validItem = {
    id: 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16',
    alias: null,
    name: 'Acme Corp',
    recipientType: 'guia' as const,
    serviceScope: 'national' as const,
    status: 'active' as const,
    starred: false,
    stateName: 'Miranda',
    cityName: 'Caracas',
    formattedAddress: null,
    internationalCityText: null,
    countryName: null,
    lockerPrefix: null,
    lockerCode: null,
    ownerBusinessProfileId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    ownerName: 'Juan Pérez',
    isBusinessAccountOwner: false,
    createdAt: '2026-05-14T12:00:00.000Z',
  };

  it('accepts a valid response with items', () => {
    const result = listRecipientsResponseSchema.safeParse({
      items: [validItem],
      total: 1,
      page: 1,
      limit: 10,
    });
    expect(result.success).toBe(true);
  });

  it('accepts a valid empty response', () => {
    const result = listRecipientsResponseSchema.safeParse({
      items: [],
      total: 0,
      page: 1,
      limit: 10,
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing items', () => {
    const result = listRecipientsResponseSchema.safeParse({
      total: 0,
      page: 1,
      limit: 10,
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative total', () => {
    const result = listRecipientsResponseSchema.safeParse({
      items: [],
      total: -1,
      page: 1,
      limit: 10,
    });
    expect(result.success).toBe(false);
  });

  it('rejects page < 1', () => {
    const result = listRecipientsResponseSchema.safeParse({
      items: [],
      total: 0,
      page: 0,
      limit: 10,
    });
    expect(result.success).toBe(false);
  });

  it('rejects limit < 1', () => {
    const result = listRecipientsResponseSchema.safeParse({
      items: [],
      total: 0,
      page: 1,
      limit: 0,
    });
    expect(result.success).toBe(false);
  });
});

// ── toggleFavoriteInputSchema ──

describe('toggleFavoriteInputSchema', () => {
  it('accepts starred = true', () => {
    const result = toggleFavoriteInputSchema.safeParse({ starred: true });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.starred).toBe(true);
  });

  it('accepts starred = false', () => {
    const result = toggleFavoriteInputSchema.safeParse({ starred: false });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.starred).toBe(false);
  });

  it('rejects missing starred', () => {
    const result = toggleFavoriteInputSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects non-boolean starred', () => {
    const result = toggleFavoriteInputSchema.safeParse({ starred: 'yes' });
    expect(result.success).toBe(false);
  });
});
