import { Global, Module } from '@nestjs/common';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { env } from '../../env';
import { DRIZZLE_CLIENT } from './drizzle.constants';

export { DRIZZLE_CLIENT };

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE_CLIENT,
      useFactory: async (): Promise<NodePgDatabase> => {
        const pool = new Pool({ connectionString: env.DATABASE_URL });
        return drizzle(pool);
      },
    },
  ],
  exports: [DRIZZLE_CLIENT],
})
export class DrizzleModule {}
