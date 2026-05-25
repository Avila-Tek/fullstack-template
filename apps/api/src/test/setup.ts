/**
 * Global vitest setup — seeds the minimum required env vars before any module
 * import executes env.ts's top-level `envSchema.parse(process.env)`.
 *
 * Keep these values minimal and obviously fake (no real secrets).
 */

// Required fields (no defaults in envSchema)
process.env.SERVICE_NAME = 'test-service';
process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.BETTER_AUTH_SECRET = 'a'.repeat(32);
process.env.BETTER_AUTH_URL = 'http://localhost:3000';
process.env.API_BASE_URL = 'http://localhost:3000';
process.env.CLIENT_URL = 'http://localhost:5173';
process.env.EMAIL_FROM = 'noreply@test.com';
