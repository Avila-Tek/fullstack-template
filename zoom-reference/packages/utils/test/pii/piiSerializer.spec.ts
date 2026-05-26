import { describe, expect, it } from 'vitest';
import { redactPii } from '../../src/piiSerializer';

describe('redactPii', () => {
  describe('email masking', () => {
    it('masks email to first 2 chars + *** + @domain', () => {
      const result = redactPii({ email: 'sabucds@example.com' });
      expect(result['email']).toBe('sa***@example.com');
    });

    it('masks short email (1 char local part) to 1 char', () => {
      const result = redactPii({ email: 'a@example.com' });
      expect(result['email']).toBe('a***@example.com');
    });

    it('masks email in nested objects', () => {
      const result = redactPii({ user: { email: 'test@foo.com' } });
      expect((result['user'] as Record<string, unknown>)['email']).toBe(
        'te***@foo.com'
      );
    });
  });

  describe('phone masking', () => {
    it('shows only last 4 digits of phone number', () => {
      const result = redactPii({ phone: '+52 55 1234 5678' });
      expect(result['phone']).toBe('****5678');
    });

    it('masks phone in nested objects', () => {
      const result = redactPii({ contact: { phone: '5551234567' } });
      expect((result['contact'] as Record<string, unknown>)['phone']).toBe(
        '****4567'
      );
    });
  });

  describe('address redaction', () => {
    it('redacts address field entirely', () => {
      const result = redactPii({ address: '123 Main St, City, Country' });
      expect(result['address']).toBe('[REDACTED]');
    });
  });

  describe('sensitive header/token stripping', () => {
    it('redacts Authorization header', () => {
      const result = redactPii({ authorization: 'Bearer eyJhbGc...' });
      expect(result['authorization']).toBe('[REDACTED]');
    });

    it('redacts Cookie header', () => {
      const result = redactPii({ cookie: 'session=abc123' });
      expect(result['cookie']).toBe('[REDACTED]');
    });

    it('redacts fields named refreshToken', () => {
      const result = redactPii({ refreshToken: 'some-opaque-token' });
      expect(result['refreshToken']).toBe('[REDACTED]');
    });

    it('redacts fields named apiKey', () => {
      const result = redactPii({ apiKey: 'sk-abc123' });
      expect(result['apiKey']).toBe('[REDACTED]');
    });
  });

  describe('JWT structural detection in arbitrary fields', () => {
    it('redacts a structurally valid JWT in an arbitrary field', () => {
      // eyJhbGciOiJSUzI1NiJ9 → {"alg":"RS256"}
      // eyJzdWIiOiIxMjMifQ   → {"sub":"123"}
      const jwt = 'eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIxMjMifQ.sig';
      const result = redactPii({ data: jwt });
      expect(result['data']).toBe('[REDACTED]');
    });

    it('redacts a valid JWT whose segments are shorter than 20 chars (old heuristic would miss this)', () => {
      // eyJhbGciOiJub25lIn0 → {"alg":"none"} (19 chars — rejected by old {20,} regex)
      // eyJhIjoxfQ          → {"a":1}        (10 chars)
      const shortJwt = 'eyJhbGciOiJub25lIn0.eyJhIjoxfQ.abc';
      const result = redactPii({ data: shortJwt });
      expect(result['data']).toBe('[REDACTED]');
    });

    it('does not redact a dotted event name that looks superficially like a JWT', () => {
      const result = redactPii({ event: 'auth.login.success' });
      expect(result['event']).toBe('auth.login.success');
    });

    it('does not redact a string with only two dot-separated segments', () => {
      const result = redactPii({
        data: 'eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIxMjMifQ',
      });
      expect(result['data']).toBe('eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIxMjMifQ');
    });

    it('does not redact a three-part string where header is not valid JSON', () => {
      const result = redactPii({
        data: 'notbase64json.eyJzdWIiOiIxMjMifQ.sig',
      });
      expect(result['data']).toBe('notbase64json.eyJzdWIiOiIxMjMifQ.sig');
    });

    it('does not redact a three-part string where payload is not a JSON object', () => {
      // eyJhbGciOiJSUzI1NiJ9 → {"alg":"RS256"} (valid header)
      // InN0cmluZyI          → "string"        (JSON string, not object)
      const result = redactPii({
        data: 'eyJhbGciOiJSUzI1NiJ9.InN0cmluZyI.sig',
      });
      expect(result['data']).toBe('eyJhbGciOiJSUzI1NiJ9.InN0cmluZyI.sig');
    });

    it('does not redact a three-part string where signature contains non-base64url chars', () => {
      const result = redactPii({
        data: 'eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIxMjMifQ.bad sig!',
      });
      expect(result['data']).toBe(
        'eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIxMjMifQ.bad sig!'
      );
    });
  });

  describe('non-PII pass-through', () => {
    it('leaves safe fields unchanged', () => {
      const result = redactPii({
        service: 'zoom-api',
        statusCode: 200,
        method: 'GET',
        path: '/health',
      });
      expect(result).toMatchObject({
        service: 'zoom-api',
        statusCode: 200,
        method: 'GET',
        path: '/health',
      });
    });
  });
});
