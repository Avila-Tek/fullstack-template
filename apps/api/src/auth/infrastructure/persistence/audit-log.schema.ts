// RULE: No PII in any column. email_hash and ip_hash store SHA-256 hashes only.
import { pgTable, uuid, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';

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
