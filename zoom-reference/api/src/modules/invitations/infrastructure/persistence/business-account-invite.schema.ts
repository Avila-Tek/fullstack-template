import { sql } from 'drizzle-orm';
import {
	char,
	index,
	pgEnum,
	pgTable,
	timestamp,
	uniqueIndex,
	uuid,
	varchar,
} from 'drizzle-orm/pg-core';
import { businessAccount } from '../../../../modules/profiles/infrastructure/persistence/business-account.schema';
import {
	businessProfile,
	businessProfileRoleEnum,
} from '../../../../modules/profiles/infrastructure/persistence/business-profile.schema';

export const inviteStatusEnum = pgEnum('invite_status', [
	'pending',
	'accepted',
	'rejected',
	'canceled',
]);

export const businessAccountInvite = pgTable(
	'business_account_invite',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		businessAccountId: uuid('business_account_id')
			.notNull()
			.references(() => businessAccount.id),
		businessProfileId: uuid('business_profile_id')
			.notNull()
			.references(() => businessProfile.id),
		email: varchar('email', { length: 320 }).notNull(),
		normalizedEmail: varchar('normalized_email', { length: 320 }).notNull(),
		role: businessProfileRoleEnum('role').notNull().default('member'),
		status: inviteStatusEnum('status').notNull().default('pending'),
		// SHA-256 hex digest of the plaintext token — plaintext is never stored
		tokenHash: char('token_hash', { length: 64 }).notNull(),
		// Cross-DB ref to auth.user.id — no FK constraint
		createdByUserId: uuid('created_by_user_id').notNull(),

		// Cross-DB ref to auth.user.id — no FK constraint
		acceptedByUserId: uuid('accepted_by_user_id'),
		acceptedAt: timestamp('accepted_at', { mode: 'date', withTimezone: true }),

		// Cross-DB ref to auth.user.id — no FK constraint
		rejectedByUserId: uuid('rejected_by_user_id'),
		rejectedAt: timestamp('rejected_at', { mode: 'date', withTimezone: true }),

		// Cross-DB ref to auth.user.id — no FK constraint
		canceledByUserId: uuid('canceled_by_user_id'),
		canceledAt: timestamp('canceled_at', { mode: 'date', withTimezone: true }),

		createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		uniqueIndex('uq_business_account_invite_token_hash').on(t.tokenHash),
		// Only one pending invite per (business_account, normalized_email)
		uniqueIndex('uq_business_account_invite_pending_email_account')
			.on(t.businessAccountId, t.normalizedEmail)
			.where(sql`${t.status} = 'pending'`),
		index('ix_business_account_invite_business_email_status').on(
			t.businessAccountId,
			t.normalizedEmail,
			t.status,
		),
		index('ix_business_account_invite_created_by_created_at').on(
			t.createdByUserId,
			t.createdAt,
		),
	],
);

export type BusinessAccountInviteRow =
	typeof businessAccountInvite.$inferSelect;
export type NewBusinessAccountInviteRow =
	typeof businessAccountInvite.$inferInsert;
