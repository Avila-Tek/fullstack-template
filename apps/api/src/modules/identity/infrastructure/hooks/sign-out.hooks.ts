import { createHash } from 'node:crypto';
import { auditLogger } from '../shared/logger/audit-logger';
import { recordAuthEvent } from '../shared/metrics/auth-metrics';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SignOutParams {
	userId: string;
	ipHash: string;
	correlationId: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function hashIp(ip: string): string {
	return createHash('sha256').update(ip).digest('hex');
}

// ---------------------------------------------------------------------------
// Core handler — exported for direct unit testing (no side-effects)
// ---------------------------------------------------------------------------

export function handleSignOutBefore(params: SignOutParams): void {
	auditLogger.info({
		level: 'security',
		event: 'auth.logout',
		userId: params.userId,
		ipHash: params.ipHash,
		correlationId: params.correlationId,
		resultStatus: 'success',
	});
	recordAuthEvent('auth.logout');
}

// ---------------------------------------------------------------------------
// Better Auth databaseHooks.session.delete.before handler
// ---------------------------------------------------------------------------

export async function signOutSessionDeleteBefore(
	session: {
		userId: string;
		ipAddress?: string | null;
		userAgent?: string | null;
	},
	context: { path?: string } | null,
): Promise<void> {
	if (context?.path !== '/sign-out') return;

	const ip = session.ipAddress ?? '';
	const ipHash = hashIp(ip);
	const correlationId = crypto.randomUUID();

	handleSignOutBefore({ userId: session.userId, ipHash, correlationId });
}
