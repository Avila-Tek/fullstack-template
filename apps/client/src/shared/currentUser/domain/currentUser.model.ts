/**
 * Current User domain models for client.
 * Re-exports types from @repo/auth — no custom session types needed
 * since Better Auth manages session state via HTTPOnly cookie.
 */

export type { User as CurrentUser } from '@repo/auth';
