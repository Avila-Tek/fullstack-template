import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UpdateMemberRoleCommand } from '../../../src/application/ports/in/update-member-role.use-case.port';
import type { BetterAuthOrgPort } from '../../../src/application/ports/out/better-auth-org.port';
import type { SystemAuditLogPort } from '../../../src/application/ports/out/system-audit-log.port';
import type { SystemMembershipRepositoryPort } from '../../../src/application/ports/out/system-membership-repository.port';
import { UpdateMemberRoleUseCase } from '../../../src/application/use-cases/update-member-role.use-case';
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
	overrides?: Partial<UpdateMemberRoleCommand>,
): UpdateMemberRoleCommand {
	return {
		systemId: SYSTEM_ID,
		organizationId: ORG_ID,
		callerUserId: CALLER_USER_ID,
		targetUserId: TARGET_USER_ID,
		role: 'admin',
		ipAddress: '10.0.0.1',
		userAgent: 'test-agent',
		headers: fakeHeaders,
		...overrides,
	};
}

describe('UpdateMemberRoleUseCase', () => {
	let useCase: UpdateMemberRoleUseCase;
	let membershipRepo: {
		findByUserAndOrg: ReturnType<typeof vi.fn>;
		updateMemberRole: ReturnType<typeof vi.fn>;
	};
	let baOrg: {
		updateMemberRole: ReturnType<typeof vi.fn>;
		findBaMemberByUserAndOrg: ReturnType<typeof vi.fn>;
	};
	let auditLog: { log: ReturnType<typeof vi.fn> };

	beforeEach(() => {
		membershipRepo = {
			findByUserAndOrg: vi
				.fn()
				.mockResolvedValue(makeMembership({ role: 'member' })),
			updateMemberRole: vi
				.fn()
				.mockResolvedValue(makeMembership({ role: 'admin' })),
		};
		baOrg = {
			updateMemberRole: vi.fn().mockResolvedValue(undefined),
			findBaMemberByUserAndOrg: vi.fn().mockResolvedValue(BA_MEMBER_ID),
		};
		auditLog = { log: vi.fn().mockResolvedValue(undefined) };

		useCase = new UpdateMemberRoleUseCase(
			membershipRepo as unknown as SystemMembershipRepositoryPort,
			baOrg as unknown as BetterAuthOrgPort,
			auditLog as unknown as SystemAuditLogPort,
		);
	});

	it('updates role, calls BA updateMemberRole, audits with oldRole and newRole', async () => {
		const result = await useCase.execute(makeCommand());

		expect(result.success).toBe(true);
		expect(membershipRepo.updateMemberRole).toHaveBeenCalledWith(
			TARGET_USER_ID,
			SYSTEM_ID,
			'admin',
		);
		expect(baOrg.updateMemberRole).toHaveBeenCalledWith({
			memberId: BA_MEMBER_ID,
			role: 'admin',
			organizationId: ORG_ID,
			headers: fakeHeaders,
		});
		expect(auditLog.log).toHaveBeenCalledWith(
			expect.objectContaining({ eventType: 'member_role_updated' }),
		);
	});

	it('returns CannotRemoveOwnerException when target has owner role', async () => {
		membershipRepo.findByUserAndOrg.mockResolvedValue(
			makeMembership({ role: 'owner' }),
		);

		const result = await useCase.execute(makeCommand());

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBeInstanceOf(CannotRemoveOwnerException);
		}
		expect(membershipRepo.updateMemberRole).not.toHaveBeenCalled();
		expect(baOrg.updateMemberRole).not.toHaveBeenCalled();
	});

	it('returns MemberNotFoundException when no active membership found', async () => {
		membershipRepo.findByUserAndOrg.mockResolvedValue(null);

		const result = await useCase.execute(makeCommand());

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBeInstanceOf(MemberNotFoundException);
		}
		expect(membershipRepo.updateMemberRole).not.toHaveBeenCalled();
		expect(baOrg.updateMemberRole).not.toHaveBeenCalled();
	});

	it('returns MemberNotFoundException when membership deleted between check and update (TOCTOU)', async () => {
		membershipRepo.updateMemberRole.mockResolvedValue(null);

		const result = await useCase.execute(makeCommand());

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBeInstanceOf(MemberNotFoundException);
		}
		expect(baOrg.updateMemberRole).not.toHaveBeenCalled();
		expect(auditLog.log).not.toHaveBeenCalled();
	});

	it('audit log captures oldRole and newRole in details', async () => {
		await useCase.execute(makeCommand({ role: 'admin' }));

		expect(auditLog.log).toHaveBeenCalledWith(
			expect.objectContaining({
				details: expect.objectContaining({
					oldRole: 'member',
					newRole: 'admin',
				}),
			}),
		);
	});

	it('BA updateMemberRole receives correct memberId, role, organizationId', async () => {
		await useCase.execute(makeCommand({ role: 'member' }));

		expect(baOrg.updateMemberRole).toHaveBeenCalledWith({
			memberId: BA_MEMBER_ID,
			role: 'member',
			organizationId: ORG_ID,
			headers: fakeHeaders,
		});
	});

	it('BA updateMemberRole failure: reverts local role, emits failure audit, rethrows', async () => {
		baOrg.updateMemberRole.mockRejectedValue(new Error('BA unavailable'));

		await expect(
			useCase.execute(makeCommand({ role: 'admin' })),
		).rejects.toThrow('BA unavailable');

		expect(membershipRepo.updateMemberRole).toHaveBeenCalledTimes(2);
		expect(membershipRepo.updateMemberRole).toHaveBeenNthCalledWith(
			1,
			TARGET_USER_ID,
			SYSTEM_ID,
			'admin',
		);
		expect(membershipRepo.updateMemberRole).toHaveBeenNthCalledWith(
			2,
			TARGET_USER_ID,
			SYSTEM_ID,
			'member',
		);
		expect(auditLog.log).toHaveBeenCalledWith(
			expect.objectContaining({
				eventType: 'member_role_update_failed',
				details: expect.objectContaining({
					oldRole: 'member',
					newRole: 'admin',
				}),
			}),
		);
		expect(auditLog.log).not.toHaveBeenCalledWith(
			expect.objectContaining({ eventType: 'member_role_updated' }),
		);
	});
});
