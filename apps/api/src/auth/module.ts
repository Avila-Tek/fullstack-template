import { Module } from '@nestjs/common';
import { BetterAuthService } from './infrastructure/better-auth/better-auth.service.js';
import { Argon2HashAdapter } from './infrastructure/adapters/argon2-hash.adapter.js';
import { RedisBruteForceAdapter } from './infrastructure/adapters/brute-force.adapter.js';
import { PasswordHasherPort } from './application/ports/out/password-hasher.port.js';
import { SmtpEmailAdapter } from './infrastructure/adapters/email.adapter.js';
import { PostmarkEmailAdapter } from './infrastructure/adapters/postmark-email.adapter.js';
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
    { provide: PasswordHasherPort, useExisting: Argon2HashAdapter },

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
    // Email adapter — only the selected provider is instantiated
    {
      provide: EmailPort,
      useClass: env.EMAIL_PROVIDER === 'postmark' ? PostmarkEmailAdapter : SmtpEmailAdapter,
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
