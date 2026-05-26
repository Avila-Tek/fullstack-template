import { describe, it, expect } from 'vitest';

// Import only the schema, not the parsed env (which reads process.env)
import { envSchema } from '../env.js';

describe('envSchema', () => {
  const baseValid = {
    SERVICE_NAME: 'fullstack-api',
    DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/db',
    REDIS_URL: 'redis://localhost:6379',
    BETTER_AUTH_SECRET: 'a'.repeat(32),
    BETTER_AUTH_URL: 'http://localhost:3000',
    API_BASE_URL: 'http://localhost:3000',
    CLIENT_URL: 'http://localhost:5173',
    EMAIL_FROM: 'noreply@example.com',
  };

  it('fails when DATABASE_URL is missing', () => {
    expect(() =>
      envSchema.parse({ ...baseValid, DATABASE_URL: undefined }),
    ).toThrow();
  });

  it('fails when SERVICE_NAME is missing (observability standard: required)', () => {
    expect(() =>
      envSchema.parse({ ...baseValid, SERVICE_NAME: undefined }),
    ).toThrow();
  });

  it('applies defaults when optional vars are absent', () => {
    const result = envSchema.parse(baseValid);
    expect(result.NODE_ENV).toBe('development');
    expect(result.PORT).toBe(3000);
    expect(result.ARGON2_MEMORY_COST).toBe(65536);
    expect(result.CAPTCHA_PROVIDER).toBe('cloudflare');
    expect(result.GOOGLE_ENABLED).toBe(false);
    expect(result.CAPTCHA_ENABLED).toBe(false);
    expect(result.LOG_LEVEL).toBe('info');
    expect(result.SERVICE_VERSION).toBe('0.0.0');
    expect(result.SERVICE_NAMESPACE).toBe('default');
  });

  it('rejects BETTER_AUTH_SECRET shorter than 32 chars', () => {
    expect(() =>
      envSchema.parse({ ...baseValid, BETTER_AUTH_SECRET: 'short' }),
    ).toThrow();
  });

  it('coerces numeric strings', () => {
    const result = envSchema.parse({ ...baseValid, PORT: '4000' });
    expect(result.PORT).toBe(4000);
  });
});
