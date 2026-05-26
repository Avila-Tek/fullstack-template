vi.mock('../../../src/infrastructure/better-auth/auth', () => ({
	auth: {
		api: {
			getSession: vi.fn(),
		},
	},
}));

import type { ExecutionContext } from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SystemMembershipRepositoryPort } from '../../../src/application/ports/out/system-membership-repository.port';
import type { SystemRepositoryPort } from '../../../src/application/ports/out/system-repository.port';
import { System } from '../../../src/domain/entities/system.entity';
import type { SystemMembershipEntity } from '../../../src/domain/entities/system-membership.entity';
import { NotSystemAdminException } from '../../../src/domain/exceptions/not-system-admin.exception';
import { SystemNotFoundException } from '../../../src/domain/exceptions/system-not-found.exception';
import { auth } from '../../../src/infrastructure/better-auth/auth';
import { SystemAdminGuard } from '../../../src/infrastructure/guards/system-admin.guard';

const mockGetSession = vi.mocked(auth.api.getSession);

const SYSTEM_ID = 'sys-1';
const ORG_ID = 'org-1';
const USER_ID = 'user-1';

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

function makeMembership(
	role: 'owner' | 'admin' | 'member',
	status: SystemMembershipEntity['status'] = 'active',
): SystemMembershipEntity {
	return {
		id: 'mem-1',
		systemId: SYSTEM_ID,
		organizationId: ORG_ID,
		userId: USER_ID,
		role,
		status,
		isDeleted: false,
	};
}

function makeContext(
	params: { id: string } = { id: SYSTEM_ID },
): ExecutionContext {
	const req = {
		headers: { cookie: 'session=abc' },
		params,
	};
	return {
		switchToHttp: () => ({
			getRequest: () => req,
		}),
	} as unknown as ExecutionContext;
}

describe('SystemAdminGuard', () => {
	let guard: SystemAdminGuard;
	let systemRepo: { findById: ReturnType<typeof vi.fn> };
	let membershipRepo: { findByUserAndOrg: ReturnType<typeof vi.fn> };

	beforeEach(() => {
		mockGetSession.mockClear();
		systemRepo = { findById: vi.fn().mockResolvedValue(makeSystem()) };
		membershipRepo = {
			findByUserAndOrg: vi.fn().mockResolvedValue(makeMembership('owner')),
		};
		guard = new SystemAdminGuard(
			systemRepo as unknown as SystemRepositoryPort,
			membershipRepo as unknown as SystemMembershipRepositoryPort,
		);
	});

	it('returns true for session with owner role', async () => {
		mockGetSession.mockResolvedValue({
			user: { id: USER_ID },
			session: { id: 'sess-1', userId: USER_ID },
		} as never);

		const ctx = makeContext();
		const result = await guard.canActivate(ctx);
		const req = ctx.switchToHttp().getRequest();

		expect(result).toBe(true);
		expect(req.resolvedSystem).toEqual(
			expect.objectContaining({ id: SYSTEM_ID, organizationId: ORG_ID }),
		);
		expect(req.callerMembership).toEqual(makeMembership('owner'));
	});

	it('throws NotSystemAdminException for session with member role', async () => {
		mockGetSession.mockResolvedValue({
			user: { id: USER_ID },
			session: { id: 'sess-1', userId: USER_ID },
		} as never);
		membershipRepo.findByUserAndOrg.mockResolvedValue(makeMembership('member'));

		await expect(guard.canActivate(makeContext())).rejects.toThrow(
			NotSystemAdminException,
		);
	});

	it('returns true for session with admin role', async () => {
		mockGetSession.mockResolvedValue({
			user: { id: USER_ID },
			session: { id: 'sess-1', userId: USER_ID },
		} as never);
		membershipRepo.findByUserAndOrg.mockResolvedValue(makeMembership('admin'));

		const ctx = makeContext();
		const result = await guard.canActivate(ctx);
		const req = ctx.switchToHttp().getRequest();

		expect(result).toBe(true);
		expect(req.resolvedSystem).toEqual(
			expect.objectContaining({ id: SYSTEM_ID, organizationId: ORG_ID }),
		);
		expect(req.callerMembership).toEqual(makeMembership('admin'));
	});

	it('throws UnauthorizedException when no session', async () => {
		mockGetSession.mockResolvedValue(null);

		await expect(guard.canActivate(makeContext())).rejects.toThrow(
			UnauthorizedException,
		);
	});

	it('throws NotSystemAdminException for admin with non-active membership status', async () => {
		mockGetSession.mockResolvedValue({
			user: { id: USER_ID },
			session: { id: 'sess-1', userId: USER_ID },
		} as never);
		membershipRepo.findByUserAndOrg.mockResolvedValue(
			makeMembership('admin', 'suspended'),
		);

		await expect(guard.canActivate(makeContext())).rejects.toThrow(
			NotSystemAdminException,
		);
	});

	it('throws SystemNotFoundException when system not found', async () => {
		mockGetSession.mockResolvedValue({
			user: { id: USER_ID },
			session: { id: 'sess-1', userId: USER_ID },
		} as never);
		systemRepo.findById.mockResolvedValue(null);

		await expect(guard.canActivate(makeContext())).rejects.toThrow(
			SystemNotFoundException,
		);
	});
});
