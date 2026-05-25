import { describe, it, expect, vi, beforeEach } from 'vitest';
import type Redis from 'ioredis';
import { SessionActivityMiddleware } from '@/auth/infrastructure/middleware/session-activity.middleware.js';
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
  return { clearCookie, status, json };
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
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'AUTH_SESSION_EXPIRED' }),
    );
  });
});
