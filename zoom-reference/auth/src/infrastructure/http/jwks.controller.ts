import { Controller, Get, Inject, Logger } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { JwkRepositoryPort } from '../../application/ports/out/jwk-repository.port';

interface JwkPublicEntry {
	kty: string;
	use: string;
	alg: string;
	kid: string;
	// EC (ES256) public key params
	crv?: string;
	x?: string;
	y?: string;
	// RSA public key params (kept for forward compatibility)
	n?: string;
	e?: string;
}

interface JwksResponse {
	keys: JwkPublicEntry[];
}

// Public endpoint — returns the active ES256 public key in JWKS format.
// Excluded from SystemKeyMiddleware (no API key required).
@ApiTags('Auth / JWKS')
@Controller('auth/.well-known')
@AllowAnonymous()
export class JwksController {
	private readonly logger = new Logger(JwksController.name);

	constructor(
		@Inject(JwkRepositoryPort)
		private readonly jwkRepo: JwkRepositoryPort,
	) {}

	@Get('jwks.json')
	@ApiOperation({
		summary: 'JSON Web Key Set',
		description:
			'Returns the public key(s) used to verify system-scoped JWTs. ' +
			'No authentication required.',
	})
	async get(): Promise<JwksResponse> {
		const jwks = await this.jwkRepo.getAllVerificationKeys();
		const keys: JwkPublicEntry[] = [];
		for (const jwk of jwks) {
			let parsed: Record<string, unknown>;
			try {
				parsed = JSON.parse(jwk.publicJwk) as Record<string, unknown>;
			} catch {
				this.logger.warn(
					`Skipping malformed JWK (kid=${jwk.kid}): invalid JSON`,
				);
				continue;
			}
			if (typeof parsed.kty !== 'string') {
				this.logger.warn(
					`Skipping JWK kid=${jwk.kid}: missing or non-string 'kty'`,
				);
				continue;
			}
			const entry: JwkPublicEntry = {
				kty: parsed.kty,
				use: 'sig',
				alg: jwk.algorithm,
				kid: jwk.kid,
			};
			if (typeof parsed.crv === 'string') entry.crv = parsed.crv;
			if (typeof parsed.x === 'string') entry.x = parsed.x;
			if (typeof parsed.y === 'string') entry.y = parsed.y;
			if (typeof parsed.n === 'string') entry.n = parsed.n;
			if (typeof parsed.e === 'string') entry.e = parsed.e;
			keys.push(entry);
		}
		return { keys };
	}
}
