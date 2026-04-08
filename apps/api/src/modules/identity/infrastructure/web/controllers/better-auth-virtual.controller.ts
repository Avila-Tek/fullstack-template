import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
	disableTotpInput,
	enableTotpResponse,
	forgetPasswordInput,
	getSessionResponse,
	loginInput,
	resetPasswordInput,
	signOutResponse,
	signUpInput,
	socialSignInInput,
	socialSignInResponse,
	tokenResponse,
	totpVerifyInput,
	userSchema,
	verificationResultResponse,
} from '@repo/schemas';
import { SkipApiResponse } from '@/infrastructure/interceptors/skip-api-response.decorator';
import { ApiErrorResponses, zodToOpenApi } from '@/shared/swagger/swagger';

/**
 * Virtual controllers — exist ONLY to generate Swagger documentation for Better Auth routes.
 * These routes are handled entirely by the Better Auth middleware before reaching NestJS routing.
 * Conditionally included via BetterAuthDocsModule (non-production only).
 */

@SkipApiResponse()
@ApiTags('Auth / Session')
@Controller()
export class BetterAuthSessionController {
	@Post('api/v1/auth/sign-up/email')
	@ApiOperation({
		summary: 'Register with email + password',
		description:
			'Creates a new user account. Sends a verification email. ' +
			'Requires acceptance of Terms & Conditions. Returns 409 if email already exists.',
	})
	@ApiBody({ schema: zodToOpenApi(signUpInput) })
	@ApiResponse({ status: 200, schema: zodToOpenApi(userSchema) })
	@ApiErrorResponses(400, 409, 429)
	signUp(@Body() _body: unknown): void {
		/* handled by Better Auth middleware */
	}

	@Post('api/v1/auth/sign-in/email')
	@ApiOperation({
		summary: 'Sign in with email + password',
		description:
			'Authenticates the user and sets a session cookie. ' +
			'Returns a 2FA challenge instead if TOTP is enabled.',
	})
	@ApiBody({ schema: zodToOpenApi(loginInput) })
	@ApiResponse({ status: 200, schema: zodToOpenApi(userSchema) })
	@ApiErrorResponses(400, 401, 429)
	signIn(@Body() _body: unknown): void {
		/* handled by Better Auth middleware */
	}

	@Post('api/v1/auth/sign-out')
	@ApiOperation({
		summary: 'Sign out',
		description: 'Invalidates the current session cookie.',
	})
	@ApiResponse({ status: 200, schema: zodToOpenApi(signOutResponse) })
	@ApiErrorResponses(401)
	signOut(): void {
		/* handled by Better Auth middleware */
	}

	@Get('api/v1/auth/get-session')
	@ApiOperation({
		summary: 'Get current session',
		description:
			'Returns the authenticated user and session. Returns null if no active session.',
	})
	@ApiResponse({ status: 200, schema: zodToOpenApi(getSessionResponse) })
	getSession(): void {
		/* handled by Better Auth middleware */
	}
}

@SkipApiResponse()
@ApiTags('Auth / Email Verification')
@Controller()
export class BetterAuthEmailVerificationController {
	@Get('api/v1/auth/verify-email')
	@ApiOperation({
		summary: 'Verify email address',
		description: 'Consumes a one-time token from the verification email link.',
	})
	@ApiResponse({
		status: 200,
		schema: zodToOpenApi(verificationResultResponse),
	})
	@ApiErrorResponses(400, 401)
	verifyEmail(@Query('token') _token: string): void {
		/* handled by Better Auth middleware */
	}

	@Post('api/v1/auth/send-verification-email')
	@ApiOperation({
		summary: 'Resend verification email',
		description:
			"Sends a new verification link to the authenticated user's email address.",
	})
	@ApiResponse({
		status: 200,
		schema: zodToOpenApi(verificationResultResponse),
	})
	@ApiErrorResponses(401, 429)
	sendVerificationEmail(): void {
		/* handled by Better Auth middleware */
	}
}

@SkipApiResponse()
@ApiTags('Auth / Password Reset')
@Controller()
export class BetterAuthPasswordResetController {
	@Post('api/v1/auth/forget-password')
	@ApiOperation({
		summary: 'Request password reset email',
		description:
			'Sends a reset link. Always returns 200 — no email enumeration.',
	})
	@ApiBody({ schema: zodToOpenApi(forgetPasswordInput) })
	@ApiResponse({
		status: 200,
		schema: zodToOpenApi(verificationResultResponse),
	})
	@ApiErrorResponses(400, 429)
	forgetPassword(@Body() _body: unknown): void {
		/* handled by Better Auth middleware */
	}

	@Post('api/v1/auth/reset-password')
	@ApiOperation({
		summary: 'Reset password with token',
		description:
			'Consumes the reset token and sets a new password. Token is single-use.',
	})
	@ApiBody({ schema: zodToOpenApi(resetPasswordInput) })
	@ApiResponse({
		status: 200,
		schema: zodToOpenApi(verificationResultResponse),
	})
	@ApiErrorResponses(400, 401, 429)
	resetPassword(@Body() _body: unknown): void {
		/* handled by Better Auth middleware */
	}
}

@SkipApiResponse()
@ApiTags('Auth / Token (JWT)')
@Controller()
export class BetterAuthTokenController {
	@Post('api/v1/auth/token')
	@ApiOperation({
		summary: 'Exchange session cookie for ES256 JWT',
		description: 'Returns a short-lived JWT (ES256) for stateless auth in apps/api.',
	})
	@ApiResponse({ status: 200, schema: zodToOpenApi(tokenResponse) })
	@ApiErrorResponses(401)
	exchangeToken(): void {
		/* handled by Better Auth middleware */
	}

}

@SkipApiResponse()
@ApiTags('Auth / OAuth (Google)')
@Controller()
export class BetterAuthOAuthController {
	@Post('api/v1/auth/sign-in/social')
	@ApiOperation({
		summary: 'Initiate Google OAuth flow',
		description:
			'Returns a redirect URL to begin the Google OAuth authorization flow.',
	})
	@ApiBody({ schema: zodToOpenApi(socialSignInInput) })
	@ApiResponse({ status: 200, schema: zodToOpenApi(socialSignInResponse) })
	@ApiErrorResponses(400)
	socialSignIn(@Body() _body: unknown): void {
		/* handled by Better Auth middleware */
	}

	@Get('api/v1/auth/callback/google')
	@ApiOperation({
		summary: 'Google OAuth callback',
		description:
			'Handled automatically by Better Auth. Redirects to the configured callbackURL.',
	})
	@ApiResponse({ status: 302, description: 'Redirects to callbackURL' })
	oauthCallback(): void {
		/* handled by Better Auth middleware */
	}
}

@SkipApiResponse()
@ApiTags('Auth / Two-Factor')
@Controller()
export class BetterAuthTwoFactorController {
	@Post('api/v1/auth/two-factor/enable')
	@ApiOperation({
		summary: 'Begin TOTP setup',
		description: 'Returns a QR code URI for authenticator app enrollment.',
	})
	@ApiResponse({ status: 200, schema: zodToOpenApi(enableTotpResponse) })
	@ApiErrorResponses(401)
	enableTwoFactor(): void {
		/* handled by Better Auth middleware */
	}

	@Post('api/v1/auth/two-factor/verify-totp')
	@ApiOperation({
		summary: 'Verify TOTP code',
		description:
			'Verifies a TOTP code during a 2FA challenge. Completes sign-in on success.',
	})
	@ApiBody({ schema: zodToOpenApi(totpVerifyInput) })
	@ApiResponse({ status: 200, schema: zodToOpenApi(userSchema) })
	@ApiErrorResponses(400, 401, 429)
	verifyTotp(@Body() _body: unknown): void {
		/* handled by Better Auth middleware */
	}

	@Post('api/v1/auth/two-factor/disable')
	@ApiOperation({
		summary: 'Disable 2FA',
		description: 'Disables TOTP 2FA after confirming current password.',
	})
	@ApiBody({ schema: zodToOpenApi(disableTotpInput) })
	@ApiResponse({
		status: 200,
		schema: zodToOpenApi(verificationResultResponse),
	})
	@ApiErrorResponses(400, 401, 429)
	disableTwoFactor(@Body() _body: unknown): void {
		/* handled by Better Auth middleware */
	}

}
