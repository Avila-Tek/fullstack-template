// Keys whose entire value must be redacted regardless of content.
const REDACT_KEYS = new Set([
  'address',
  'apikey',
  'authorization',
  'barcode',
  'barcodetoken',
  'clientcodelastfour',
  'cookie',
  'otp',
  'password',
  'refreshtoken',
  'secret',
  'token',
]);

/** Validates that a string contains only base64url-safe characters. */
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;

/**
 * Decodes a base64url segment and JSON-parses it.
 * Throws if the segment is not valid base64url-encoded JSON.
 */
function decodeBase64UrlJson(segment: string): unknown {
  const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  // atob is available in Node.js 16+ and all modern browsers.
  // The charCodeAt map restores UTF-8 multi-byte characters correctly.
  const decoded = decodeURIComponent(
    atob(padded)
      .split('')
      .map((c) => `%${c.charCodeAt(0).toString(16).padStart(2, '0')}`)
      .join('')
  );
  return JSON.parse(decoded);
}

/**
 * Returns true only for structurally valid JWTs.
 * Splits by '.' into exactly three parts, then base64url-decodes and
 * JSON-parses the header and payload to confirm they are plain objects,
 * and verifies the signature is a non-empty base64url-safe string.
 *
 * This replaces a length-heuristic regex that rejected valid short JWTs
 * (e.g. headers encoded from {"alg":"none"} are only 19 base64url chars).
 */
function isJwt(value: string): boolean {
  const parts = value.split('.');
  if (parts.length !== 3) return false;
  const [header, payload, signature] = parts;
  if (!header || !payload || !signature) return false;
  if (!BASE64URL_PATTERN.test(signature)) return false;
  try {
    const headerObj = decodeBase64UrlJson(header);
    const payloadObj = decodeBase64UrlJson(payload);
    return (
      typeof headerObj === 'object' &&
      headerObj !== null &&
      !Array.isArray(headerObj) &&
      typeof payloadObj === 'object' &&
      payloadObj !== null &&
      !Array.isArray(payloadObj)
    );
  } catch {
    return false;
  }
}

function maskEmail(value: string): string {
  const atIdx = value.indexOf('@');
  if (atIdx <= 0) return '[REDACTED]';
  const local = value.slice(0, atIdx);
  const domain = value.slice(atIdx); // includes '@'
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}***${domain}`;
}

function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  const last4 = digits.slice(-4);
  return `****${last4}`;
}

function redactValue(
  key: string,
  value: unknown,
  seen: WeakSet<object>
): unknown {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    if (seen.has(value)) return '[Circular]';
    return redactPii(value as Record<string, unknown>, seen);
  }

  if (typeof value !== 'string') return value;

  const lowerKey = key.toLowerCase();

  if (REDACT_KEYS.has(lowerKey)) return '[REDACTED]';
  if (isJwt(value)) return '[REDACTED]';

  if (lowerKey === 'email') return maskEmail(value);
  if (lowerKey === 'phone') return maskPhone(value);

  return value;
}

/**
 * Recursively redacts PII from a plain log object.
 * Safe to use as a pino `formatters.log` function.
 * Handles circular references by replacing them with '[Circular]'.
 */
export function redactPii(
  obj: Record<string, unknown>,
  seen = new WeakSet<object>()
): Record<string, unknown> {
  seen.add(obj);
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] = redactValue(key, value, seen);
  }
  return result;
}
