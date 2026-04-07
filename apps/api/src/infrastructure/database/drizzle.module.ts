import { Global, Module } from '@nestjs/common';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

export const DRIZZLE_CLIENT = Symbol('DRIZZLE_CLIENT');

@Global()
@Module({
	providers: [
		{
			provide: DRIZZLE_CLIENT,
			useFactory: async (): Promise<NodePgDatabase> => {
				const pool = new Pool({
					connectionString:
						process.env.DATABASE_URL ??
						'postgresql://postgres:postgres@localhost:5432/poc',
				});
				return drizzle(pool);
			},
		},
	],
	exports: [DRIZZLE_CLIENT],
})
export class DrizzleModule {}
