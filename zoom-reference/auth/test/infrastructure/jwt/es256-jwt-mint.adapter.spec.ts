import { symmetricEncrypt } from 'better-auth/crypto';
import {
	decodeJwt,
	decodeProtectedHeader,
	exportJWK,
	generateKeyPair,
	importJWK,
	jwtVerify,
} from 'jose';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { SystemJwtPayload } from '../../../src/application/ports/out/jwt-mint-service.port';
import type { JwkEntity } from '../../../src/domain/entities/jwk.entity';
import { Es256JwtMintAdapter } from '../../../src/infrastructure/jwt/es256-jwt-mint.adapter';

const { BETTER_AUTH_SECRET } = vi.hoisted(() => ({
	BETTER_AUTH_SECRET: 'test-secret',
}));

vi.mock('../../../src/env', () => ({
	env: {
		AUTH_BASE_URL: 'http://localhost:3001',
		BETTER_AUTH_SECRET,
	},
}));

let jwkEntity: JwkEntity;

beforeAll(async () => {
	const { publicKey, privateKey } = await generateKeyPair('ES256', {
		extractable: true,
	});
	// Mirror Better Auth's at-rest format: JSON.stringify(symmetricEncrypt(jwkJson)).
	// The adapter must decrypt before importing — see es256-jwt-mint.adapter.ts.
	const encryptedPrivateJwk = JSON.stringify(
		await symmetricEncrypt({
			key: BETTER_AUTH_SECRET,
			data: JSON.stringify(await exportJWK(privateKey)),
		}),
	);
	jwkEntity = {
		id: 'test-id',
		kid: 'test-kid-001',
		publicJwk: JSON.stringify(await exportJWK(publicKey)),
		privateJwk: encryptedPrivateJwk,
		algorithm: 'ES256',
	};
});

const PAYLOAD: SystemJwtPayload = {
	sub: 'user-123',
	email: 'user@example.com',
	emailVerified: true,
	sid: 'session-456',
	orgId: 'org-789',
	role: 'member',
	aud: 'https://api.example.com',
};

describe('Es256JwtMintAdapter', () => {
	describe('mint', () => {
		it('returns a compact JWT string', async () => {
			const adapter = new Es256JwtMintAdapter();
			const token = await adapter.mint(PAYLOAD, jwkEntity);
			// JWT compact format: three dot-separated base64url segments
			expect(token.split('.')).toHaveLength(3);
		});

		it('sets alg=ES256 and kid in the protected header', async () => {
			const adapter = new Es256JwtMintAdapter();
			const token = await adapter.mint(PAYLOAD, jwkEntity);
			const header = decodeProtectedHeader(token);

			expect(header.alg).toBe('ES256');
			expect(header.kid).toBe('test-kid-001');
		});

		it('includes all required claims in the payload', async () => {
			const adapter = new Es256JwtMintAdapter();
			const token = await adapter.mint(PAYLOAD, jwkEntity);
			const claims = decodeJwt(token);

			expect(claims.sub).toBe('user-123');
			expect(claims.email).toBe('user@example.com');
			expect(claims.email_verified).toBe(true);
			expect(claims.sid).toBe('session-456');
			expect(claims.org_id).toBe('org-789');
			expect(claims.role).toBe('member');
			expect(claims.aud).toBe('https://api.example.com');
			expect(typeof claims.iat).toBe('number');
			expect(typeof claims.exp).toBe('number');
			expect(typeof claims.iss).toBe('string');
		});

		it('sets exp ~15 minutes after iat', async () => {
			const adapter = new Es256JwtMintAdapter();
			const token = await adapter.mint(PAYLOAD, jwkEntity);
			const { iat, exp } = decodeJwt(token);

			const diffSeconds = (exp as number) - (iat as number);
			// Allow ±5 s tolerance around 15 min (900 s)
			expect(diffSeconds).toBeGreaterThanOrEqual(895);
			expect(diffSeconds).toBeLessThanOrEqual(905);
		});

		it('signature is verifiable with the corresponding public key', async () => {
			const adapter = new Es256JwtMintAdapter();
			const token = await adapter.mint(PAYLOAD, jwkEntity);

			const publicKey = await importJWK(
				JSON.parse(jwkEntity.publicJwk),
				'ES256',
			);
			await expect(
				jwtVerify(token, publicKey, { audience: PAYLOAD.aud }),
			).resolves.toBeDefined();
		});
	});
});
