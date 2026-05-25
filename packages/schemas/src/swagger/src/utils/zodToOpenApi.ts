import type { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import type * as z from 'zod';

// Zod v4 exposes a `type` discriminant and a `def` object on every schema.
// We use these stable properties instead of `instanceof` to avoid cross-realm issues
// and deprecation warnings from the old `_def` API.
type AnyZodSchema = z.ZodTypeAny;

interface ZodSchemaDef {
  type: string;
  innerType?: AnyZodSchema;
  defaultValue?: unknown;
  shape?: Record<string, AnyZodSchema>;
  element?: AnyZodSchema;
  options?: AnyZodSchema[] | readonly string[];
  items?: AnyZodSchema[];
}

function def(schema: AnyZodSchema): ZodSchemaDef {
  return (schema as unknown as { def: ZodSchemaDef }).def;
}

function schemaType(schema: AnyZodSchema): string {
  return (schema as unknown as { type: string }).type;
}

function stringFormat(schema: AnyZodSchema): string | null {
  return (schema as unknown as { format: string | null }).format ?? null;
}

/**
 * Converts a ZodType to an OpenAPI SchemaObject.
 * Falls back to `{}` and emits a console.warn for unsupported types (.transform, .pipe).
 */
export function zodToOpenApi(schema: AnyZodSchema): SchemaObject {
  const type = schemaType(schema);

  switch (type) {
    case 'optional':
    case 'nullable': {
      const inner = def(schema).innerType;
      if (!inner) return {};
      const innerSchema = zodToOpenApi(inner);
      return type === 'nullable'
        ? { ...innerSchema, nullable: true }
        : innerSchema;
    }

    case 'default': {
      const inner = def(schema).innerType;
      return inner ? zodToOpenApi(inner) : {};
    }

    case 'string':
      return buildStringSchema(schema);

    case 'number':
    case 'int':
      return { type: 'number' };

    case 'boolean':
      return { type: 'boolean' };

    case 'enum': {
      const values = (schema as unknown as { options?: string[] }).options;
      if (!values) return { type: 'string' };
      return { type: 'string', enum: values };
    }

    case 'literal': {
      const value = (schema as unknown as { value: unknown }).value;
      if (typeof value === 'string') return { type: 'string', enum: [value] };
      if (typeof value === 'number') return { type: 'number', enum: [value] };
      if (typeof value === 'boolean') return { type: 'boolean', enum: [value] };
      return {};
    }

    case 'object':
      return buildObjectSchema(schema);

    case 'array': {
      const element = def(schema).element;
      return { type: 'array', items: element ? zodToOpenApi(element) : {} };
    }

    case 'union': {
      const options = def(schema).options as AnyZodSchema[] | undefined;
      if (!options) return {};
      return { oneOf: options.map(zodToOpenApi) };
    }

    default:
      warnUnsupported(type);
      return {};
  }
}

function buildStringSchema(schema: AnyZodSchema): SchemaObject {
  const format = stringFormat(schema);
  const description = (schema as unknown as { description?: string })
    .description;
  const base: SchemaObject = { type: 'string' };

  if (format === 'email') return { ...base, format: 'email' };
  if (format === 'uuid' || format === 'guid')
    return { ...base, format: 'uuid' };
  if (format === 'url') return { ...base, format: 'uri' };
  if (format === 'datetime') return { ...base, format: 'date-time' };
  if (format === 'date') return { ...base, format: 'date' };
  if (description) return { ...base, description };
  return base;
}

function buildObjectSchema(schema: AnyZodSchema): SchemaObject {
  const shape = def(schema).shape ?? {};
  const properties: Record<string, SchemaObject> = {};
  const required: string[] = [];

  for (const [key, fieldSchema] of Object.entries(shape)) {
    properties[key] = zodToOpenApi(fieldSchema as AnyZodSchema);
    const fieldType = schemaType(fieldSchema as AnyZodSchema);
    if (fieldType !== 'optional' && fieldType !== 'default') {
      required.push(key);
    }
  }

  const result: SchemaObject = { type: 'object', properties };
  if (required.length > 0) result.required = required;
  const description = (schema as unknown as { description?: string })
    .description;
  if (description) result.description = description;
  return result;
}

function warnUnsupported(type: string): void {
  if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
    console.warn(
      `[zodToOpenApi] Unsupported Zod type '${type}' — falling back to {}`
    );
  }
}
