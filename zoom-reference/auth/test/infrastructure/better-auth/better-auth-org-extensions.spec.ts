// Module-level mock — must be hoisted above all imports
vi.mock('../../../src/infrastructure/better-auth/auth', () => ({
	auth: {
		api: {
			getSession: vi.fn(),
			addMember: vi.fn(),
			removeMember: vi.fn(),
			updateMemberRole: vi.fn(),
		},
	},
}));

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { auth } from '../../../src/infrastructure/better-auth/auth';
import { BetterAuthOrgAdapter } from '../../../src/infrastructure/better-auth/better-auth-org.adapter';

const mockAddMember = vi.mocked(auth.api.addMember);
const mockRemoveMember = vi.mocked(auth.api.removeMember);
const mockUpdateMemberRole = vi.mocked(auth.api.updateMemberRole);

const fakeHeaders = new Headers({ cookie: 'session=abc' });

function makeSelectDb(rows: unknown[] = []) {
	const limitMock = vi.fn().mockResolvedValue(rows);
	const whereMock = vi.fn().mockReturnValue({ limit: limitMock });
	const fromMock = vi.fn().mockReturnValue({ where: whereMock });
	const selectMock = vi.fn().mockReturnValue({ from: fromMock });
	return { select: selectMock } as never;
}

function makeAdapter(db: Record<string, unknown> = makeSelectDb() as never) {
	return new BetterAuthOrgAdapter(db as never);
}

beforeEach(() => {
	mockAddMember?.mockClear();
	mockRemoveMember?.mockClear();
	mockUpdateMemberRole?.mockClear();
});

describe('BetterAuthOrgAdapter.addMember', () => {
	it('calls auth.api.addMember with correct body', async () => {
		mockAddMember.mockResolvedValue(undefined as never);
		await makeAdapter().addMember({
			userId: 'u-1',
			role: 'member',
			organizationId: 'org-1',
		});
		expect(mockAddMember).toHaveBeenCalledWith({
			body: { userId: 'u-1', role: 'member', organizationId: 'org-1' },
		});
	});

	it('resolves without error on success', async () => {
		mockAddMember.mockResolvedValue(undefined as never);
		await expect(
			makeAdapter().addMember({
				userId: 'u-1',
				role: 'admin',
				organizationId: 'org-1',
			}),
		).resolves.toBeUndefined();
	});
});

describe('BetterAuthOrgAdapter.removeMember', () => {
	it('calls auth.api.removeMember with correct body and headers', async () => {
		mockRemoveMember.mockResolvedValue(undefined as never);
		await makeAdapter().removeMember({
			memberIdOrEmail: 'mem-1',
			organizationId: 'org-1',
			headers: fakeHeaders,
		});
		expect(mockRemoveMember).toHaveBeenCalledWith({
			body: { memberIdOrEmail: 'mem-1', organizationId: 'org-1' },
			headers: fakeHeaders,
		});
	});

	it('resolves without error on success', async () => {
		mockRemoveMember.mockResolvedValue(undefined as never);
		await expect(
			makeAdapter().removeMember({
				memberIdOrEmail: 'mem-1',
				organizationId: 'org-1',
				headers: fakeHeaders,
			}),
		).resolves.toBeUndefined();
	});
});

describe('BetterAuthOrgAdapter.updateMemberRole', () => {
	it('calls auth.api.updateMemberRole with correct body and headers', async () => {
		mockUpdateMemberRole.mockResolvedValue(undefined as never);
		await makeAdapter().updateMemberRole({
			memberId: 'mem-1',
			role: 'admin',
			organizationId: 'org-1',
			headers: fakeHeaders,
		});
		expect(mockUpdateMemberRole).toHaveBeenCalledWith({
			body: { memberId: 'mem-1', role: 'admin', organizationId: 'org-1' },
			headers: fakeHeaders,
		});
	});

	it('resolves without error on success', async () => {
		mockUpdateMemberRole.mockResolvedValue(undefined as never);
		await expect(
			makeAdapter().updateMemberRole({
				memberId: 'mem-1',
				role: 'admin',
				organizationId: 'org-1',
				headers: fakeHeaders,
			}),
		).resolves.toBeUndefined();
	});
});

describe('BetterAuthOrgAdapter.findBaMemberByUserAndOrg', () => {
	it('returns null when no member row found', async () => {
		const db = makeSelectDb([]);
		const result = await makeAdapter(db as never).findBaMemberByUserAndOrg(
			'u-1',
			'org-1',
		);
		expect(result).toBeNull();
	});

	it('returns the member id when found', async () => {
		const db = makeSelectDb([{ id: 'ba-mem-42' }]);
		const result = await makeAdapter(db as never).findBaMemberByUserAndOrg(
			'u-1',
			'org-1',
		);
		expect(result).toBe('ba-mem-42');
	});
});
