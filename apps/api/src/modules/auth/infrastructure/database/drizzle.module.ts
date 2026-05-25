import { Global, Module } from '@nestjs/common';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { env } from '../../env';
import * as schema from './db-schema';

export type AuthDb = NodePgDatabase<typeof schema>;
export const DRIZZLE_CLIENT = Symbol('DRIZZLE_CLIENT');

@Global()
@Module({
	providers: [
		{
			provide: DRIZZLE_CLIENT,
			useFactory: async (): Promise<AuthDb> => {
				const pool = new Pool({
					connectionString: env.AUTH_DATABASE_URL,
				});
				return drizzle(pool, { schema });
			},
		},
	],
	exports: [DRIZZLE_CLIENT],
})
export class DrizzleModule {}
