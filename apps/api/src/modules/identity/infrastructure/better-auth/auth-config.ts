// Exported separately so unit tests can import these constants without
// triggering the full auth.ts module initialization (which requires DATABASE_URL).

export const JWT_JWKS_CONFIG = {
	keyPairConfig: { alg: 'ES256' as const },
	jwksPath: '/.well-known/jwks.json',
	rotationInterval: 60 * 60 * 24 * 30, // 30 days
	gracePeriod: 60 * 60 * 24 * 7, // 7 days
};

export const SESSION_CONFIG = {
	expiresIn: 60 * 60 * 24 * 7, // 7 days
	updateAge: 60 * 60, // 1 hour
	freshAge: 60 * 5, // 5 minutes
	cookieCache: {
		enabled: true,
		maxAge: 60 * 2, // 2 minutes
	},
};

export const ADVANCED_CONFIG = {
	defaultCookieAttributes: {
		sameSite: 'lax' as const,
		httpOnly: true,
		path: '/api/v1',
	},
};
