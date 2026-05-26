import { Inject, Injectable } from '@nestjs/common';
import { type IStructuredLogger, LOGGER_PORT } from '@zoom/utils';
import type Redis from 'ioredis';
import { z } from 'zod';
import {
	type PendingMethodPayload,
	TwoFactorPendingMethodPort,
} from '../../application/ports/out/two-factor-pending-method.port';
import { REDIS_CLIENT } from './redis.constants';

const PayloadSchema = z.object({
	method: z.enum(['email', 'sms']),
	phoneNumber: z.string().optional(),
});

@Injectable()
export class RedisTwoFactorPendingMethodAdapter extends TwoFactorPendingMethodPort {
	constructor(
		@Inject(REDIS_CLIENT) private readonly redis: Redis,
		@Inject(LOGGER_PORT) private readonly logger: IStructuredLogger,
	) {
		super();
	}

	async set(
		userId: string,
		payload: PendingMethodPayload,
		ttlSeconds: number,
	): Promise<void> {
		await this.redis.set(
			this.key(userId),
			JSON.stringify(payload),
			'EX',
			ttlSeconds,
		);
	}

	async get(userId: string): Promise<PendingMethodPayload | null> {
		const raw = await this.redis.get(this.key(userId));
		if (!raw) return null;

		try {
			const parsed = JSON.parse(raw);
			const result = PayloadSchema.safeParse(parsed);
			if (result.success) return result.data;
		} catch {
			// malformed JSON — fall through to warning
		}

		this.logger.warn(
			{ userId },
			'2fa-pending-method: validation failed for stored value',
		);
		return null;
	}

	async delete(userId: string): Promise<void> {
		await this.redis.del(this.key(userId));
	}

	private key(userId: string): string {
		return `auth:2fa-pending-method:${userId}`;
	}
}
