import { index, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { user } from './user.schema';

// Spec §12 — one row per (user, device) pair; updated on repeat logins from same device
export const device = pgTable(
	'device',
	{
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		// Human-readable label derived from User-Agent, e.g. "Chrome on macOS"
		deviceName: text('device_name').notNull(),
		// Coarse category: "desktop" | "mobile" | "tablet" | "unknown"
		deviceType: text('device_type').notNull().default('unknown'),
		userAgent: text('user_agent').notNull(),
		ipAddress: text('ip_address').notNull(),
		lastLoginAt: timestamp('last_login_at', {
			mode: 'date',
			withTimezone: true,
		})
			.notNull()
			.defaultNow(),
		createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [index('idx_device_user_id').on(table.userId)],
);

export type Device = typeof device.$inferSelect;
export type NewDevice = typeof device.$inferInsert;
