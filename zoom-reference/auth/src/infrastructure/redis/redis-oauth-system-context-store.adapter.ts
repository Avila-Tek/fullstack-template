import { Inject, Injectable } from '@nestjs/common';
import { type IStructuredLogger, LOGGER_PORT } from '@zoom/utils';
import type Redis from 'ioredis';
import { OAuthSystemContextStorePort } from '../../application/ports/out/oauth-system-context-store.port';
import type { SystemContext } from '../../application/ports/out/system-key-service.port';
import { env } from '../../env';
import { REDIS_CLIENT } from './redis.constants';

const KEY_PREFIX = 'auth:oauth-system-ctx';

@Injectable()
export class RedisOAuthSystemContextStoreAdapter extends OAuthSystemContextStorePort {
	private readonly ttl: number;

	constructor(
		@Inject(REDIS_CLIENT) private readonly redis: Redis,
		@Inject(LOGGER_PORT) private readonly logger: IStructuredLogger,
	) {
		super();
		this.ttl = env.OAUTH_SYSTEM_CTX_TTL_SECONDS;
	}

	async set(correlationId: string, context: SystemContext): Promise<void> {
		try {
			await this.redis.set(
				this.key(correlationId),
				JSON.stringify(context),
				'EX',
				this.ttl,
			);
		} catch (err) {
			this.logger.error(
				{ err, correlationId },
				'oauth-system-ctx-store: set failed',
			);
			throw err;
		}
	}

	async get(correlationId: string): Promise<SystemContext | null> {
		try {
			const raw = await this.redis.get(this.key(correlationId));
			if (!raw) return null;
			return JSON.parse(raw) as SystemContext;
		} catch (err) {
			this.logger.error(
				{ err, correlationId },
				'oauth-system-ctx-store: get failed',
			);
			throw err;
		}
	}

	async consume(correlationId: string): Promise<SystemContext | null> {
		const k = this.key(correlationId);
		try {
			const raw = await (this.redis.getdel(k) as Promise<string | null>);
			if (!raw) return null;
			return JSON.parse(raw) as SystemContext;
		} catch (err) {
			this.logger.error(
				{ err, correlationId },
				'oauth-system-ctx-store: consume failed',
			);
			throw err;
		}
	}

	private key(correlationId: string): string {
		return `${KEY_PREFIX}:${correlationId}`;
	}
}
