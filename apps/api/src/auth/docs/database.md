# Auth Module — Database

All tables are defined in `src/auth/infrastructure/persistence/auth.schema.ts` using Drizzle ORM.

## Tables

### Better Auth-managed tables

These tables are generated and maintained by the Better Auth CLI. Do not write manual migrations for them. After any change to the Better Auth config, regenerate them with:

```sh
npx @better-auth/cli generate
```

---

#### `user`

Stores registered users. Better Auth creates and updates this table.

| Column | Type | Nullable | Description |
|---|---|---|---|
| `id` | `text` PK | No | BA-generated user ID |
| `name` | `text` | No | Display name |
| `email` | `text` UNIQUE | No | Raw email address |
| `email_verified` | `boolean` | No | Whether the email has been verified (default `false`) |
| `image` | `text` | Yes | Avatar URL |
| `normalized_email` | `text` | Yes | `email.toLowerCase().trim()` — set by `databaseHooks.user.create.before` |
| `two_factor_enabled` | `boolean` | Yes | 2FA enabled flag |
| `is_anonymous` | `boolean` | Yes | Anonymous user flag |
| `created_at` | `timestamp` | No | — |
| `updated_at` | `timestamp` | No | — |

**Indexes:** `user_normalized_email_unique` — unique index on `normalized_email`.

---

#### `session`

Stores active sessions. Better Auth creates and deletes these rows. Custom logic in `databaseHooks.session.create.before` enforces single-session-per-user.

| Column | Type | Nullable | Description |
|---|---|---|---|
| `id` | `text` PK | No | BA-generated session ID |
| `expires_at` | `timestamp` | No | Absolute expiry; set by `session.expiresIn` (7 days) |
| `token` | `text` UNIQUE | No | Opaque session token used in the cookie |
| `created_at` | `timestamp` | No | — |
| `updated_at` | `timestamp` | No | — |
| `ip_address` | `text` | Yes | Client IP at session creation |
| `user_agent` | `text` | Yes | Client user-agent at session creation |
| `user_id` | `text` FK → `user.id` CASCADE | No | Owner of the session |
| `active_organization_id` | `text` | Yes | Reserved for multi-tenancy (unused) |
| `impersonated_by` | `text` | Yes | Reserved for impersonation (unused) |

**Indexes:** none beyond the unique constraint on `token`.

---

#### `account`

Stores per-provider credentials (password hash for email/password, OAuth tokens for social providers).

| Column | Type | Nullable | Description |
|---|---|---|---|
| `id` | `text` PK | No | BA-generated account ID |
| `account_id` | `text` | No | Provider-specific account identifier |
| `provider_id` | `text` | No | Provider name, e.g. `credential`, `google` |
| `user_id` | `text` FK → `user.id` CASCADE | No | Owning user |
| `access_token` | `text` | Yes | OAuth access token |
| `refresh_token` | `text` | Yes | OAuth refresh token |
| `id_token` | `text` | Yes | OAuth ID token |
| `access_token_expires_at` | `timestamp` | Yes | OAuth access token expiry |
| `refresh_token_expires_at` | `timestamp` | Yes | OAuth refresh token expiry |
| `scope` | `text` | Yes | OAuth scopes granted |
| `password` | `text` | Yes | Argon2id hash for email/password accounts |
| `created_at` | `timestamp` | No | — |
| `updated_at` | `timestamp` | No | — |

---

#### `verification`

Stores pending verification tokens (email verification, password reset).

| Column | Type | Nullable | Description |
|---|---|---|---|
| `id` | `text` PK | No | BA-generated verification ID |
| `identifier` | `text` | No | Target identifier (usually the email address) |
| `value` | `text` | No | Opaque token value |
| `expires_at` | `timestamp` | No | Token expiry |
| `created_at` | `timestamp` | Yes | — |
| `updated_at` | `timestamp` | Yes | — |

---

#### `two_factor`

Reserved for 2FA. Better Auth manages this table; the 2FA flow is not yet enabled in the module config.

| Column | Type | Nullable | Description |
|---|---|---|---|
| `id` | `text` PK | No | — |
| `secret` | `text` | No | TOTP secret |
| `backup_codes` | `text` | No | Serialised backup codes |
| `user_id` | `text` FK → `user.id` CASCADE | No | Owning user |

---

#### `rate_limit`

Used by Better Auth's built-in rate limiter when `rateLimit.storage` is not `secondary-storage`. Not used in this config (Redis is used instead) but declared in the schema for completeness.

| Column | Type | Nullable | Description |
|---|---|---|---|
| `id` | `text` PK | No | — |
| `key` | `text` | Yes | Rate limit key |
| `count` | `integer` | Yes | Request count |
| `last_request` | `integer` | Yes | Unix timestamp of last request |

---

### Drizzle-managed tables (custom)

These tables are **not** touched by the Better Auth CLI. They are managed via standard Drizzle migrations.

---

#### `password_history`

Stores the last `PASSWORD_HISTORY_DEPTH` Argon2id hashes for each user. Used by `CheckPasswordHistoryUseCase` to prevent password reuse.

| Column | Type | Nullable | Description |
|---|---|---|---|
| `id` | `uuid` PK DEFAULT `gen_random_uuid()` | No | — |
| `user_id` | `text` FK → `user.id` CASCADE | No | Owning user |
| `hashed_password` | `text` | No | Argon2id hash |
| `created_at` | `timestamp with time zone` DEFAULT `now()` | No | — |

**Indexes:** `password_history_user_id_created_at_idx` — composite index on `(user_id, created_at)` for efficient `findLastN` queries.

---

#### `auth_audit_log`

Append-only log of all auth events. No PII — email and IP are stored as SHA-256 hashes only.

| Column | Type | Nullable | Description |
|---|---|---|---|
| `id` | `uuid` PK DEFAULT `gen_random_uuid()` | No | — |
| `event` | `text` | No | Event type, e.g. `auth.signed_in` |
| `user_id` | `text` | Yes | User ID from the auth context |
| `email_hash` | `text` | Yes | `SHA-256(email.toLowerCase().trim())` |
| `ip_hash` | `text` | Yes | `SHA-256(ip)` |
| `user_agent` | `text` | Yes | Raw user-agent string |
| `session_id` | `text` | Yes | Session ID from the auth context |
| `correlation_id` | `text` | Yes | Value of the `x-correlation-id` request header |
| `metadata` | `jsonb` | Yes | Free-form extra context |
| `created_at` | `timestamp with time zone` DEFAULT `now()` | No | — |

**Indexes:**
- `auth_audit_log_user_id_created_at_idx` — on `(user_id, created_at)` for per-user timeline queries.
- `auth_audit_log_event_created_at_idx` — on `(event, created_at)` for event-type queries.

## Migration commands

```sh
# Generate a new migration after schema changes (custom tables only)
npm -C apps/api run db:generate

# Apply all pending migrations
npm -C apps/api run db:migrate

# Regenerate Better Auth tables after changing the BA config
npx @better-auth/cli generate
```

## Ownership summary

| Table | Managed by | Migration tool |
|---|---|---|
| `user` | Better Auth | `@better-auth/cli generate` |
| `session` | Better Auth | `@better-auth/cli generate` |
| `account` | Better Auth | `@better-auth/cli generate` |
| `verification` | Better Auth | `@better-auth/cli generate` |
| `two_factor` | Better Auth | `@better-auth/cli generate` |
| `rate_limit` | Better Auth | `@better-auth/cli generate` |
| `password_history` | Custom (Drizzle) | `db:generate` / `db:migrate` |
| `auth_audit_log` | Custom (Drizzle) | `db:generate` / `db:migrate` |
