import { Inject, Injectable } from '@nestjs/common';
import { type IStructuredLogger, LOGGER_PORT } from '@zoom/utils';
import type Redis from 'ioredis';
import { z } from 'zod';
import {
	type ChangeEmailPending,
	ChangeEmailPendingPort,
} from '../../application/ports/out/change-email-pending.port';
import { REDIS_CLIENT } from './redis.constants';

const ChangeEmailPendingSchema = z.object({
	newEmail: z.string(),
	normalizedNewEmail: z.string(),
	oldEmail: z.string(),
	createdAt: z.string(),
});

@Injectable()
export class RedisChangeEmailPendingAdapter extends ChangeEmailPendingPort {
	constructor(
		@Inject(REDIS_CLIENT) private readonly redis: Redis,
		@Inject(LOGGER_PORT) private readonly logger: IStructuredLogger,
	) {
		super();
	}

	async set(
		userId: string,
		record: ChangeEmailPending,
		ttlSeconds: number,
	): Promise<void> {
		await this.redis.set(
			this.key(userId),
			JSON.stringify(record),
			'EX',
			ttlSeconds,
		);
	}

	async get(userId: string): Promise<ChangeEmailPending | null> {
		const raw = await this.redis.get(this.key(userId));
		if (!raw) return null;
		try {
			return ChangeEmailPendingSchema.parse(JSON.parse(raw));
		} catch (error) {
			this.logger.warn(
				{
					userId,
					error: error instanceof Error ? error.message : String(error),
				},
				'change-email-pending: malformed JSON in Redis record',
			);
			return null;
		}
	}

	async delete(userId: string): Promise<void> {
		await this.redis.del(this.key(userId));
	}

	private key(userId: string): string {
		return `auth:change-email-pending:${userId}`;
	}
}
