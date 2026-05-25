import { pgTable, text, uuid, timestamp, index } from 'drizzle-orm/pg-core';
import { user } from './auth.schema.js';

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
