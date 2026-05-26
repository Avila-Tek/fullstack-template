import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ── Request bodies ────────────────────────────────────────────────────────────

export class SignUpEmailDto {
  @ApiProperty({ example: 'user@example.com' })
  email!: string;

  @ApiProperty({ example: 'MyP@ssw0rd', minLength: 8, maxLength: 128 })
  password!: string;

  @ApiProperty({ example: 'Jane Doe' })
  name!: string;

  @ApiPropertyOptional({ description: 'Captcha token (required when captcha is enabled)' })
  captchaToken?: string;
}

export class SignInEmailDto {
  @ApiProperty({ example: 'user@example.com' })
  email!: string;

  @ApiProperty({ example: 'MyP@ssw0rd' })
  password!: string;
}

export class ForgetPasswordDto {
  @ApiProperty({ example: 'user@example.com' })
  email!: string;

  @ApiProperty({ example: 'http://localhost:5173/reset-password', description: 'URL to redirect to after reset' })
  redirectTo!: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'Reset token from email link' })
  token!: string;

  @ApiProperty({ example: 'NewP@ssw0rd', minLength: 8, maxLength: 128 })
  newPassword!: string;
}

export class SendVerificationEmailDto {
  @ApiProperty({ example: 'user@example.com' })
  email!: string;
}

export class VerifyEmailDto {
  @ApiProperty({ description: 'Verification token from email link' })
  token!: string;

  @ApiPropertyOptional({ description: 'URL to redirect to after verification' })
  callbackURL?: string;
}

// ── Response shapes (for Swagger only — not enforced at runtime) ──────────────

export class AuthUserDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() email!: string;
  @ApiProperty() emailVerified!: boolean;
  @ApiPropertyOptional() image?: string | null;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}

export class AuthSessionDto {
  @ApiProperty() id!: string;
  @ApiProperty() userId!: string;
  @ApiProperty() expiresAt!: string;
  @ApiPropertyOptional() ipAddress?: string | null;
  @ApiPropertyOptional() userAgent?: string | null;
}

export class SignUpResponseDto {
  @ApiProperty({ type: AuthUserDto }) user!: AuthUserDto;
  @ApiPropertyOptional({ nullable: true }) token!: string | null;
}

export class SessionResponseDto {
  @ApiProperty({ type: AuthUserDto }) user!: AuthUserDto;
  @ApiProperty({ type: AuthSessionDto }) session!: AuthSessionDto;
}

export class MessageResponseDto {
  @ApiProperty() message!: string;
}
