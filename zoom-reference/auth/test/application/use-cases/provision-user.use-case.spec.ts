import { describe, expect, it, vi } from 'vitest';
import type {
	GrantAccessRepos,
	GrantAccessUnitOfWorkPort,
} from '../../../src/application/ports/out/grant-access-unit-of-work.port';
import type { PasswordHashServicePort } from '../../../src/application/ports/out/password-hash-service.port';
import type { UserRepositoryPort } from '../../../src/application/ports/out/user-repository.port';
import { ProvisionUserUseCase } from '../../../src/application/use-cases/provision-user.use-case';
import { User } from '../../../src/domain/entities/user.entity';
import { Email } from '../../../src/domain/value-objects/user.value-object';

function makeUser(id = 'user-uuid'): User {
	return User.reconstitute({
		id,
		email: Email.create('test@example.com'),
		emailVerified: false,
	});
}

function makeUserRepo(
	existing: User | null = null,
): Pick<UserRepositoryPort, 'findByNormalizedEmail'> {
	return { findByNormalizedEmail: vi.fn().mockResolvedValue(existing) };
}

interface MockedUnitOfWork extends GrantAccessUnitOfWorkPort {
	__capturedUserRepoMock?: ReturnType<typeof vi.fn>;
}

function makeUnitOfWork(user: User): MockedUnitOfWork {
	const createProvisionedMock = vi.fn().mockResolvedValue(user);
	const unitOfWork: MockedUnitOfWork = {
		run: vi
			.fn()
			.mockImplementation(
				async (work: (repos: GrantAccessRepos) => Promise<User>) => {
					return work({
						user: { createProvisioned: createProvisionedMock },
						account: { createCredential: vi.fn().mockResolvedValue(undefined) },
						membership: { insertMembership: vi.fn() },
					});
				},
			),
		__capturedUserRepoMock: createProvisionedMock,
	};
	return unitOfWork;
}

function makePasswordHash(): Pick<PasswordHashServicePort, 'hash'> {
	return { hash: vi.fn().mockResolvedValue('hashed-password') };
}

describe('ProvisionUserUseCase', () => {
	const email = 'Test@Example.Com';

	describe('Path A — existing user', () => {
		it('returns existing userId without creating a new user', async () => {
			const existing = makeUser('existing-id');
			const userRepo = makeUserRepo(existing);
			const unitOfWork = makeUnitOfWork(existing);
			const passwordHash = makePasswordHash();

			const useCase = new ProvisionUserUseCase(
				userRepo as UserRepositoryPort,
				unitOfWork,
				passwordHash as PasswordHashServicePort,
			);

			const result = await useCase.execute(email);

			expect(result).toEqual({ userId: 'existing-id', path: 'existing' });
			expect(unitOfWork.run).not.toHaveBeenCalled();
		});

		it('normalizes the email before lookup', async () => {
			const existing = makeUser();
			const userRepo = makeUserRepo(existing);
			const unitOfWork = makeUnitOfWork(existing);
			const passwordHash = makePasswordHash();

			const useCase = new ProvisionUserUseCase(
				userRepo as UserRepositoryPort,
				unitOfWork,
				passwordHash as PasswordHashServicePort,
			);

			await useCase.execute('  TEST@EXAMPLE.COM  ');

			expect(userRepo.findByNormalizedEmail).toHaveBeenCalledWith(
				'test@example.com',
			);
		});
	});

	describe('Path C — concurrent request (TOCTOU / unique violation)', () => {
		it('returns existing userId when createProvisioned throws a PG unique-violation (23505)', async () => {
			const raceUser = makeUser('race-uuid');
			// Pre-check returns null (no user yet), but insert fails with 23505
			const userRepo = {
				findByNormalizedEmail: vi
					.fn()
					.mockResolvedValueOnce(null) // first call — pre-check
					.mockResolvedValueOnce(raceUser), // second call — re-fetch after race
			};
			const pgError = Object.assign(new Error('duplicate key'), {
				code: '23505',
			});
			const unitOfWork = {
				run: vi.fn().mockRejectedValue(pgError),
			} as unknown as GrantAccessUnitOfWorkPort;
			const passwordHash = makePasswordHash();

			const useCase = new ProvisionUserUseCase(
				userRepo as unknown as UserRepositoryPort,
				unitOfWork,
				passwordHash as PasswordHashServicePort,
			);

			const result = await useCase.execute(email);

			expect(result).toEqual({ userId: 'race-uuid', path: 'existing' });
		});

		it('rethrows when the error is not a unique violation', async () => {
			const userRepo = makeUserRepo(null);
			const networkError = new Error('connection refused');
			const unitOfWork = {
				run: vi.fn().mockRejectedValue(networkError),
			} as unknown as GrantAccessUnitOfWorkPort;
			const passwordHash = makePasswordHash();

			const useCase = new ProvisionUserUseCase(
				userRepo as UserRepositoryPort,
				unitOfWork,
				passwordHash as PasswordHashServicePort,
			);

			await expect(useCase.execute(email)).rejects.toThrow(
				'connection refused',
			);
		});
	});

	describe('Path B — new user provisioned', () => {
		it('creates user and credential in a transaction and returns new userId', async () => {
			const newUser = makeUser('new-uuid');
			const userRepo = makeUserRepo(null);
			const unitOfWork = makeUnitOfWork(newUser);
			const passwordHash = makePasswordHash();

			const useCase = new ProvisionUserUseCase(
				userRepo as UserRepositoryPort,
				unitOfWork,
				passwordHash as PasswordHashServicePort,
			);

			const result = await useCase.execute(email);

			expect(result).toEqual({ userId: 'new-uuid', path: 'provisioned' });
			expect(unitOfWork.run).toHaveBeenCalledOnce();

			// Verify createProvisioned was called with normalized email
			expect(unitOfWork.__capturedUserRepoMock).toHaveBeenCalledOnce();
			const callArgs = (
				unitOfWork.__capturedUserRepoMock as ReturnType<typeof vi.fn>
			).mock.calls[0][0];
			expect(callArgs.email).toBe('test@example.com'); // normalized from 'Test@Example.Com'
		});

		it('hashes a random password during provisioning', async () => {
			const newUser = makeUser('new-uuid');
			const userRepo = makeUserRepo(null);
			const unitOfWork = makeUnitOfWork(newUser);
			const passwordHash = makePasswordHash();

			const useCase = new ProvisionUserUseCase(
				userRepo as UserRepositoryPort,
				unitOfWork,
				passwordHash as PasswordHashServicePort,
			);

			await useCase.execute(email);

			expect(passwordHash.hash).toHaveBeenCalledOnce();
		});
	});
});
