import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type AccessRequest = { name?: string | null };
type Payload = { data?: string | Uint8Array | null } | null | undefined;
type AccessResponse = { payload?: Payload };

const { accessSecretVersion, close, constructorSpy } = vi.hoisted(() => ({
  accessSecretVersion: vi.fn(),
  close: vi.fn().mockResolvedValue(undefined),
  constructorSpy: vi.fn(),
}));

vi.mock('@google-cloud/secret-manager', () => ({
  SecretManagerServiceClient: class {
    accessSecretVersion = accessSecretVersion;
    close = close;
    constructor(options?: unknown) {
      constructorSpy(options);
    }
  },
}));

beforeEach(() => {
  accessSecretVersion.mockReset();
  close.mockReset();
  close.mockResolvedValue(undefined);
  constructorSpy.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

async function loadModule() {
  return await import('./gcpSecretLoader.js');
}

function buildAccessResponse(value: string): [AccessResponse] {
  return [{ payload: { data: Buffer.from(value, 'utf8') } }];
}

describe('resolveGcpSecrets — disabled path', () => {
  it('returns immediately when enabled=false and never constructs the client', async () => {
    const { resolveGcpSecrets } = await loadModule();
    const record: Record<string, string | undefined> = {
      SECRET_A: 'projects/zoom-prod/secrets/SECRET_A/versions/latest',
      FOO: 'bar',
    };

    await resolveGcpSecrets(record, { enabled: false });

    expect(constructorSpy).not.toHaveBeenCalled();
    expect(accessSecretVersion).not.toHaveBeenCalled();
    expect(record.SECRET_A).toBe(
      'projects/zoom-prod/secrets/SECRET_A/versions/latest'
    );
    expect(record.FOO).toBe('bar');
  });
});

describe('resolveGcpSecrets — enabled path', () => {
  it('is a no-op when no locators are present (no GCP call)', async () => {
    const { resolveGcpSecrets } = await loadModule();
    const record: Record<string, string | undefined> = {
      PLAIN: 'hello',
      ALSO_PLAIN: 'world',
      EMPTY: undefined,
    };

    await resolveGcpSecrets(record, { enabled: true });

    expect(accessSecretVersion).not.toHaveBeenCalled();
    expect(record).toEqual({
      PLAIN: 'hello',
      ALSO_PLAIN: 'world',
      EMPTY: undefined,
    });
  });

  it('mutates only locator keys; literals are left intact', async () => {
    const { resolveGcpSecrets } = await loadModule();
    accessSecretVersion.mockImplementation(async (req: AccessRequest) => {
      const name = req.name ?? '';
      if (name.includes('SECRET_A')) return buildAccessResponse('value-a');
      if (name.includes('SECRET_B')) return buildAccessResponse('value-b');
      if (name.includes('SECRET_C')) return buildAccessResponse('value-c');
      throw new Error(`unexpected name ${name}`);
    });
    const record: Record<string, string | undefined> = {
      LITERAL_1: 'plain-one',
      LITERAL_2: 'plain-two',
      SECRET_A: 'projects/zoom-prod/secrets/SECRET_A',
      SECRET_B: 'projects/zoom-prod/secrets/SECRET_B/versions/latest',
      SECRET_C: 'projects/zoom-prod/secrets/SECRET_C/versions/7',
    };

    await resolveGcpSecrets(record, { enabled: true, concurrency: 3 });

    expect(record.LITERAL_1).toBe('plain-one');
    expect(record.LITERAL_2).toBe('plain-two');
    expect(record.SECRET_A).toBe('value-a');
    expect(record.SECRET_B).toBe('value-b');
    expect(record.SECRET_C).toBe('value-c');
    expect(accessSecretVersion).toHaveBeenCalledTimes(3);
  });

  it('sends the correct resource name for /versions/latest and pinned versions', async () => {
    const { resolveGcpSecrets } = await loadModule();
    accessSecretVersion.mockImplementation(async (_req: AccessRequest) =>
      buildAccessResponse('ok')
    );
    const record: Record<string, string | undefined> = {
      BARE: 'projects/zoom-prod/secrets/BARE',
      PINNED: 'projects/zoom-prod/secrets/PINNED/versions/3',
    };

    await resolveGcpSecrets(record, { enabled: true });

    const calls = accessSecretVersion.mock.calls.map(
      (args) => (args[0] as AccessRequest).name
    );
    expect(calls).toEqual(
      expect.arrayContaining([
        'projects/zoom-prod/secrets/BARE/versions/latest',
        'projects/zoom-prod/secrets/PINNED/versions/3',
      ])
    );
  });

  it('honors the concurrency cap', async () => {
    const { resolveGcpSecrets } = await loadModule();
    let inFlight = 0;
    let peak = 0;
    accessSecretVersion.mockImplementation(async () => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 10));
      inFlight -= 1;
      return buildAccessResponse('v');
    });
    const record: Record<string, string | undefined> = Object.fromEntries(
      Array.from({ length: 6 }, (_, i) => [
        `KEY_${i}`,
        `projects/zoom-prod/secrets/KEY_${i}/versions/latest`,
      ])
    );

    await resolveGcpSecrets(record, { enabled: true, concurrency: 2 });

    expect(peak).toBeLessThanOrEqual(2);
    expect(peak).toBeGreaterThan(0);
  });

  it('throws GcpSecretLoadError with key and cause when a fetch fails', async () => {
    const { resolveGcpSecrets, GcpSecretLoadError } = await loadModule();
    const cause = new Error('permission denied');
    accessSecretVersion.mockImplementation(async (req: AccessRequest) => {
      if (req.name?.includes('BAD')) {
        throw cause;
      }
      return buildAccessResponse('ok');
    });
    const record: Record<string, string | undefined> = {
      GOOD: 'projects/zoom-prod/secrets/GOOD/versions/latest',
      BAD: 'projects/zoom-prod/secrets/BAD/versions/latest',
    };

    try {
      await resolveGcpSecrets(record, { enabled: true, concurrency: 2 });
      throw new Error('expected resolveGcpSecrets to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(GcpSecretLoadError);
      const loadErr = err as InstanceType<typeof GcpSecretLoadError>;
      expect(loadErr.key).toBe('BAD');
      expect(loadErr.cause).toBe(cause);
    }
  });

  it('throws before any GCP call when projectId mismatches a locator', async () => {
    const { resolveGcpSecrets, GcpSecretLoadError } = await loadModule();
    const record: Record<string, string | undefined> = {
      MISMATCHED: 'projects/other-project/secrets/X/versions/latest',
    };

    await expect(
      resolveGcpSecrets(record, {
        enabled: true,
        projectId: 'zoom-prod',
      })
    ).rejects.toBeInstanceOf(GcpSecretLoadError);
    expect(accessSecretVersion).not.toHaveBeenCalled();
    expect(constructorSpy).not.toHaveBeenCalled();
  });

  it('throws when GCP returns an empty payload', async () => {
    const { resolveGcpSecrets, GcpSecretLoadError } = await loadModule();
    accessSecretVersion.mockResolvedValue([
      { payload: { data: Buffer.from('', 'utf8') } },
    ]);
    const record: Record<string, string | undefined> = {
      EMPTY: 'projects/zoom-prod/secrets/EMPTY/versions/latest',
    };

    await expect(
      resolveGcpSecrets(record, { enabled: true })
    ).rejects.toBeInstanceOf(GcpSecretLoadError);
  });

  it('accepts string payload data from GCP', async () => {
    const { resolveGcpSecrets } = await loadModule();
    accessSecretVersion.mockResolvedValue([{ payload: { data: 'as-string' } }]);
    const record: Record<string, string | undefined> = {
      S: 'projects/zoom-prod/secrets/S/versions/latest',
    };

    await resolveGcpSecrets(record, { enabled: true });

    expect(record.S).toBe('as-string');
  });

  it('closes the GCP client on success', async () => {
    const { resolveGcpSecrets } = await loadModule();
    accessSecretVersion.mockResolvedValue(buildAccessResponse('v'));
    const record: Record<string, string | undefined> = {
      S: 'projects/zoom-prod/secrets/S/versions/latest',
    };

    await resolveGcpSecrets(record, { enabled: true });

    expect(close).toHaveBeenCalledTimes(1);
  });

  it('closes the GCP client even when a fetch fails', async () => {
    const { resolveGcpSecrets } = await loadModule();
    accessSecretVersion.mockRejectedValue(new Error('nope'));
    const record: Record<string, string | undefined> = {
      BAD: 'projects/zoom-prod/secrets/BAD/versions/latest',
    };

    await expect(
      resolveGcpSecrets(record, { enabled: true })
    ).rejects.toThrow();
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('wraps an ADC / auth failure thrown from the SDK in GcpSecretLoadError with key and cause', async () => {
    const { resolveGcpSecrets, GcpSecretLoadError } = await loadModule();
    const adcError = new Error(
      'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication'
    );
    accessSecretVersion.mockRejectedValue(adcError);
    const record: Record<string, string | undefined> = {
      SECRET: 'projects/zoom-prod/secrets/SECRET/versions/latest',
    };

    try {
      await resolveGcpSecrets(record, { enabled: true });
      throw new Error('expected resolveGcpSecrets to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(GcpSecretLoadError);
      const loadErr = err as InstanceType<typeof GcpSecretLoadError>;
      expect(loadErr.key).toBe('SECRET');
      expect(loadErr.cause).toBe(adcError);
    }
  });
});
