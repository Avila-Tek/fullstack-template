import { z } from 'zod';
import { withRetry } from '../resilience/retry';
import { makeZoomSignal } from '../resilience/signal';
import type { ZoomTokenProvider } from '../types';

// ---------------------------------------------------------------------------
// Exceptions
// ---------------------------------------------------------------------------

export class ZoomAuthException extends Error {
  constructor(
    message: string,
    public readonly meta: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ZoomAuthException';
  }
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export interface ZoomAuthClientConfig {
  authUrl: string;
  user: string;
  password: string;
  timeoutMs: number;
  retryMax: number;
  retryBackoffMs: number;
}

// ---------------------------------------------------------------------------
// Response schema
// ---------------------------------------------------------------------------

const authResponseSchema = z.object({
  codrespuesta: z.string(),
  mensaje: z.string(),
  entidadRespuesta: z.object({
    token: z.string(),
    expires_at: z.string(),
  }),
});

const SUCCESS_CODE = 'COD_000';
const TOKEN_REFRESH_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

/**
 * Pure TypeScript client for Zoom platform authentication.
 * Manages token acquisition, caching, deduplication, and proactive refresh.
 * No NestJS dependency — configure via constructor.
 *
 * Implements ZoomTokenProvider so it can be passed directly to ZoomEmailClient
 * and ZoomSmsClient, or wrapped by a NestJS @Injectable() service.
 */
export class ZoomAuthClient implements ZoomTokenProvider {
  private cachedToken: string | null = null;
  private tokenExpiry: Date | null = null;
  private pendingAuth: Promise<string> | null = null;

  constructor(private readonly config: ZoomAuthClientConfig) {}

  /** Returns the cached token, authenticating first if necessary.
   *  Deduplicates concurrent requests and refreshes proactively if near expiry.
   */
  async getToken(): Promise<string> {
    if (
      this.cachedToken &&
      this.tokenExpiry &&
      Date.now() < this.tokenExpiry.getTime() - TOKEN_REFRESH_THRESHOLD_MS
    ) {
      return this.cachedToken;
    }

    if (this.pendingAuth) {
      return this.pendingAuth;
    }

    this.pendingAuth = this.authenticate()
      .then((token) => {
        this.pendingAuth = null;
        return token;
      })
      .catch((err) => {
        this.pendingAuth = null;
        throw err;
      });

    return this.pendingAuth;
  }

  /** Clears the cached token so the next getToken() call will re-authenticate. */
  invalidateToken(): void {
    this.cachedToken = null;
    this.tokenExpiry = null;
  }

  private async authenticate(): Promise<string> {
    return withRetry(
      () => this.doAuthenticate(),
      (err) =>
        err instanceof ZoomAuthException &&
        err.meta['reason'] === 'network_error',
      {
        maxAttempts: this.config.retryMax,
        backoffMs: this.config.retryBackoffMs,
      }
    );
  }

  private async doAuthenticate(): Promise<string> {
    let raw: Response;
    try {
      raw = await fetch(this.config.authUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuario: this.config.user,
          password: this.config.password,
        }),
        signal: makeZoomSignal(this.config.timeoutMs),
      });
    } catch (cause) {
      throw new ZoomAuthException('Zoom auth network error', {
        reason: 'network_error',
        cause,
      });
    }

    let body: unknown;
    try {
      body = await raw.json();
    } catch {
      throw new ZoomAuthException('Zoom auth invalid JSON', {
        reason: 'invalid_json',
        status: raw.status,
      });
    }

    const parsed = authResponseSchema.safeParse(body);
    if (!parsed.success || parsed.data.codrespuesta !== SUCCESS_CODE) {
      throw new ZoomAuthException('Zoom auth unexpected response', {
        reason: 'unexpected_response',
        codrespuesta: (body as Record<string, unknown>)?.codrespuesta,
      });
    }

    const token = parsed.data.entidadRespuesta.token;
    const expiresAtStr = parsed.data.entidadRespuesta.expires_at;

    this.tokenExpiry = new Date(expiresAtStr);
    // Validate date is not Invalid Date; fallback to 1 hour from now if parsing failed
    if (Number.isNaN(this.tokenExpiry.getTime())) {
      this.tokenExpiry = new Date(Date.now() + 60 * 60 * 1000);
    }

    this.cachedToken = token;
    return token;
  }
}
