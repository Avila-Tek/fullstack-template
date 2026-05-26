import { z } from 'zod';
import { withRetry } from '../resilience/retry';
import { makeZoomSignal } from '../resilience/signal';
import type { ZoomTokenProvider } from '../types';

// ---------------------------------------------------------------------------
// Exceptions
// ---------------------------------------------------------------------------

export class ZoomEmailException extends Error {
  constructor(
    message: string,
    public readonly meta: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ZoomEmailException';
  }
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export interface ZoomEmailClientConfig {
  emailApiUrl: string;
  emailSenderId: number;
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
  entidadRespuesta: z.object({ estatus: z.string() }).optional().nullable(),
});

const SUCCESS_CODE = 'COD_000';

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

/**
 * Pure TypeScript client for the Zoom internal email gateway.
 * Handles auth token acquisition, 401 refresh-and-retry, and response parsing.
 * No NestJS dependency — configure via constructor.
 *
 * Exposes a single sendEmail() primitive that apps wrap in their own
 * EmailServicePort adapter with domain-specific method names.
 */
export class ZoomEmailClient {
  constructor(
    private readonly tokenProvider: ZoomTokenProvider,
    private readonly config: ZoomEmailClientConfig
  ) {}

  /**
   * Sends an email via the Zoom email gateway.
   * @param to - Recipient address or list of addresses.
   * @param subject - Email subject line.
   * @param htmlContent - HTML body of the email.
   * @param priority - Delivery priority (1 = high, 3 = normal). Defaults to 3.
   */
  async sendEmail(
    to: string | string[],
    subject: string,
    htmlContent: string,
    priority = 3
  ): Promise<void> {
    return withRetry(
      () => this.doSend(to, subject, htmlContent, priority),
      (err) =>
        err instanceof ZoomEmailException &&
        err.meta['reason'] === 'network_error',
      {
        maxAttempts: this.config.retryMax,
        backoffMs: this.config.retryBackoffMs,
      }
    );
  }

  private async doSend(
    to: string | string[],
    subject: string,
    htmlContent: string,
    priority: number,
    shouldRetry = true
  ): Promise<void> {
    let token: string;
    try {
      token = await this.tokenProvider.getToken();
    } catch (cause) {
      throw new ZoomEmailException('Zoom email auth failed', {
        step: 'auth',
        reason: 'auth_failed',
        cause,
      });
    }

    let res: Response;
    try {
      res = await fetch(this.config.emailApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          destinatario: to,
          asunto: subject,
          tipo: 'html',
          contenido: htmlContent,
          prioridad: priority,
          pasaporte: this.config.emailSenderId,
        }),
        signal: makeZoomSignal(this.config.timeoutMs),
      });
    } catch (cause) {
      throw new ZoomEmailException('Zoom email network error', {
        step: 'send',
        reason: 'network_error',
        cause,
      });
    }

    if (res.status === 401 && shouldRetry) {
      this.tokenProvider.invalidateToken();
      return this.doSend(to, subject, htmlContent, priority, false);
    }

    await this.parseResponse(res);
  }

  private async parseResponse(res: Response): Promise<void> {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      throw new ZoomEmailException('Zoom email invalid JSON', {
        step: 'send',
        reason: 'invalid_json',
        status: res.status,
      });
    }

    const parsed = sendResponseSchema.safeParse(body);
    if (!parsed.success || parsed.data.codrespuesta !== SUCCESS_CODE) {
      throw new ZoomEmailException('Zoom email unexpected response', {
        step: 'send',
        reason: 'unexpected_response',
        codrespuesta: (body as Record<string, unknown>)?.codrespuesta,
      });
    }
  }
}
