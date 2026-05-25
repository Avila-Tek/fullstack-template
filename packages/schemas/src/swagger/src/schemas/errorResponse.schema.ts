import type { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';

/**
 * Standard NestJS HTTP error envelope.
 * Matches the shape returned by NestJS built-in exception filters.
 */
export const errorResponseSchema: SchemaObject = {
  type: 'object',
  properties: {
    statusCode: { type: 'number', example: 400 },
    message: {
      oneOf: [
        { type: 'string' },
        {
          type: 'object',
          description: 'Zod flattened errors (on 400 validation failure)',
          properties: {
            formErrors: { type: 'array', items: { type: 'string' } },
            fieldErrors: {
              type: 'object',
              additionalProperties: {
                type: 'array',
                items: { type: 'string' },
              },
            },
          },
        },
      ],
    },
    error: { type: 'string', example: 'Bad Request' },
  },
  required: ['statusCode', 'message'],
};
