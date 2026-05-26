import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ZoomAuthClient, ZoomAuthException } from './zoom-auth.client';

const SUCCESS_AUTH_RESPONSE = {
  codrespuesta: 'COD_000',
  mensaje: 'OK',
  entidadRespuesta: { token: 'tok-abc', expires_at: '2099-01-01T00:00:00Z' },
};

const CONFIG = {
  authUrl: 'https://zoom-api.test/auth',
  user: 'test-user',
  password: 'test-password',
  timeoutMs: 5000,
  retryMax: 3,
  retryBackoffMs: 0, // instant retries in tests
};

function mockFetch(response: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    status,
    json: vi.fn().mockResolvedValue(response),
  });
}

describe('ZoomAuthClient', () => {
  let client: ZoomAuthClient;

  beforeEach(() => {
    client = new ZoomAuthClient(CONFIG);
    vi.stubGlobal('fetch', mockFetch(SUCCESS_AUTH_RESPONSE));
  });

  describe('getToken()', () => {
    it('authenticates on first call and returns token', async () => {
      const token = await client.getToken();
      expect(token).toBe('tok-abc');
      expect(fetch).toHaveBeenCalledOnce();
    });

    it('returns cached token on subsequent calls', async () => {
      await client.getToken();
      await client.getToken();
      expect(fetch).toHaveBeenCalledOnce();
    });

    it('re-authenticates after invalidateToken()', async () => {
      await client.getToken();
      client.invalidateToken();
      vi.stubGlobal(
        'fetch',
        mockFetch({
          ...SUCCESS_AUTH_RESPONSE,
          entidadRespuesta: { token: 'tok-fresh', expires_at: '2099-01-01' },
        })
      );
      const token = await client.getToken();
      expect(token).toBe('tok-fresh');
    });
  });

  describe('HTTP behaviour', () => {
    it('posts credentials to authUrl with an AbortSignal', async () => {
      await client.getToken();
      const [url, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]!;
      expect(url).toBe('https://zoom-api.test/auth');
      expect(options.signal).toBeInstanceOf(AbortSignal);
      expect(options.body).toBe(
        JSON.stringify({ usuario: 'test-user', password: 'test-password' })
      );
    });

    it('retries on network error and resolves on eventual success', async () => {
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockRejectedValueOnce(new Error('ECONNREFUSED'))
          .mockResolvedValue({
            status: 200,
            json: vi.fn().mockResolvedValue(SUCCESS_AUTH_RESPONSE),
          })
      );
      const token = await client.getToken();
      expect(token).toBe('tok-abc');
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('throws ZoomAuthException after exhausting retries on network error', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockRejectedValue(new Error('ECONNREFUSED'))
      );
      await expect(client.getToken()).rejects.toThrow(ZoomAuthException);
      expect(fetch).toHaveBeenCalledTimes(3); // retryMax=3
    });

    it('does NOT retry on non-COD_000 response (non-transient)', async () => {
      vi.stubGlobal(
        'fetch',
        mockFetch({ codrespuesta: 'COD_999', mensaje: 'Error' })
      );
      await expect(client.getToken()).rejects.toThrow(ZoomAuthException);
      expect(fetch).toHaveBeenCalledOnce();
    });

    it('does NOT retry on invalid JSON (non-transient)', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          status: 200,
          json: vi.fn().mockRejectedValue(new SyntaxError('Unexpected token')),
        })
      );
      await expect(client.getToken()).rejects.toThrow(ZoomAuthException);
      expect(fetch).toHaveBeenCalledOnce();
    });
  });
});
