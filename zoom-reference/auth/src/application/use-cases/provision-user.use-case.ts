import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { TProvisionUserOutput } from '@zoom/schemas';
import { normalizeEmail } from '@zoom/utils';
import { SystemConflictException } from '../../domain/exceptions/system-conflict.exception';
import { ProvisionUserUseCasePort } from '../ports/in/provision-user.use-case.port';
import { GrantAccessUnitOfWorkPort } from '../ports/out/grant-access-unit-of-work.port';
import { PasswordHashServicePort } from '../ports/out/password-hash-service.port';
import { UserRepositoryPort } from '../ports/out/user-repository.port';

/** PostgreSQL unique_violation error code */
const PG_UNIQUE_VIOLATION = '23505';

function isUniqueViolation(err: unknown): boolean {
	return (
		typeof err === 'object' &&
		err !== null &&
		'code' in err &&
		(err as { code: unknown }).code === PG_UNIQUE_VIOLATION
	);
}

@Injectable()
export class ProvisionUserUseCase implements ProvisionUserUseCasePort {
	constructor(
		private readonly userRepo: UserRepositoryPort,
		private readonly unitOfWork: GrantAccessUnitOfWorkPort,
		private readonly passwordHash: PasswordHashServicePort,
	) {}

	async execute(email: string): Promise<TProvisionUserOutput> {
		const normalized = normalizeEmail(email);
		const existing = await this.userRepo.findByNormalizedEmail(normalized);

		if (existing) {
			return { userId: existing.id, path: 'existing' };
		}

		try {
			const provisioned = await this.unitOfWork.run(async (repos) => {
				const rawBytes = randomBytes(32);
				const hash = await this.passwordHash.hash(rawBytes.toString('hex'));
				rawBytes.fill(0);

				const user = await repos.user.createProvisioned({
					email: email.toLowerCase(),
					normalizedEmail: normalized,
					fullName: '',
				});

				await repos.account.createCredential({
					userId: user.id,
					passwordHash: hash,
				});

				return user;
			});

			return { userId: provisioned.id, path: 'provisioned' };
		} catch (err) {
			// Two concurrent requests for the same email can both pass the pre-check
			// above and then race inside createProvisioned. The unique index on
			// normalized_email makes only one succeed; the loser gets a 23505 error.
			// Re-fetch to return the winner's user record rather than propagating a 500.
			if (isUniqueViolation(err)) {
				const race = await this.userRepo.findByNormalizedEmail(normalized);
				if (race) {
					return { userId: race.id, path: 'existing' };
				}
				// Race condition detected: unique constraint violated, but re-fetch returned null.
				// This suggests the concurrent insert occurred but the row vanished unexpectedly.
				throw new SystemConflictException({
					details: 'Concurrent user provision race condition unresolved',
				});
			}
			throw err;
		}
	}
}
