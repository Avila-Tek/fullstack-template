import { z } from 'zod';
import { withRetry } from '../resilience/retry';
import { makeZoomSignal } from '../resilience/signal';
import type { ZoomTokenProvider } from '../types';

// ---------------------------------------------------------------------------
// Exceptions
// ---------------------------------------------------------------------------

export class ZoomSmsException extends Error {
  constructor(
    message: string,
    public readonly meta: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ZoomSmsException';
  }
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export interface ZoomSmsClientConfig {
  smsApiUrl: string;
  smsSenderId: string;
  timeoutMs: number;
  retryMax: number;
  retryBackoffMs: number;
}

// ---------------------------------------------------------------------------
// Response schema
// ---------------------------------------------------------------------------

const sendResponseSchema = z.object({
  codrespuesta: z.string(),
  mensaje: z.string(),
});

const SUCCESS_CODE = 'COD_000';

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

/**
 * Pure TypeScript client for the Zoom internal SMS gateway.
 * Handles auth token acquisition, 401 refresh-and-retry, accent normalization,
 * and the double-base64 encoding required by the gateway.
 * No NestJS dependency — configure via constructor.
 *
 * Exposes a single sendSms() primitive that apps wrap in their own
 * SmsServicePort adapter with domain-specific method names.
 */
export class ZoomSmsClient {
  constructor(
    private readonly tokenProvider: ZoomTokenProvider,
    private readonly config: ZoomSmsClientConfig
  ) {}

  /**
   * Sends an SMS via the Zoom SMS gateway.
   * Accents are stripped (provider limitation) and the body is double-base64-encoded.
   * @param to - Recipient phone number.
   * @param message - Plain-text message body.
   */
  async sendSms(to: string, message: string): Promise<void> {
    return withRetry(
      () => this.doSend(to, message),
      (err) =>
        err instanceof ZoomSmsException &&
        err.meta['reason'] === 'network_error',
      {
        maxAttempts: this.config.retryMax,
        backoffMs: this.config.retryBackoffMs,
      }
    );
  }

  private async doSend(
    to: string,
    message: string,
    shouldRetry = true
  ): Promise<void> {
    let token: string;
    try {
      token = await this.tokenProvider.getToken();
    } catch (cause) {
      throw new ZoomSmsException('Zoom SMS auth failed', {
        step: 'auth',
        reason: 'auth_failed',
        cause,
      });
    }

    let res: Response;
    try {
      res = await this.postSms(token, to, message);
    } catch (cause) {
      throw new ZoomSmsException('Zoom SMS network error', {
        step: 'send',
        reason: 'network_error',
        cause,
      });
    }

    if (res.status === 401 && shouldRetry) {
      this.tokenProvider.invalidateToken();
      return this.doSend(to, message, false);
    }

    await this.parseResponse(res);
  }

  private async postSms(
    token: string,
    to: string,
    message: string
  ): Promise<Response> {
    // Strip accents — current SMS provider does not support diacritics.
    const normalized = message.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    // The API requires the message body to be base64-encoded twice.
    const encoded = Buffer.from(
      Buffer.from(normalized).toString('base64')
    ).toString('base64');

    return fetch(this.config.smsApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        telefono: to,
        sms: encoded,
        tipo: 2,
        subtipo: 4,
        pasaporte: this.config.smsSenderId,
      }),
      signal: makeZoomSignal(this.config.timeoutMs),
    });
  }

  private async parseResponse(res: Response): Promise<void> {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      throw new ZoomSmsException('Zoom SMS invalid JSON', {
        step: 'send',
        reason: 'invalid_json',
        status: res.status,
      });
    }

    const parsed = sendResponseSchema.safeParse(body);
    if (!parsed.success || parsed.data.codrespuesta !== SUCCESS_CODE) {
      throw new ZoomSmsException('Zoom SMS unexpected response', {
        step: 'send',
        reason: 'unexpected_response',
        codrespuesta: (body as Record<string, unknown>)?.codrespuesta,
      });
    }
  }
}
