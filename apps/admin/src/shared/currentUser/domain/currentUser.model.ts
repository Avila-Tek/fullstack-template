/**
 * Current User domain models for admin.
 * Re-exports types from @repo/auth — no custom session types needed
 * since Better Auth manages session state via HTTPOnly cookie.
 */

export type { Role, User } from '@repo/auth';
