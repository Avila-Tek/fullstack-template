import type { JwkEntity } from '../../../domain/entities/jwk.entity';

// Payload passed to the JWT mint service.
// Claims map: sub → sub, email → email, emailVerified → email_verified,
// sid → sid, orgId → org_id, role → role, aud → aud.
export interface SystemJwtPayload {
	sub: string;
	email: string;
	emailVerified: boolean;
	sid: string;
	orgId: string;
	role: string;
	// JWT aud claim — set to system.apiBaseUrl
	aud: string;
}

// Outbound port — signs a system-scoped ES256 JWT.
// Implemented by Es256JwtMintAdapter in infrastructure/jwt/.
export abstract class JwtMintServicePort {
	abstract mint(payload: SystemJwtPayload, jwk: JwkEntity): Promise<string>;
}
