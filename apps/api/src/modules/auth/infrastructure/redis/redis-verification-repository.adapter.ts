import { Inject, Injectable } from '@nestjs/common';
import { type IStructuredLogger, LOGGER_PORT } from '@zoom/utils';
import type Redis from 'ioredis';
import {
	type VerificationRecord,
	VerificationRepositoryPort,
} from '../../application/ports/out/verification-repository.port';
import { REDIS_CLIENT } from './redis.constants';

interface StoredVerification {
	identifier: string;
	value: string;
	expiresAt: string | number;
	createdAt: string | number;
	updatedAt: string | number;
}

@Injectable()
export class RedisVerificationRepositoryAdapter extends VerificationRepositoryPort {
	constructor(
		@Inject(REDIS_CLIENT) private readonly redis: Redis,
		@Inject(LOGGER_PORT) private readonly logger: IStructuredLogger,
	) {
		super();
	}

	async findByResetToken(rawToken: string): Promise<VerificationRecord | null> {
		try {
			const raw = await this.redis.get(this.key(rawToken));
			if (!raw) return null;
			const parsed = JSON.parse(raw) as StoredVerification;
			const expiresAt = new Date(parsed.expiresAt);
			if (Number.isNaN(expiresAt.getTime())) return null;
			const createdAt = new Date(parsed.createdAt);
			if (Number.isNaN(createdAt.getTime())) return null;
			const updatedAt = new Date(parsed.updatedAt);
			if (Number.isNaN(updatedAt.getTime())) return null;
			return {
				identifier: parsed.identifier,
				value: parsed.value,
				expiresAt,
				createdAt,
				updatedAt,
			};
		} catch (err) {
			this.logger.error(
				{ err },
				'verification-repository: findByResetToken failed',
			);
			return null;
		}
	}

	private key(rawToken: string): string {
		return `better-auth:verification:reset-password:${rawToken}`;
	}
}
