import {
	type JWTVerifyGetKey,
	createRemoteJWKSet,
	jwtVerify,
} from 'jose';

export interface IdentityJwtPayload {
	email: string;
	emailVerified: boolean;
	sid: string;
	scope: string;
}

interface VerifyOptions {
	/** Injected JWKS set — used in tests. Defaults to remote JWKS from BETTER_AUTH_URL. */
	jwks?: JWTVerifyGetKey;
	issuer?: string;
	audience?: string;
}

function getDefaultJwks(): JWTVerifyGetKey {
	const baseUrl = process.env.BETTER_AUTH_URL ?? 'http://localhost:3002';
	return createRemoteJWKSet(new URL('/.well-known/jwks.json', baseUrl));
}

export async function verifyIdentityJwt(
	token: string,
	options: VerifyOptions = {},
): Promise<IdentityJwtPayload> {
	const jwks = options.jwks ?? getDefaultJwks();
	const issuer = options.issuer ?? (process.env.BETTER_AUTH_URL ?? 'http://localhost:3002');
	const audience = options.audience ?? (process.env.CLIENT_URL ?? 'http://localhost:4200');

	const { payload } = await jwtVerify(token, jwks, {
		algorithms: ['ES256'],
		issuer,
		audience,
	});

	return {
		email: payload.email as string,
		emailVerified: payload.emailVerified as boolean,
		sid: payload.sid as string,
		scope: payload.scope as string,
	};
}
