import { Module } from '@nestjs/common';
import { BetterAuthService } from '@/auth/infrastructure/better-auth/better-auth.service.js';
import { Argon2HashAdapter } from '@/auth/infrastructure/adapters/argon2-hash.adapter.js';
import { RedisBruteForceAdapter } from '@/auth/infrastructure/adapters/brute-force.adapter.js';
import { SmtpEmailAdapter } from '@/auth/infrastructure/adapters/email.adapter.js';
import { SecurityNotificationAdapter } from '@/auth/infrastructure/adapters/security-notification.adapter.js';
import { CloudflareCaptchaAdapter } from '@/auth/infrastructure/adapters/captcha/cloudflare-captcha.adapter.js';
import { GoogleCaptchaAdapter } from '@/auth/infrastructure/adapters/captcha/google-captcha.adapter.js';
import { DrizzlePasswordHistoryAdapter } from '@/auth/infrastructure/persistence/password-history.repository-adapter.js';
import { DrizzleSessionRepositoryAdapter } from '@/auth/infrastructure/persistence/session.repository-adapter.js';
import { AuditLogListener } from '@/auth/infrastructure/listeners/audit-log.listener.js';
import { AuthHttpHandler } from '@/auth/infrastructure/web/auth.http-handler.js';
import { BruteForcePort } from '@/auth/application/ports/out/brute-force.port.js';
import { CaptchaPort } from '@/auth/application/ports/out/captcha.port.js';
import { EmailPort } from '@/auth/application/ports/out/email.port.js';
import { SecurityNotificationPort } from '@/auth/application/ports/out/security-notification.port.js';
import { PasswordHistoryRepositoryPort } from '@/auth/application/ports/out/password-history.repository.port.js';
import { SessionRepositoryPort } from '@/auth/application/ports/out/session.repository.port.js';
import { CheckPasswordHistoryPort } from '@/auth/application/ports/in/check-password-history.port.js';
import { CheckPasswordHistoryUseCase } from '@/auth/application/use-cases/check-password-history.use-case.js';
import { env } from '@/env.js';

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
    BetterAuthService, // Exported for JwtAuthGuard in F3
    SessionRepositoryPort, // Exported for GetTokenUseCase in F3
  ],
})
export class AuthModule {}
