import type { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';

/**
 * Wraps a data schema inside the AdapterResponse<T> success envelope.
 * { success: true, data: T }
 */
export function buildSuccessEnvelope(dataSchema: SchemaObject): SchemaObject {
  return {
    type: 'object',
    properties: {
      success: { type: 'boolean', enum: [true] },
      data: dataSchema,
    },
    required: ['success', 'data'],
  };
}

/**
 * AdapterResponse failure envelope.
 * { success: false, error: string }
 */
export const failureEnvelopeSchema: SchemaObject = {
  type: 'object',
  properties: {
    success: { type: 'boolean', enum: [false] },
    error: { type: 'string' },
  },
  required: ['success', 'error'],
};
