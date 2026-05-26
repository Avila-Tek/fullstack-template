import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import type Redis from 'ioredis';
import {
	type ActiveTermsRecord,
	TermsRepositoryPort,
} from '@/application/ports/out/terms-repository.port';
import { systemTerms } from '@/infrastructure/database/db-schema';
import { env } from '../../../env';
import { REDIS_CLIENT } from '../../redis/redis.constants';
import { type AuthDb, DRIZZLE_CLIENT } from '../drizzle.module';

const CACHE_PREFIX = 'terms:active:';

function getCacheTtl(): number {
	return env.TERMS_CACHE_TTL_SECONDS;
}

@Injectable()
export class DrizzleTermsRepository implements TermsRepositoryPort {
	constructor(
		@Inject(DRIZZLE_CLIENT) private readonly db: AuthDb,
		@Inject(REDIS_CLIENT) private readonly redis: Redis,
	) {}

	async findActiveBySystemId(
		systemId: string,
	): Promise<ActiveTermsRecord | null> {
		const cacheKey = `${CACHE_PREFIX}${systemId}`;

		try {
			const cached = await this.redis.get(cacheKey);
			if (cached) {
				const parsed = JSON.parse(cached) as ActiveTermsRecord;
				return {
					...parsed,
					effectiveAt: new Date(parsed.effectiveAt),
				};
			}
		} catch {
			// Redis unavailable — fall through to DB
		}

		const rows = await this.db
			.select()
			.from(systemTerms)
			.where(
				and(
					eq(systemTerms.systemId, systemId),
					eq(systemTerms.status, 'active'),
				),
			)
			.limit(1);

		const row = rows[0];
		if (!row) return null;

		const record: ActiveTermsRecord = {
			id: row.id,
			version: row.version,
			title: row.title,
			content: row.content,
			effectiveAt: row.effectiveAt,
		};

		try {
			await this.redis.set(
				cacheKey,
				JSON.stringify(record),
				'EX',
				getCacheTtl(),
			);
		} catch {
			// Redis unavailable — cache population is best-effort
		}

		return record;
	}

	async findById(
		systemTermsId: string,
	): Promise<{ id: string; version: string } | null> {
		const rows = await this.db
			.select({ id: systemTerms.id, version: systemTerms.version })
			.from(systemTerms)
			.where(eq(systemTerms.id, systemTermsId))
			.limit(1);

		const row = rows[0];
		if (!row) return null;
		return { id: row.id, version: row.version };
	}
}
