import type { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';

/**
 * Wraps an item schema inside a paginated response envelope.
 * { items: T[], total: number, page: number, limit: number }
 */
export function buildPaginatedEnvelope(itemSchema: SchemaObject): SchemaObject {
  return {
    type: 'object',
    properties: {
      items: { type: 'array', items: itemSchema },
      total: {
        type: 'number',
        description: 'Total number of matching records',
      },
      page: { type: 'number', description: 'Current page (1-based)' },
      limit: { type: 'number', description: 'Items per page' },
    },
    required: ['items', 'total', 'page', 'limit'],
  };
}
