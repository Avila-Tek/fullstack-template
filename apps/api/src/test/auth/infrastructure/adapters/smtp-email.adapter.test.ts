import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PinoLogger } from 'nestjs-pino';
import { EmailDeliveryFailedException } from '../../../../auth/domain/exceptions/email-delivery-failed.exception.js';

// Adapter imports `* as nodemailer` and calls nodemailer.createTransport(...)
// so the mock must export createTransport at the top level (not under default)
const sendMailMock = vi.fn();
vi.mock('nodemailer', () => ({
  createTransport: vi.fn().mockReturnValue({ sendMail: sendMailMock }),
}));

function buildMockLogger() {
  return {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  } as unknown as PinoLogger;
}

describe('SmtpEmailAdapter — error logging (PII compliance)', () => {
  let mockLogger: PinoLogger;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockLogger = buildMockLogger();
    sendMailMock.mockRejectedValue(new Error('SMTP connection refused'));
  });

  async function makeAdapter() {
    // Dynamic import after vi.mock is hoisted so the mock is in place
    const { SmtpEmailAdapter } = await import(
      '../../../../auth/infrastructure/adapters/email.adapter.js'
    );
    return new SmtpEmailAdapter(mockLogger);
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
