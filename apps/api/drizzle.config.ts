import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
import { defineConfig } from 'drizzle-kit';

loadEnv({ path: resolve(__dirname, '.env') });

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
