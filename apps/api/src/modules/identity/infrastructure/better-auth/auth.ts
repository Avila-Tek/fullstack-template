import * as argon2 from 'argon2';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { createAuthMiddleware } from 'better-auth/api';
import { jwt, twoFactor } from 'better-auth/plugins';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { smtpEmailService } from '../email/smtp-email-adapter';
import { googleOAuthAfterMiddlewareBody } from '../hooks/google-oauth.hooks';
import { signInAfterMiddlewareBody } from '../hooks/sign-in.hooks';
import { signOutSessionDeleteBefore } from '../hooks/sign-out.hooks';
import {
	consumePendingTermsData,
	signUpBeforeHook,
} from '../hooks/sign-up.hooks';
import * as schema from '../persistence/db-schema';
import { generateRecoveryToken } from '../shared/utils/generate-recovery-token';
import { normalizeEmail } from '../shared/utils/normalize-email';
import {
	parseDeviceName,
	parseDeviceType,
} from '../shared/utils/parse-device-name';
import { validatePasswordComplexity } from '../shared/utils/validate-password-complexity';

// Dedicated connection pool for Better Auth — reuses the same DATABASE_URL as the API.
// Better Auth owns lifecycle of this connection; it must be available before the
// NestJS DI container starts, which is why we cannot inject it from DrizzleModule here.
const pool = new Pool({
	connectionString:
		process.env.DATABASE_URL ??
		'postgresql://postgres:postgres@localhost:5432/poc',
});
const db = drizzle(pool, { schema });

const memoryCostArg = Number(process.env.ARGON2_MEMORY_COST ?? 65536);
const timeCostArg = Number(process.env.ARGON2_TIME_COST ?? 3);
const parallelismArg = Number(process.env.ARGON2_PARALLELISM ?? 4);

// Spec §18: store password hash in history and prune to the 5 most recent entries.
async function appendPasswordHistory(
	userId: string,
	hashedPassword: string,
): Promise<void> {
	await db.insert(schema.passwordHistory).values({
		id: crypto.randomUUID(),
		userId,
		hashedPassword,
	});

	const history = await db
		.select({ id: schema.passwordHistory.id })
		.from(schema.passwordHistory)
		.where(eq(schema.passwordHistory.userId, userId))
		.orderBy(desc(schema.passwordHistory.createdAt));

	if (history.length > 5) {
		const idsToDelete = history.slice(5).map((r) => r.id);
		await db
			.delete(schema.passwordHistory)
			.where(inArray(schema.passwordHistory.id, idsToDelete));
	}
}

export const auth = betterAuth({
	baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3002',
	basePath: '/api/v1/auth',
	secret: process.env.BETTER_AUTH_SECRET,

	database: drizzleAdapter(db, {
		provider: 'pg',
		schema: {
			user: schema.user,
			session: schema.session,
			account: schema.account,
			verification: schema.verification,
			twoFactor: schema.twoFactor,
			rateLimit: schema.rateLimit,
			jwks: schema.jwks,
		},
	}),

	user: {
		additionalFields: {
			normalizedEmail: {
				type: 'string',
				required: true,
				input: false,
			},
			twoFactorEnabled: {
				type: 'boolean',
				required: true,
				defaultValue: false,
				input: false,
			},
			termsAcceptedVersion: {
				type: 'string',
				required: true,
				defaultValue: '',
				input: false,
			},
			termsAcceptedAt: {
				type: 'date',
				required: true,
				input: false,
			},
		},
	},

	emailAndPassword: {
		enabled: true,
		requireEmailVerification: true,
		password: {
			hash: async (password: string): Promise<string> => {
				const { valid, errors } = validatePasswordComplexity(password);
				if (!valid) throw new Error(errors[0]);
				return argon2.hash(password, {
					type: argon2.argon2id,
					memoryCost: memoryCostArg,
					timeCost: timeCostArg,
					parallelism: parallelismArg,
				});
			},
			verify: ({
				hash,
				password,
			}: {
				hash: string;
				password: string;
			}): Promise<boolean> => argon2.verify(hash, password),
		},
		sendResetPassword: async ({
			user,
			url,
		}: {
			user: { email: string };
			url: string;
		}) => {
			await smtpEmailService.sendPasswordResetEmail(user.email, url);
		},
	},

	trustedOrigins: [
		process.env.CLIENT_URL ?? 'http://localhost:4200',
		process.env.ADMIN_URL ?? 'http://localhost:3000',
	],

	socialProviders: {
		google: {
			clientId: process.env.GOOGLE_CLIENT_ID ?? '',
			clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
		},
	},

	account: {
		accountLinking: {
			enabled: true,
			trustedProviders: ['google'],
		},
	},

	rateLimit: {
		enabled: true,
		window: 60,
		max: 10,
		storage: 'database',
	},

	plugins: [
		jwt({
			jwks: {
				keyPairConfig: { alg: 'RS256', modulusLength: 2048 },
				jwksPath: '/.well-known/jwks.json',
			},
			jwt: {
				issuer: process.env.BETTER_AUTH_URL ?? 'http://localhost:3002',
				audience: [process.env.CLIENT_URL ?? 'http://localhost:4200'],
				expirationTime: '15 minutes',
				definePayload: ({ user, session }) => ({
					email: user.email,
					emailVerified: user.emailVerified,
					sid: session.id,
					scope: '',
				}),
			},
		}),
		twoFactor({
			issuer: process.env.BETTER_AUTH_URL ?? 'http://localhost:3002',
			otpOptions: {
				period: 30,
				digits: 6,
			},
		}),
	],

	session: {
		expiresIn: 60 * 60 * 24 * 7,
		updateAge: 60 * 60 * 24,
		cookieCache: {
			enabled: true,
			maxAge: 60 * 5,
		},
	},

	advanced: {
		useSecureCookies: process.env.NODE_ENV === 'production',
	},

	emailVerification: {
		sendVerificationEmail: async ({
			user,
			url,
		}: {
			user: { email: string };
			url: string;
		}) => {
			await smtpEmailService.sendVerificationEmail(user.email, url);
		},
		afterEmailVerification: async (user: { id: string }) => {
			await db
				.update(schema.user)
				.set({ emailVerified: true })
				.where(eq(schema.user.id, user.id));
		},
		sendOnSignUp: true,
	},

	hooks: {
		before: signUpBeforeHook,
		after: createAuthMiddleware(async (ctx) => {
			await signInAfterMiddlewareBody(ctx);
			await googleOAuthAfterMiddlewareBody(ctx);
		}),
	},

	databaseHooks: {
		user: {
			create: {
				before: async (user) => {
					const normalized = normalizeEmail(user.email);

					const existing = await db
						.select({ id: schema.user.id })
						.from(schema.user)
						.where(eq(schema.user.normalizedEmail, normalized))
						.limit(1);

					if (existing.length > 0) {
						return false;
					}

					const correlationId = (user as Record<string, unknown>)
						._signupCorrelationId;
					const termsEntry =
						typeof correlationId === 'string'
							? consumePendingTermsData(correlationId)
							: undefined;

					return {
						data: {
							...user,
							normalizedEmail: normalized,
							twoFactorEnabled: false,
							termsAcceptedVersion: termsEntry?.resolvedTermsVersion ?? '',
							termsAcceptedAt: termsEntry?.termsAcceptedAt ?? new Date(),
						},
					};
				},
			},
		},

		session: {
			create: {
				after: async (session) => {
					const ua = session.userAgent ?? '';
					const ip = session.ipAddress ?? '';
					const deviceName = parseDeviceName(ua);

					const [existing] = await db
						.select({ id: schema.device.id })
						.from(schema.device)
						.where(
							and(
								eq(schema.device.userId, session.userId),
								eq(schema.device.userAgent, ua),
								eq(schema.device.ipAddress, ip),
							),
						)
						.limit(1);

					if (existing) {
						await db
							.update(schema.device)
							.set({ lastLoginAt: new Date() })
							.where(eq(schema.device.id, existing.id));
					} else {
						await db.insert(schema.device).values({
							id: crypto.randomUUID(),
							userId: session.userId,
							deviceName,
							deviceType: parseDeviceType(ua),
							userAgent: ua,
							ipAddress: ip,
						});

						const [userRow] = await db
							.select({ email: schema.user.email })
							.from(schema.user)
							.where(eq(schema.user.id, session.userId))
							.limit(1);

						if (userRow) {
							const secret = process.env.BETTER_AUTH_SECRET ?? '';
							const token = generateRecoveryToken(session.userId, secret);
							const clientUrl =
								process.env.CLIENT_URL ?? 'http://localhost:4200';
							const recoveryUrl = `${clientUrl}/security/recover?token=${token}`;
							await smtpEmailService.sendLoginAlertEmail(
								userRow.email,
								deviceName,
								ip,
								new Date(),
								recoveryUrl,
							);
						}
					}

					await db.insert(schema.loginAuditLog).values({
						id: crypto.randomUUID(),
						userId: session.userId,
						ipAddress: ip,
						userAgent: ua,
						deviceName,
						success: true,
					});
				},
			},
			delete: {
				before: signOutSessionDeleteBefore,
			},
		},

		account: {
			create: {
				after: async (account) => {
					if (account.providerId === 'credential' && account.password) {
						await appendPasswordHistory(account.userId, account.password);
					}

					const TRUSTED_PROVIDERS = ['google'];
					if (TRUSTED_PROVIDERS.includes(account.providerId)) {
						const [userRow] = await db
							.select({ email: schema.user.email })
							.from(schema.user)
							.where(eq(schema.user.id, account.userId))
							.limit(1);

						if (userRow) {
							await db
								.update(schema.account)
								.set({ providerEmail: userRow.email })
								.where(eq(schema.account.id, account.id));
						}

						await db
							.update(schema.user)
							.set({ emailVerified: true })
							.where(eq(schema.user.id, account.userId));
					}
				},
			},
			update: {
				after: async (account) => {
					if (account.providerId !== 'credential' || !account.password) return;
					await appendPasswordHistory(account.userId, account.password);
				},
			},
		},
	},
});

export type AppAuth = typeof auth;
