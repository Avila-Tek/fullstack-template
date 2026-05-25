// This file declares all auth-related database tables for Drizzle schema awareness.
// Better-Auth tables: DO NOT add migrations manually — BA manages them via its own migration system.
// Run: npx @better-auth/cli generate  to regenerate BA tables after config changes.
import {
  pgTable,
  text,
  boolean,
  timestamp,
  integer,
  uniqueIndex,
  uuid,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';

export const user = pgTable(
  'user',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    emailVerified: boolean('email_verified').$default(() => false).notNull(),
    image: text('image'),
    normalizedEmail: text('normalized_email'),
    twoFactorEnabled: boolean('two_factor_enabled'),
    isAnonymous: boolean('is_anonymous'),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
  },
  (t) => [uniqueIndex('user_normalized_email_unique').on(t.normalizedEmail)],
);

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  activeOrganizationId: text('active_organization_id'),
  impersonatedBy: text('impersonated_by'),
});

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
});

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at'),
  updatedAt: timestamp('updated_at'),
});

export const twoFactor = pgTable('two_factor', {
  id: text('id').primaryKey(),
  secret: text('secret').notNull(),
  backupCodes: text('backup_codes').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
});

export const rateLimit = pgTable('rate_limit', {
  id: text('id').primaryKey(),
  key: text('key'),
  count: integer('count'),
  lastRequest: integer('last_request'),
});

// ---------------------------------------------------------------------------
// Custom auth tables (not managed by Better-Auth)
// ---------------------------------------------------------------------------

export const passwordHistory = pgTable(
  'password_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    hashedPassword: text('hashed_password').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('password_history_user_id_created_at_idx').on(t.userId, t.createdAt)],
);

// RULE: No PII in any column. email_hash and ip_hash store SHA-256 hashes only.
export const authAuditLog = pgTable(
  'auth_audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    event: text('event').notNull(),
    userId: text('user_id'),
    emailHash: text('email_hash'),   // SHA-256(email.toLowerCase().trim()) — never plain text
    ipHash: text('ip_hash'),         // SHA-256(ip) — never plain text
    userAgent: text('user_agent'),
    sessionId: text('session_id'),
    correlationId: text('correlation_id'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('auth_audit_log_user_id_created_at_idx').on(t.userId, t.createdAt),
    index('auth_audit_log_event_created_at_idx').on(t.event, t.createdAt),
  ],
);
