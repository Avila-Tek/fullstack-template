import {
	boolean,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
} from 'drizzle-orm/pg-core';
import { encryptedText } from '../encrypted-text';

// Better Auth core user table + custom columns required by spec
export const user = pgTable(
	'user',
	{
		// --- Better Auth core ---
		id: text('id').primaryKey(),
		email: text('email').notNull().unique(),
		fullName: text('full_name').notNull(),
		emailVerified: boolean('email_verified').notNull().default(false),
		image: text('image'),
		createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date()),

		// --- Custom columns (spec §3, §4, §10) ---
		// Normalized form of email: trim(lowercase(email)) — enforces one canonical identity per address
		normalizedEmail: text('normalized_email').notNull(),
		twoFactorEnabled: boolean('two_factor_enabled').notNull().default(false),
		// S-010: platform admins can register/manage systems. Set by seed script or manual UPDATE.
		platformAdmin: boolean('platform_admin').notNull().default(false),
		// S-009: sessions created before this timestamp are forcibly invalidated (credential change guard).
		// Null = no forced invalidation for this user.
		sessionInvalidBefore: timestamp('session_invalid_before', {
			mode: 'date',
			withTimezone: true,
		}),
		// Better Auth phoneNumber plugin — populated when user registers+verifies a phone
		// via /phone-number/send-otp → /phone-number/verify during 2FA onboarding.
		phoneNumber: encryptedText('phone_number'),
		phoneNumberVerified: boolean('phone_number_verified')
			.notNull()
			.default(false),
	},
	(table) => [
		uniqueIndex('uq_user_normalized_email').on(table.normalizedEmail),
	],
);

export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;
