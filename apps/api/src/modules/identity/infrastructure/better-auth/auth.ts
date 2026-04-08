import { i18n } from '@better-auth/i18n';
import * as argon2 from 'argon2';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { createAuthMiddleware } from 'better-auth/api';
import { jwt, twoFactor } from 'better-auth/plugins';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import Redis from 'ioredis';
import { Pool } from 'pg';
import { normalizeEmail } from '@/shared/utils/normalize-email';
import {
	parseDeviceName,
	parseDeviceType,
} from '@/shared/utils/user-agent-parser';
import { googleOAuthAfterMiddlewareBody } from './hooks/google-oauth.hooks';
import { signInAfterMiddlewareBody } from './hooks/sign-in.hooks';
import { signOutSessionDeleteBefore } from './hooks/sign-out.hooks';
import {
	consumePendingTermsData,
	signUpBeforeHook,
} from './hooks/sign-up.hooks';
import { esBetterAuthTranslations } from './i18n/translations';
import * as schema from '../persistence/db-schema';
import { validatePasswordComplexity } from '../utils/validate-password-complexity';

// Dedicated connection pool for Better Auth — reuses the same DATABASE_URL as the API.
// Better Auth owns lifecycle of this connection; it must be available before the
// NestJS DI container starts, which is why we cannot inject it from DrizzleModule here.
if (!process.env.DATABASE_URL) {
	throw new Error('DATABASE_URL is required for Better Auth');
}

// Dedicated Redis client for Better Auth secondary storage (session cache + rate limiting).
// Must be created here — Better Auth initializes before the NestJS DI container.
const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
	lazyConnect: false,
	maxRetriesPerRequest: 1,
	enableOfflineQueue: false,
});
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

const memoryCostArg = Number(process.env.ARGON2_MEMORY_COST ?? 65536);
const timeCostArg = Number(process.env.ARGON2_TIME_COST ?? 3);
const parallelismArg = Number(process.env.ARGON2_PARALLELISM ?? 4);

// Spec §18: store password hash in history and prune to the 5 most recent entries.
async function appendPasswordHistory(
	userId: string,
	hashedPassword: string,
): Promise<void> {
	await db.transaction(async (tx) => {
		await tx.insert(schema.passwordHistory).values({
			id: crypto.randomUUID(),
			userId,
			hashedPassword,
		});

		const history = await tx
			.select({ id: schema.passwordHistory.id })
			.from(schema.passwordHistory)
			.where(eq(schema.passwordHistory.userId, userId))
			.orderBy(desc(schema.passwordHistory.createdAt));

		if (history.length > 5) {
			const idsToDelete = history.slice(5).map((r) => r.id);
			await tx
				.delete(schema.passwordHistory)
				.where(inArray(schema.passwordHistory.id, idsToDelete));
		}
	});
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
			jwks: schema.jwks,
		},
	}),

	secondaryStorage: {
		get: (key) => redis.get(key),
		set: async (key, value, ttl) => {
			if (ttl) await redis.set(key, value, 'EX', ttl);
			else await redis.set(key, value);
		},
		delete: (key) => redis.del(key).then(() => undefined),
	},

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
			// TODO: integrate shared Postmark email service
			void user.email;
			void url;
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
		storage: 'secondary-storage',
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
		i18n({
			defaultLocale: 'en',
			detection: ['header'],
			translations: {
				es: esBetterAuthTranslations,
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
			// TODO: integrate shared Postmark email service
			void user.email;
			void url;
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
