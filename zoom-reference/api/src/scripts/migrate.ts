/**
 * Migration runner — applies pending Drizzle migrations against DATABASE_URL.
 *
 * Runs at container startup before the app boots (see scripts/start.sh).
 * Uses a pg advisory lock so concurrent Cloud Run instances are safe — only
 * one will hold the lock and apply migrations.
 *
 * Required env vars: DATABASE_URL (resolved via loadEnv() if it points
 * at a GCP Secret Manager locator).
 */

import { resolve } from 'node:path';
import { runDrizzleMigrations } from '@zoom/config';
import { Pool } from 'pg';
import { env, loadEnv } from '../env';

async function main(): Promise<void> {
	await loadEnv();

	const pool = new Pool({ connectionString: env.DATABASE_URL });
	try {
		await runDrizzleMigrations({
			pool,
			migrationsFolder: resolve(__dirname, '../../drizzle'),
			label: 'api',
		});
	} finally {
		await pool.end();
	}
}

main().catch((err) => {
	console.error('❌ Api migration failed:', err);
	process.exit(1);
});
