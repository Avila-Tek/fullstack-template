-- Partial unique indexes that drizzle-kit cannot generate from schema metadata.
-- Each index is declared in the schema as a full unique index and then narrowed
-- here with a WHERE clause. Keep this migration in sync with the
-- "MANUALLY PATCHED" annotations in:
--   - apps/auth/src/infrastructure/database/schema/system-membership.schema.ts
--   - apps/auth/src/infrastructure/database/schema/user-two-factor.schema.ts

-- system_membership: at most one non-deleted (user_id, organization_id) pair.
-- Soft-deleted rows are retained without uniqueness constraints.
DROP INDEX IF EXISTS "uq_system_membership_user_org";--> statement-breakpoint
CREATE UNIQUE INDEX "uq_system_membership_user_org" ON "system_membership" USING btree ("user_id","organization_id") WHERE "system_membership"."is_deleted" = false;--> statement-breakpoint

-- user_two_factor: at most one enabled 2FA method per user.
-- Disabled rows are kept as audit history and are unrestricted.
DROP INDEX IF EXISTS "uq_user_two_factor_user_enabled";--> statement-breakpoint
CREATE UNIQUE INDEX "uq_user_two_factor_user_enabled" ON "user_two_factor" USING btree ("user_id") WHERE "user_two_factor"."enabled" = true;
