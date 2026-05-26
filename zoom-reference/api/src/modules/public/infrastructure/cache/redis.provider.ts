import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { redisTlsOptions } from '@zoom/config';
import { Redis } from 'ioredis';
import { env } from '../../../../env';

export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

@Injectable()
export class RedisClientProvider implements OnModuleDestroy {
	readonly client: Redis;

	constructor() {
		this.client = new Redis(env.REDIS_URL, redisTlsOptions(env.REDIS_CA_CERT));
	}

	onModuleDestroy(): void {
		this.client.disconnect();
	}
}
