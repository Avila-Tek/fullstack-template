import { Inject, Injectable } from '@nestjs/common';
import {
	AfterHook,
	type AuthHookContext,
	BeforeHook,
	Hook,
} from '@thallesp/nestjs-better-auth';
import { APIError } from 'better-auth';
import { GetTokenUseCasePort } from '../../application/ports/in/get-token.use-case.port';
import {
	BetterAuthOrgPort,
	type SessionWithUser,
} from '../../application/ports/out/better-auth-org.port';
import {
	type SystemContext,
	SystemKeyPort,
	type SystemKeyResolution,
} from '../../application/ports/out/system-key-service.port';
import { AccessDeniedException } from '../../domain/exceptions/access-denied.exception';
import { SessionExpiredException } from '../../domain/exceptions/session-expired.exception';
import { SessionInvalidatedException } from '../../domain/exceptions/session-invalidated.exception';
import {
	extractSystemKey,
	resolveAndValidateSystemKey,
} from '../system-key/system-key.utils';

// ---------------------------------------------------------------------------
// Type guard — avoids unchecked `as` cast on ctx.context.systemResolution
// ---------------------------------------------------------------------------

function isSystemKeyResolution(v: unknown): v is SystemKeyResolution {
	if (typeof v !== 'object' || v === null) return false;
	const r = v as Record<string, unknown>;
	return (
		typeof r.systemId === 'string' &&
		typeof r.organizationId === 'string' &&
		typeof r.accessModel === 'string' &&
		typeof r.apiBaseUrl === 'string' &&
		typeof r.status === 'string'
	);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HandleTokenAfterParams {
	sessionWithUser: SessionWithUser | null;
	systemResolution: SystemKeyResolution;
	getToken: Pick<GetTokenUseCasePort, 'execute'>;
	correlationId: string;
}

// ---------------------------------------------------------------------------
// Core handler — exported for direct unit testing (no DI container needed)
// ---------------------------------------------------------------------------

export async function handleTokenAfter(
	params: HandleTokenAfterParams,
): Promise<string> {
	const { sessionWithUser, systemResolution, getToken, correlationId } = params;

	if (!sessionWithUser) {
		throw new APIError(401, { error: 'session_required' });
	}

	const { session, user } = sessionWithUser;

	if (
		!session.activeOrganizationId ||
		session.activeOrganizationId !== systemResolution.organizationId
	) {
		throw new APIError(401, { error: 'invalid_system_key' });
	}

	const systemContext: SystemContext = {
		systemId: systemResolution.systemId,
		organizationId: systemResolution.organizationId,
		accessModel: systemResolution.accessModel,
		apiBaseUrl: systemResolution.apiBaseUrl,
	};

	try {
		const { token } = await getToken.execute({
			userId: session.userId,
			sessionId: session.id,
			sessionCreatedAt: session.createdAt,
			email: user.email,
			emailVerified: user.emailVerified,
			systemContext,
			correlationId,
		});
		return token;
	} catch (err) {
		if (err instanceof SessionExpiredException)
			throw new APIError(401, { message: err.error });
		if (err instanceof SessionInvalidatedException)
			throw new APIError(401, { message: err.error });
		if (err instanceof AccessDeniedException)
			throw new APIError(403, { message: err.error });
		throw err;
	}
}

// ---------------------------------------------------------------------------
// NestJS Hook class — registered as a provider in AppModule
// ---------------------------------------------------------------------------

@Hook()
@Injectable()
export class TokenHook {
	constructor(
		@Inject(SystemKeyPort)
		private readonly systemKeyService: SystemKeyPort,
		@Inject(GetTokenUseCasePort)
		private readonly getToken: GetTokenUseCasePort,
		@Inject(BetterAuthOrgPort)
		private readonly baOrg: BetterAuthOrgPort,
	) {}

	@BeforeHook('/token')
	async before(ctx: AuthHookContext): Promise<void> {
		const key = extractSystemKey((name) => ctx.getHeader(name) ?? undefined);

		const result = await resolveAndValidateSystemKey(
			key,
			this.systemKeyService,
		);
		if (!result.ok) throw new APIError(401, { error: result.error });

		ctx.context.systemResolution = result.resolution;
	}

	@AfterHook('/token')
	async after(ctx: AuthHookContext): Promise<void> {
		// Spec §3.2: if before threw (invalid key, suspended system), BA may still
		// call after with no systemResolution — return early with no error.
		const rawResolution = ctx.context.systemResolution;
		if (!isSystemKeyResolution(rawResolution)) return;

		if (!ctx.request) return;

		const sessionWithUser = await this.baOrg.getSession(ctx.request.headers);
		const correlationId =
			ctx.getHeader('x-correlation-id') ?? crypto.randomUUID();

		const token = await handleTokenAfter({
			sessionWithUser,
			systemResolution: rawResolution,
			getToken: this.getToken,
			correlationId,
		});

		// BA reads ctx.context.returned after all after-hooks complete.
		// In-place mutation is required by the framework — no spread alternative.
		(ctx.context.returned as Record<string, unknown>).token = token;
	}
}
