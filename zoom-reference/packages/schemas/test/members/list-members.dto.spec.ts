import { describe, expect, it } from 'vitest';
import {
  collaboratorListItemSchema,
  listMembersOutputSchema,
  listMembersQuerySchema,
} from '../../src/members/list-members.dto';

describe('listMembersQuerySchema', () => {
  it('defaults page=1 and limit=20 when no input', () => {
    const result = listMembersQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
    }
  });

  it('coerces string numbers to integers', () => {
    const result = listMembersQuerySchema.safeParse({ page: '3', limit: '50' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(3);
      expect(result.data.limit).toBe(50);
    }
  });

  it('rejects limit > 100', () => {
    const result = listMembersQuerySchema.safeParse({ limit: '101' });
    expect(result.success).toBe(false);
  });

  it('rejects status values outside allowed enum', () => {
    const result = listMembersQuerySchema.safeParse({ status: 'blocked' });
    expect(result.success).toBe(false);
  });

  it('accepts status=active', () => {
    const result = listMembersQuerySchema.safeParse({ status: 'active' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.status).toBe('active');
  });

  it('accepts status=invited', () => {
    const result = listMembersQuerySchema.safeParse({ status: 'invited' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.status).toBe('invited');
  });

  it('accepts status=suspended', () => {
    const result = listMembersQuerySchema.safeParse({ status: 'suspended' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.status).toBe('suspended');
  });

  it('trims search whitespace', () => {
    const result = listMembersQuerySchema.safeParse({ search: '  john  ' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.search).toBe('john');
  });

  it('omits search when not provided', () => {
    const result = listMembersQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.search).toBeUndefined();
  });

  it('rejects page < 1', () => {
    const result = listMembersQuerySchema.safeParse({ page: '0' });
    expect(result.success).toBe(false);
  });

  it('rejects limit < 1', () => {
    const result = listMembersQuerySchema.safeParse({ limit: '0' });
    expect(result.success).toBe(false);
  });
});

describe('collaboratorListItemSchema', () => {
  const validItem = {
    businessProfileId: '123e4567-e89b-4d3c-a456-426614174000',
    inviteId: null,
    name: 'John Doe',
    email: 'john@example.com',
    role: 'member' as const,
    status: 'active' as const,
    roleTemplateId: null,
  };

  it('accepts a valid collaborator list item', () => {
    expect(collaboratorListItemSchema.safeParse(validItem).success).toBe(true);
  });

  it('accepts null email', () => {
    expect(
      collaboratorListItemSchema.safeParse({ ...validItem, email: null })
        .success
    ).toBe(true);
  });

  it('accepts null roleTemplateId', () => {
    expect(
      collaboratorListItemSchema.safeParse({
        ...validItem,
        roleTemplateId: null,
      }).success
    ).toBe(true);
  });

  it('accepts a uuid roleTemplateId', () => {
    expect(
      collaboratorListItemSchema.safeParse({
        ...validItem,
        roleTemplateId: '123e4567-e89b-4d3c-a456-426614174001',
      }).success
    ).toBe(true);
  });

  it('accepts role=owner', () => {
    expect(
      collaboratorListItemSchema.safeParse({ ...validItem, role: 'owner' })
        .success
    ).toBe(true);
  });

  it('rejects unknown role', () => {
    expect(
      collaboratorListItemSchema.safeParse({ ...validItem, role: 'admin' })
        .success
    ).toBe(false);
  });

  it('rejects unknown status', () => {
    expect(
      collaboratorListItemSchema.safeParse({ ...validItem, status: 'removed' })
        .success
    ).toBe(false);
  });

  it('rejects missing businessProfileId', () => {
    const { businessProfileId: _id, ...without } = validItem;
    expect(collaboratorListItemSchema.safeParse(without).success).toBe(false);
  });

  it('accepts a uuid inviteId', () => {
    expect(
      collaboratorListItemSchema.safeParse({
        ...validItem,
        inviteId: '123e4567-e89b-4d3c-a456-426614174002',
      }).success
    ).toBe(true);
  });

  it('rejects a non-uuid inviteId', () => {
    expect(
      collaboratorListItemSchema.safeParse({
        ...validItem,
        inviteId: 'not-a-uuid',
      }).success
    ).toBe(false);
  });
});

describe('listMembersOutputSchema', () => {
  const validOutput = {
    count: 0,
    items: [],
    pageInfo: {
      currentPage: 1,
      perPage: 20,
      itemCount: 0,
      pageCount: 0,
      hasPreviousPage: false,
      hasNextPage: false,
    },
  };

  it('accepts a valid output with empty items', () => {
    expect(listMembersOutputSchema.safeParse(validOutput).success).toBe(true);
  });

  it('accepts non-negative count', () => {
    expect(
      listMembersOutputSchema.safeParse({ ...validOutput, count: 0 }).success
    ).toBe(true);
  });

  it('rejects missing items', () => {
    const { items: _items, ...without } = validOutput;
    expect(listMembersOutputSchema.safeParse(without).success).toBe(false);
  });

  it('accepts output with populated items', () => {
    const result = listMembersOutputSchema.safeParse({
      count: 1,
      items: [
        {
          businessProfileId: '123e4567-e89b-4d3c-a456-426614174000',
          inviteId: null,
          name: 'Jane',
          email: null,
          role: 'member',
          status: 'active',
          roleTemplateId: null,
        },
      ],
      pageInfo: {
        currentPage: 1,
        perPage: 20,
        itemCount: 1,
        pageCount: 1,
        hasPreviousPage: false,
        hasNextPage: false,
      },
    });
    expect(result.success).toBe(true);
  });
});
