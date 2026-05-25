// Adds the unique index on normalizedEmail that Better-Auth does not create automatically.
// This prevents race conditions on concurrent sign-ups with the same email in different casing.
import { uniqueIndex } from 'drizzle-orm/pg-core';
import { user } from './auth.schema.js';

const normalizedEmailIndex = uniqueIndex(
  'user_normalized_email_unique',
// biome-ignore lint/style/noNonNullAssertion: column guaranteed to exist in schema
).on(user.normalizedEmail!);

export { normalizedEmailIndex as userNormalizedEmailIndex };
