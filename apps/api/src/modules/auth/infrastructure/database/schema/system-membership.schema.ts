import {
	boolean,
	index,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from 'drizzle-orm/pg-core';

export const systemMemberRoleEnum = pgEnum('system_member_role', [
	'member',
	'admin',
	'owner',
]);
export const systemMembershipStatusEnum = pgEnum('system_membership_status', [
	'active',
	'suspended',
]);

// Platform-level membership mapping: one row per (user, system/organization) pair.
// Tracks role and status within a system for access-model enforcement.
// Soft-deleted rows are retained; the partial unique index enforces one active
// membership per (user_id, organization_id).
//
// NOTE: The UNIQUE index below is generated as a full unique index by Drizzle.
// After `npm run db:generate`, the migration SQL is manually patched to add
// WHERE is_deleted = false (partial unique index). See migration comment.
export const systemMembership = pgTable(
	'system_membership',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		// FK → system.id — no Drizzle FK constraint (consistent with project pattern)
		systemId: uuid('system_id').notNull(),
		// Better Auth organization ID (text PK — not a UUID)
		organizationId: text('organization_id').notNull(),
		// Better Auth user ID (text PK — not a UUID)
		userId: text('user_id').notNull(),
		role: systemMemberRoleEnum('role').notNull().default('member'),
		status: systemMembershipStatusEnum('status').notNull().default('active'),
		isDeleted: boolean('is_deleted').notNull().default(false),
		createdAt: timestamp('created_at', { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date()),
	},
	(t) => [
		// MANUALLY PATCHED in migration SQL: full unique → partial unique WHERE is_deleted = false
		// Drizzle generates a standard UNIQUE index; the migration is edited post-generation
		// to enforce uniqueness only for non-deleted rows (same pattern as S-010 / system table).
		uniqueIndex('uq_system_membership_user_org').on(t.userId, t.organizationId),
		index('ix_system_membership_org').on(t.organizationId),
	],
);

export type SystemMembership = typeof systemMembership.$inferSelect;
export type NewSystemMembership = typeof systemMembership.$inferInsert;
