# @zoom/config — GCP Secret Manager integration

Runtime-resolved secrets for the NestJS apps in this monorepo. Source any env
var from GCP Secret Manager by replacing the literal value in `.env` with a
resource locator; the loader resolves it in place before Zod parses the env.

## When to use

Every NestJS app (`apps/api`, `apps/auth`, `apps/orchestrator`) already wires
this in via `src/env.ts`'s `loadEnv()` and `src/main.ts`'s `await loadEnv()`
before `NestFactory.create`. If you add a new NestJS app, follow the same
pattern.

Nothing else needs to call `resolveGcpSecrets` directly. Call sites continue
to read `env.X` exactly as before — the source (literal vs. GCP) is invisible
at the consumer.

## Locator format

Any env var whose value matches one of these two regex-anchored patterns is
treated as a locator:

```
projects/<project>/secrets/<name>
projects/<project>/secrets/<name>/versions/<version>
```

- `<project>` follows GCP project-ID rules: `[a-z][a-z0-9-]{4,28}[a-z0-9]`.
- `<name>` allows `[A-Za-z0-9_-]{1,255}`.
- `<version>` is `latest` or a positive integer (e.g. `3`).
- The bare form (no `/versions/…` suffix) defaults to `latest`.
- Anything else is returned unchanged — so literal values like
  `postgresql://…` or `dev-secret-replace-me` are never touched.

## Gate variables

Two env vars control the loader:

| Var | Effect |
|---|---|
| `USE_GCP_SECRETS=true` | Loader runs; every locator in `process.env` is resolved via the GCP SDK before Zod parses `env`. |
| `USE_GCP_SECRETS=false` / unset | Full no-op. The `SecretManagerServiceClient` is **never constructed** — no import-time network or auth calls. |
| `GCP_PROJECT_ID=<id>` | Optional. When set, every locator must target this project; a mismatch fails startup **before** any GCP call. |

Default for local dev and tests: leave `USE_GCP_SECRETS` unset. Literal `.env`
values are used as-is.

## Rotation

There is no runtime refresh path. Secrets are fetched once at startup.
**Rotating a secret in GCP requires redeploying / restarting the app** — the
same guarantee the pre-change `.env`-only flow offered. Runtime rotation
would change this contract and must be agreed with DevOps before shipping.

## Local-dev ADC setup

When you do need to test with `USE_GCP_SECRETS=true` locally:

```bash
gcloud auth application-default login
USE_GCP_SECRETS=true GCP_PROJECT_ID=zoom-dev npm -C apps/auth run start:dev
```

In production (Cloud Run), ADC is provided automatically by the service
account bound to the revision. Never pass a service-account key file path in
code.

## Failure modes

All failures throw `GcpSecretLoadError` **before** Zod's `.parse()` runs, so
the app never boots with half-resolved secrets:

- Missing ADC credentials → `GcpSecretLoadError('auth', …)`.
- `accessSecretVersion` rejects → `GcpSecretLoadError(key, …, { cause })`;
  other in-flight fetches complete and their results are discarded (no
  partial mutation of `process.env`).
- GCP returns an empty payload → throws (`Empty payload for <key> …`).
- `opts.projectId` mismatch → throws without constructing the client or
  making any GCP call.

## Concurrency

Locators are fetched in parallel with `opts.concurrency ?? 5` in flight. The
cap keeps startup fast while protecting the GCP API quota.

## Boundaries — `process.env` and child processes

`resolveGcpSecrets` mutates the record you pass in (by design — downstream
`process.env.X` reads need to see resolved values). In every NestJS app that
record is `process.env` itself, so **resolved secret values live in
`process.env` for the lifetime of the Node process**.

Anything that inherits the environment inherits the secrets in plaintext:

- `child_process.spawn` / `exec` / `fork` — unless you pass an explicit
  `env` override, the child inherits the full parent env.
- `cluster.fork` and Node worker threads — same contract.
- Sub-shells opened from the app (build steps, migrations run in-process).

Before spawning child processes from a NestJS app, pass an explicit
allowlist:

```ts
child_process.spawn(cmd, args, {
  env: { PATH: process.env.PATH, /* only what the child needs */ },
});
```

Today the apps in this monorepo do not spawn untrusted children at runtime.
Adding such a code path requires an env-scrubbing decision; coordinate with
DevOps and security before shipping.

## Public API

```ts
import {
  resolveGcpSecrets,
  GcpSecretLoadError,
  type ResolveGcpSecretsOptions,
} from '@zoom/config';

await resolveGcpSecrets(process.env, {
  enabled: process.env.USE_GCP_SECRETS === 'true',
  projectId: process.env.GCP_PROJECT_ID,
  concurrency: 5,
});
```

`resolveGcpSecrets` mutates the passed record in place — by design, so that
downstream `process.env.X` reads see resolved values — and returns
`Promise<void>`.
