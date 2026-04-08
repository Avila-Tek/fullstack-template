import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

// Managed by Better Auth's JWT plugin — stores auto-generated ECDSA P-256 key pairs.
// Rows are created/rotated by the plugin; never modified directly.
export const jwks = pgTable('jwks', {
	id: text('id').primaryKey(),
	// JWK-encoded public key (JSON string) — safe to expose via JWKS endpoint
	publicKey: text('public_key').notNull(),
	// JWK-encoded private key (JSON string) — encrypted at rest by Better Auth
	privateKey: text('private_key').notNull(),
	createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
		.notNull()
		.defaultNow(),
	expiresAt: timestamp('expires_at', { mode: 'date', withTimezone: true }),
});

export type Jwks = typeof jwks.$inferSelect;
