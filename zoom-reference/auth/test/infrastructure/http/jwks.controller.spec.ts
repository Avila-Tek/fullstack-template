import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { JwkRepositoryPort } from '../../../src/application/ports/out/jwk-repository.port';
import type { JwkEntity } from '../../../src/domain/entities/jwk.entity';
import { JwksController } from '../../../src/infrastructure/http/jwks.controller';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MOCK_JWK: JwkEntity = {
	id: 'jwk-001',
	kid: 'kid-001',
	publicJwk: JSON.stringify({
		kty: 'EC',
		crv: 'P-256',
		x: 'abc123',
		y: 'def456',
	}),
	privateJwk: '{}',
	algorithm: 'ES256',
};

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

function makeJwkRepo(jwks: JwkEntity[] = [MOCK_JWK]): JwkRepositoryPort {
	return {
		getActiveKey: vi.fn().mockResolvedValue(jwks[0] ?? null),
		getAllVerificationKeys: vi.fn().mockResolvedValue(jwks),
	};
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('JwksController', () => {
	let controller: JwksController;

	beforeEach(() => {
		vi.clearAllMocks();
		controller = new JwksController(makeJwkRepo());
	});

	it('returns JWKS with the active key when one exists', async () => {
		const result = await controller.get();
		expect(result.keys).toHaveLength(1);
		// Exact shape — no extra fields allowed
		expect(result.keys[0]).toEqual({
			kty: 'EC',
			crv: 'P-256',
			x: 'abc123',
			y: 'def456',
			use: 'sig',
			alg: 'ES256',
			kid: 'kid-001',
		});
		// Private key parameter must never appear in JWKS output
		expect(result.keys[0]).not.toHaveProperty('d');
	});

	it('returns all non-revoked keys when multiple exist', async () => {
		const second: JwkEntity = { ...MOCK_JWK, id: 'jwk-002', kid: 'kid-002' };
		controller = new JwksController(makeJwkRepo([MOCK_JWK, second]));
		const result = await controller.get();
		expect(result.keys).toHaveLength(2);
		expect(result.keys.map((k) => k.kid)).toEqual(['kid-001', 'kid-002']);
	});

	it('returns empty keys array when no active JWK exists', async () => {
		controller = new JwksController(makeJwkRepo([]));
		const result = await controller.get();
		expect(result.keys).toHaveLength(0);
	});
});
