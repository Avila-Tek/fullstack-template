import { All, Controller, Get, Post, Req, Res } from '@nestjs/common';
import {
  ApiBody,
  ApiCookieAuth,
  ApiExcludeEndpoint,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { toNodeHandler } from 'better-auth/node';
import type { Request, Response } from 'express';
import { SkipApiResponse } from '../../../infrastructure/interceptors/skip-api-response.decorator.js';
import { BetterAuthService } from '../better-auth/better-auth.service.js';
import {
  ForgetPasswordDto,
  MessageResponseDto,
  ResetPasswordDto,
  SendVerificationEmailDto,
  SessionResponseDto,
  SignInEmailDto,
  SignUpEmailDto,
  SignUpResponseDto,
  VerifyEmailDto,
} from './auth.swagger.js';

import { detectLocale } from '../../../infrastructure/i18n/locale.js';
import { betterAuthMessage } from '../../../infrastructure/i18n/better-auth-messages.js';

function translateBody(body: unknown, locale: ReturnType<typeof detectLocale>): unknown {
  if (
    body !== null &&
    typeof body === 'object' &&
    'code' in body &&
    'message' in body &&
    typeof (body as Record<string, unknown>).message === 'string'
  ) {
    const translated = betterAuthMessage(
      String((body as Record<string, unknown>).code),
      locale,
    );
    if (translated) {
      return { ...(body as Record<string, unknown>), message: translated };
    }
  }
  return body;
}

function wrapForI18n(req: Request, res: Response): void {
  const locale = detectLocale(req);

  // Better Auth (h3 adapter) calls res.end() directly with a JSON string
  const originalEnd = res.end.bind(res);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (res as any).end = (chunk?: unknown, encoding?: unknown, cb?: unknown) => {
    if (typeof chunk === 'string') {
      try {
        const parsed = JSON.parse(chunk) as unknown;
        const translated = translateBody(parsed, locale);
        if (translated !== parsed) {
          chunk = JSON.stringify(translated);
        }
      } catch { /* not JSON — leave as-is */ }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (originalEnd as any)(chunk, encoding, cb);
  };
}

@SkipApiResponse()
@ApiTags('Auth')
@Controller('auth')
export class AuthHttpHandler {
  constructor(private readonly betterAuthService: BetterAuthService) {}

  // ── Sign-up ────────────────────────────────────────────────────────────────

  @Post('sign-up/email')
  @ApiOperation({ summary: 'Register with email and password' })
  @ApiBody({ type: SignUpEmailDto })
  @ApiResponse({ status: 200, description: 'User created (email verification sent)', type: SignUpResponseDto })
  @ApiResponse({ status: 422, description: 'Email already exists or password policy failed' })
  signUp(@Req() req: Request, @Res() res: Response): void {
    wrapForI18n(req, res);
    void toNodeHandler(this.betterAuthService.auth)(req, res);
  }

  // ── Sign-in ────────────────────────────────────────────────────────────────

  @Post('sign-in/email')
  @ApiOperation({ summary: 'Sign in with email and password' })
  @ApiBody({ type: SignInEmailDto })
  @ApiResponse({ status: 200, description: 'Signed in — session cookie set', type: SessionResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials or email not verified' })
  @ApiResponse({ status: 429, description: 'Account locked (brute force)' })
  signIn(@Req() req: Request, @Res() res: Response): void {
    wrapForI18n(req, res);
    void toNodeHandler(this.betterAuthService.auth)(req, res);
  }

  // ── Sign-out ───────────────────────────────────────────────────────────────

  @Post('sign-out')
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Sign out and invalidate session' })
  @ApiResponse({ status: 200, description: 'Signed out' })
  signOut(@Req() req: Request, @Res() res: Response): void {
    wrapForI18n(req, res);
    void toNodeHandler(this.betterAuthService.auth)(req, res);
  }

  // ── Session ────────────────────────────────────────────────────────────────

  @Get('session')
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Get current session and user' })
  @ApiResponse({ status: 200, description: 'Active session', type: SessionResponseDto })
  @ApiResponse({ status: 200, description: 'No active session (returns null)' })
  getSession(@Req() req: Request, @Res() res: Response): void {
    void toNodeHandler(this.betterAuthService.auth)(req, res);
  }

  // ── Password reset ─────────────────────────────────────────────────────────

  @Post('forget-password')
  @ApiOperation({ summary: 'Request a password reset email' })
  @ApiBody({ type: ForgetPasswordDto })
  @ApiResponse({ status: 200, description: 'Reset email sent if the address exists', type: MessageResponseDto })
  forgetPassword(@Req() req: Request, @Res() res: Response): void {
    wrapForI18n(req, res);
    void toNodeHandler(this.betterAuthService.auth)(req, res);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Set a new password using the reset token' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({ status: 200, description: 'Password updated', type: MessageResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  resetPassword(@Req() req: Request, @Res() res: Response): void {
    wrapForI18n(req, res);
    void toNodeHandler(this.betterAuthService.auth)(req, res);
  }

  // ── Email verification ─────────────────────────────────────────────────────

  @Post('send-verification-email')
  @ApiOperation({ summary: 'Resend the email verification link' })
  @ApiBody({ type: SendVerificationEmailDto })
  @ApiResponse({ status: 200, description: 'Verification email sent', type: MessageResponseDto })
  sendVerificationEmail(@Req() req: Request, @Res() res: Response): void {
    wrapForI18n(req, res);
    void toNodeHandler(this.betterAuthService.auth)(req, res);
  }

  @Post('verify-email')
  @ApiOperation({ summary: 'Verify email using the token from the verification link' })
  @ApiBody({ type: VerifyEmailDto })
  @ApiResponse({ status: 200, description: 'Email verified', type: SessionResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  verifyEmail(@Req() req: Request, @Res() res: Response): void {
    wrapForI18n(req, res);
    void toNodeHandler(this.betterAuthService.auth)(req, res);
  }

  // ── Fallback (OAuth callbacks, etc.) ──────────────────────────────────────

  @ApiExcludeEndpoint()
  @All('*path')
  handler(@Req() req: Request, @Res() res: Response): void {
    void toNodeHandler(this.betterAuthService.auth)(req, res);
  }
}
