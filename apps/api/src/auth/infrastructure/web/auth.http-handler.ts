// Routes ALL /auth/* requests to the Better-Auth handler.
// @SkipApiResponse() prevents the ApiResponseInterceptor from wrapping BA's own response format.
import { All, Controller, Req, Res } from '@nestjs/common';
import { toNodeHandler } from 'better-auth/node';
import type { Request, Response } from 'express';
import { SkipApiResponse } from '@infra/interceptors/skip-api-response.decorator.js';
import { BetterAuthService } from '@/auth/infrastructure/better-auth/better-auth.service.js';

@SkipApiResponse()
@Controller('auth')
export class AuthHttpHandler {
  constructor(private readonly betterAuthService: BetterAuthService) {}

  @All('*')
  handler(@Req() req: Request, @Res() res: Response): void {
    void toNodeHandler(this.betterAuthService.auth)(req, res);
  }
}
