import type { SystemContext } from './system-key-service.port';

/**
 * Stores system context across the OAuth redirect round-trip.
 * Keyed by correlationId (embedded in OAuth state by SocialSignInHook).
 *
 * Separate from PendingTermsStorePort because pending terms only applies to
 * first-time sign-ups, while system context is needed for every social login.
 */
export abstract class OAuthSystemContextStorePort {
	abstract set(correlationId: string, context: SystemContext): Promise<void>;

	abstract get(correlationId: string): Promise<SystemContext | null>;

	/** Atomic read + delete. Returns null if already consumed or expired. */
	abstract consume(correlationId: string): Promise<SystemContext | null>;
}
