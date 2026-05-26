export interface NewBusinessAccountInviteProps {
	businessAccountId: string;
	businessProfileId: string;
	email: string;
	normalizedEmail: string;
	role: 'member';
	status: 'pending';
	tokenHash: string;
	createdByUserId: string;
}

export interface InviteWithAccount {
	id: string;
	businessAccountId: string;
	businessProfileId: string;
	email: string;
	normalizedEmail: string;
	status: 'pending' | 'accepted' | 'rejected' | 'canceled';
	businessAccountName: string;
}

export interface InviteRecord {
	id: string;
	businessAccountId: string;
	businessProfileId: string;
	email: string;
	normalizedEmail: string;
	status: 'pending' | 'accepted' | 'rejected' | 'canceled';
}

export abstract class InvitationRepositoryPort {
	/** Returns true when a pending invite exists for (account + normalizedEmail). */
	abstract hasPendingInviteForEmail(
		businessAccountId: string,
		normalizedEmail: string,
	): Promise<boolean>;

	abstract create(data: NewBusinessAccountInviteProps): Promise<{ id: string }>;

	/** Find an invite by its SHA-256 token hash, joining business account name. */
	abstract findByTokenHash(
		tokenHash: string,
	): Promise<InviteWithAccount | null>;

	/** Find an invite by ID regardless of status (returns null if not found). */
	abstract findById(id: string): Promise<InviteRecord | null>;

	/** Mark invite as accepted and record who accepted it. */
	abstract accept(id: string, userId: string, now: Date): Promise<void>;

	/** Mark invite as rejected and record who rejected it. */
	abstract reject(id: string, userId: string, now: Date): Promise<void>;

	/** Cancel invite (S-007 — owner-only). */
	abstract cancel(
		id: string,
		canceledByUserId: string,
		now: Date,
	): Promise<void>;

	/** Resend invite with a new token hash (S-007 — owner-only). */
	abstract resend(
		id: string,
		newTokenHash: string,
		resentByUserId: string,
		now: Date,
	): Promise<void>;
}
