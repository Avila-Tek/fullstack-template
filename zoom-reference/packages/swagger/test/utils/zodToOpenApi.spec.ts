import { describe, expect, it } from 'vitest';
import * as z from 'zod';
import { zodToOpenApi } from '../../src/utils/zodToOpenApi';

describe('zodToOpenApi', () => {
  describe('primitives', () => {
    it('converts z.string()', () => {
      expect(zodToOpenApi(z.string())).toEqual({ type: 'string' });
    });

    it('converts z.string().email()', () => {
      expect(zodToOpenApi(z.string().email())).toEqual({
        type: 'string',
        format: 'email',
      });
    });

    it('converts z.string().uuid()', () => {
      expect(zodToOpenApi(z.string().uuid())).toEqual({
        type: 'string',
        format: 'uuid',
      });
    });

    it('converts z.string().url()', () => {
      expect(zodToOpenApi(z.string().url())).toEqual({
        type: 'string',
        format: 'uri',
      });
    });

    it('converts z.string().datetime()', () => {
      expect(zodToOpenApi(z.string().datetime())).toEqual({
        type: 'string',
        format: 'date-time',
      });
    });

    it('converts z.number()', () => {
      expect(zodToOpenApi(z.number())).toEqual({ type: 'number' });
    });

    it('converts z.boolean()', () => {
      expect(zodToOpenApi(z.boolean())).toEqual({ type: 'boolean' });
    });
  });

  describe('enum and literal', () => {
    it('converts z.enum()', () => {
      expect(zodToOpenApi(z.enum(['a', 'b', 'c']))).toEqual({
        type: 'string',
        enum: ['a', 'b', 'c'],
      });
    });

    it('converts z.literal(string)', () => {
      expect(zodToOpenApi(z.literal('ok'))).toEqual({
        type: 'string',
        enum: ['ok'],
      });
    });

    it('converts z.literal(number)', () => {
      expect(zodToOpenApi(z.literal(42))).toEqual({
        type: 'number',
        enum: [42],
      });
    });

    it('converts z.literal(boolean)', () => {
      expect(zodToOpenApi(z.literal(true))).toEqual({
        type: 'boolean',
        enum: [true],
      });
    });
  });

  describe('wrappers', () => {
    it('unwraps z.optional()', () => {
      expect(zodToOpenApi(z.optional(z.string()))).toEqual({ type: 'string' });
    });

    it('adds nullable: true for z.nullable()', () => {
      expect(zodToOpenApi(z.nullable(z.string()))).toEqual({
        type: 'string',
        nullable: true,
      });
    });

    it('unwraps .optional() chained on a type', () => {
      expect(zodToOpenApi(z.string().optional())).toEqual({ type: 'string' });
    });

    it('unwraps .nullable() chained on a type', () => {
      expect(zodToOpenApi(z.string().nullable())).toEqual({
        type: 'string',
        nullable: true,
      });
    });
  });

  describe('object', () => {
    it('converts a simple object schema', () => {
      const schema = z.object({ id: z.string().uuid(), name: z.string() });
      const result = zodToOpenApi(schema);
      expect(result).toEqual({
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
        },
        required: ['id', 'name'],
      });
    });

    it('omits optional fields from required[]', () => {
      const schema = z.object({ id: z.string(), label: z.string().optional() });
      const result = zodToOpenApi(schema);
      expect(result.required).toEqual(['id']);
    });

    it('omits fields with defaults from required[]', () => {
      const schema = z.object({ page: z.number().default(1) });
      const result = zodToOpenApi(schema);
      expect(result.required).toBeUndefined();
    });
  });

  describe('array', () => {
    it('converts z.array()', () => {
      expect(zodToOpenApi(z.array(z.string()))).toEqual({
        type: 'array',
        items: { type: 'string' },
      });
    });
  });

  describe('union', () => {
    it('converts z.union() to oneOf', () => {
      const result = zodToOpenApi(z.union([z.string(), z.number()]));
      expect(result).toEqual({
        oneOf: [{ type: 'string' }, { type: 'number' }],
      });
    });
  });

  describe('fallback', () => {
    it('returns {} for ZodEffects and does not throw', () => {
      const schema = z.string().transform((v) => v.toUpperCase());
      expect(() => zodToOpenApi(schema)).not.toThrow();
      expect(zodToOpenApi(schema)).toEqual({});
    });
  });
});
