import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: [
    './src/auth/infrastructure/persistence/auth.schema.ts',
    './src/auth/infrastructure/persistence/auth-schema-extensions.ts',
    './src/auth/infrastructure/persistence/password-history.schema.ts',
    './src/auth/infrastructure/persistence/audit-log.schema.ts',
  ],
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/fullstack',
  },
});
