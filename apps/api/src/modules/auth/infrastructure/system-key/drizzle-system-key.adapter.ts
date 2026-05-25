import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { ApiKeyHashPort } from '../../application/ports/out/api-key-hash.port';
import {
	SystemKeyPort,
	type SystemKeyResolution,
} from '../../application/ports/out/system-key-service.port';
import * as schema from '../database/db-schema';
import { type AuthDb, DRIZZLE_CLIENT } from '../database/drizzle.module';

@Injectable()
export class DrizzleSystemKeyAdapter implements SystemKeyPort {
	constructor(
		@Inject(DRIZZLE_CLIENT) private readonly db: AuthDb,
		@Inject(ApiKeyHashPort) private readonly apiKeyHash: ApiKeyHashPort,
	) {}

	async resolveSystemId(key: string): Promise<SystemKeyResolution | null> {
		const hash = this.apiKeyHash.hash(key);

		const [row] = await this.db
			.select({
				systemId: schema.system.id,
				organizationId: schema.system.organizationId,
				accessModel: schema.system.accessModel,
				apiBaseUrl: schema.system.apiBaseUrl,
				status: schema.system.status,
			})
			.from(schema.systemApiKey)
			.innerJoin(
				schema.system,
				eq(schema.systemApiKey.systemId, schema.system.id),
			)
			.where(
				and(
					eq(schema.systemApiKey.keyHash, hash),
					isNull(schema.systemApiKey.revokedAt),
				),
			)
			.limit(1);

		return row ?? null;
	}
}
