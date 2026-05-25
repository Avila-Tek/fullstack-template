import { boolean, pgTable, text } from 'drizzle-orm/pg-core';
import { user } from './user.schema';

// Managed by Better Auth's twoFactor plugin — stores TOTP secret + backup codes per user.
// Rows are created on enable, deleted on disable; never modified directly.
// Extended with verified column to track completion of 2FA enrollment.
export const twoFactor = pgTable('two_factor', {
	id: text('id').primaryKey(),
	// Base32-encoded TOTP secret shown as QR code to the user
	secret: text('secret').notNull(),
	// JSON array of single-use recovery codes (Argon2id hashed by the plugin)
	backupCodes: text('backup_codes').notNull(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	// True once the user has completed the full verification step
	verified: boolean('verified').notNull().default(false),
});

export type TwoFactor = typeof twoFactor.$inferSelect;
