import {
	index,
	pgEnum,
	pgTable,
	primaryKey,
	timestamp,
	uuid,
} from 'drizzle-orm/pg-core';
import { businessProfile } from '../../../profiles/infrastructure/persistence/business-profile.schema';
import { recipient } from './recipient.schema';

export const recipientStarredStatusEnum = pgEnum('recipient_starred_status', [
	'active',
	'inactive',
]);

export const recipientStarred = pgTable(
	'recipient_starred',
	{
		recipientId: uuid('recipient_id')
			.notNull()
			.references(() => recipient.id, { onDelete: 'cascade' }),
		businessProfileId: uuid('business_profile_id')
			.notNull()
			.references(() => businessProfile.id, { onDelete: 'cascade' }),
		status: recipientStarredStatusEnum('status').notNull().default('active'),
		createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date()),
	},
	(t) => [
		primaryKey({ columns: [t.recipientId, t.businessProfileId] }),
		index('ix_recipient_starred_profile_id').on(t.businessProfileId),
	],
);

export type RecipientStarredRow = typeof recipientStarred.$inferSelect;
