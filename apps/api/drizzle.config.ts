import { defineConfig } from 'drizzle-kit';
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/modules/**/infrastructure/persistence/*.schema.ts',
  out: './drizzle',
  dbCredentials: {
    url:
      process.env.DATABASE ??
      'postgresql://postgres:postgres@localhost:5432/poc',
  },
});
