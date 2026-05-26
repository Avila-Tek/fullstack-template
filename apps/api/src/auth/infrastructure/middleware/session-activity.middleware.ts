import { Inject, Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import type { Redis } from 'ioredis';
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
