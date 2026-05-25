import { Inject, Injectable } from '@nestjs/common';
import type { AuthHookContext } from '@thallesp/nestjs-better-auth';
import { BeforeHook, Hook } from '@thallesp/nestjs-better-auth';
import { APIError } from 'better-auth';
import { AuditLogServicePort } from '../../application/ports/out/audit-log-service.port';
import { CaptchaServicePort } from '../../application/ports/out/captcha-service.port';
import { OAuthSystemContextStorePort } from '../../application/ports/out/oauth-system-context-store.port';
import { PendingTermsStorePort } from '../../application/ports/out/pending-terms-store.port';
import {
	SystemKeyPort,
	type SystemKeyResolution,
} from '../../application/ports/out/system-key-service.port';
import { TermsRepositoryPort } from '../../application/ports/out/terms-repository.port';
import { env } from '../../env';
import { recordAuthEvent } from '../../shared/metrics/auth-metrics';
import { hashIp } from '../../shared/utils/hash-ip';
import { resolveClientIp } from '../../shared/utils/resolve-client-ip';
import { extractSystemKey } from '../system-key/system-key.utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SocialSignInAdditionalData {
	captchaToken?: unknown;
	captchaVersion?: unknown;
	systemTermsId?: unknown;
}

interface SocialSignInBody {
	provider?: unknown;
	additionalData?: SocialSignInAdditionalData;
}

// ---------------------------------------------------------------------------
// NestJS Hook class — registered as a provider in AppModule
// ---------------------------------------------------------------------------

@Hook()
@Injectable()
export class SocialSignInHook {
	constructor(
		@Inject(PendingTermsStorePort)
		private readonly pendingTermsStore: PendingTermsStorePort,
		@Inject(CaptchaServicePort)
		private readonly captchaService: CaptchaServicePort,
		@Inject(TermsRepositoryPort)
		private readonly termsRepository: TermsRepositoryPort,
		@Inject(SystemKeyPort)
		private readonly systemKeyService: SystemKeyPort,
		@Inject(AuditLogServicePort)
		private readonly auditLogService: AuditLogServicePort,
		@Inject(OAuthSystemContextStorePort)
		private readonly oauthSystemCtxStore: OAuthSystemContextStorePort,
	) {}

	@BeforeHook('/sign-in/social')
	async handleBefore(ctx: AuthHookContext): Promise<void> {
		if (!ctx.request) return;

		const body = ctx.body as SocialSignInBody;
		const additionalData: SocialSignInAdditionalData =
			body.additionalData ?? {};

		const captchaToken =
			typeof additionalData.captchaToken === 'string' &&
			additionalData.captchaToken.length > 0
				? additionalData.captchaToken
				: null;

		const captchaVersion =
			additionalData.captchaVersion === 'v2'
				? ('v2' as const)
				: ('v3' as const);
		const systemTermsId =
			typeof additionalData.systemTermsId === 'string'
				? additionalData.systemTermsId
				: '';
		const provider = typeof body.provider === 'string' ? body.provider : '';

		const ip = resolveClientIp(ctx);
		const userAgent = ctx.getHeader('user-agent') ?? '';
		const ipHash = hashIp(ip);

		const resolution = await this.resolveSystemContext(ctx);

		if (!env.SKIP_CAPTCHA) {
			if (!captchaToken) {
				throw new APIError(422, { error: 'captcha_token_required' });
			}
			await this.verifyCaptcha(captchaToken, captchaVersion);
		}
		await this.validateTermsVersion(systemTermsId, resolution.systemId);

		const correlationId =
			ctx.getHeader('x-correlation-id') ?? crypto.randomUUID();

		await this.pendingTermsStore.set(correlationId, {
			systemTermsId,
			systemId: resolution.systemId,
			provider: provider as 'google' | 'facebook',
			ipAddress: ip,
			userAgent,
			termsAcceptedAt: new Date().toISOString(),
		});

		// Store system context in Redis so the callback hook can retrieve it
		// after the OAuth redirect round-trip (cookies set in hooks are lost
		// because the NestJS adapter sets asResponse=false).
		await this.oauthSystemCtxStore.set(correlationId, {
			systemId: resolution.systemId,
			organizationId: resolution.organizationId,
			accessModel: resolution.accessModel,
			apiBaseUrl: resolution.apiBaseUrl,
		});

		(ctx.body as Record<string, unknown>).additionalData = { correlationId };

		this.auditLogService
			.logSocialAuthEvent({
				correlationId,
				eventType: 'social_signup_attempt',
				providerId: provider,
				ipHash,
				userAgent,
			})
			.catch(() => {});

		recordAuthEvent('social_auth_started', { provider });
	}

	private async resolveSystemContext(
		ctx: AuthHookContext,
	): Promise<SystemKeyResolution> {
		const key = extractSystemKey((name) => ctx.getHeader(name) ?? undefined);

		if (!key) {
			throw new APIError(401, { error: 'missing_system_key' });
		}

		const resolution = await this.systemKeyService.resolveSystemId(key);
		if (!resolution) {
			throw new APIError(401, { error: 'invalid_system_key' });
		}
		if (resolution.status === 'suspended') {
			throw new APIError(401, { error: 'system_inactive' });
		}

		return resolution;
	}

	private async verifyCaptcha(
		token: string,
		version: 'v2' | 'v3',
	): Promise<void> {
		const result = await this.captchaService.verify(token, version);
		if (result.success) return;

		if (result.unavailable) {
			throw new APIError(503, { error: 'captcha_api_unavailable' });
		}
		throw new APIError(422, { error: 'captcha_failed' });
	}

	private async validateTermsVersion(
		systemTermsId: string,
		systemId: string,
	): Promise<void> {
		if (!systemTermsId) {
			throw new APIError(422, { error: 'terms_version_mismatch' });
		}

		let record: { id: string } | null;
		try {
			record = await this.termsRepository.findActiveBySystemId(systemId);
		} catch {
			throw new APIError(503, { error: 'terms_version_unavailable' });
		}

		if (!record || record.id !== systemTermsId) {
			throw new APIError(422, { error: 'terms_version_mismatch' });
		}
	}
}
