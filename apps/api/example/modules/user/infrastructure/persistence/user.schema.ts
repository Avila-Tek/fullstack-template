import {
  boolean,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

export const userStatusEnum = pgEnum('user_status', ['active', 'inactive']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name'), // Required by Better Auth internally
  firstName: text('first_name'),
  lastName: text('last_name'),
  image: text('image'),
  emailVerified: boolean('email_verified').notNull().default(false),
  status: userStatusEnum('status').notNull().default('active'),
  // roleId: uuid('role_id').references(() => roles.id),
  deleted: boolean('deleted').notNull().default(false),
  deletedAt: timestamp('deleted_at', { mode: 'date', withTimezone: true }),
  createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
