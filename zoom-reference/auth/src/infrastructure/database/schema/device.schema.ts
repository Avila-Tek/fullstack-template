import { pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
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
		// Fallback fingerprint key: truncated to 512 chars at the repository layer
		// to prevent oversized index entries from crafted headers.
		// Primary fingerprint is the zoom_device_id httpOnly cookie (device.id);
		// the UA is used only when the cookie is absent or resolves to an unknown device.
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
	(t) => [
		uniqueIndex('device_user_id_user_agent_unique').on(t.userId, t.userAgent),
	],
);

export type Device = typeof device.$inferSelect;
export type NewDevice = typeof device.$inferInsert;
