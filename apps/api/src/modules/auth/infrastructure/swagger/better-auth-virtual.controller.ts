import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
	backupCodesResponse,
	changeEmailInput,
	changePasswordInput,
	disableTotpInput,
	enableTotpInput,
	enableTotpResponse,
	forgetPasswordInput,
	getSessionResponse,
	getTotpUriInput,
	getTotpUriResponse,
	loginInput,
	phoneNumberSendOtpInput,
	phoneNumberVerifyInput,
	phoneNumberVerifyResponse,
	resendVerificationEmailInput,
	resetPasswordInput,
	sendOtpInput,
	sendOtpResponse,
	signOutResponse,
	signUpInput,
	socialSignInInput,
	socialSignInResponse,
	tokenResponse,
	totpVerifyInput,
	userSchema,
	verificationResultResponse,
	verifyOtpInput,
} from '@zoom/schemas';
import { ApiErrorResponses, zodToOpenApi } from '@zoom/swagger';
import { SkipApiResponse } from '../interceptors/skip-api-response.decorator';

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
	@ApiBody({ schema: zodToOpenApi(resendVerificationEmailInput) })
	@ApiResponse({
		status: 200,
		schema: zodToOpenApi(verificationResultResponse),
	})
	@ApiErrorResponses(401, 429)
	sendVerificationEmail(): void {
		/* handled by Better Auth middleware */
	}

	@Post('api/v1/auth/change-email')
	@ApiOperation({
		summary: 'Initiate email change',
		description:
			'Verifies the current password, then sends a verification link to the new email address. ' +
			'Returns 200 for both success and silent anti-enumeration cases — no email enumeration. ' +
			'Rate limited to 5 requests per 5 minutes per IP.',
	})
	@ApiBody({ schema: zodToOpenApi(changeEmailInput) })
	@ApiResponse({
		status: 200,
		schema: zodToOpenApi(verificationResultResponse),
	})
	@ApiErrorResponses(400, 401, 422, 429)
	changeEmail(@Body() _body: unknown): void {
		/* handled by Better Auth middleware */
	}
}

@SkipApiResponse()
@ApiTags('Auth / Password')
@Controller()
export class BetterAuthPasswordController {
	@Post('api/v1/auth/request-password-reset')
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
	@ApiErrorResponses(400, 403, 422, 429, 503)
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
	@ApiErrorResponses(400, 401, 422, 429)
	resetPassword(@Body() _body: unknown): void {
		/* handled by Better Auth middleware */
	}

	@Post('api/v1/auth/change-password')
	@ApiOperation({
		summary: "Change the authenticated user's password",
		description:
			'Validates the current password, enforces complexity rules and password history, ' +
			'then updates the password. Rate limited to 5 requests per 10 minutes per IP. ' +
			'Returns 422 if the new password was recently used or fails complexity requirements.',
	})
	@ApiBody({ schema: zodToOpenApi(changePasswordInput) })
	@ApiResponse({ status: 200 })
	@ApiErrorResponses(400, 401, 422, 429)
	changePassword(@Body() _body: unknown): void {
		/* handled by Better Auth middleware */
	}
}

@SkipApiResponse()
@ApiTags('Auth / Token (JWT)')
@Controller()
export class BetterAuthTokenController {
	@Get('api/v1/auth/token')
	@ApiOperation({
		summary: 'Exchange session cookie for ES256 JWT',
		description: 'Returns a short-lived JWT for stateless auth in apps/api.',
	})
	@ApiResponse({ status: 200, schema: zodToOpenApi(tokenResponse) })
	@ApiErrorResponses(401)
	exchangeToken(): void {
		/* handled by Better Auth middleware */
	}

	@Get('api/v1/auth/.well-known/jwks.json')
	@ApiOperation({
		summary: 'JWKS public key set',
		description: 'Public keys used by apps/api to verify ES256 JWTs.',
	})
	@ApiResponse({ status: 200, schema: { type: 'object' } })
	jwks(): void {
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
		description:
			'Returns a QR code URI for authenticator app enrollment. ' +
			'Password is required for credential accounts; optional when `allowPasswordless` is enabled.',
	})
	@ApiBody({ schema: zodToOpenApi(enableTotpInput) })
	@ApiResponse({ status: 200, schema: zodToOpenApi(enableTotpResponse) })
	@ApiErrorResponses(401)
	enableTwoFactor(@Body() _body: unknown): void {
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

	@Post('api/v1/auth/two-factor/send-otp')
	@ApiOperation({
		summary: 'Send OTP for 2FA setup or challenge',
		description:
			'Sends a one-time password via **email** (default) or **SMS**. ' +
			'Pass `method: "sms"` to send via SMS. If the user has not verified a phone number yet, ' +
			'complete `/phone-number/send-otp` → `/phone-number/verify` first. ' +
			'Used during enrollment and during sign-in challenges when TOTP is not available.',
	})
	@ApiBody({ schema: zodToOpenApi(sendOtpInput) })
	@ApiResponse({ status: 200, schema: zodToOpenApi(sendOtpResponse) })
	@ApiErrorResponses(400, 401, 422, 429)
	sendOtp(@Body() _body: unknown): void {
		/* handled by Better Auth middleware */
	}

	@Post('api/v1/auth/two-factor/verify-otp')
	@ApiOperation({
		summary: 'Verify OTP code',
		description:
			'Verifies the one-time password sent via email or SMS. ' +
			'Completes enrollment (marks 2FA as enabled) or completes a sign-in challenge.',
	})
	@ApiBody({ schema: zodToOpenApi(verifyOtpInput) })
	@ApiResponse({ status: 200, schema: zodToOpenApi(userSchema) })
	@ApiErrorResponses(400, 401, 429)
	verifyOtp(@Body() _body: unknown): void {
		/* handled by Better Auth middleware */
	}

	@Post('api/v1/auth/two-factor/get-totp-uri')
	@ApiOperation({
		summary: 'Get TOTP setup URI',
		description:
			'Returns the TOTP URI (otpauth://) for scanning with an authenticator app. ' +
			'Requires an active session. Password may be required for credential accounts.',
	})
	@ApiBody({ schema: zodToOpenApi(getTotpUriInput) })
	@ApiResponse({ status: 200, schema: zodToOpenApi(getTotpUriResponse) })
	@ApiErrorResponses(401)
	getTotpUri(@Body() _body: unknown): void {
		/* handled by Better Auth middleware */
	}

	@Post('api/v1/auth/two-factor/generate-backup-codes')
	@ApiOperation({
		summary: 'Regenerate backup codes',
		description:
			'Generates a fresh set of one-time backup codes, invalidating previous codes.',
	})
	@ApiResponse({ status: 200, schema: zodToOpenApi(backupCodesResponse) })
	@ApiErrorResponses(401)
	generateBackupCodes(): void {
		/* handled by Better Auth middleware */
	}

	@Post('api/v1/auth/two-factor/skip')
	@ApiOperation({
		summary: 'Skip 2FA enrollment for now',
		description:
			'Records that the user chose to skip 2FA setup. ' +
			'No state change — only an audit log entry is written.',
	})
	@ApiResponse({
		status: 200,
		schema: {
			type: 'object',
			properties: { message: { type: 'string' } },
		},
	})
	@ApiErrorResponses(401)
	skipTwoFactor(): void {
		/* handled by Better Auth middleware + TwoFactorSkipHook */
	}
}

@SkipApiResponse()
@ApiTags('Auth / Phone Number')
@Controller()
export class BetterAuthPhoneNumberController {
	@Post('api/v1/auth/phone-number/send-otp')
	@ApiOperation({
		summary: 'Send phone verification OTP',
		description:
			'Sends a 6-digit OTP to the provided Venezuelan phone number (04XXXXXXXXX) via SMS. ' +
			'Must be called before `/phone-number/verify`. ' +
			'Complete this step during 2FA onboarding **before** calling `/two-factor/send-otp` with `method: "sms"`.',
	})
	@ApiBody({ schema: zodToOpenApi(phoneNumberSendOtpInput) })
	@ApiResponse({
		status: 200,
		schema: { type: 'object', properties: { message: { type: 'string' } } },
	})
	@ApiErrorResponses(400, 401, 429)
	sendPhoneOtp(@Body() _body: unknown): void {
		/* handled by Better Auth middleware */
	}

	@Post('api/v1/auth/phone-number/verify')
	@ApiOperation({
		summary: 'Verify phone number OTP',
		description:
			'Verifies the 6-digit OTP sent to the phone. Sets `phoneNumberVerified = true` on the user. ' +
			'After verification, the user may pass `method: "sms"` in `/two-factor/send-otp`.',
	})
	@ApiBody({ schema: zodToOpenApi(phoneNumberVerifyInput) })
	@ApiResponse({ status: 200, schema: zodToOpenApi(phoneNumberVerifyResponse) })
	@ApiErrorResponses(400, 401, 429)
	verifyPhone(@Body() _body: unknown): void {
		/* handled by Better Auth middleware */
	}
}
