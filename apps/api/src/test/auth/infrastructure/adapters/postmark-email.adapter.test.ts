import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PinoLogger } from 'nestjs-pino';
import { EmailDeliveryFailedException } from '../../../../auth/domain/exceptions/email-delivery-failed.exception.js';

// Adapter imports `* as postmark` and calls `new postmark.ServerClient(...)`
// so the mock must export ServerClient at the top level (not under default).
// Must use a regular function (not arrow) so it is newable.
const sendEmailMock = vi.fn();
vi.mock('postmark', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function ServerClient(this: any) {
    this.sendEmail = sendEmailMock;
  }
  return { ServerClient };
});

function buildMockLogger() {
  return {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  } as unknown as PinoLogger;
}

describe('PostmarkEmailAdapter — error logging (PII compliance)', () => {
  let mockLogger: PinoLogger;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLogger = buildMockLogger();
    sendEmailMock.mockRejectedValue(new Error('Postmark API error'));
  });

  async function makeAdapter() {
    const { PostmarkEmailAdapter } = await import(
      '../../../../auth/infrastructure/adapters/postmark-email.adapter.js'
    );
    return new PostmarkEmailAdapter(mockLogger);
  }

  it('does NOT log the recipient email address (PII)', async () => {
    const adapter = await makeAdapter();
    await expect(adapter.sendVerification('user@example.com', 'http://verify')).rejects.toThrow(
      EmailDeliveryFailedException,
    );

    const errorCall = (mockLogger.error as ReturnType<typeof vi.fn>).mock.calls[0];
    const loggedObject = errorCall?.[0] as Record<string, unknown> | undefined;
    expect(loggedObject?.['to']).toBeUndefined();
  });

  it('does NOT log the email subject (may contain PII context)', async () => {
    const adapter = await makeAdapter();
    await expect(adapter.sendVerification('user@example.com', 'http://verify')).rejects.toThrow(
      EmailDeliveryFailedException,
    );

    const errorCall = (mockLogger.error as ReturnType<typeof vi.fn>).mock.calls[0];
    const loggedObject = errorCall?.[0] as Record<string, unknown> | undefined;
    expect(loggedObject?.['subject']).toBeUndefined();
  });

  it('logs errorCode EMAIL_DELIVERY_FAILED for observability', async () => {
    const adapter = await makeAdapter();
    await expect(adapter.sendVerification('user@example.com', 'http://verify')).rejects.toThrow(
      EmailDeliveryFailedException,
    );

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({ errorCode: 'EMAIL_DELIVERY_FAILED' }),
      expect.any(String),
    );
  });

  it('still logs the underlying error object for debugging', async () => {
    const adapter = await makeAdapter();
    await expect(adapter.sendVerification('user@example.com', 'http://verify')).rejects.toThrow(
      EmailDeliveryFailedException,
    );

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({ err: expect.any(Error) }),
      expect.any(String),
    );
  });
});
