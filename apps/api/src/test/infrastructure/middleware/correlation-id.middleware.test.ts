import { describe, it, expect, vi } from 'vitest';
import { CorrelationIdMiddleware } from '../../../infrastructure/middleware/correlation-id.middleware';

describe('CorrelationIdMiddleware', () => {
  const middleware = new CorrelationIdMiddleware();

  function buildReqRes(existingId?: string) {
    const header = vi.fn();
    const req: Record<string, unknown> & { headers: Record<string, string | undefined> } = {
      headers: { 'x-correlation-id': existingId },
      correlationId: undefined,
    };
    const res = { header };
    const next = vi.fn();
    return { req, res, next, header };
  }

  it('generates a new UUID when no x-correlation-id header is present', () => {
    const { req, res, next, header } = buildReqRes();
    middleware.use(req, res, next);

    expect(req.correlationId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(header).toHaveBeenCalledWith('x-correlation-id', req.correlationId);
    expect(next).toHaveBeenCalled();
  });

  it('reuses the incoming x-correlation-id header', () => {
    const existingId = 'existing-id-123';
    const { req, res, next, header } = buildReqRes(existingId);
    middleware.use(req, res, next);

    expect(req.correlationId).toBe(existingId);
    expect(header).toHaveBeenCalledWith('x-correlation-id', existingId);
  });

  it('calls next()', () => {
    const { req, res, next } = buildReqRes();
    middleware.use(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
