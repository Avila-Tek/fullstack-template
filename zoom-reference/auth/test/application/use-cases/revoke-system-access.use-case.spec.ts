import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RevokeSystemAccessCommand } from '../../../src/application/ports/in/revoke-system-access.use-case.port';
import type { BetterAuthOrgPort } from '../../../src/application/ports/out/better-auth-org.port';
import type { SystemAuditLogPort } from '../../../src/application/ports/out/system-audit-log.port';
import type { SystemMembershipRepositoryPort } from '../../../src/application/ports/out/system-membership-repository.port';
import { RevokeSystemAccessUseCase } from '../../../src/application/use-cases/revoke-system-access.use-case';
import type { SystemMembershipEntity } from '../../../src/domain/entities/system-membership.entity';
import { CannotRemoveOwnerException } from '../../../src/domain/exceptions/cannot-remove-owner.exception';
import { MemberNotFoundException } from '../../../src/domain/exceptions/member-not-found.exception';

const SYSTEM_ID = 'sys-1';
const ORG_ID = 'org-1';
const CALLER_USER_ID = 'caller-1';
const TARGET_USER_ID = 'user-target-1';
const BA_MEMBER_ID = 'ba-mem-42';

const fakeHeaders = new Headers({ cookie: 'session=abc' });

function makeMembership(
	overrides?: Partial<SystemMembershipEntity>,
): SystemMembershipEntity {
	return {
		id: 'mem-1',
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
	overrides?: Partial<RevokeSystemAccessCommand>,
): RevokeSystemAccessCommand {
	return {
		systemId: SYSTEM_ID,
		organizationId: ORG_ID,
		callerUserId: CALLER_USER_ID,
		targetUserId: TARGET_USER_ID,
		ipAddress: '10.0.0.1',
		userAgent: 'test-agent',
		headers: fakeHeaders,
		...overrides,
	};
}

describe('RevokeSystemAccessUseCase', () => {
	let useCase: RevokeSystemAccessUseCase;
	let membershipRepo: {
		findByUserAndOrg: ReturnType<typeof vi.fn>;
		softDeleteByUser: ReturnType<typeof vi.fn>;
	};
	let baOrg: {
		removeMember: ReturnType<typeof vi.fn>;
		findBaMemberByUserAndOrg: ReturnType<typeof vi.fn>;
	};
	let auditLog: { log: ReturnType<typeof vi.fn> };

	beforeEach(() => {
		membershipRepo = {
			findByUserAndOrg: vi.fn().mockResolvedValue(makeMembership()),
			softDeleteByUser: vi.fn().mockResolvedValue(makeMembership()),
		};
		baOrg = {
			removeMember: vi.fn().mockResolvedValue(undefined),
			findBaMemberByUserAndOrg: vi.fn().mockResolvedValue(BA_MEMBER_ID),
		};
		auditLog = { log: vi.fn().mockResolvedValue(undefined) };

		useCase = new RevokeSystemAccessUseCase(
			membershipRepo as unknown as SystemMembershipRepositoryPort,
			baOrg as unknown as BetterAuthOrgPort,
			auditLog as unknown as SystemAuditLogPort,
		);
	});

	it('soft-deletes membership, calls BA removeMember, audits revoked', async () => {
		const result = await useCase.execute(makeCommand());

		expect(result.success).toBe(true);
		expect(membershipRepo.softDeleteByUser).toHaveBeenCalledWith(
			TARGET_USER_ID,
			SYSTEM_ID,
		);
		expect(baOrg.findBaMemberByUserAndOrg).toHaveBeenCalledWith(
			TARGET_USER_ID,
			ORG_ID,
		);
		expect(baOrg.removeMember).toHaveBeenCalledWith({
			memberIdOrEmail: BA_MEMBER_ID,
			organizationId: ORG_ID,
			headers: fakeHeaders,
		});
		expect(auditLog.log).toHaveBeenCalledWith(
			expect.objectContaining({ eventType: 'member_access_revoked' }),
		);
	});

	it('returns MemberNotFoundException when no active membership found', async () => {
		membershipRepo.findByUserAndOrg.mockResolvedValue(null);

		const result = await useCase.execute(makeCommand());

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBeInstanceOf(MemberNotFoundException);
		}
		expect(baOrg.removeMember).not.toHaveBeenCalled();
	});

	it('returns CannotRemoveOwnerException when target is an owner', async () => {
		membershipRepo.findByUserAndOrg.mockResolvedValue(
			makeMembership({ role: 'owner' }),
		);

		const result = await useCase.execute(makeCommand());

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBeInstanceOf(CannotRemoveOwnerException);
		}
		expect(membershipRepo.softDeleteByUser).not.toHaveBeenCalled();
		expect(baOrg.removeMember).not.toHaveBeenCalled();
	});

	it('audit log contains actorUserId, targetUserId, and systemId', async () => {
		await useCase.execute(makeCommand());

		expect(auditLog.log).toHaveBeenCalledWith(
			expect.objectContaining({
				eventType: 'member_access_revoked',
				targetUserId: TARGET_USER_ID,
				systemId: SYSTEM_ID,
				details: expect.objectContaining({ actorUserId: CALLER_USER_ID }),
			}),
		);
	});
});
