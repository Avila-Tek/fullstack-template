import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { betterAuth } from 'better-auth';
import { createAuthMiddleware } from 'better-auth/api';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { Redis } from 'ioredis';
import { and, eq, ne } from 'drizzle-orm';
import { DRIZZLE_CLIENT } from '../../../infrastructure/database/drizzle.constants.js';
import { REDIS_CLIENT } from '../../../infrastructure/redis/redis.constants.js';
import { BruteForcePort } from '../../application/ports/out/brute-force.port.js';
import { CaptchaPort } from '../../application/ports/out/captcha.port.js';
import { EmailPort } from '../../application/ports/out/email.port.js';
import { Argon2HashAdapter } from '../adapters/argon2-hash.adapter.js';
import * as authSchema from '../persistence/auth.schema.js';
import { session, user } from '../persistence/auth.schema.js';
import { createSignUpBeforeHook, createSignUpAfterHook } from '../hooks/sign-up.hooks.js';
import { createSignInBeforeHook, createSignInAfterHook } from '../hooks/sign-in.hooks.js';
import { createSignOutAfterHook } from '../hooks/sign-out.hooks.js';
import { env } from '../../../env.js';

@Injectable()
export class BetterAuthService implements OnModuleInit {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _auth!: any;

  constructor(
    @Inject(DRIZZLE_CLIENT) private readonly db: NodePgDatabase,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly emailPort: EmailPort,
    private readonly argon2: Argon2HashAdapter,
    private readonly captchaPort: CaptchaPort,
    private readonly bruteForcePort: BruteForcePort,
    private readonly eventEmitter: EventEmitter2,
    @InjectPinoLogger(BetterAuthService.name)
    private readonly logger: PinoLogger,
  ) {}

  onModuleInit(): void {
    this._auth = this.createAuth();
    this.logger.info('BetterAuthService initialized');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get auth(): any {
    return this._auth;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private createAuth(): any {
    const { db, redis, emailPort, argon2, captchaPort, bruteForcePort, eventEmitter } = this;

    // Cast needed: betterAuth returns a narrowed generic type that doesn't
    // unify with the base BetterAuthOptions-parameterized Auth type.
    return betterAuth({
      baseURL: env.API_BASE_URL,
      basePath: '/api/v1/auth',
      secret: env.BETTER_AUTH_SECRET,

      database: drizzleAdapter(db as never, { provider: 'pg', schema: authSchema }),

      secondaryStorage: {
        get: (key) => redis.get(key),
        set: async (key, value, ttl) => {
          await redis.set(key, value);
          if (ttl) await redis.expire(key, ttl);
        },
        delete: (key) => redis.del(key).then(() => undefined),
      },

      session: {
        expiresIn: 60 * 60 * 24 * 7, // 7 days
        updateAge: 60 * 60 * 24, // refresh if >1 day old
        cookieCache: { enabled: true, maxAge: 60 * 5 },
      },

      emailAndPassword: {
        enabled: true,
        requireEmailVerification: true,
        minPasswordLength: 8,
        maxPasswordLength: 128,
        password: {
          hash: (plain) => argon2.hash(plain),
          verify: ({ hash, password }) => argon2.verify(hash, password),
        },
        sendResetPassword: async ({ user: u, url }) => {
          await emailPort.sendPasswordReset(u.email, url);
        },
      },

      emailVerification: {
        sendVerificationEmail: async ({ user: u, url }) => {
          await emailPort.sendVerification(u.email, url);
        },
        sendOnSignUp: true,
        autoSignInAfterVerification: true,
        callbackURL: `${env.CLIENT_URL}/auth/email-verified`,
      },

      socialProviders: {
        ...(env.GOOGLE_ENABLED &&
          env.GOOGLE_CLIENT_ID &&
          env.GOOGLE_CLIENT_SECRET && {
            google: {
              clientId: env.GOOGLE_CLIENT_ID,
              clientSecret: env.GOOGLE_CLIENT_SECRET,
            },
          }),
      },

      plugins: [],

      rateLimit: {
        storage: 'secondary-storage',
        customRules: {
          '/sign-up/email': { window: 3600, max: env.SIGNUP_RATE_LIMIT_MAX },
          '/sign-in/email': { window: 900, max: env.SIGNIN_RATE_LIMIT_MAX },
          '/forget-password': { window: 3600, max: env.RESET_RATE_LIMIT_MAX },
          '/send-verification-email': { window: 3600, max: 3 },
        },
      },

      databaseHooks: {
        session: {
          create: {
            before: async (sess) => {
              // Single-session: remove any previous session for this user
              await db
                .delete(session)
                .where(and(eq(session.userId, sess.userId), ne(session.id, sess.id)));
              return { data: sess };
            },
            after: async (sess) => {
              // Seed Redis inactivity key
              await redis.set(
                `session:${sess.id}:activity`,
                Date.now().toString(),
                'EX',
                env.SESSION_INACTIVITY_TIMEOUT_SECONDS,
              );
            },
          },
        },
        user: {
          create: {
            before: async (u) => ({
              data: { ...u, normalizedEmail: u.email.toLowerCase().trim() },
            }),
          },
        },
      },

      hooks: {
        before: createAuthMiddleware(async (ctx) => {
          await createSignUpBeforeHook({ captchaPort })(ctx);
          await createSignInBeforeHook({ bruteForce: bruteForcePort })(ctx);
        }),
        after: createAuthMiddleware(async (ctx) => {
          await createSignUpAfterHook({ eventEmitter, logger: this.logger })(ctx);
          await createSignInAfterHook({ bruteForce: bruteForcePort, eventEmitter, logger: this.logger })(ctx);
          await createSignOutAfterHook({ redis, eventEmitter })(ctx);
        }),
      },

      trustedOrigins: [env.CLIENT_URL],

      advanced: {
        cookiePrefix: env.COOKIE_PREFIX,
        useSecureCookies: env.NODE_ENV === 'production',
        // Disable CSRF check in non-production so Postman/curl can hit auth
        // endpoints without an Origin header. In production the check is on.
        disableCSRFCheck: env.NODE_ENV !== 'production',
      },
    });
  }
}
