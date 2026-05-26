CREATE TYPE "public"."session_event_type" AS ENUM('session_logout', 'session_expired_inactivity', 'session_invalidated_credential_change', 'jwt_refresh_succeeded', 'jwt_refresh_failed_revoked', 'jwt_refresh_failed_expired', 'jwt_refresh_failed_system_key');--> statement-breakpoint
CREATE TYPE "public"."signup_event_type" AS ENUM('signup_attempt', 'signup_success', 'signup_failure', 'signup_duplicate_email', 'signup_captcha_challenge', 'signup_rate_limited', 'signup_tc_version_unavailable', 'signup_tc_version_mismatch', 'email_verification_attempt', 'email_verification_success', 'email_verification_failure_expired', 'email_verification_failure_invalid', 'email_verification_failure_used', 'email_verification_resend', 'email_verification_resend_rate_limited', 'social_signup_attempt', 'social_signup_success', 'social_signup_failure', 'social_signup_link', 'social_signup_email_required', 'social_signup_unverified_email_rejected', 'social_signup_email_mismatch_denied', 'oauth_state_mismatch');--> statement-breakpoint
CREATE TYPE "public"."system_member_role" AS ENUM('member', 'admin', 'owner');--> statement-breakpoint
CREATE TYPE "public"."system_membership_status" AS ENUM('active', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."terms_status" AS ENUM('draft', 'active', 'retired');--> statement-breakpoint
CREATE TYPE "public"."system_access_model" AS ENUM('open', 'restricted');--> statement-breakpoint
CREATE TYPE "public"."system_status" AS ENUM('active', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."two_factor_event_type" AS ENUM('2fa_setup_enrolled', '2fa_setup_skipped', '2fa_setup_started', '2fa_otp_send_rate_limited', '2fa_totp_replay_rejected', '2fa_enrollment_otp_sent', '2fa_enrollment_succeeded', '2fa_enrollment_failed', '2fa_challenge_succeeded', '2fa_challenge_failed', '2fa_challenge_locked', '2fa_challenge_otp_sent', '2fa_activated', '2fa_deactivated', '2fa_method_switched');--> statement-breakpoint
CREATE TYPE "public"."two_factor_methods" AS ENUM('sms', 'totp', 'email');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"provider_email" text,
	"normalized_provider_email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "device" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"device_name" text NOT NULL,
	"device_type" text DEFAULT 'unknown' NOT NULL,
	"user_agent" text NOT NULL,
	"ip_address" text NOT NULL,
	"last_login_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitation" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"email" text NOT NULL,
	"role" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"inviter_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jwks" (
	"id" text PRIMARY KEY NOT NULL,
	"public_key" text NOT NULL,
	"private_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "login_audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text NOT NULL,
	"user_agent" text NOT NULL,
	"device_name" text NOT NULL,
	"success" boolean NOT NULL,
	"failure_reason" text,
	"system_id" uuid,
	"login_method" text,
	"correlation_id" text,
	"device_id" text
);
--> statement-breakpoint
CREATE TABLE "member" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"logo" text,
	"metadata" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "password_history" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"hashed_password" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limit" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text,
	"count" integer NOT NULL,
	"last_request" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "security_audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" text NOT NULL,
	"platform_admin_user_id" text,
	"target_user_id" text,
	"system_id" uuid,
	"key_prefix" varchar(16),
	"ip_address" text,
	"user_agent" text,
	"details" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"session_id" text,
	"system_id" text,
	"event_type" "session_event_type" NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"correlation_id" text NOT NULL,
	"failure_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"active_organization_id" text,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "signup_audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"correlation_id" text NOT NULL,
	"event_type" "signup_event_type" NOT NULL,
	"ip_hash" text NOT NULL,
	"user_agent" text NOT NULL,
	"user_id" text,
	"failure_reason" text,
	"provider_id" text,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_api_key" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"system_id" uuid NOT NULL,
	"key_hash" char(64) NOT NULL,
	"key_prefix" varchar(16) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "system_api_key_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
CREATE TABLE "system_membership" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"system_id" uuid NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" "system_member_role" DEFAULT 'member' NOT NULL,
	"status" "system_membership_status" DEFAULT 'active' NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_terms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"system_id" uuid NOT NULL,
	"version" varchar(50) NOT NULL,
	"status" "terms_status" DEFAULT 'draft' NOT NULL,
	"title" varchar(200) NOT NULL,
	"content" text NOT NULL,
	"content_hash" char(64),
	"published_at" timestamp with time zone,
	"effective_at" timestamp with time zone NOT NULL,
	"retired_at" timestamp with time zone,
	"created_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"slug" varchar(120) NOT NULL,
	"api_base_url" varchar(2048) NOT NULL,
	"access_model" "system_access_model" NOT NULL,
	"organization_id" text NOT NULL,
	"status" "system_status" DEFAULT 'active' NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_by_user_id" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "two_factor_audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"correlation_id" text NOT NULL,
	"event_type" "two_factor_event_type" NOT NULL,
	"user_id" text NOT NULL,
	"method" text,
	"ip_hash" text NOT NULL,
	"user_agent" text NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "two_factor" (
	"id" text PRIMARY KEY NOT NULL,
	"secret" text NOT NULL,
	"backup_codes" text NOT NULL,
	"user_id" text NOT NULL,
	"verified" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_terms_acceptance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"system_id" uuid NOT NULL,
	"system_terms_id" uuid NOT NULL,
	"session_id" text,
	"ip_address" "inet",
	"user_agent" text,
	"accepted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_two_factor" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"method" "two_factor_methods" NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"full_name" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"normalized_email" text NOT NULL,
	"two_factor_enabled" boolean DEFAULT false NOT NULL,
	"platform_admin" boolean DEFAULT false NOT NULL,
	"session_invalid_before" timestamp with time zone,
	"phone_number" text,
	"phone_number_verified" boolean DEFAULT false NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device" ADD CONSTRAINT "device_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "login_audit_log" ADD CONSTRAINT "login_audit_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "login_audit_log" ADD CONSTRAINT "login_audit_log_device_id_device_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."device"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_history" ADD CONSTRAINT "password_history_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_audit_log" ADD CONSTRAINT "session_audit_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "two_factor" ADD CONSTRAINT "two_factor_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_two_factor" ADD CONSTRAINT "user_two_factor_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_account_provider_account_id" ON "account" USING btree ("provider_id","account_id");--> statement-breakpoint
CREATE INDEX "idx_account_normalized_provider_email" ON "account" USING btree ("normalized_provider_email");--> statement-breakpoint
CREATE UNIQUE INDEX "device_user_id_user_agent_unique" ON "device" USING btree ("user_id","user_agent");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_organization_slug" ON "organization" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "ix_system_api_key_system_id" ON "system_api_key" USING btree ("system_id");--> statement-breakpoint
CREATE INDEX "ix_system_api_key_system_revoked_at" ON "system_api_key" USING btree ("system_id","revoked_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_system_membership_user_org" ON "system_membership" USING btree ("user_id","organization_id");--> statement-breakpoint
CREATE INDEX "ix_system_membership_org" ON "system_membership" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_system_terms_system_version" ON "system_terms" USING btree ("system_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_system_terms_system_status" ON "system_terms" USING btree ("system_id","status") WHERE "system_terms"."status" = 'active';--> statement-breakpoint
CREATE INDEX "ix_system_status" ON "system" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ix_system_access_model_status" ON "system" USING btree ("access_model","status");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_system_name_active" ON "system" USING btree ("name") WHERE "system"."is_deleted" = false;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_system_slug_active" ON "system" USING btree ("slug") WHERE "system"."is_deleted" = false;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_user_terms_acceptance" ON "user_terms_acceptance" USING btree ("user_id","system_id","system_terms_id");--> statement-breakpoint
CREATE INDEX "ix_user_terms_user_system_accepted" ON "user_terms_acceptance" USING btree ("user_id","system_id","accepted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_user_two_factor_user_enabled" ON "user_two_factor" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_user_normalized_email" ON "user" USING btree ("normalized_email");