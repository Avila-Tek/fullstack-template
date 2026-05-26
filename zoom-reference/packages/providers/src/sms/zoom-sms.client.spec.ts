import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ZoomTokenProvider } from '../types';
import { ZoomSmsClient, ZoomSmsException } from './zoom-sms.client';

const SUCCESS_SEND_RESPONSE = { codrespuesta: 'COD_000', mensaje: 'OK' };

const CONFIG = {
  smsApiUrl: 'https://zoom-api.test/sms',
  smsSenderId: 'ZOOM',
  timeoutMs: 5000,
  retryMax: 3,
  retryBackoffMs: 0, // instant retries in tests
};

function makeTokenProvider(token = 'tok-sms'): ZoomTokenProvider {
  return {
    getToken: vi.fn().mockResolvedValue(token),
    invalidateToken: vi.fn(),
  };
}

function mockFetch(response: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    status,
    json: vi.fn().mockResolvedValue(response),
  });
}

describe('ZoomSmsClient', () => {
  let tokenProvider: ZoomTokenProvider;
  let smsClient: ZoomSmsClient;

  beforeEach(() => {
    tokenProvider = makeTokenProvider();
    smsClient = new ZoomSmsClient(tokenProvider, CONFIG);
    vi.stubGlobal('fetch', mockFetch(SUCCESS_SEND_RESPONSE));
  });

  describe('sendSms()', () => {
    it('posts to smsApiUrl with correct payload', async () => {
      await smsClient.sendSms('+584141234567', 'Hello');
      const [url, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]!;
      expect(url).toBe('https://zoom-api.test/sms');
      const body = JSON.parse(options.body);
      expect(body.telefono).toBe('+584141234567');
      expect(body.pasaporte).toBe('ZOOM');
      expect(body.tipo).toBe(2);
      expect(body.subtipo).toBe(4);
    });

    it('double-base64 encodes the message body', async () => {
      await smsClient.sendSms('+584141234567', 'Hello');
      const body = JSON.parse(
        (fetch as ReturnType<typeof vi.fn>).mock.calls[0]![1].body
      );
      const once = Buffer.from(body.sms, 'base64').toString('utf8');
      const plain = Buffer.from(once, 'base64').toString('utf8');
      expect(plain).toBe('Hello');
    });

    it('strips accents before encoding', async () => {
      await smsClient.sendSms('+584141234567', 'Código');
      const body = JSON.parse(
        (fetch as ReturnType<typeof vi.fn>).mock.calls[0]![1].body
      );
      const once = Buffer.from(body.sms, 'base64').toString('utf8');
      const plain = Buffer.from(once, 'base64').toString('utf8');
      expect(plain).toBe('Codigo');
    });

    it('passes AbortSignal to fetch', async () => {
      await smsClient.sendSms('+584141234567', 'Hello');
      const [, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]!;
      expect(options.signal).toBeInstanceOf(AbortSignal);
    });

    it('uses bearer token from token provider', async () => {
      await smsClient.sendSms('+584141234567', 'Hello');
      expect(tokenProvider.getToken).toHaveBeenCalledOnce();
      const [, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]!;
      expect(options.headers.Authorization).toBe('Bearer tok-sms');
    });

    it('retries on network error and resolves on eventual success', async () => {
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockRejectedValueOnce(new Error('ECONNREFUSED'))
          .mockResolvedValue({
            status: 200,
            json: vi.fn().mockResolvedValue(SUCCESS_SEND_RESPONSE),
          })
      );
      await smsClient.sendSms('+584141234567', 'Hello');
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('throws ZoomSmsException after exhausting retries on network error', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockRejectedValue(new Error('ECONNREFUSED'))
      );
      await expect(smsClient.sendSms('+584141234567', 'Hello')).rejects.toThrow(
        ZoomSmsException
      );
      expect(fetch).toHaveBeenCalledTimes(3); // retryMax=3
    });

    it('does NOT retry on non-COD_000 response (non-transient)', async () => {
      vi.stubGlobal(
        'fetch',
        mockFetch({ codrespuesta: 'COD_999', mensaje: 'Error' })
      );
      await expect(smsClient.sendSms('+584141234567', 'Hello')).rejects.toThrow(
        ZoomSmsException
      );
      expect(fetch).toHaveBeenCalledOnce();
    });

    it('invalidates token and retries on 401', async () => {
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValueOnce({
            status: 401,
            json: vi.fn().mockResolvedValue({}),
          })
          .mockResolvedValueOnce({
            status: 200,
            json: vi.fn().mockResolvedValue(SUCCESS_SEND_RESPONSE),
          })
      );
      await smsClient.sendSms('+584141234567', 'Hello');
      expect(tokenProvider.invalidateToken).toHaveBeenCalledOnce();
      expect(tokenProvider.getToken).toHaveBeenCalledTimes(2);
    });
  });
});
