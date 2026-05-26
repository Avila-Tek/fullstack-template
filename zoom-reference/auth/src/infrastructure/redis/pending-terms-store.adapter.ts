import { Inject, Injectable } from '@nestjs/common';
import { type IStructuredLogger, LOGGER_PORT } from '@zoom/utils';
import type Redis from 'ioredis';
import {
	type PendingTermsEntry,
	PendingTermsStorePort,
} from '../../application/ports/out/pending-terms-store.port';
import { env } from '../../env';
import { REDIS_CLIENT } from './redis.constants';

@Injectable()
export class RedisPendingTermsStoreAdapter extends PendingTermsStorePort {
	private readonly ttl: number;

	constructor(
		@Inject(REDIS_CLIENT) private readonly redis: Redis,
		@Inject(LOGGER_PORT) private readonly logger: IStructuredLogger,
	) {
		super();
		// Expire in 10 minutes by default
		this.ttl = env.PENDING_TERMS_TTL_SECONDS;
	}

	async set(correlationId: string, entry: PendingTermsEntry): Promise<void> {
		try {
			await this.redis.set(
				this.key(correlationId),
				JSON.stringify(entry),
				'EX',
				this.ttl,
			);
		} catch (err) {
			this.logger.error(
				{ err, correlationId },
				'pending-terms-store: set failed',
			);
			throw err;
		}
	}

	async get(correlationId: string): Promise<PendingTermsEntry | null> {
		try {
			const raw = await this.redis.get(this.key(correlationId));
			if (!raw) return null;
			return JSON.parse(raw) as PendingTermsEntry;
		} catch (err) {
			this.logger.error(
				{ err, correlationId },
				'pending-terms-store: get failed',
			);
			throw err;
		}
	}

	async consume(correlationId: string): Promise<PendingTermsEntry | null> {
		const k = this.key(correlationId);
		try {
			const results = await this.redis.pipeline().get(k).del(k).exec();

			const raw = results?.[0]?.[1] as string | null | undefined;
			if (!raw) return null;
			return JSON.parse(raw) as PendingTermsEntry;
		} catch (err) {
			this.logger.error(
				{ err, correlationId },
				'pending-terms-store: consume failed',
			);
			throw err;
		}
	}

	private key(correlationId: string): string {
		return `pending-terms:${correlationId}`;
	}
}
