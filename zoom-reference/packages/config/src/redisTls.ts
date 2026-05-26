/**
 * Build the ioredis TLS options bag from an optional PEM-encoded CA cert.
 *
 * When the Redis URL uses `rediss://`, ioredis initiates a TLS handshake. If
 * the server cert is signed by a private CA (e.g. GCP Memorystore), Node has
 * no way to verify it without being told the CA explicitly — failing with
 * `unable to verify the first certificate`. Pass the CA's PEM into this helper
 * and spread the result into the ioredis options.
 *
 * Local dev typically uses `redis://` (no TLS) and leaves the CA unset; the
 * helper returns an empty object in that case.
 */
export function redisTlsOptions(caCert: string | undefined): {
  tls?: { ca: string };
} {
  if (!caCert) return {};
  return { tls: { ca: caCert } };
}
