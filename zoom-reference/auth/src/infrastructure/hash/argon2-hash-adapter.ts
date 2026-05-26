import { Inject, Injectable } from '@nestjs/common';
import { type IStructuredLogger, LOGGER_PORT } from '@zoom/utils';
import * as argon2 from 'argon2';
import type { PasswordHashServicePort } from '../../application/ports/out/password-hash-service.port';
import { env } from '../../env';

@Injectable()
export class Argon2HashAdapter implements PasswordHashServicePort {
	private readonly memoryCost = env.ARGON2_MEMORY_COST;
	private readonly timeCost = env.ARGON2_TIME_COST;
	private readonly parallelism = env.ARGON2_PARALLELISM;

	constructor(
		@Inject(LOGGER_PORT)
		private readonly logger: IStructuredLogger,
	) {}

	async hash(plaintext: string): Promise<string> {
		try {
			return await argon2.hash(plaintext, {
				type: argon2.argon2id,
				memoryCost: this.memoryCost,
				timeCost: this.timeCost,
				parallelism: this.parallelism,
			});
		} catch (err) {
			const errorCode = (err as { code?: string }).code ?? 'ARGON2_ERROR';
			this.logger.warn(
				{ event: 'hash.error', operation: 'hash', errorCode },
				'Hash operation failed',
			);
			throw err;
		}
	}

	async verify(hash: string, candidate: string): Promise<boolean> {
		try {
			return await argon2.verify(hash, candidate);
		} catch (err) {
			const errorCode = (err as { code?: string }).code ?? 'ARGON2_ERROR';
			this.logger.warn(
				{ event: 'hash.error', operation: 'verify', errorCode },
				'Verify operation failed',
			);
			throw err;
		}
	}
}
