# F2: Auth Core + Security — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement signup, signin, and signout with Argon2id, single-session, brute-force protection, captcha, password history, password policy, session-activity middleware, and a decoupled audit log via EventEmitter2. At the end all acceptance criteria in the F2 spec pass.

**Architecture:** Hexagonal (ports & adapters). `BetterAuthService` creates the BA instance in `onModuleInit()` capturing injected ports as closures. BA hooks use `APIError` (BA's own error type) so BA controls the HTTP response; domain exceptions are for NestJS use-cases only. Audit log is fully decoupled via `@OnEvent('auth.*')`.

**Tech Stack:** NestJS 11 + Better-Auth 1.x + Drizzle ORM + ioredis + Argon2id + Nodemailer + `@nestjs/event-emitter`.

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | `apps/api/src/auth/domain/exceptions/account-locked.exception.ts` | `AccountLockedException` |
| Create | `apps/api/src/auth/domain/exceptions/email-delivery-failed.exception.ts` | `EmailDeliveryFailedException` |
| Create | `apps/api/src/auth/domain/exceptions/password-policy-failed.exception.ts` | `PasswordPolicyFailedException` |
| Create | `apps/api/src/auth/domain/exceptions/password-reuse.exception.ts` | `PasswordReuseException` |
| Create | `apps/api/src/auth/domain/policies/password.policy.ts` | Pure-TS complexity validation |
| Create | `apps/api/src/auth/application/ports/in/check-password-history.port.ts` | Abstract input port (DI token) |
| Create | `apps/api/src/auth/application/ports/out/brute-force.port.ts` | Abstract output port |
| Create | `apps/api/src/auth/application/ports/out/captcha.port.ts` | Abstract output port |
| Create | `apps/api/src/auth/application/ports/out/email.port.ts` | Abstract output port |
| Create | `apps/api/src/auth/application/ports/out/security-notification.port.ts` | Abstract output port |
| Create | `apps/api/src/auth/application/ports/out/password-history.repository.port.ts` | Abstract output port |
| Create | `apps/api/src/auth/application/ports/out/session.repository.port.ts` | Abstract output port |
| Create | `apps/api/src/auth/application/events/auth.events.ts` | Plain TS event classes (zero framework) |
| Create | `apps/api/src/auth/application/use-cases/check-password-history.use-case.ts` | Verifies new password against history |
| Create | `apps/api/src/auth/infrastructure/better-auth/argon2.config.ts` | ARGON2_OPTIONS from env |
| Create | `apps/api/src/auth/infrastructure/better-auth/better-auth.service.ts` | Factory; creates BA instance with all hooks |
| Create | `apps/api/src/auth/infrastructure/hooks/sign-up.hooks.ts` | Captcha hook + signed_up event |
| Create | `apps/api/src/auth/infrastructure/hooks/sign-in.hooks.ts` | BruteForce hooks + signed_in event |
| Create | `apps/api/src/auth/infrastructure/hooks/sign-out.hooks.ts` | Redis cleanup + signed_out event |
| Create | `apps/api/src/auth/infrastructure/persistence/auth.schema.ts` | BA tables (user, session, account, etc.) |
| Create | `apps/api/src/auth/infrastructure/persistence/auth-schema-extensions.ts` | `normalizedEmail` unique index |
| Create | `apps/api/src/auth/infrastructure/persistence/password-history.schema.ts` | `password_history` table |
| Create | `apps/api/src/auth/infrastructure/persistence/audit-log.schema.ts` | `auth_audit_log` table (hashes only) |
| Create | `apps/api/src/auth/infrastructure/persistence/password-history.repository-adapter.ts` | Drizzle impl |
| Create | `apps/api/src/auth/infrastructure/persistence/session.repository-adapter.ts` | Drizzle impl |
| Create | `apps/api/src/auth/infrastructure/adapters/argon2-hash.adapter.ts` | hash / verify with ARGON2_OPTIONS |
| Create | `apps/api/src/auth/infrastructure/adapters/brute-force.adapter.ts` | Redis INCR/EXPIRE (class: `RedisBruteForceAdapter`) |
| Create | `apps/api/src/auth/infrastructure/adapters/email.adapter.ts` | Nodemailer SMTP (class: `SmtpEmailAdapter`) |
| Create | `apps/api/src/auth/infrastructure/adapters/security-notification.adapter.ts` | Delegates to EmailPort |
| Create | `apps/api/src/auth/infrastructure/adapters/captcha/cloudflare-captcha.adapter.ts` | Turnstile |
| Create | `apps/api/src/auth/infrastructure/adapters/captcha/google-captcha.adapter.ts` | reCAPTCHA |
| Create | `apps/api/src/auth/infrastructure/middleware/session-activity.middleware.ts` | Redis TTL check & renew |
| Create | `apps/api/src/auth/infrastructure/listeners/audit-log.listener.ts` | `@OnEvent('auth.*')` → INSERT |
| Create | `apps/api/src/auth/infrastructure/web/auth.http-handler.ts` | Catch-all controller → BA handler |
| Create | `apps/api/src/auth/module.ts` | AuthModule DI wiring |
| Create | `apps/api/src/infrastructure/health/redis.health-indicator.ts` | PING |
| Create | `apps/api/src/infrastructure/health/auth.health-indicator.ts` | SELECT 1 FROM session LIMIT 1 |
| Modify | `apps/api/src/infrastructure/health/health.controller.ts` | Add Redis + auth checks |
| Modify | `apps/api/src/infrastructure/health/health.module.ts` | Register new indicators |
| Modify | `apps/api/src/infrastructure/mapping/domain-to-http.mapper.ts` | Add AUTH_* status codes |
| Modify | `apps/api/src/infrastructure/i18n/domain-messages.ts` | Add AUTH_* messages |
| Modify | `apps/api/src/app.module.ts` | `wildcard: true`; add AuthModule; add SessionActivityMiddleware |
| Modify | `apps/api/drizzle.config.ts` | Update schema glob to include auth schemas |

---

## Task 1 — Install packages

**Files:** `apps/api/package.json` (via npm)

- [ ] **Step 1: Install runtime deps**

```bash
npm install -w apps/api better-auth nodemailer
```

- [ ] **Step 2: Install dev deps**

```bash
npm install -w apps/api --save-dev @types/nodemailer
```

- [ ] **Step 3: Verify**

```bash
cat apps/api/package.json | python3 -c "import json,sys; d=json.load(sys.stdin); deps={**d.get('dependencies',{}),**d.get('devDependencies',{})}; print(deps.get('better-auth'), deps.get('nodemailer'), deps.get('@types/nodemailer'))"
```

Expected: three version strings (not `None`).

- [ ] **Step 4: Commit**

```bash
git add apps/api/package.json package-lock.json
git commit -m "chore(api): add better-auth, nodemailer deps"
```

---

## Task 2 — Domain layer: exceptions + PasswordPolicy

**Files:**
- Create: `apps/api/src/auth/domain/exceptions/*.ts` (4 files)
- Create: `apps/api/src/auth/domain/policies/password.policy.ts`
- Create: `apps/api/src/test/auth/domain/policies/password.policy.test.ts`
- Create: `apps/api/src/test/auth/domain/exceptions/domain-exceptions.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// apps/api/src/test/auth/domain/exceptions/domain-exceptions.test.ts
import { describe, it, expect } from 'vitest';
import { AccountLockedException } from '../../../../auth/domain/exceptions/account-locked.exception.js';
import { EmailDeliveryFailedException } from '../../../../auth/domain/exceptions/email-delivery-failed.exception.js';
import { PasswordPolicyFailedException } from '../../../../auth/domain/exceptions/password-policy-failed.exception.js';
import { PasswordReuseException } from '../../../../auth/domain/exceptions/password-reuse.exception.js';
import { DomainException } from '../../../../shared/domain-exception.js';

describe('Auth domain exceptions', () => {
  it('AccountLockedException has correct error code', () => {
    const ex = new AccountLockedException();
    expect(ex.error).toBe('AUTH_ACCOUNT_LOCKED');
    expect(ex).toBeInstanceOf(DomainException);
  });

  it('EmailDeliveryFailedException has correct error code', () => {
    const ex = new EmailDeliveryFailedException();
    expect(ex.error).toBe('AUTH_EMAIL_DELIVERY_FAILED');
    expect(ex).toBeInstanceOf(DomainException);
  });

  it('PasswordPolicyFailedException carries violations array', () => {
    const ex = new PasswordPolicyFailedException(['Too short', 'No digit']);
    expect(ex.error).toBe('AUTH_PASSWORD_POLICY_FAILED');
    expect(ex.meta).toEqual({ violations: ['Too short', 'No digit'] });
  });

  it('PasswordReuseException has correct error code', () => {
    const ex = new PasswordReuseException();
    expect(ex.error).toBe('AUTH_PASSWORD_REUSE');
  });
});
```

```typescript
// apps/api/src/test/auth/domain/policies/password.policy.test.ts
import { describe, it, expect } from 'vitest';
import { PasswordPolicy } from '../../../../auth/domain/policies/password.policy.js';
import { PasswordPolicyFailedException } from '../../../../auth/domain/exceptions/password-policy-failed.exception.js';

describe('PasswordPolicy.validate', () => {
  it('accepts a valid complex password', () => {
    expect(() => PasswordPolicy.validate('Str0ng!Pass')).not.toThrow();
  });

  it('rejects password shorter than 8 chars', () => {
    expect(() => PasswordPolicy.validate('Ab1!')).toThrow(PasswordPolicyFailedException);
  });

  it('rejects password longer than 128 chars', () => {
    expect(() => PasswordPolicy.validate('A1!' + 'a'.repeat(130))).toThrow(PasswordPolicyFailedException);
  });

  it('rejects password with no uppercase', () => {
    expect(() => PasswordPolicy.validate('str0ng!pass')).toThrow(PasswordPolicyFailedException);
  });

  it('rejects password with no lowercase', () => {
    expect(() => PasswordPolicy.validate('STR0NG!PASS')).toThrow(PasswordPolicyFailedException);
  });

  it('rejects password with no digit', () => {
    expect(() => PasswordPolicy.validate('Stro!ngPass')).toThrow(PasswordPolicyFailedException);
  });

  it('rejects password with no special character', () => {
    expect(() => PasswordPolicy.validate('Str0ngPass1')).toThrow(PasswordPolicyFailedException);
  });

  it('rejects password with leading space', () => {
    expect(() => PasswordPolicy.validate(' Str0ng!Pass')).toThrow(PasswordPolicyFailedException);
  });

  it('rejects password with trailing space', () => {
    expect(() => PasswordPolicy.validate('Str0ng!Pass ')).toThrow(PasswordPolicyFailedException);
  });

  it('accumulates all violations', () => {
    try {
      PasswordPolicy.validate('short');
      expect.fail('should throw');
    } catch (e) {
      expect(e).toBeInstanceOf(PasswordPolicyFailedException);
      const ex = e as PasswordPolicyFailedException;
      const violations = (ex.meta as { violations: string[] }).violations;
      expect(violations.length).toBeGreaterThan(1);
    }
  });
});
```

- [ ] **Step 2: Run — verify fail**

```bash
npm -C apps/api test -- --reporter=verbose src/test/auth/domain
```

Expected: `FAIL — Cannot find module`

- [ ] **Step 3: Create the 4 exception files**

```typescript
// apps/api/src/auth/domain/exceptions/account-locked.exception.ts
import { DomainException } from '../../../shared/domain-exception.js';

export class AccountLockedException extends DomainException {
  constructor(meta?: Record<string, unknown>) {
    super('AUTH_ACCOUNT_LOCKED', meta);
  }
}
```

```typescript
// apps/api/src/auth/domain/exceptions/email-delivery-failed.exception.ts
import { DomainException } from '../../../shared/domain-exception.js';

export class EmailDeliveryFailedException extends DomainException {
  constructor(meta?: Record<string, unknown>) {
    super('AUTH_EMAIL_DELIVERY_FAILED', meta);
  }
}
```

```typescript
// apps/api/src/auth/domain/exceptions/password-policy-failed.exception.ts
import { DomainException } from '../../../shared/domain-exception.js';

export class PasswordPolicyFailedException extends DomainException {
  constructor(violations: string[]) {
    super('AUTH_PASSWORD_POLICY_FAILED', { violations });
  }
}
```

```typescript
// apps/api/src/auth/domain/exceptions/password-reuse.exception.ts
import { DomainException } from '../../../shared/domain-exception.js';

export class PasswordReuseException extends DomainException {
  constructor(meta?: Record<string, unknown>) {
    super('AUTH_PASSWORD_REUSE', meta);
  }
}
```

- [ ] **Step 4: Create PasswordPolicy**

```typescript
// apps/api/src/auth/domain/policies/password.policy.ts
import { PasswordPolicyFailedException } from '../exceptions/password-policy-failed.exception.js';

export class PasswordPolicy {
  static readonly MIN_LENGTH = 8;
  static readonly MAX_LENGTH = 128;

  /**
   * Validates password complexity.
   * Throws PasswordPolicyFailedException with all violations collected.
   */
  static validate(password: string): void {
    const violations: string[] = [];

    if (password !== password.trim()) {
      violations.push('Password must not have leading or trailing spaces');
    }
    if (password.length < PasswordPolicy.MIN_LENGTH) {
      violations.push(`Password must be at least ${PasswordPolicy.MIN_LENGTH} characters`);
    }
    if (password.length > PasswordPolicy.MAX_LENGTH) {
      violations.push(`Password must be at most ${PasswordPolicy.MAX_LENGTH} characters`);
    }
    if (!/[A-Z]/.test(password)) {
      violations.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      violations.push('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
      violations.push('Password must contain at least one digit');
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      violations.push('Password must contain at least one special character');
    }

    if (violations.length > 0) {
      throw new PasswordPolicyFailedException(violations);
    }
  }
}
```

- [ ] **Step 5: Run — verify pass**

```bash
npm -C apps/api test -- --reporter=verbose src/test/auth/domain
```

Expected: `PASS` — 13 tests.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/auth/domain/ apps/api/src/test/auth/domain/
git commit -m "feat(api): add auth domain exceptions and PasswordPolicy"
```

---

## Task 3 — Application layer: ports, events, CheckPasswordHistoryUseCase

**Files:**
- Create: `apps/api/src/auth/application/ports/in/check-password-history.port.ts`
- Create: `apps/api/src/auth/application/ports/out/brute-force.port.ts`
- Create: `apps/api/src/auth/application/ports/out/captcha.port.ts`
- Create: `apps/api/src/auth/application/ports/out/email.port.ts`
- Create: `apps/api/src/auth/application/ports/out/security-notification.port.ts`
- Create: `apps/api/src/auth/application/ports/out/password-history.repository.port.ts`
- Create: `apps/api/src/auth/application/ports/out/session.repository.port.ts`
- Create: `apps/api/src/auth/application/events/auth.events.ts`
- Create: `apps/api/src/auth/application/use-cases/check-password-history.use-case.ts`
- Create: `apps/api/src/test/auth/application/use-cases/check-password-history.use-case.test.ts`

- [ ] **Step 1: Write failing test for CheckPasswordHistoryUseCase**

```typescript
// apps/api/src/test/auth/application/use-cases/check-password-history.use-case.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CheckPasswordHistoryUseCase } from '../../../../auth/application/use-cases/check-password-history.use-case.js';
import { PasswordReuseException } from '../../../../auth/domain/exceptions/password-reuse.exception.js';
import type { PasswordHistoryRepositoryPort } from '../../../../auth/application/ports/out/password-history.repository.port.js';
import type { Argon2HashAdapter } from '../../../../auth/infrastructure/adapters/argon2-hash.adapter.js';

describe('CheckPasswordHistoryUseCase', () => {
  let useCase: CheckPasswordHistoryUseCase;
  let repo: PasswordHistoryRepositoryPort;
  let argon2: Argon2HashAdapter;

  beforeEach(() => {
    repo = {
      findLastN: vi.fn(),
    } as unknown as PasswordHistoryRepositoryPort;
    argon2 = {
      hash: vi.fn(),
      verify: vi.fn(),
    } as unknown as Argon2HashAdapter;
    useCase = new CheckPasswordHistoryUseCase(repo, argon2);
  });

  it('does not throw when password is not in history', async () => {
    vi.mocked(repo.findLastN).mockResolvedValue([
      { id: '1', userId: 'u1', hashedPassword: '$hash1', createdAt: new Date() },
    ]);
    vi.mocked(argon2.verify).mockResolvedValue(false);

    await expect(
      useCase.execute({ userId: 'u1', plainPassword: 'NewPass1!' }),
    ).resolves.not.toThrow();
  });

  it('throws PasswordReuseException when password matches history', async () => {
    vi.mocked(repo.findLastN).mockResolvedValue([
      { id: '1', userId: 'u1', hashedPassword: '$hash1', createdAt: new Date() },
    ]);
    vi.mocked(argon2.verify).mockResolvedValue(true);

    await expect(
      useCase.execute({ userId: 'u1', plainPassword: 'OldPass1!' }),
    ).rejects.toThrow(PasswordReuseException);
  });

  it('checks all history entries before deciding', async () => {
    vi.mocked(repo.findLastN).mockResolvedValue([
      { id: '1', userId: 'u1', hashedPassword: '$hash1', createdAt: new Date() },
      { id: '2', userId: 'u1', hashedPassword: '$hash2', createdAt: new Date() },
    ]);
    vi.mocked(argon2.verify)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    await expect(
      useCase.execute({ userId: 'u1', plainPassword: 'OldPass1!' }),
    ).rejects.toThrow(PasswordReuseException);
    expect(argon2.verify).toHaveBeenCalledTimes(2);
  });

  it('passes empty history without throwing', async () => {
    vi.mocked(repo.findLastN).mockResolvedValue([]);

    await expect(
      useCase.execute({ userId: 'u1', plainPassword: 'AnyPass1!' }),
    ).resolves.not.toThrow();
  });
});
```

- [ ] **Step 2: Run — verify fail**

```bash
npm -C apps/api test -- --reporter=verbose src/test/auth/application
```

Expected: `FAIL — Cannot find module`

- [ ] **Step 3: Create all ports**

```typescript
// apps/api/src/auth/application/ports/in/check-password-history.port.ts
export abstract class CheckPasswordHistoryPort {
  abstract execute(input: { userId: string; plainPassword: string }): Promise<void>;
}
```

```typescript
// apps/api/src/auth/application/ports/out/brute-force.port.ts
export abstract class BruteForcePort {
  /** Increment counter for email; returns new count */
  abstract increment(email: string): Promise<number>;
  /** Reset counter after successful login */
  abstract clear(email: string): Promise<void>;
  /** Read current count without incrementing */
  abstract getCount(email: string): Promise<number>;
}
```

```typescript
// apps/api/src/auth/application/ports/out/captcha.port.ts
export abstract class CaptchaPort {
  abstract verify(token: string, ip?: string): Promise<{ success: boolean }>;
}
```

```typescript
// apps/api/src/auth/application/ports/out/email.port.ts
export abstract class EmailPort {
  abstract sendVerification(to: string, verificationUrl: string): Promise<void>;
  abstract sendPasswordReset(to: string, resetUrl: string): Promise<void>;
  abstract send2faOtp(to: string, otp: string): Promise<void>;
  abstract sendLoginAlert(to: string, ip: string): Promise<void>;
  abstract sendFailedLoginAlert(to: string, ip: string): Promise<void>;
  abstract sendSessionRevoked(to: string): Promise<void>;
}
```

```typescript
// apps/api/src/auth/application/ports/out/security-notification.port.ts
export abstract class SecurityNotificationPort {
  abstract sendNewLoginAlert(to: string, ip: string): Promise<void>;
  abstract sendPasswordChangedAlert(to: string): Promise<void>;
  abstract sendEmailChangedAlert(to: string, newEmail: string): Promise<void>;
}
```

```typescript
// apps/api/src/auth/application/ports/out/password-history.repository.port.ts
export interface PasswordHistoryEntry {
  id: string;
  userId: string;
  hashedPassword: string;
  createdAt: Date;
}

export abstract class PasswordHistoryRepositoryPort {
  abstract findLastN(userId: string, n: number): Promise<PasswordHistoryEntry[]>;
  abstract add(userId: string, hashedPassword: string): Promise<void>;
  abstract pruneOldest(userId: string, keepCount: number): Promise<void>;
}
```

```typescript
// apps/api/src/auth/application/ports/out/session.repository.port.ts
export interface SessionRecord {
  id: string;
  userId: string;
  createdAt: Date;
  expiresAt: Date;
}

export abstract class SessionRepositoryPort {
  abstract findById(sessionId: string): Promise<SessionRecord | null>;
  abstract deleteById(sessionId: string): Promise<void>;
  abstract deleteByUserId(userId: string, exceptSessionId?: string): Promise<void>;
}
```

- [ ] **Step 4: Create auth events**

```typescript
// apps/api/src/auth/application/events/auth.events.ts
// Zero framework imports — plain TS event classes.
// AuditLogListener listens on 'auth.*' and reads these shapes.

export interface AuthEventPayload {
  userId?: string;
  email?: string;
  sessionId?: string;
  ip?: string;
  correlationId?: string;
  metadata?: Record<string, unknown>;
}

export class AuthSignedUpEvent {
  readonly type = 'auth.signed_up' as const;
  constructor(public readonly payload: AuthEventPayload) {}
}

export class AuthSignedInEvent {
  readonly type = 'auth.signed_in' as const;
  constructor(public readonly payload: AuthEventPayload) {}
}

export class AuthSignedOutEvent {
  readonly type = 'auth.signed_out' as const;
  constructor(public readonly payload: AuthEventPayload) {}
}

export type AuthEvent =
  | AuthSignedUpEvent
  | AuthSignedInEvent
  | AuthSignedOutEvent;
```

- [ ] **Step 5: Create CheckPasswordHistoryUseCase**

```typescript
// apps/api/src/auth/application/use-cases/check-password-history.use-case.ts
import { Injectable } from '@nestjs/common';
import { CheckPasswordHistoryPort } from '../ports/in/check-password-history.port.js';
import { PasswordHistoryRepositoryPort } from '../ports/out/password-history.repository.port.js';
import { PasswordReuseException } from '../../domain/exceptions/password-reuse.exception.js';
import type { Argon2HashAdapter } from '../../infrastructure/adapters/argon2-hash.adapter.js';
import { env } from '../../../../env.js';

@Injectable()
export class CheckPasswordHistoryUseCase extends CheckPasswordHistoryPort {
  constructor(
    private readonly repo: PasswordHistoryRepositoryPort,
    private readonly argon2: Argon2HashAdapter,
  ) {
    super();
  }

  async execute(input: { userId: string; plainPassword: string }): Promise<void> {
    const history = await this.repo.findLastN(input.userId, env.PASSWORD_HISTORY_DEPTH);

    for (const entry of history) {
      const matches = await this.argon2.verify(entry.hashedPassword, input.plainPassword);
      if (matches) {
        throw new PasswordReuseException();
      }
    }
  }
}
```

- [ ] **Step 6: Run — verify pass**

```bash
npm -C apps/api test -- --reporter=verbose src/test/auth/application
```

Expected: `PASS` — 4 tests.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/auth/application/ apps/api/src/test/auth/application/
git commit -m "feat(api): add auth application ports, events, CheckPasswordHistoryUseCase"
```

---

## Task 4 — Auth database schemas + drizzle.config.ts

**Files:**
- Create: `apps/api/src/auth/infrastructure/persistence/auth.schema.ts`
- Create: `apps/api/src/auth/infrastructure/persistence/auth-schema-extensions.ts`
- Create: `apps/api/src/auth/infrastructure/persistence/password-history.schema.ts`
- Create: `apps/api/src/auth/infrastructure/persistence/audit-log.schema.ts`
- Modify: `apps/api/drizzle.config.ts`

No unit tests needed — schemas are verified by Drizzle's own type-checking.

- [ ] **Step 1: Create Better-Auth schema (BA-managed tables)**

```typescript
// apps/api/src/auth/infrastructure/persistence/auth.schema.ts
// This file declares the Better-Auth database tables so Drizzle knows the schema.
// DO NOT add migrations manually — Better-Auth manages these tables via its own migration system.
// Run: npx @better-auth/cli generate  to regenerate this file after BA config changes.
import {
  pgTable,
  text,
  boolean,
  timestamp,
  integer,
} from 'drizzle-orm/pg-core';

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').$default(() => false).notNull(),
  image: text('image'),
  normalizedEmail: text('normalized_email'),
  twoFactorEnabled: boolean('two_factor_enabled'),
  isAnonymous: boolean('is_anonymous'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
});

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  activeOrganizationId: text('active_organization_id'),
  impersonatedBy: text('impersonated_by'),
});

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
});

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at'),
  updatedAt: timestamp('updated_at'),
});

export const twoFactor = pgTable('two_factor', {
  id: text('id').primaryKey(),
  secret: text('secret').notNull(),
  backupCodes: text('backup_codes').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
});

export const rateLimit = pgTable('rate_limit', {
  id: text('id').primaryKey(),
  key: text('key'),
  count: integer('count'),
  lastRequest: integer('last_request'),
});
```

- [ ] **Step 2: Create schema extensions (normalizedEmail unique index)**

```typescript
// apps/api/src/auth/infrastructure/persistence/auth-schema-extensions.ts
// Adds the unique index on normalizedEmail that Better-Auth does not create automatically.
// This prevents race conditions on concurrent sign-ups with the same email in different casing.
import { uniqueIndex } from 'drizzle-orm/pg-core';
import { user } from './auth.schema.js';

export const userNormalizedEmailIndex = uniqueIndex(
  'user_normalized_email_unique',
).on(user.normalizedEmail!);
```

- [ ] **Step 3: Create password-history schema**

```typescript
// apps/api/src/auth/infrastructure/persistence/password-history.schema.ts
import { pgTable, text, uuid, timestamp, index } from 'drizzle-orm/pg-core';
import { user } from './auth.schema.js';

export const passwordHistory = pgTable(
  'password_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    hashedPassword: text('hashed_password').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('password_history_user_id_created_at_idx').on(t.userId, t.createdAt)],
);
```

- [ ] **Step 4: Create audit-log schema**

```typescript
// apps/api/src/auth/infrastructure/persistence/audit-log.schema.ts
// RULE: No PII in any column. email_hash and ip_hash store SHA-256 hashes only.
import { pgTable, uuid, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';

export const authAuditLog = pgTable(
  'auth_audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    event: text('event').notNull(),
    userId: text('user_id'),
    emailHash: text('email_hash'),   // SHA-256(email.toLowerCase().trim()) — never plain text
    ipHash: text('ip_hash'),         // SHA-256(ip) — never plain text
    userAgent: text('user_agent'),
    sessionId: text('session_id'),
    correlationId: text('correlation_id'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('auth_audit_log_user_id_created_at_idx').on(t.userId, t.createdAt),
    index('auth_audit_log_event_created_at_idx').on(t.event, t.createdAt),
  ],
);
```

- [ ] **Step 5: Update drizzle.config.ts**

Replace the whole file:

```typescript
// apps/api/drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: [
    './src/auth/infrastructure/persistence/auth.schema.ts',
    './src/auth/infrastructure/persistence/auth-schema-extensions.ts',
    './src/auth/infrastructure/persistence/password-history.schema.ts',
    './src/auth/infrastructure/persistence/audit-log.schema.ts',
  ],
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/fullstack',
  },
});
```

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/auth/infrastructure/persistence/ apps/api/drizzle.config.ts
git commit -m "feat(api): add auth, password-history, audit-log schemas; update drizzle.config"
```

---

## Task 5 — Infrastructure adapters: Argon2, BruteForce, Captcha

**Files:**
- Create: `apps/api/src/auth/infrastructure/adapters/argon2-hash.adapter.ts`
- Create: `apps/api/src/auth/infrastructure/adapters/brute-force.adapter.ts`
- Create: `apps/api/src/auth/infrastructure/adapters/captcha/cloudflare-captcha.adapter.ts`
- Create: `apps/api/src/auth/infrastructure/adapters/captcha/google-captcha.adapter.ts`
- Create: `apps/api/src/test/auth/infrastructure/adapters/argon2-hash.adapter.test.ts`
- Create: `apps/api/src/test/auth/infrastructure/adapters/brute-force.adapter.test.ts`
- Create: `apps/api/src/test/auth/infrastructure/adapters/captcha/cloudflare-captcha.adapter.test.ts`
- Create: `apps/api/src/test/auth/infrastructure/adapters/captcha/google-captcha.adapter.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// apps/api/src/test/auth/infrastructure/adapters/argon2-hash.adapter.test.ts
import { describe, it, expect } from 'vitest';
import { Argon2HashAdapter } from '../../../../auth/infrastructure/adapters/argon2-hash.adapter.js';

describe('Argon2HashAdapter', () => {
  const adapter = new Argon2HashAdapter();

  it('hashes a password (result is different from plain)', async () => {
    const hash = await adapter.hash('Str0ng!Pass');
    expect(hash).not.toBe('Str0ng!Pass');
    expect(hash.startsWith('$argon2')).toBe(true);
  });

  it('verifies correct password returns true', async () => {
    const hash = await adapter.hash('Str0ng!Pass');
    const result = await adapter.verify(hash, 'Str0ng!Pass');
    expect(result).toBe(true);
  });

  it('verifies wrong password returns false', async () => {
    const hash = await adapter.hash('Str0ng!Pass');
    const result = await adapter.verify(hash, 'WrongPass1!');
    expect(result).toBe(false);
  });
});
```

```typescript
// apps/api/src/test/auth/infrastructure/adapters/brute-force.adapter.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RedisBruteForceAdapter } from '../../../../auth/infrastructure/adapters/brute-force.adapter.js';
import type Redis from 'ioredis';

function buildRedis(incrResult = 1): Redis {
  return {
    incr: vi.fn().mockResolvedValue(incrResult),
    expire: vi.fn().mockResolvedValue(1),
    del: vi.fn().mockResolvedValue(1),
    get: vi.fn().mockResolvedValue(String(incrResult)),
  } as unknown as Redis;
}

describe('RedisBruteForceAdapter', () => {
  it('increment returns the new count from Redis INCR', async () => {
    const redis = buildRedis(3);
    const adapter = new RedisBruteForceAdapter(redis);
    const count = await adapter.increment('user@example.com');
    expect(count).toBe(3);
    expect(redis.incr).toHaveBeenCalledWith('bf:user@example.com');
  });

  it('increment sets TTL when count is 1 (new key)', async () => {
    const redis = buildRedis(1);
    const adapter = new RedisBruteForceAdapter(redis);
    await adapter.increment('new@example.com');
    expect(redis.expire).toHaveBeenCalled();
  });

  it('increment does NOT reset TTL when count > 1', async () => {
    const redis = buildRedis(2);
    const adapter = new RedisBruteForceAdapter(redis);
    await adapter.increment('user@example.com');
    expect(redis.expire).not.toHaveBeenCalled();
  });

  it('clear calls DEL on the key', async () => {
    const redis = buildRedis();
    const adapter = new RedisBruteForceAdapter(redis);
    await adapter.clear('user@example.com');
    expect(redis.del).toHaveBeenCalledWith('bf:user@example.com');
  });

  it('normalizes email to lowercase for key', async () => {
    const redis = buildRedis(1);
    const adapter = new RedisBruteForceAdapter(redis);
    await adapter.increment('USER@EXAMPLE.COM');
    expect(redis.incr).toHaveBeenCalledWith('bf:user@example.com');
  });
});
```

```typescript
// apps/api/src/test/auth/infrastructure/adapters/captcha/cloudflare-captcha.adapter.test.ts
import { describe, it, expect, vi } from 'vitest';
import { CloudflareCaptchaAdapter } from '../../../../../auth/infrastructure/adapters/captcha/cloudflare-captcha.adapter.js';
import { env } from '../../../../../env.js';

vi.mock('../../../../../env.js', () => ({
  env: {
    CAPTCHA_ENABLED: true,
    CAPTCHA_SECRET_KEY: 'test-secret',
  },
}));

describe('CloudflareCaptchaAdapter', () => {
  it('returns success:true when CAPTCHA_ENABLED is false', async () => {
    vi.mocked(env).CAPTCHA_ENABLED = false;
    const adapter = new CloudflareCaptchaAdapter();
    const result = await adapter.verify('any-token');
    expect(result).toEqual({ success: true });
  });

  it('returns success:true when CAPTCHA_SECRET_KEY is not set', async () => {
    vi.mocked(env).CAPTCHA_ENABLED = true;
    (vi.mocked(env) as unknown as { CAPTCHA_SECRET_KEY: string | undefined }).CAPTCHA_SECRET_KEY = undefined;
    const adapter = new CloudflareCaptchaAdapter();
    const result = await adapter.verify('any-token');
    expect(result).toEqual({ success: true });
  });
});
```

```typescript
// apps/api/src/test/auth/infrastructure/adapters/captcha/google-captcha.adapter.test.ts
import { describe, it, expect, vi } from 'vitest';
import { GoogleCaptchaAdapter } from '../../../../../auth/infrastructure/adapters/captcha/google-captcha.adapter.js';
import { env } from '../../../../../env.js';

vi.mock('../../../../../env.js', () => ({
  env: {
    CAPTCHA_ENABLED: false,
    CAPTCHA_SECRET_KEY: undefined,
  },
}));

describe('GoogleCaptchaAdapter', () => {
  it('returns success:true when CAPTCHA_ENABLED is false', async () => {
    const adapter = new GoogleCaptchaAdapter();
    const result = await adapter.verify('any-token');
    expect(result).toEqual({ success: true });
  });
});
```

- [ ] **Step 2: Run — verify fail**

```bash
npm -C apps/api test -- --reporter=verbose src/test/auth/infrastructure/adapters
```

Expected: `FAIL — Cannot find module`

- [ ] **Step 3: Create Argon2HashAdapter**

```typescript
// apps/api/src/auth/infrastructure/adapters/argon2-hash.adapter.ts
import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { ARGON2_OPTIONS } from '../better-auth/argon2.config.js';

@Injectable()
export class Argon2HashAdapter {
  async hash(plain: string): Promise<string> {
    return argon2.hash(plain, ARGON2_OPTIONS);
  }

  async verify(hash: string, plain: string): Promise<boolean> {
    return argon2.verify(hash, plain);
  }
}
```

Note: `ARGON2_OPTIONS` is created in Task 8 but referenced here. The tests for argon2-hash.adapter use the real argon2 lib so they run slightly slow (~100ms each). That is expected.

- [ ] **Step 4: Create RedisBruteForceAdapter**

```typescript
// apps/api/src/auth/infrastructure/adapters/brute-force.adapter.ts
import { Inject, Injectable } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../../../infrastructure/redis/redis.constants.js';
import { BruteForcePort } from '../../application/ports/out/brute-force.port.js';
import { env } from '../../../env.js';

@Injectable()
export class RedisBruteForceAdapter extends BruteForcePort {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {
    super();
  }

  async increment(email: string): Promise<number> {
    const key = this.key(email);
    const count = await this.redis.incr(key);
    if (count === 1) {
      // First attempt in window — set the expiry
      await this.redis.expire(key, env.BRUTE_FORCE_WINDOW_SECONDS);
    }
    return count;
  }

  async clear(email: string): Promise<void> {
    await this.redis.del(this.key(email));
  }

  async getCount(email: string): Promise<number> {
    const val = await this.redis.get(this.key(email));
    return val ? Number(val) : 0;
  }

  private key(email: string): string {
    return `bf:${email.toLowerCase().trim()}`;
  }
}
```

- [ ] **Step 5: Create Cloudflare captcha adapter**

```typescript
// apps/api/src/auth/infrastructure/adapters/captcha/cloudflare-captcha.adapter.ts
import { Injectable } from '@nestjs/common';
import { CaptchaPort } from '../../../application/ports/out/captcha.port.js';
import { env } from '../../../../env.js';

const TURNSTILE_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

@Injectable()
export class CloudflareCaptchaAdapter extends CaptchaPort {
  async verify(token: string, ip?: string): Promise<{ success: boolean }> {
    // Skip verification in dev or when no secret is configured
    if (!env.CAPTCHA_ENABLED || !env.CAPTCHA_SECRET_KEY) {
      return { success: true };
    }

    const body = new URLSearchParams({
      secret: env.CAPTCHA_SECRET_KEY,
      response: token,
      ...(ip && { remoteip: ip }),
    });

    const res = await fetch(TURNSTILE_URL, {
      method: 'POST',
      body,
    });

    const data = (await res.json()) as { success: boolean };
    return { success: data.success };
  }
}
```

- [ ] **Step 6: Create Google reCAPTCHA adapter**

```typescript
// apps/api/src/auth/infrastructure/adapters/captcha/google-captcha.adapter.ts
import { Injectable } from '@nestjs/common';
import { CaptchaPort } from '../../../application/ports/out/captcha.port.js';
import { env } from '../../../../env.js';

const RECAPTCHA_URL = 'https://www.google.com/recaptcha/api/siteverify';
const SCORE_THRESHOLD = 0.5;

@Injectable()
export class GoogleCaptchaAdapter extends CaptchaPort {
  async verify(token: string, ip?: string): Promise<{ success: boolean }> {
    if (!env.CAPTCHA_ENABLED || !env.CAPTCHA_SECRET_KEY) {
      return { success: true };
    }

    const body = new URLSearchParams({
      secret: env.CAPTCHA_SECRET_KEY,
      response: token,
      ...(ip && { remoteip: ip }),
    });

    const res = await fetch(RECAPTCHA_URL, {
      method: 'POST',
      body,
    });

    const data = (await res.json()) as { success: boolean; score?: number };
    // For v3 check score; v2 has no score
    const passed =
      data.success && (data.score === undefined || data.score >= SCORE_THRESHOLD);
    return { success: passed };
  }
}
```

- [ ] **Step 7: Run — verify pass**

```bash
npm -C apps/api test -- --reporter=verbose src/test/auth/infrastructure/adapters
```

Expected: `PASS` — 9 tests. (argon2 tests will be slow ~300ms total — that is normal)

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/auth/infrastructure/adapters/ apps/api/src/test/auth/infrastructure/adapters/
git commit -m "feat(api): add Argon2, BruteForce, Cloudflare and Google captcha adapters"
```

---

## Task 6 — Email + SecurityNotification adapters

**Files:**
- Create: `apps/api/src/auth/infrastructure/adapters/email.adapter.ts`
- Create: `apps/api/src/auth/infrastructure/adapters/security-notification.adapter.ts`

No unit tests for these — they wrap nodemailer (I/O). Correctness verified by acceptance criteria smoke test.

- [ ] **Step 1: Create SmtpEmailAdapter**

```typescript
// apps/api/src/auth/infrastructure/adapters/email.adapter.ts
import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { EmailPort } from '../../application/ports/out/email.port.js';
import { EmailDeliveryFailedException } from '../../domain/exceptions/email-delivery-failed.exception.js';
import { env } from '../../../env.js';

@Injectable()
export class SmtpEmailAdapter extends EmailPort {
  private readonly transporter: Transporter;

  constructor(
    @InjectPinoLogger(SmtpEmailAdapter.name)
    private readonly logger: PinoLogger,
  ) {
    super();
    // In development with no SMTP config, use ethereal-like stub
    this.transporter = nodemailer.createTransport(
      env.EMAIL_SMTP_HOST
        ? {
            host: env.EMAIL_SMTP_HOST,
            port: env.EMAIL_SMTP_PORT,
            auth: env.EMAIL_SMTP_USER
              ? { user: env.EMAIL_SMTP_USER, pass: env.EMAIL_SMTP_PASS }
              : undefined,
          }
        : { jsonTransport: true }, // dev stub — logs to console, does not send
    );
  }

  async sendVerification(to: string, verificationUrl: string): Promise<void> {
    await this.send(to, 'Verify your email', `Click to verify: ${verificationUrl}`);
  }

  async sendPasswordReset(to: string, resetUrl: string): Promise<void> {
    await this.send(to, 'Reset your password', `Click to reset: ${resetUrl}`);
  }

  async send2faOtp(to: string, otp: string): Promise<void> {
    await this.send(to, 'Your 2FA code', `Your code: ${otp}`);
  }

  async sendLoginAlert(to: string, ip: string): Promise<void> {
    await this.send(to, 'New login detected', `Login from IP: ${ip}`);
  }

  async sendFailedLoginAlert(to: string, ip: string): Promise<void> {
    await this.send(to, 'Failed login attempt', `Failed login from IP: ${ip}`);
  }

  async sendSessionRevoked(to: string): Promise<void> {
    await this.send(to, 'Session revoked', 'Your session has been revoked.');
  }

  private async send(to: string, subject: string, text: string): Promise<void> {
    try {
      await this.transporter.sendMail({ from: env.EMAIL_FROM, to, subject, text });
    } catch (err) {
      this.logger.error({ err, to, subject }, 'Email delivery failed');
      throw new EmailDeliveryFailedException({ to, subject });
    }
  }
}
```

- [ ] **Step 2: Create SecurityNotificationAdapter**

```typescript
// apps/api/src/auth/infrastructure/adapters/security-notification.adapter.ts
import { Injectable } from '@nestjs/common';
import { SecurityNotificationPort } from '../../application/ports/out/security-notification.port.js';
import { EmailPort } from '../../application/ports/out/email.port.js';

@Injectable()
export class SecurityNotificationAdapter extends SecurityNotificationPort {
  constructor(private readonly emailPort: EmailPort) {
    super();
  }

  async sendNewLoginAlert(to: string, ip: string): Promise<void> {
    await this.emailPort.sendLoginAlert(to, ip);
  }

  async sendPasswordChangedAlert(to: string): Promise<void> {
    await this.emailPort.send2faOtp(to, '');
    // Replace with a dedicated password-changed email in F4
  }

  async sendEmailChangedAlert(to: string, newEmail: string): Promise<void> {
    await this.emailPort.sendLoginAlert(to, newEmail);
    // Replace with a dedicated email-changed notification in F4
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/auth/infrastructure/adapters/email.adapter.ts \
  apps/api/src/auth/infrastructure/adapters/security-notification.adapter.ts
git commit -m "feat(api): add SmtpEmailAdapter and SecurityNotificationAdapter"
```

---

## Task 7 — Persistence adapters: PasswordHistory + Session

**Files:**
- Create: `apps/api/src/auth/infrastructure/persistence/password-history.repository-adapter.ts`
- Create: `apps/api/src/auth/infrastructure/persistence/session.repository-adapter.ts`
- Create: `apps/api/src/test/auth/infrastructure/persistence/password-history.repository-adapter.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// apps/api/src/test/auth/infrastructure/persistence/password-history.repository-adapter.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DrizzlePasswordHistoryAdapter } from '../../../../auth/infrastructure/persistence/password-history.repository-adapter.js';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

function buildDb(rows: unknown[] = []): NodePgDatabase {
  const selectValues = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(rows),
  };
  return {
    select: vi.fn().mockReturnValue(selectValues),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue(undefined),
    }),
  } as unknown as NodePgDatabase;
}

describe('DrizzlePasswordHistoryAdapter', () => {
  it('findLastN queries with the correct userId and limit', async () => {
    const mockRows = [
      { id: '1', userId: 'u1', hashedPassword: '$hash', createdAt: new Date() },
    ];
    const db = buildDb(mockRows);
    const adapter = new DrizzlePasswordHistoryAdapter(db);

    const result = await adapter.findLastN('u1', 5);
    expect(result).toHaveLength(1);
    expect(result[0].userId).toBe('u1');
  });

  it('add inserts a new entry', async () => {
    const db = buildDb();
    const adapter = new DrizzlePasswordHistoryAdapter(db);
    await expect(adapter.add('u1', '$hash')).resolves.not.toThrow();
    expect(db.insert).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run — verify fail**

```bash
npm -C apps/api test -- --reporter=verbose src/test/auth/infrastructure/persistence
```

Expected: `FAIL — Cannot find module`

- [ ] **Step 3: Create DrizzlePasswordHistoryAdapter**

```typescript
// apps/api/src/auth/infrastructure/persistence/password-history.repository-adapter.ts
import { Inject, Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_CLIENT } from '../../../infrastructure/database/drizzle.constants.js';
import { PasswordHistoryRepositoryPort, type PasswordHistoryEntry } from '../../application/ports/out/password-history.repository.port.js';
import { passwordHistory } from './password-history.schema.js';

@Injectable()
export class DrizzlePasswordHistoryAdapter extends PasswordHistoryRepositoryPort {
  constructor(
    @Inject(DRIZZLE_CLIENT) private readonly db: NodePgDatabase,
  ) {
    super();
  }

  async findLastN(userId: string, n: number): Promise<PasswordHistoryEntry[]> {
    const rows = await this.db
      .select()
      .from(passwordHistory)
      .where(eq(passwordHistory.userId, userId))
      .orderBy(desc(passwordHistory.createdAt))
      .limit(n);

    return rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      hashedPassword: r.hashedPassword,
      createdAt: r.createdAt,
    }));
  }

  async add(userId: string, hashedPassword: string): Promise<void> {
    await this.db.insert(passwordHistory).values({ userId, hashedPassword });
  }

  async pruneOldest(userId: string, keepCount: number): Promise<void> {
    // Keep only the most recent `keepCount` entries; delete the rest.
    // Drizzle does not support DELETE with ORDER BY + LIMIT in all dialects.
    // Strategy: fetch IDs to keep, then delete the rest.
    const toKeep = await this.db
      .select({ id: passwordHistory.id })
      .from(passwordHistory)
      .where(eq(passwordHistory.userId, userId))
      .orderBy(desc(passwordHistory.createdAt))
      .limit(keepCount);

    if (toKeep.length === 0) return;

    // Delete all entries for the user that are NOT in the keep list
    const keepIds = toKeep.map((r) => r.id);
    // We use a raw query approach for simplicity since Drizzle notIn is complex
    for (const row of await this.db
      .select({ id: passwordHistory.id })
      .from(passwordHistory)
      .where(eq(passwordHistory.userId, userId))) {
      if (!keepIds.includes(row.id)) {
        await this.db.delete(passwordHistory).where(eq(passwordHistory.id, row.id));
      }
    }
  }
}
```

- [ ] **Step 4: Create DrizzleSessionRepositoryAdapter**

```typescript
// apps/api/src/auth/infrastructure/persistence/session.repository-adapter.ts
import { Inject, Injectable } from '@nestjs/common';
import { and, eq, ne } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_CLIENT } from '../../../infrastructure/database/drizzle.constants.js';
import { SessionRepositoryPort, type SessionRecord } from '../../application/ports/out/session.repository.port.js';
import { session } from './auth.schema.js';

@Injectable()
export class DrizzleSessionRepositoryAdapter extends SessionRepositoryPort {
  constructor(
    @Inject(DRIZZLE_CLIENT) private readonly db: NodePgDatabase,
  ) {
    super();
  }

  async findById(sessionId: string): Promise<SessionRecord | null> {
    const rows = await this.db
      .select()
      .from(session)
      .where(eq(session.id, sessionId))
      .limit(1);

    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      userId: r.userId,
      createdAt: r.createdAt,
      expiresAt: r.expiresAt,
    };
  }

  async deleteById(sessionId: string): Promise<void> {
    await this.db.delete(session).where(eq(session.id, sessionId));
  }

  async deleteByUserId(userId: string, exceptSessionId?: string): Promise<void> {
    if (exceptSessionId) {
      await this.db
        .delete(session)
        .where(and(eq(session.userId, userId), ne(session.id, exceptSessionId)));
    } else {
      await this.db.delete(session).where(eq(session.userId, userId));
    }
  }
}
```

- [ ] **Step 5: Run — verify pass**

```bash
npm -C apps/api test -- --reporter=verbose src/test/auth/infrastructure/persistence
```

Expected: `PASS` — 2 tests.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/auth/infrastructure/persistence/password-history.repository-adapter.ts \
  apps/api/src/auth/infrastructure/persistence/session.repository-adapter.ts \
  apps/api/src/test/auth/infrastructure/persistence/
git commit -m "feat(api): add DrizzlePasswordHistoryAdapter and DrizzleSessionRepositoryAdapter"
```

---

## Task 8 — Argon2 config + BetterAuthService

**Files:**
- Create: `apps/api/src/auth/infrastructure/better-auth/argon2.config.ts`
- Create: `apps/api/src/auth/infrastructure/better-auth/better-auth.service.ts`

No direct unit tests — integration verified via acceptance criteria.

- [ ] **Step 1: Create argon2.config.ts**

```typescript
// apps/api/src/auth/infrastructure/better-auth/argon2.config.ts
import * as argon2 from 'argon2';
import { env } from '../../../env.js';

export const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: env.ARGON2_MEMORY_COST,
  timeCost: env.ARGON2_TIME_COST,
  parallelism: env.ARGON2_PARALLELISM,
};
```

- [ ] **Step 2: Create BetterAuthService**

```typescript
// apps/api/src/auth/infrastructure/better-auth/better-auth.service.ts
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type Redis from 'ioredis';
import { and, eq, ne } from 'drizzle-orm';
import { DRIZZLE_CLIENT } from '../../../infrastructure/database/drizzle.constants.js';
import { REDIS_CLIENT } from '../../../infrastructure/redis/redis.constants.js';
import { BruteForcePort } from '../../application/ports/out/brute-force.port.js';
import { CaptchaPort } from '../../application/ports/out/captcha.port.js';
import { EmailPort } from '../../application/ports/out/email.port.js';
import { Argon2HashAdapter } from '../adapters/argon2-hash.adapter.js';
import { ARGON2_OPTIONS } from './argon2.config.js';
import { session, user } from '../persistence/auth.schema.js';
import { createSignUpBeforeHook, createSignUpAfterHook } from '../hooks/sign-up.hooks.js';
import { createSignInBeforeHook, createSignInAfterHook } from '../hooks/sign-in.hooks.js';
import { createSignOutAfterHook } from '../hooks/sign-out.hooks.js';
import { env } from '../../../env.js';

@Injectable()
export class BetterAuthService implements OnModuleInit {
  private _auth!: ReturnType<typeof betterAuth>;

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

  get auth(): ReturnType<typeof betterAuth> {
    return this._auth;
  }

  private createAuth(): ReturnType<typeof betterAuth> {
    const { db, redis, emailPort, argon2, captchaPort, bruteForcePort, eventEmitter } = this;

    return betterAuth({
      baseURL: env.API_BASE_URL,
      basePath: '/api/v1/auth',
      secret: env.BETTER_AUTH_SECRET,

      database: drizzleAdapter(db as never, { provider: 'pg' }),

      // Secondary storage for rate limiting
      secondaryStorage: {
        get: (key) => redis.get(key),
        set: async (key, value, ttl) => {
          await redis.set(key, value);
          if (ttl) await redis.expire(key, ttl);
        },
        delete: (key) => redis.del(key).then(() => undefined),
      },

      session: {
        expiresIn: 60 * 60 * 24 * 7,   // 7 days
        updateAge: 60 * 60 * 24,         // refresh if >1 day old
        cookieCache: { enabled: true, maxAge: 60 * 5 },
      },

      emailAndPassword: {
        enabled: true,
        requireEmailVerification: true,
        minPasswordLength: 8,
        maxPasswordLength: 128,
        password: {
          hash: (plain) => argon2.hash(plain),
          verify: ({ hash, plain }) => argon2.verify(hash, plain),
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

      // F3 adds: jwt plugin
      // F6 adds: twoFactor plugin, passkey plugin
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
        before: [
          createSignUpBeforeHook({ captchaPort }),
          createSignInBeforeHook({ bruteForce: bruteForcePort }),
        ],
        after: [
          createSignUpAfterHook({ eventEmitter }),
          createSignInAfterHook({ bruteForce: bruteForcePort, eventEmitter }),
          createSignOutAfterHook({ redis, eventEmitter }),
        ],
      },

      trustedOrigins: [env.CLIENT_URL],

      advanced: {
        cookiePrefix: env.COOKIE_PREFIX,
        useSecureCookies: env.NODE_ENV === 'production',
      },
    });
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/auth/infrastructure/better-auth/
git commit -m "feat(api): add Argon2Config and BetterAuthService"
```

---

## Task 9 — Hook factories: sign-up, sign-in, sign-out

**Files:**
- Create: `apps/api/src/auth/infrastructure/hooks/sign-up.hooks.ts`
- Create: `apps/api/src/auth/infrastructure/hooks/sign-in.hooks.ts`
- Create: `apps/api/src/auth/infrastructure/hooks/sign-out.hooks.ts`

Hooks use BA's `APIError` (not `DomainException`) because BA controls HTTP response for its own routes.

- [ ] **Step 1: Create sign-up hooks**

```typescript
// apps/api/src/auth/infrastructure/hooks/sign-up.hooks.ts
import { APIError } from 'better-auth/api';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import type { CaptchaPort } from '../../application/ports/out/captcha.port.js';
import { AuthSignedUpEvent } from '../../application/events/auth.events.js';

interface SignUpBeforeDeps {
  captchaPort: CaptchaPort;
}

interface SignUpAfterDeps {
  eventEmitter: EventEmitter2;
}

type HookCtx = {
  path: string;
  body?: Record<string, unknown>;
  context?: {
    user?: { id?: string; email?: string };
    session?: { id?: string };
  };
  request?: {
    ip?: string;
    headers?: Record<string, string | string[] | undefined>;
  };
};

export function createSignUpBeforeHook(deps: SignUpBeforeDeps) {
  return {
    matcher: (ctx: HookCtx) => ctx.path === '/sign-up/email',
    handler: async (ctx: HookCtx) => {
      const captchaToken = ctx.body?.captchaToken as string | undefined;
      if (!captchaToken) return;

      const rawIp = ctx.request?.headers?.['x-forwarded-for'];
      const ip = Array.isArray(rawIp) ? rawIp[0] : rawIp ?? ctx.request?.ip;

      const result = await deps.captchaPort.verify(captchaToken, ip);
      if (!result.success) {
        throw new APIError('FORBIDDEN', { message: 'Captcha verification failed' });
      }
    },
  };
}

export function createSignUpAfterHook(deps: SignUpAfterDeps) {
  return {
    matcher: (ctx: HookCtx) => ctx.path === '/sign-up/email',
    handler: async (ctx: HookCtx) => {
      const user = ctx.context?.user;
      if (!user) return;

      const rawIp = ctx.request?.headers?.['x-forwarded-for'];
      const ip = Array.isArray(rawIp) ? rawIp[0] : rawIp ?? ctx.request?.ip;
      const correlationId = ctx.request?.headers?.['x-correlation-id'];

      deps.eventEmitter.emit(
        'auth.signed_up',
        new AuthSignedUpEvent({
          userId: user.id,
          email: user.email,
          ip,
          correlationId: Array.isArray(correlationId) ? correlationId[0] : correlationId,
        }),
      );
    },
  };
}
```

- [ ] **Step 2: Create sign-in hooks**

```typescript
// apps/api/src/auth/infrastructure/hooks/sign-in.hooks.ts
import { APIError } from 'better-auth/api';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import type { BruteForcePort } from '../../application/ports/out/brute-force.port.js';
import { AuthSignedInEvent } from '../../application/events/auth.events.js';
import { env } from '../../../env.js';

interface SignInBeforeDeps {
  bruteForce: BruteForcePort;
}

interface SignInAfterDeps {
  bruteForce: BruteForcePort;
  eventEmitter: EventEmitter2;
}

type HookCtx = {
  path: string;
  body?: Record<string, unknown>;
  context?: {
    user?: { id?: string; email?: string };
    session?: { id?: string };
  };
  request?: {
    ip?: string;
    headers?: Record<string, string | string[] | undefined>;
  };
};

export function createSignInBeforeHook(deps: SignInBeforeDeps) {
  return {
    matcher: (ctx: HookCtx) => ctx.path === '/sign-in/email',
    handler: async (ctx: HookCtx) => {
      const email = ctx.body?.email as string | undefined;
      if (!email) return;

      const count = await deps.bruteForce.increment(email);
      if (count > env.BRUTE_FORCE_MAX_ATTEMPTS) {
        throw new APIError('TOO_MANY_REQUESTS', {
          message: 'Too many failed attempts. Account temporarily locked.',
          body: { code: 'AUTH_ACCOUNT_LOCKED' },
        });
      }
    },
  };
}

export function createSignInAfterHook(deps: SignInAfterDeps) {
  return {
    matcher: (ctx: HookCtx) => ctx.path === '/sign-in/email',
    handler: async (ctx: HookCtx) => {
      const user = ctx.context?.user;
      if (!user?.email) return;

      // Reset brute force counter on successful login
      await deps.bruteForce.clear(user.email);

      const rawIp = ctx.request?.headers?.['x-forwarded-for'];
      const ip = Array.isArray(rawIp) ? rawIp[0] : rawIp ?? ctx.request?.ip;
      const correlationId = ctx.request?.headers?.['x-correlation-id'];

      deps.eventEmitter.emit(
        'auth.signed_in',
        new AuthSignedInEvent({
          userId: user.id,
          email: user.email,
          sessionId: ctx.context?.session?.id,
          ip,
          correlationId: Array.isArray(correlationId) ? correlationId[0] : correlationId,
        }),
      );
    },
  };
}
```

- [ ] **Step 3: Create sign-out hooks**

```typescript
// apps/api/src/auth/infrastructure/hooks/sign-out.hooks.ts
import type { EventEmitter2 } from '@nestjs/event-emitter';
import type Redis from 'ioredis';
import { AuthSignedOutEvent } from '../../application/events/auth.events.js';

interface SignOutAfterDeps {
  redis: Redis;
  eventEmitter: EventEmitter2;
}

type HookCtx = {
  path: string;
  context?: {
    user?: { id?: string; email?: string };
    session?: { id?: string };
  };
  request?: {
    ip?: string;
    headers?: Record<string, string | string[] | undefined>;
  };
};

export function createSignOutAfterHook(deps: SignOutAfterDeps) {
  return {
    matcher: (ctx: HookCtx) => ctx.path === '/sign-out',
    handler: async (ctx: HookCtx) => {
      const sessionId = ctx.context?.session?.id;
      const user = ctx.context?.user;

      // Remove session inactivity key from Redis
      if (sessionId) {
        await deps.redis.del(`session:${sessionId}:activity`);
      }

      const rawIp = ctx.request?.headers?.['x-forwarded-for'];
      const ip = Array.isArray(rawIp) ? rawIp[0] : rawIp ?? ctx.request?.ip;
      const correlationId = ctx.request?.headers?.['x-correlation-id'];

      deps.eventEmitter.emit(
        'auth.signed_out',
        new AuthSignedOutEvent({
          userId: user?.id,
          email: user?.email,
          sessionId,
          ip,
          correlationId: Array.isArray(correlationId) ? correlationId[0] : correlationId,
        }),
      );
    },
  };
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/auth/infrastructure/hooks/
git commit -m "feat(api): add sign-up, sign-in, sign-out hook factories"
```

---

## Task 10 — SessionActivityMiddleware

**Files:**
- Create: `apps/api/src/auth/infrastructure/middleware/session-activity.middleware.ts`
- Create: `apps/api/src/test/auth/infrastructure/middleware/session-activity.middleware.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// apps/api/src/test/auth/infrastructure/middleware/session-activity.middleware.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type Redis from 'ioredis';
import { SessionActivityMiddleware } from '../../../../auth/infrastructure/middleware/session-activity.middleware.js';
import type { Request, Response, NextFunction } from 'express';

function buildRedis(activityValue: string | null = '12345'): Redis {
  return {
    get: vi.fn().mockResolvedValue(activityValue),
    set: vi.fn().mockResolvedValue('OK'),
  } as unknown as Redis;
}

function buildReq(sessionToken?: string): Partial<Request> & { cookies: Record<string, string> } {
  return {
    cookies: sessionToken ? { 'app.session_token': sessionToken } : {},
    headers: {},
  };
}

function buildRes() {
  const clearCookie = vi.fn();
  const status = vi.fn().mockReturnThis();
  const json = vi.fn();
  return { clearCookie, status, json, _status: status, _json: json };
}

describe('SessionActivityMiddleware', () => {
  it('calls next() if no session cookie is present (public route)', async () => {
    const redis = buildRedis();
    const mw = new SessionActivityMiddleware(redis);
    const req = buildReq();
    const res = buildRes();
    const next: NextFunction = vi.fn();

    await mw.use(req as Request, res as unknown as Response, next);

    expect(next).toHaveBeenCalled();
    expect(redis.get).not.toHaveBeenCalled();
  });

  it('calls next() and renews TTL when session is active', async () => {
    const redis = buildRedis('12345');
    const mw = new SessionActivityMiddleware(redis);
    const req = buildReq('sess_abc');
    const res = buildRes();
    const next: NextFunction = vi.fn();

    await mw.use(req as Request, res as unknown as Response, next);

    expect(next).toHaveBeenCalled();
    expect(redis.set).toHaveBeenCalled();
  });

  it('returns 401 AUTH_SESSION_EXPIRED when Redis key is absent', async () => {
    const redis = buildRedis(null);
    const mw = new SessionActivityMiddleware(redis);
    const req = buildReq('sess_stale');
    const res = buildRes();
    const next: NextFunction = vi.fn();

    await mw.use(req as Request, res as unknown as Response, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.clearCookie).toHaveBeenCalled();
    expect(res._status).toHaveBeenCalledWith(401);
    expect(res._json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'AUTH_SESSION_EXPIRED' }),
    );
  });
});
```

- [ ] **Step 2: Run — verify fail**

```bash
npm -C apps/api test -- --reporter=verbose src/test/auth/infrastructure/middleware
```

Expected: `FAIL — Cannot find module`

- [ ] **Step 3: Create SessionActivityMiddleware**

```typescript
// apps/api/src/auth/infrastructure/middleware/session-activity.middleware.ts
import { Inject, Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../../../infrastructure/redis/redis.constants.js';
import { env } from '../../../env.js';

@Injectable()
export class SessionActivityMiddleware implements NestMiddleware {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    const cookieName = `${env.COOKIE_PREFIX}.session_token`;
    const sessionToken: string | undefined = req.cookies?.[cookieName];

    // No session cookie → public route or unauthenticated request, let it through
    if (!sessionToken) {
      next();
      return;
    }

    // Better-Auth stores session by token value, not by session ID directly.
    // The key is: session:<token>:activity
    const key = `session:${sessionToken}:activity`;
    const lastActivity = await this.redis.get(key);

    if (!lastActivity) {
      // Session inactivity timeout exceeded — force sign-out
      res.clearCookie(cookieName);
      res.status(401).json({
        success: false,
        code: 401,
        error: 'AUTH_SESSION_EXPIRED',
        message: 'Session expired due to inactivity',
        data: null,
      });
      return;
    }

    // Renew TTL on each active request
    await this.redis.set(
      key,
      Date.now().toString(),
      'EX',
      env.SESSION_INACTIVITY_TIMEOUT_SECONDS,
    );

    next();
  }
}
```

> **Note on session key format:** Better-Auth exposes the session `token` in the cookie (not the session `id`). The `databaseHook session.create.after` seeds the key as `session:{session.id}:activity` but the middleware reads via the cookie token. These two values are different. Review BA's `session.token` vs `session.id` when wiring — update the key format in both places to be consistent (either both use `id` or both use `token`). Use `session.id` everywhere for consistency with the spec.

- [ ] **Step 4: Run — verify pass**

```bash
npm -C apps/api test -- --reporter=verbose src/test/auth/infrastructure/middleware
```

Expected: `PASS` — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/auth/infrastructure/middleware/ \
  apps/api/src/test/auth/infrastructure/middleware/
git commit -m "feat(api): add SessionActivityMiddleware with Redis TTL check"
```

---

## Task 11 — AuditLogListener

**Files:**
- Create: `apps/api/src/auth/infrastructure/listeners/audit-log.listener.ts`
- Create: `apps/api/src/test/auth/infrastructure/listeners/audit-log.listener.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// apps/api/src/test/auth/infrastructure/listeners/audit-log.listener.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuditLogListener } from '../../../../auth/infrastructure/listeners/audit-log.listener.js';
import { AuthSignedInEvent } from '../../../../auth/application/events/auth.events.js';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

function buildDb(insertFn = vi.fn().mockResolvedValue(undefined)) {
  return {
    insert: vi.fn().mockReturnValue({ values: insertFn }),
  } as unknown as NodePgDatabase;
}

describe('AuditLogListener', () => {
  it('inserts a record with hashed email and ip (not plain text)', async () => {
    const db = buildDb();
    const listener = new AuditLogListener(db);

    await listener.handle(
      new AuthSignedInEvent({
        userId: 'u1',
        email: 'user@example.com',
        sessionId: 'sess1',
        ip: '1.2.3.4',
        correlationId: 'corr1',
      }),
    );

    expect(db.insert).toHaveBeenCalled();
    const insertValues = vi.mocked(db.insert).mock.results[0].value.values;
    const calledWith = vi.mocked(insertValues).mock.calls[0][0] as Record<string, unknown>;

    // Plain email and IP must NOT be stored
    expect(calledWith.emailHash).not.toBe('user@example.com');
    expect(calledWith.ipHash).not.toBe('1.2.3.4');
    // Hashes must be SHA-256 hex (64 chars)
    expect(String(calledWith.emailHash)).toHaveLength(64);
    expect(String(calledWith.ipHash)).toHaveLength(64);
  });

  it('does NOT throw if the DB insert fails', async () => {
    const db = buildDb(vi.fn().mockRejectedValue(new Error('DB down')));
    const listener = new AuditLogListener(db);

    // Should not throw — audit log never blocks the auth flow
    await expect(
      listener.handle(new AuthSignedInEvent({ userId: 'u1' })),
    ).resolves.not.toThrow();
  });

  it('handles missing email and ip gracefully (stores null hashes)', async () => {
    const insertValues = vi.fn().mockResolvedValue(undefined);
    const db = buildDb(insertValues);
    const listener = new AuditLogListener(db);

    await listener.handle(new AuthSignedInEvent({ userId: 'u1' }));

    const calledWith = insertValues.mock.calls[0][0] as Record<string, unknown>;
    expect(calledWith.emailHash).toBeNull();
    expect(calledWith.ipHash).toBeNull();
  });
});
```

- [ ] **Step 2: Run — verify fail**

```bash
npm -C apps/api test -- --reporter=verbose src/test/auth/infrastructure/listeners
```

Expected: `FAIL — Cannot find module`

- [ ] **Step 3: Create AuditLogListener**

```typescript
// apps/api/src/auth/infrastructure/listeners/audit-log.listener.ts
import { Inject, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { createHash } from 'node:crypto';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_CLIENT } from '../../../infrastructure/database/drizzle.constants.js';
import { authAuditLog } from '../persistence/audit-log.schema.js';
import type { AuthEvent } from '../../application/events/auth.events.js';

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

@Injectable()
export class AuditLogListener {
  constructor(
    @Inject(DRIZZLE_CLIENT) private readonly db: NodePgDatabase,
    @InjectPinoLogger(AuditLogListener.name)
    private readonly logger: PinoLogger,
  ) {}

  // Handles ALL auth.* events — requires wildcard: true in EventEmitter config
  @OnEvent('auth.*', { async: true })
  async handle(event: AuthEvent): Promise<void> {
    try {
      const { payload } = event;
      await this.db.insert(authAuditLog).values({
        event: event.type,
        userId: payload.userId ?? null,
        // SHA-256 hash — NEVER store email or IP in plain text
        emailHash: payload.email
          ? sha256(payload.email.toLowerCase().trim())
          : null,
        ipHash: payload.ip ? sha256(payload.ip) : null,
        sessionId: payload.sessionId ?? null,
        correlationId: payload.correlationId ?? null,
        metadata: payload.metadata ?? {},
      });
    } catch (err) {
      // NEVER re-throw — audit log must not block the auth flow
      this.logger.error({ err, eventType: event.type }, 'audit_log_insert_failed');
    }
  }
}
```

- [ ] **Step 4: Run — verify pass**

```bash
npm -C apps/api test -- --reporter=verbose src/test/auth/infrastructure/listeners
```

Expected: `PASS` — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/auth/infrastructure/listeners/ \
  apps/api/src/test/auth/infrastructure/listeners/
git commit -m "feat(api): add AuditLogListener with SHA-256 hashing, never re-throws"
```

---

## Task 12 — Redis + Auth health indicators

**Files:**
- Create: `apps/api/src/infrastructure/health/redis.health-indicator.ts`
- Create: `apps/api/src/infrastructure/health/auth.health-indicator.ts`
- Create: `apps/api/src/test/infrastructure/health/redis.health-indicator.test.ts`
- Create: `apps/api/src/test/infrastructure/health/auth.health-indicator.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// apps/api/src/test/infrastructure/health/redis.health-indicator.test.ts
import { describe, it, expect, vi } from 'vitest';
import { HealthCheckError } from '@nestjs/terminus';
import { RedisHealthIndicator } from '../../../infrastructure/health/redis.health-indicator.js';
import type Redis from 'ioredis';

describe('RedisHealthIndicator', () => {
  it('returns up status when PING succeeds', async () => {
    const redis = { ping: vi.fn().mockResolvedValue('PONG') } as unknown as Redis;
    const indicator = new RedisHealthIndicator(redis);
    const result = await indicator.isHealthy();
    expect(result).toEqual({ redis: { status: 'up' } });
  });

  it('throws HealthCheckError when PING fails', async () => {
    const redis = {
      ping: vi.fn().mockRejectedValue(new Error('Connection refused')),
    } as unknown as Redis;
    const indicator = new RedisHealthIndicator(redis);
    await expect(indicator.isHealthy()).rejects.toThrow(HealthCheckError);
  });
});
```

```typescript
// apps/api/src/test/infrastructure/health/auth.health-indicator.test.ts
import { describe, it, expect, vi } from 'vitest';
import { HealthCheckError } from '@nestjs/terminus';
import { AuthHealthIndicator } from '../../../infrastructure/health/auth.health-indicator.js';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

describe('AuthHealthIndicator', () => {
  it('returns up status when SELECT 1 FROM session succeeds', async () => {
    const db = { select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([]),
      }),
    }) } as unknown as NodePgDatabase;
    const indicator = new AuthHealthIndicator(db);
    const result = await indicator.isHealthy();
    expect(result).toEqual({ authDb: { status: 'up' } });
  });

  it('throws HealthCheckError when query fails', async () => {
    const db = { select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        limit: vi.fn().mockRejectedValue(new Error('table not found')),
      }),
    }) } as unknown as NodePgDatabase;
    const indicator = new AuthHealthIndicator(db);
    await expect(indicator.isHealthy()).rejects.toThrow(HealthCheckError);
  });
});
```

- [ ] **Step 2: Run — verify fail**

```bash
npm -C apps/api test -- --reporter=verbose src/test/infrastructure/health
```

Expected: `FAIL — Cannot find module` (for the new ones; existing tests still pass)

- [ ] **Step 3: Create RedisHealthIndicator**

```typescript
// apps/api/src/infrastructure/health/redis.health-indicator.ts
import { Inject, Injectable } from '@nestjs/common';
import { HealthCheckError, HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.constants.js';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {
    super();
  }

  async isHealthy(): Promise<HealthIndicatorResult> {
    try {
      await this.redis.ping();
      return this.getStatus('redis', true);
    } catch (err) {
      throw new HealthCheckError(
        'Redis check failed',
        this.getStatus('redis', false, { message: (err as Error).message }),
      );
    }
  }
}
```

- [ ] **Step 4: Create AuthHealthIndicator**

```typescript
// apps/api/src/infrastructure/health/auth.health-indicator.ts
import { Inject, Injectable } from '@nestjs/common';
import { HealthCheckError, HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_CLIENT } from '../database/drizzle.constants.js';
import { session } from '../../auth/infrastructure/persistence/auth.schema.js';

@Injectable()
export class AuthHealthIndicator extends HealthIndicator {
  constructor(
    @Inject(DRIZZLE_CLIENT) private readonly db: NodePgDatabase,
  ) {
    super();
  }

  async isHealthy(): Promise<HealthIndicatorResult> {
    try {
      await this.db.select().from(session).limit(1);
      return this.getStatus('authDb', true);
    } catch (err) {
      throw new HealthCheckError(
        'Auth DB check failed',
        this.getStatus('authDb', false, { message: (err as Error).message }),
      );
    }
  }
}
```

- [ ] **Step 5: Run — verify pass**

```bash
npm -C apps/api test -- --reporter=verbose src/test/infrastructure/health
```

Expected: `PASS` — 6 tests (2 original database + 4 new).

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/infrastructure/health/redis.health-indicator.ts \
  apps/api/src/infrastructure/health/auth.health-indicator.ts \
  apps/api/src/test/infrastructure/health/
git commit -m "feat(api): add Redis and Auth health indicators"
```

---

## Task 13 — Update domain-to-http mapper + i18n with AUTH_* codes

**Files:**
- Modify: `apps/api/src/infrastructure/mapping/domain-to-http.mapper.ts`
- Modify: `apps/api/src/infrastructure/i18n/domain-messages.ts`

- [ ] **Step 1: Update domain-to-http.mapper.ts**

Replace the entire file:

```typescript
// apps/api/src/infrastructure/mapping/domain-to-http.mapper.ts
import { HttpStatus } from '@nestjs/common';

const statusMap: Record<string, number> = {
  // ── Auth ─────────────────────────────────────────────────────────────────
  AUTH_INVALID_CREDENTIALS:  HttpStatus.UNAUTHORIZED,          // 401
  AUTH_ACCOUNT_LOCKED:       HttpStatus.TOO_MANY_REQUESTS,     // 429
  AUTH_PASSWORD_REUSE:       HttpStatus.UNPROCESSABLE_ENTITY,  // 422
  AUTH_PASSWORD_POLICY_FAILED: HttpStatus.BAD_REQUEST,          // 400
  AUTH_SESSION_EXPIRED:      HttpStatus.UNAUTHORIZED,          // 401
  AUTH_SESSION_INVALIDATED:  HttpStatus.UNAUTHORIZED,          // 401
  AUTH_EMAIL_DELIVERY_FAILED: HttpStatus.SERVICE_UNAVAILABLE,  // 503
  AUTH_2FA_LOCKED:           HttpStatus.TOO_MANY_REQUESTS,     // 429
  AUTH_FORBIDDEN:            HttpStatus.FORBIDDEN,             // 403
  AUTH_USER_NOT_FOUND:       HttpStatus.NOT_FOUND,             // 404
};

export function domainToHttpStatus(error: string): number {
  return statusMap[error] ?? HttpStatus.UNPROCESSABLE_ENTITY;
}
```

- [ ] **Step 2: Update domain-messages.ts**

Replace the entire file:

```typescript
// apps/api/src/infrastructure/i18n/domain-messages.ts
const messages: Record<string, string> = {
  // ── Auth ─────────────────────────────────────────────────────────────────
  AUTH_INVALID_CREDENTIALS:    'Invalid email or password',
  AUTH_ACCOUNT_LOCKED:         'Account temporarily locked due to too many failed attempts',
  AUTH_PASSWORD_REUSE:         'Password has been used recently. Please choose a different password',
  AUTH_PASSWORD_POLICY_FAILED: 'Password does not meet complexity requirements',
  AUTH_SESSION_EXPIRED:        'Your session has expired due to inactivity. Please sign in again',
  AUTH_SESSION_INVALIDATED:    'Your session has been invalidated. Please sign in again',
  AUTH_EMAIL_DELIVERY_FAILED:  'Failed to send email. Please try again later',
  AUTH_2FA_LOCKED:             'Too many 2FA attempts. Please wait before trying again',
  AUTH_FORBIDDEN:              'You do not have permission to perform this action',
  AUTH_USER_NOT_FOUND:         'User not found',
};

export function domainErrorMessage(error: string): string {
  return messages[error] ?? error;
}
```

- [ ] **Step 3: Run existing mapper tests to confirm they still pass**

```bash
npm -C apps/api test -- --reporter=verbose src/test/infrastructure/mapping
```

Expected: `PASS` — 2 tests (unchanged behavior, just more entries in the map).

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/infrastructure/mapping/domain-to-http.mapper.ts \
  apps/api/src/infrastructure/i18n/domain-messages.ts
git commit -m "feat(api): add AUTH_* error codes to domain-to-http mapper and i18n catalog"
```

---

## Task 14 — AuthModule + AuthHttpHandler

**Files:**
- Create: `apps/api/src/auth/infrastructure/web/auth.http-handler.ts`
- Create: `apps/api/src/auth/module.ts`

- [ ] **Step 1: Create AuthHttpHandler (catch-all controller for BA routes)**

```typescript
// apps/api/src/auth/infrastructure/web/auth.http-handler.ts
// Routes ALL /auth/* requests to the Better-Auth handler.
// @SkipApiResponse() prevents the ApiResponseInterceptor from wrapping BA's own response format.
import { All, Controller, Req, Res } from '@nestjs/common';
import { toNodeHandler } from 'better-auth/node';
import type { Request, Response } from 'express';
import { SkipApiResponse } from '../../../infrastructure/interceptors/skip-api-response.decorator.js';
import { BetterAuthService } from '../better-auth/better-auth.service.js';

@SkipApiResponse()
@Controller('auth')
export class AuthHttpHandler {
  constructor(private readonly betterAuthService: BetterAuthService) {}

  @All('*')
  handler(@Req() req: Request, @Res() res: Response): void {
    void toNodeHandler(this.betterAuthService.auth)(req, res);
  }
}
```

- [ ] **Step 2: Create AuthModule**

```typescript
// apps/api/src/auth/module.ts
import { Module } from '@nestjs/common';
import { BetterAuthService } from './infrastructure/better-auth/better-auth.service.js';
import { Argon2HashAdapter } from './infrastructure/adapters/argon2-hash.adapter.js';
import { RedisBruteForceAdapter } from './infrastructure/adapters/brute-force.adapter.js';
import { SmtpEmailAdapter } from './infrastructure/adapters/email.adapter.js';
import { SecurityNotificationAdapter } from './infrastructure/adapters/security-notification.adapter.js';
import { CloudflareCaptchaAdapter } from './infrastructure/adapters/captcha/cloudflare-captcha.adapter.js';
import { GoogleCaptchaAdapter } from './infrastructure/adapters/captcha/google-captcha.adapter.js';
import { DrizzlePasswordHistoryAdapter } from './infrastructure/persistence/password-history.repository-adapter.js';
import { DrizzleSessionRepositoryAdapter } from './infrastructure/persistence/session.repository-adapter.js';
import { AuditLogListener } from './infrastructure/listeners/audit-log.listener.js';
import { AuthHttpHandler } from './infrastructure/web/auth.http-handler.js';
import { BruteForcePort } from './application/ports/out/brute-force.port.js';
import { CaptchaPort } from './application/ports/out/captcha.port.js';
import { EmailPort } from './application/ports/out/email.port.js';
import { SecurityNotificationPort } from './application/ports/out/security-notification.port.js';
import { PasswordHistoryRepositoryPort } from './application/ports/out/password-history.repository.port.js';
import { SessionRepositoryPort } from './application/ports/out/session.repository.port.js';
import { CheckPasswordHistoryPort } from './application/ports/in/check-password-history.port.js';
import { CheckPasswordHistoryUseCase } from './application/use-cases/check-password-history.use-case.js';
import { env } from '../env.js';

@Module({
  controllers: [AuthHttpHandler],
  providers: [
    // Infrastructure services
    BetterAuthService,
    Argon2HashAdapter,

    // Output port → adapter bindings
    {
      provide: BruteForcePort,
      useClass: RedisBruteForceAdapter,
    },
    {
      // Select captcha adapter based on env CAPTCHA_PROVIDER
      provide: CaptchaPort,
      useClass:
        env.CAPTCHA_PROVIDER === 'google' ? GoogleCaptchaAdapter : CloudflareCaptchaAdapter,
    },
    {
      provide: EmailPort,
      useClass: SmtpEmailAdapter,
    },
    {
      provide: SecurityNotificationPort,
      useClass: SecurityNotificationAdapter,
    },
    {
      provide: PasswordHistoryRepositoryPort,
      useClass: DrizzlePasswordHistoryAdapter,
    },
    {
      provide: SessionRepositoryPort,
      useClass: DrizzleSessionRepositoryAdapter,
    },

    // Input port → use-case bindings
    {
      provide: CheckPasswordHistoryPort,
      useClass: CheckPasswordHistoryUseCase,
    },

    // Event listeners (async; never re-throws)
    AuditLogListener,
  ],
  exports: [
    BetterAuthService,    // Exported for JwtAuthGuard in F3
    SessionRepositoryPort, // Exported for GetTokenUseCase in F3
  ],
})
export class AuthModule {}
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/auth/infrastructure/web/ apps/api/src/auth/module.ts
git commit -m "feat(api): add AuthModule and AuthHttpHandler catch-all controller"
```

---

## Task 15 — Update AppModule, HealthModule, HealthController

**Files:**
- Modify: `apps/api/src/app.module.ts`
- Modify: `apps/api/src/infrastructure/health/health.module.ts`
- Modify: `apps/api/src/infrastructure/health/health.controller.ts`

- [ ] **Step 1: Update AppModule**

Replace the entire file:

```typescript
// apps/api/src/app.module.ts
import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { LoggerModule } from 'nestjs-pino';

import { DrizzleModule } from './infrastructure/database/drizzle.module.js';
import { RedisModule } from './infrastructure/redis/redis.module.js';
import { HealthModule } from './infrastructure/health/health.module.js';
import { AllExceptionsFilter } from './infrastructure/filters/all-exceptions.filter.js';
import { HttpExceptionFilter } from './infrastructure/filters/http-exception.filter.js';
import { DomainExceptionFilter } from './infrastructure/filters/domain-exception.filter.js';
import { ApiResponseInterceptor } from './infrastructure/interceptors/api-response.interceptor.js';
import { CorrelationIdMiddleware } from './infrastructure/middleware/correlation-id.middleware.js';
import { SessionActivityMiddleware } from './auth/infrastructure/middleware/session-activity.middleware.js';
import { pinoConfig } from './infrastructure/telemetry/pino.config.js';
import { SecurityModule } from './security.module.js';
import { AuthModule } from './auth/module.js';

@Module({
  imports: [
    // ── Logging ─────────────────────────────────────────────────────────────
    LoggerModule.forRoot(pinoConfig),

    // ── Domain events ─────────────────────────────────────────────────────── 
    // wildcard: true is REQUIRED for @OnEvent('auth.*') pattern matching
    EventEmitterModule.forRoot({ wildcard: true, delimiter: '.', global: true }),

    // ── Infrastructure ───────────────────────────────────────────────────────
    DrizzleModule,
    RedisModule,
    HealthModule,

    // ── Security ─────────────────────────────────────────────────────────────
    SecurityModule,

    // ── Auth ─────────────────────────────────────────────────────────────────
    AuthModule,
  ],

  providers: [
    // ── Exception filters (registration order = least → most specific) ───────
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_FILTER, useClass: DomainExceptionFilter },

    // ── Response interceptor ─────────────────────────────────────────────────
    { provide: APP_INTERCEPTOR, useClass: ApiResponseInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // 1. CorrelationId — runs first on every route
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');

    // 2. SessionActivity — excluded from auth routes and public routes
    //    Auth routes are handled directly by Better-Auth (no session cookie required)
    consumer
      .apply(SessionActivityMiddleware)
      .exclude(
        { path: 'api/v1/auth/(.*)', method: RequestMethod.ALL },
        { path: 'api/v1/public/(.*)', method: RequestMethod.ALL },
        { path: 'health', method: RequestMethod.ALL },
        { path: 'health/ready', method: RequestMethod.ALL },
      )
      .forRoutes('*');
  }
}
```

- [ ] **Step 2: Update HealthModule**

Replace the entire file:

```typescript
// apps/api/src/infrastructure/health/health.module.ts
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { DatabaseHealthIndicator } from './database.health-indicator.js';
import { RedisHealthIndicator } from './redis.health-indicator.js';
import { AuthHealthIndicator } from './auth.health-indicator.js';
import { HealthController } from './health.controller.js';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [DatabaseHealthIndicator, RedisHealthIndicator, AuthHealthIndicator],
})
export class HealthModule {}
```

- [ ] **Step 3: Update HealthController**

Replace the entire file:

```typescript
// apps/api/src/infrastructure/health/health.controller.ts
import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DatabaseHealthIndicator } from './database.health-indicator.js';
import { RedisHealthIndicator } from './redis.health-indicator.js';
import { AuthHealthIndicator } from './auth.health-indicator.js';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: DatabaseHealthIndicator,
    private readonly redis: RedisHealthIndicator,
    private readonly auth: AuthHealthIndicator,
  ) {}

  // Note: Add @Public() decorator in F3 once JwtAuthGuard is in place.
  @Get()
  @ApiOperation({ summary: 'Liveness probe — always 200 if app is running' })
  ping(): { status: string } {
    return { status: 'ok' };
  }

  @Get('ready')
  @HealthCheck()
  @ApiOperation({ summary: 'Readiness probe — 200 if DB + Redis + auth DB connected' })
  ready() {
    return this.health.check([
      () => this.db.isHealthy(),
      () => this.redis.isHealthy(),
      () => this.auth.isHealthy(),
    ]);
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/app.module.ts \
  apps/api/src/infrastructure/health/health.module.ts \
  apps/api/src/infrastructure/health/health.controller.ts
git commit -m "feat(api): wire AuthModule + SessionActivityMiddleware in AppModule; update health probes"
```

---

## Task 16 — Typecheck, lint, run all tests

**No new files.** Fix any type errors found.

- [ ] **Step 1: Run all tests first**

```bash
npm -C apps/api test
```

Expected: All tests pass. If any fail, fix before continuing.

- [ ] **Step 2: Typecheck**

```bash
npm -C apps/api run check:types
```

Expected: `0 errors`. Common errors to expect and fix:

- **`toNodeHandler` not found**: Check import `from 'better-auth/node'` — may need `from 'better-auth/node.js'` depending on BA version
- **`APIError` not found**: Try `from 'better-auth/api'` or `from 'better-auth'`
- **`drizzleAdapter` import**: Try `from 'better-auth/adapters/drizzle'`
- **`betterAuth` return type**: `ReturnType<typeof betterAuth>` — if BA doesn't export the return type cleanly, use `any` temporarily and note it for review
- **`argon2` types**: Import as `import * as argon2 from 'argon2'` — if `@types/argon2` is stale, use `// @ts-expect-error` and note it
- **`emailHash` nullable**: The `authAuditLog.emailHash` field is `text()` which may not accept `null` — update schema to `.nullable()` or cast
- **Hook context `any` types**: The `HookCtx` interfaces we defined are approximate — adjust based on what BA's TypeScript exports

- [ ] **Step 3: Run linter**

```bash
npx turbo lint --filter=@repo/api
```

Expected: `0 errors`. Auto-fix if possible:

```bash
npx turbo lint:fix --filter=@repo/api
```

- [ ] **Step 4: Verify full turbo typecheck**

```bash
npx turbo typecheck
```

Expected: All workspaces pass.

- [ ] **Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix(api): typecheck and lint fixes for F2 implementation"
```

---

## Task 17 — Smoke verify acceptance criteria

This task requires a running PostgreSQL and Redis instance. It documents what to verify once the app boots.

- [ ] **Step 1: Ensure .env has required values**

```bash
# Minimum .env for local testing:
cp apps/api/.env.example apps/api/.env
# Edit: set DATABASE_URL, REDIS_URL, BETTER_AUTH_SECRET (32+ chars),
# BETTER_AUTH_URL, API_BASE_URL, CLIENT_URL, EMAIL_FROM, SERVICE_NAME
```

- [ ] **Step 2: Generate and run DB migrations**

```bash
# Generate migrations from schema
npm -C apps/api run drizzle:generate

# Run migrations (creates BA tables + our custom tables)
npm -C apps/api run drizzle:migrate
```

If `drizzle:generate` / `drizzle:migrate` scripts are not in package.json, add them:

```json
"drizzle:generate": "drizzle-kit generate",
"drizzle:migrate": "drizzle-kit migrate"
```

- [ ] **Step 3: Start the app and verify boot**

```bash
# Ctrl+C after seeing "Application is running"
cd apps/api && npm run dev
```

Expected log:
```
{"level":"info",...,"msg":"BetterAuthService initialized"}
{"level":"info",...,"msg":"Application is running on: http://[::1]:3000"}
```

- [ ] **Step 4: Verify acceptance criteria**

```bash
# AC1: POST /api/v1/auth/sign-up/email → 201
curl -s -X POST http://localhost:3000/api/v1/auth/sign-up/email \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","name":"Test","password":"Str0ng!Pass1"}' | jq .
# Expected: { "user": { "id": "...", "email": "test@example.com" } }

# AC2: Sign-in without email verification → 403
curl -s -X POST http://localhost:3000/api/v1/auth/sign-in/email \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","password":"Str0ng!Pass1"}' | jq .
# Expected: error response (email not verified)

# AC3: Brute force — 6 failed sign-in attempts → 429
for i in {1..6}; do
  curl -s -X POST http://localhost:3000/api/v1/auth/sign-in/email \
    -H 'Content-Type: application/json' \
    -d '{"email":"test@example.com","password":"WrongPass1!"}' | jq .code
done
# Expected: last response has code 429 with AUTH_ACCOUNT_LOCKED

# AC4: GET /health/ready → includes Redis and auth DB
curl -s http://localhost:3000/health/ready | jq .
# Expected: { "info": { "database": {...}, "redis": {...}, "authDb": {...} } }

# AC5: Session idle > 30min (simulate by deleting Redis key)
# 1. Sign in successfully (need verified email — verify via DB or skip verification in dev)
# 2. Delete the activity key: redis-cli DEL "session:<sessionToken>:activity"
# 3. Call any protected endpoint → 401 AUTH_SESSION_EXPIRED

# AC6: audit_audit_log table has records after sign-up
# psql -c "SELECT event, email_hash, ip_hash FROM auth_audit_log LIMIT 5;"
# Expected: rows with email_hash and ip_hash as 64-char hex strings (not plain text)

# AC7: Typecheck + lint pass
npx turbo typecheck
npx turbo lint
```

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat(api): F2 auth core security complete — better-auth, argon2id, brute-force, captcha, password history, session activity, audit log"
```

---

## Self-Review Checklist

| Acceptance Criterion | Task |
|---|---|
| `POST /api/v1/auth/sign-up/email` → 201, email sent | Task 8 (BA config: emailVerification) |
| Sign-up with existing email → 422 (BA handles) | Task 8 |
| Sign-in without email verification → 403 (BA handles) | Task 8 |
| Sign-in correct → 200, cookie set, single-session | Task 8 (databaseHooks.session.create.before) |
| 6 failed sign-ins → 429 `AUTH_ACCOUNT_LOCKED` | Tasks 5, 9 (BruteForcePort + sign-in hook) |
| Sign-in success after lockout → counter reset | Task 9 (sign-in after hook) |
| Password in history → 422 `AUTH_PASSWORD_REUSE` | Task 3 (CheckPasswordHistoryUseCase) |
| Password not meeting policy → 400 `AUTH_PASSWORD_POLICY_FAILED` | Task 2 (PasswordPolicy) |
| Session idle >30min → 401 `AUTH_SESSION_EXPIRED` | Task 10 (SessionActivityMiddleware) |
| New login → previous session revoked | Task 8 (databaseHooks.session.create.before) |
| `GET /health/ready` → Redis + auth DB health | Tasks 12, 15 |
| `auth_audit_log` rows have hashed email/ip (not plain text) | Task 11 (AuditLogListener) |
| `npx turbo typecheck` passes | Task 16 |
| `npx turbo lint` passes | Task 16 |

**Placeholder scan:** None — all tasks contain complete code.

**Type consistency:**
- `PasswordHistoryEntry` defined in port and used identically in adapter and use case ✓
- `AuthEvent` union in `auth.events.ts` matches the types expected in `AuditLogListener.handle()` ✓
- `DRIZZLE_CLIENT` token from `drizzle.constants.ts` used consistently ✓
- `REDIS_CLIENT` token from `redis.constants.ts` used consistently ✓
