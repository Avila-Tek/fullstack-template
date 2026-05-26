import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { runWithConcurrency } from './concurrencyLimiter';
import { parseLocator, type SecretLocator } from './secretLocator';

export interface ResolveGcpSecretsOptions {
  enabled: boolean;
  projectId?: string;
  concurrency?: number;
}

export class GcpSecretLoadError extends Error {
  readonly key: string;
  override readonly cause?: unknown;

  constructor(key: string, message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = 'GcpSecretLoadError';
    this.key = key;
    if (options?.cause !== undefined) {
      this.cause = options.cause;
    }
  }
}

const DEFAULT_CONCURRENCY = 5;

type SecretEntry = { key: string; locator: SecretLocator };

export async function resolveGcpSecrets(
  record: Record<string, string | undefined>,
  opts: ResolveGcpSecretsOptions
): Promise<void> {
  if (!opts.enabled) {
    return;
  }

  const entries: SecretEntry[] = [];
  for (const [key, value] of Object.entries(record)) {
    if (typeof value !== 'string') continue;
    const locator = parseLocator(value);
    if (!locator) continue;
    if (opts.projectId && locator.project !== opts.projectId) {
      throw new GcpSecretLoadError(
        key,
        `Locator project "${locator.project}" does not match configured GCP_PROJECT_ID "${opts.projectId}"`
      );
    }
    entries.push({ key, locator });
  }

  if (entries.length === 0) {
    return;
  }

  const client = new SecretManagerServiceClient();
  const concurrency = opts.concurrency ?? DEFAULT_CONCURRENCY;

  const tasks = entries.map(
    ({ key, locator }) =>
      async (): Promise<{ key: string; value: string }> => {
        const resourceName = `projects/${locator.project}/secrets/${locator.name}/versions/${locator.version}`;
        try {
          const [response] = await client.accessSecretVersion({
            name: resourceName,
          });
          const raw = response.payload?.data;
          let value: string;
          if (typeof raw === 'string') {
            value = raw;
          } else if (raw instanceof Uint8Array) {
            value = Buffer.from(raw).toString('utf8');
          } else {
            throw new GcpSecretLoadError(
              key,
              `Unexpected payload type for "${key}" from GCP Secret Manager (${resourceName})`
            );
          }
          if (value.length === 0) {
            throw new GcpSecretLoadError(
              key,
              `Empty payload for "${key}" from GCP Secret Manager (${resourceName})`
            );
          }
          return { key, value };
        } catch (err) {
          if (err instanceof GcpSecretLoadError) {
            throw err;
          }
          throw new GcpSecretLoadError(
            key,
            `Failed to load secret "${key}" from GCP Secret Manager (${resourceName}): ${
              err instanceof Error ? err.message : String(err)
            }`,
            { cause: err }
          );
        }
      }
  );

  try {
    const results = await runWithConcurrency(tasks, concurrency);
    for (const { key, value } of results) {
      record[key] = value;
    }
  } finally {
    // Close gRPC handles once startup resolution completes. Secret Manager
    // client is not reused after startup, so leaving it open leaks handles.
    try {
      await client.close();
    } catch {
      // Best-effort cleanup; a close failure must not mask a resolution error.
    }
  }
}
