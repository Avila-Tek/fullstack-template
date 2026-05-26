vi.mock('../../../src/infrastructure/better-auth/auth', () => ({
	auth: {
		api: {
			getSession: vi.fn(),
		},
	},
}));

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { auth } from '../../../src/infrastructure/better-auth/auth';
import { BetterAuthOrgAdapter } from '../../../src/infrastructure/better-auth/better-auth-org.adapter';

const mockGetSession = auth.api.getSession as ReturnType<typeof vi.fn>;

// Minimal stub for the Drizzle client — getSession never touches the DB
const stubDb = {} as never;

function makeAdapter(): BetterAuthOrgAdapter {
	return new BetterAuthOrgAdapter(stubDb);
}

const HEADERS = new Headers({ cookie: 'session=abc' });

describe('BetterAuthOrgAdapter.getSession', () => {
	beforeEach(() => {
		mockGetSession.mockClear();
	});

	it('returns null when auth.api.getSession returns null', async () => {
		mockGetSession.mockResolvedValue(null);
		const result = await makeAdapter().getSession(HEADERS);
		expect(result).toBeNull();
	});

	it('maps session fields and returns SessionWithUser on valid session', async () => {
		const createdAt = new Date('2025-06-01');
		mockGetSession.mockResolvedValue({
			session: {
				id: 'sess-99',
				userId: 'user-99',
				createdAt,
				activeOrganizationId: 'org-99',
				token: 'ignore',
			},
			user: {
				id: 'user-99',
				email: 'test@example.com',
				emailVerified: true,
				name: 'Test User',
			},
		});

		const result = await makeAdapter().getSession(HEADERS);

		expect(result).toEqual({
			session: {
				id: 'sess-99',
				userId: 'user-99',
				createdAt,
				activeOrganizationId: 'org-99',
			},
			user: {
				id: 'user-99',
				email: 'test@example.com',
				emailVerified: true,
			},
		});
	});

	it('maps undefined activeOrganizationId to null', async () => {
		mockGetSession.mockResolvedValue({
			session: {
				id: 's',
				userId: 'u',
				createdAt: new Date(),
				activeOrganizationId: undefined,
			},
			user: { id: 'u', email: 'e@e.com', emailVerified: false },
		});

		const result = await makeAdapter().getSession(HEADERS);
		expect(result?.session.activeOrganizationId).toBeNull();
	});

	it('passes headers directly to auth.api.getSession', async () => {
		mockGetSession.mockResolvedValue(null);
		await makeAdapter().getSession(HEADERS);
		expect(mockGetSession).toHaveBeenCalledWith({ headers: HEADERS });
	});
});
