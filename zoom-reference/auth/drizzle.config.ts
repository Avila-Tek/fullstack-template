import { defineConfig } from 'drizzle-kit';
import './src/env';

export default defineConfig({
	dialect: 'postgresql',
	schema: ['./src/infrastructure/database/schema/**/*.schema.ts'],
	out: './drizzle',
	migrations: {
		prefix: 'timestamp',
	},
	dbCredentials: {
		url:
			process.env.AUTH_DATABASE_URL ??
			'postgresql://postgres:postgres@localhost:5432/auth_db',
	},
});
