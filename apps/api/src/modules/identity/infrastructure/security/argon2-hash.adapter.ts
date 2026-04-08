import { Inject, Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { type IStructuredLogger, LOGGER_PORT } from '@/shared/domain-utils';
import type { PasswordHashServicePort } from '../../application/ports/out/password-hash-service.port';

@Injectable()
export class Argon2HashAdapter implements PasswordHashServicePort {
	private readonly memoryCost = Number(process.env.ARGON2_MEMORY_COST ?? 65536);
	private readonly timeCost = Number(process.env.ARGON2_TIME_COST ?? 3);
	private readonly parallelism = Number(process.env.ARGON2_PARALLELISM ?? 4);

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
