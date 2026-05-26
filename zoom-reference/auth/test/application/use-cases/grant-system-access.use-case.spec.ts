import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GrantSystemAccessCommand } from '../../../src/application/ports/in/grant-system-access.use-case.port';
import type { BetterAuthOrgPort } from '../../../src/application/ports/out/better-auth-org.port';
import type {
	GrantAccessRepos,
	GrantAccessUnitOfWorkPort,
} from '../../../src/application/ports/out/grant-access-unit-of-work.port';
import type { PasswordHashServicePort } from '../../../src/application/ports/out/password-hash-service.port';
import type { SystemAuditLogPort } from '../../../src/application/ports/out/system-audit-log.port';
import type { SystemMembershipRepositoryPort } from '../../../src/application/ports/out/system-membership-repository.port';
import type { SystemRepositoryPort } from '../../../src/application/ports/out/system-repository.port';
import type { UserRepositoryPort } from '../../../src/application/ports/out/user-repository.port';
import { GrantSystemAccessUseCase } from '../../../src/application/use-cases/grant-system-access.use-case';
import { System } from '../../../src/domain/entities/system.entity';
import type { SystemMembershipEntity } from '../../../src/domain/entities/system-membership.entity';
import { User } from '../../../src/domain/entities/user.entity';
import { SystemNotFoundException } from '../../../src/domain/exceptions/system-not-found.exception';
import { Email } from '../../../src/domain/value-objects/user.value-object';

const SYSTEM_ID = 'sys-1';
const ORG_ID = 'org-1';
const CALLER_USER_ID = 'caller-1';
const TARGET_USER_ID = 'user-target-1';
const MEMBERSHIP_ID = 'mem-1';

function makeSystem(): System {
	return System.reconstitute({
		id: SYSTEM_ID,
		name: 'Test System',
		slug: 'test-system',
		apiBaseUrl: 'https://example.com',
		accessModel: 'restricted',
		organizationId: ORG_ID,
		status: 'active',
		isDeleted: false,
		deletedByUserId: null,
		deletedAt: null,
		createdAt: new Date(),
		updatedAt: new Date(),
	});
}

function makeUser(id = TARGET_USER_ID): User {
	return User.reconstitute({
		id,
		email: Email.create('user@example.com'),
		emailVerified: true,
	});
}

function makeMembership(
	overrides?: Partial<SystemMembershipEntity>,
): SystemMembershipEntity {
	return {
		id: MEMBERSHIP_ID,
		systemId: SYSTEM_ID,
		organizationId: ORG_ID,
		userId: TARGET_USER_ID,
		role: 'member',
		status: 'active',
		isDeleted: false,
		...overrides,
	};
}

function makeCommand(
	overrides?: Partial<GrantSystemAccessCommand>,
): GrantSystemAccessCommand {
	return {
		systemId: SYSTEM_ID,
		callerUserId: CALLER_USER_ID,
		email: 'user@example.com',
		ipAddress: '10.0.0.1',
		userAgent: 'test-agent',
		...overrides,
	};
}

function makeRepos(overrides?: Partial<GrantAccessRepos>): GrantAccessRepos {
	return {
		user: {
			createProvisioned: vi.fn().mockResolvedValue(makeUser('new-user-1')),
		},
		account: {
			createCredential: vi.fn().mockResolvedValue(undefined),
		},
		membership: {
			insertMembership: vi
				.fn()
				.mockResolvedValue(
					makeMembership({ userId: 'new-user-1', id: 'mem-new-1' }),
				),
		},
		...overrides,
	} as unknown as GrantAccessRepos;
}

function stubUnitOfWork(
	unitOfWork: { run: ReturnType<typeof vi.fn> },
	repos: GrantAccessRepos,
): void {
	unitOfWork.run.mockImplementation(
		async (work: (r: GrantAccessRepos) => Promise<unknown>) => work(repos),
	);
}

describe('GrantSystemAccessUseCase', () => {
	let useCase: GrantSystemAccessUseCase;
	let systemRepo: { findById: ReturnType<typeof vi.fn> };
	let userRepo: { findByNormalizedEmail: ReturnType<typeof vi.fn> };
	let membershipRepo: {
		findByUserAndOrg: ReturnType<typeof vi.fn>;
		insertMembership: ReturnType<typeof vi.fn>;
		softDeleteByUser: ReturnType<typeof vi.fn>;
	};
	let baOrg: { addMember: ReturnType<typeof vi.fn> };
	let unitOfWork: { run: ReturnType<typeof vi.fn> };
	let passwordHash: { hash: ReturnType<typeof vi.fn> };
	let auditLog: { log: ReturnType<typeof vi.fn> };

	beforeEach(() => {
		systemRepo = { findById: vi.fn().mockResolvedValue(makeSystem()) };
		userRepo = {
			findByNormalizedEmail: vi.fn().mockResolvedValue(makeUser()),
		};
		membershipRepo = {
			findByUserAndOrg: vi.fn().mockResolvedValue(null),
			insertMembership: vi.fn().mockResolvedValue(makeMembership()),
			softDeleteByUser: vi.fn().mockResolvedValue(makeMembership()),
		};
		baOrg = { addMember: vi.fn().mockResolvedValue(undefined) };
		unitOfWork = { run: vi.fn() };
		passwordHash = { hash: vi.fn().mockResolvedValue('hashed-pw') };
		auditLog = { log: vi.fn().mockResolvedValue(undefined) };

		useCase = new GrantSystemAccessUseCase(
			systemRepo as unknown as SystemRepositoryPort,
			userRepo as unknown as UserRepositoryPort,
			membershipRepo as unknown as SystemMembershipRepositoryPort,
			baOrg as unknown as BetterAuthOrgPort,
			unitOfWork as unknown as GrantAccessUnitOfWorkPort,
			passwordHash as unknown as PasswordHashServicePort,
			auditLog as unknown as SystemAuditLogPort,
		);
	});

	it('Path A — existing user, no prior membership: inserts membership, calls addMember, audits, returns existing path', async () => {
		const result = await useCase.execute(makeCommand());

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.path).toBe('existing');
			expect(result.data.alreadyMember).toBeUndefined();
			expect(result.data.userId).toBe(TARGET_USER_ID);
			expect(result.data.role).toBe('member');
			expect(result.data.profileId).toBe(MEMBERSHIP_ID);
		}
		expect(baOrg.addMember).toHaveBeenCalledWith({
			userId: TARGET_USER_ID,
			role: 'member',
			organizationId: ORG_ID,
		});
		expect(membershipRepo.insertMembership).toHaveBeenCalledWith({
			userId: TARGET_USER_ID,
			systemId: SYSTEM_ID,
			organizationId: ORG_ID,
			role: 'member',
		});
		expect(auditLog.log).toHaveBeenCalledWith(
			expect.objectContaining({
				eventType: 'member_access_granted_path_a',
				details: { actorUserId: CALLER_USER_ID, role: 'member' },
			}),
		);
	});

	it('Path A — existing user, already a member: returns alreadyMember true, audits idempotent', async () => {
		const existing = makeMembership({ role: 'admin' });
		membershipRepo.findByUserAndOrg.mockResolvedValue(existing);

		const result = await useCase.execute(makeCommand());

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.path).toBe('existing');
			expect(result.data.alreadyMember).toBe(true);
			expect(result.data.userId).toBe(TARGET_USER_ID);
			expect(result.data.role).toBe('admin');
			expect(result.data.profileId).toBe(MEMBERSHIP_ID);
		}
		expect(baOrg.addMember).not.toHaveBeenCalled();
		expect(membershipRepo.insertMembership).not.toHaveBeenCalled();
		expect(auditLog.log).toHaveBeenCalledWith(
			expect.objectContaining({
				eventType: 'member_access_idempotent',
				details: { actorUserId: CALLER_USER_ID },
			}),
		);
	});

	it('Path B — user not found: creates provisioned user, inserts membership, audits, returns provisioned path', async () => {
		userRepo.findByNormalizedEmail.mockResolvedValue(null);
		const repos = makeRepos();
		stubUnitOfWork(unitOfWork, repos);

		const result = await useCase.execute(makeCommand());

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.path).toBe('provisioned');
			expect(result.data.userId).toBe('new-user-1');
		}
		expect(repos.user.createProvisioned).toHaveBeenCalled();
		expect(repos.account.createCredential).toHaveBeenCalledWith({
			userId: 'new-user-1',
			passwordHash: 'hashed-pw',
		});
		expect(repos.membership.insertMembership).toHaveBeenCalled();
		expect(auditLog.log).toHaveBeenCalledWith(
			expect.objectContaining({
				eventType: 'member_access_granted_path_b',
				details: { actorUserId: CALLER_USER_ID, role: 'member' },
			}),
		);
		expect(baOrg.addMember).toHaveBeenCalledWith(
			expect.objectContaining({ organizationId: ORG_ID }),
		);
	});

	it('Path B — provisional password is not present in the returned data', async () => {
		userRepo.findByNormalizedEmail.mockResolvedValue(null);
		const repos = makeRepos();
		stubUnitOfWork(unitOfWork, repos);

		const result = await useCase.execute(makeCommand());

		expect(result.success).toBe(true);
		if (result.success) {
			const data = result.data as unknown as Record<string, unknown>;
			expect(data).not.toHaveProperty('password');
			expect(data).not.toHaveProperty('passwordHash');
		}
	});

	it('normalizes email to lowercase before lookup', async () => {
		await useCase.execute(makeCommand({ email: 'User@X.com' }));

		expect(userRepo.findByNormalizedEmail).toHaveBeenCalledWith('user@x.com');
	});

	it('Path B — stores email in lowercase when provisioning a new user', async () => {
		userRepo.findByNormalizedEmail.mockResolvedValue(null);
		const repos = makeRepos();
		stubUnitOfWork(unitOfWork, repos);

		await useCase.execute(makeCommand({ email: 'Alice@Example.COM' }));

		expect(repos.user.createProvisioned).toHaveBeenCalledWith(
			expect.objectContaining({ email: 'alice@example.com' }),
		);
	});

	it('returns SystemNotFoundException when system not found', async () => {
		systemRepo.findById.mockResolvedValue(null);

		const result = await useCase.execute(makeCommand());

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBeInstanceOf(SystemNotFoundException);
		}
	});

	it('defaults role to member when not provided', async () => {
		await useCase.execute(makeCommand({ role: undefined }));

		expect(membershipRepo.insertMembership).toHaveBeenCalledWith(
			expect.objectContaining({ role: 'member' }),
		);
		expect(baOrg.addMember).toHaveBeenCalledWith(
			expect.objectContaining({ role: 'member' }),
		);
	});

	it('uses provided role admin in membership and BA call', async () => {
		await useCase.execute(makeCommand({ role: 'admin' }));

		expect(membershipRepo.insertMembership).toHaveBeenCalledWith(
			expect.objectContaining({ role: 'admin' }),
		);
		expect(baOrg.addMember).toHaveBeenCalledWith(
			expect.objectContaining({ role: 'admin' }),
		);
	});

	it('second grant for same user returns alreadyMember without inserting new row', async () => {
		await useCase.execute(makeCommand());
		membershipRepo.findByUserAndOrg.mockResolvedValue(makeMembership());

		const result = await useCase.execute(makeCommand());

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.alreadyMember).toBe(true);
		}
		expect(membershipRepo.insertMembership).toHaveBeenCalledTimes(1);
	});

	it('Path A — insertMembership is called before addMember', async () => {
		const order: string[] = [];
		membershipRepo.insertMembership.mockImplementation(async () => {
			order.push('insertMembership');
			return makeMembership();
		});
		baOrg.addMember.mockImplementation(async () => {
			order.push('addMember');
		});

		await useCase.execute(makeCommand());

		expect(order).toEqual(['insertMembership', 'addMember']);
	});

	it('Path A — soft-deletes membership as compensation when addMember fails, emits failure audit', async () => {
		baOrg.addMember.mockRejectedValue(new Error('BA unavailable'));

		await expect(useCase.execute(makeCommand())).rejects.toThrow(
			'BA unavailable',
		);

		expect(membershipRepo.insertMembership).toHaveBeenCalled();
		expect(membershipRepo.softDeleteByUser).toHaveBeenCalledWith(
			TARGET_USER_ID,
			SYSTEM_ID,
		);
		expect(auditLog.log).toHaveBeenCalledWith(
			expect.objectContaining({
				eventType: 'member_access_grant_failed_path_a',
			}),
		);
		expect(auditLog.log).not.toHaveBeenCalledWith(
			expect.objectContaining({ eventType: 'member_access_granted_path_a' }),
		);
	});

	it('Path B — unit of work failure: BA addMember not called, failure audit emitted', async () => {
		userRepo.findByNormalizedEmail.mockResolvedValue(null);
		unitOfWork.run.mockRejectedValue(new Error('DB error'));

		await expect(useCase.execute(makeCommand())).rejects.toThrow('DB error');
		expect(baOrg.addMember).not.toHaveBeenCalled();
		expect(auditLog.log).toHaveBeenCalledWith(
			expect.objectContaining({
				eventType: 'member_access_grant_failed_path_b',
			}),
		);
	});

	it('Path B — BA addMember fails after transaction commits: failure audit emitted with userId, throws', async () => {
		userRepo.findByNormalizedEmail.mockResolvedValue(null);
		const repos = makeRepos();
		stubUnitOfWork(unitOfWork, repos);
		baOrg.addMember.mockRejectedValue(new Error('BA unavailable'));

		await expect(useCase.execute(makeCommand())).rejects.toThrow(
			'BA unavailable',
		);
		expect(auditLog.log).not.toHaveBeenCalledWith(
			expect.objectContaining({ eventType: 'member_access_granted_path_b' }),
		);
		expect(auditLog.log).toHaveBeenCalledWith(
			expect.objectContaining({
				eventType: 'member_access_grant_failed_path_b',
				targetUserId: 'new-user-1',
			}),
		);
	});
});
