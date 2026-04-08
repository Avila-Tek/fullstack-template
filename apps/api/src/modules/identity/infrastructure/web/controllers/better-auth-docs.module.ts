import { Module } from '@nestjs/common';
import {
	BetterAuthEmailVerificationController,
	BetterAuthOAuthController,
	BetterAuthPasswordResetController,
	BetterAuthSessionController,
	BetterAuthTokenController,
	BetterAuthTwoFactorController,
} from './better-auth-virtual.controller';

/**
 * Documentation-only module included in non-production environments.
 * Registers virtual controllers so NestJS Swagger can discover their route stubs.
 * These controllers are intercepted by Better Auth middleware and never execute their handlers.
 */
@Module({
	controllers: [
		BetterAuthSessionController,
		BetterAuthEmailVerificationController,
		BetterAuthPasswordResetController,
		BetterAuthTokenController,
		BetterAuthOAuthController,
		BetterAuthTwoFactorController,
	],
})
export class BetterAuthDocsModule {}
