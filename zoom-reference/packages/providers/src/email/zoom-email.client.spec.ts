import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ZoomTokenProvider } from '../types';
import { ZoomEmailClient, ZoomEmailException } from './zoom-email.client';

const SUCCESS_EMAIL_RESPONSE = {
  codrespuesta: 'COD_000',
  mensaje: 'CORREO ENVIADO EXITOSAMENTE',
  entidadRespuesta: { estatus: 'Enviado exitosamente' },
};

const CONFIG = {
  emailApiUrl: 'https://zoom-api.test/email',
  emailSenderId: 1,
  timeoutMs: 5000,
  retryMax: 3,
  retryBackoffMs: 0, // instant retries in tests
};

function makeTokenProvider(token = 'tok-email'): ZoomTokenProvider {
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

describe('ZoomEmailClient', () => {
  let tokenProvider: ZoomTokenProvider;
  let emailClient: ZoomEmailClient;

  beforeEach(() => {
    tokenProvider = makeTokenProvider();
    emailClient = new ZoomEmailClient(tokenProvider, CONFIG);
    vi.stubGlobal('fetch', mockFetch(SUCCESS_EMAIL_RESPONSE));
  });

  describe('sendEmail()', () => {
    it('posts to emailApiUrl with correct envelope', async () => {
      await emailClient.sendEmail('user@example.com', 'Subject', '<p>body</p>');
      const [url, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]!;
      expect(url).toBe('https://zoom-api.test/email');
      const body = JSON.parse(options.body);
      expect(body.destinatario).toBe('user@example.com');
      expect(body.asunto).toBe('Subject');
      expect(body.tipo).toBe('html');
      expect(body.contenido).toBe('<p>body</p>');
      expect(body.prioridad).toBe(3);
      expect(body.pasaporte).toBe(1);
    });

    it('passes AbortSignal to fetch', async () => {
      await emailClient.sendEmail('user@example.com', 'S', '<p>b</p>');
      const [, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]!;
      expect(options.signal).toBeInstanceOf(AbortSignal);
    });

    it('uses bearer token from token provider', async () => {
      await emailClient.sendEmail('user@example.com', 'S', '<p>b</p>');
      expect(tokenProvider.getToken).toHaveBeenCalledOnce();
      const [, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]!;
      expect(options.headers.Authorization).toBe('Bearer tok-email');
    });

    it('sends with custom priority', async () => {
      await emailClient.sendEmail('user@example.com', 'S', '<p>b</p>', 1);
      const body = JSON.parse(
        (fetch as ReturnType<typeof vi.fn>).mock.calls[0]![1].body
      );
      expect(body.prioridad).toBe(1);
    });

    it('retries on network error and resolves on eventual success', async () => {
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockRejectedValueOnce(new Error('ECONNREFUSED'))
          .mockResolvedValue({
            status: 200,
            json: vi.fn().mockResolvedValue(SUCCESS_EMAIL_RESPONSE),
          })
      );
      await emailClient.sendEmail('user@example.com', 'S', '<p>b</p>');
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('throws ZoomEmailException after exhausting retries on network error', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockRejectedValue(new Error('ECONNREFUSED'))
      );
      await expect(
        emailClient.sendEmail('user@example.com', 'S', '<p>b</p>')
      ).rejects.toThrow(ZoomEmailException);
      expect(fetch).toHaveBeenCalledTimes(3); // retryMax=3
    });

    it('does NOT retry on non-COD_000 response (non-transient)', async () => {
      vi.stubGlobal(
        'fetch',
        mockFetch({ codrespuesta: 'COD_ERROR', mensaje: 'Bad request' })
      );
      await expect(
        emailClient.sendEmail('user@example.com', 'S', '<p>b</p>')
      ).rejects.toThrow(ZoomEmailException);
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
            json: vi.fn().mockResolvedValue(SUCCESS_EMAIL_RESPONSE),
          })
      );
      await emailClient.sendEmail('user@example.com', 'S', '<p>b</p>');
      expect(tokenProvider.invalidateToken).toHaveBeenCalledOnce();
      expect(tokenProvider.getToken).toHaveBeenCalledTimes(2);
    });
  });
});
