import { Injectable } from '@nestjs/common';
import { symmetricDecrypt } from 'better-auth/crypto';
import { importJWK, SignJWT } from 'jose';
import {
	JwtMintServicePort,
	type SystemJwtPayload,
} from '../../application/ports/out/jwt-mint-service.port';
import type { JwkEntity } from '../../domain/entities/jwk.entity';
import { env } from '../../env';

@Injectable()
export class Es256JwtMintAdapter implements JwtMintServicePort {
	async mint(payload: SystemJwtPayload, jwk: JwkEntity): Promise<string> {
		// jwk.privateJwk is the at-rest envelope written by Better Auth's jwt
		// plugin (JSON.stringify(symmetricEncrypt(...))) — decrypt with the same
		// secret before importing. See node_modules/better-auth/dist/plugins/jwt/sign.mjs.
		const decryptedJwk = await symmetricDecrypt({
			key: env.BETTER_AUTH_SECRET,
			data: JSON.parse(jwk.privateJwk),
		});
		const privateKey = await importJWK(JSON.parse(decryptedJwk), 'ES256');

		return new SignJWT({
			sub: payload.sub,
			email: payload.email,
			email_verified: payload.emailVerified,
			sid: payload.sid,
			org_id: payload.orgId,
			role: payload.role,
			aud: payload.aud,
		})
			.setProtectedHeader({ alg: 'ES256', kid: jwk.kid })
			.setIssuedAt()
			.setIssuer(env.AUTH_BASE_URL)
			.setExpirationTime('15m')
			.sign(privateKey);
	}
}
