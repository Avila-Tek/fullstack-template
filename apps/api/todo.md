# Todo: Log Schema Standard Alignment

## Phase 1 — Core Config
- [x] **Task 1** — Normalize Pino field names + suppress errorStack in prod ✅ commit 4f82b3b
  - [x] `messageKey: 'message'`
  - [x] `formatters.level` → string
  - [x] `customAttributeKeys.responseTime` → `'durationMs'`
  - [x] `formatters.bindings` emits `service.name`, `service.version`, `deployment.environment`
  - [x] `customProps` emits `requestId` (renamed from correlationId)
  - [x] `serializers.err` suppresses `stack` in production
  - [x] `otel.ts` adds `deployment.environment` to resource
  - [x] Write `pino.config.test.ts` (9 tests passing)
  - [x] Typecheck + lint pass

## Checkpoint 1
- [x] `npm -C apps/api run check:types` ✅
- [x] `npm -C apps/api test` ✅ (pre-existing domain-exception-filter test failure — fixed in Task 2)
- [x] `npm run lint` ✅

## Phase 2 — Structured Error Logging
- [x] **Task 2** — Add `errorCode` to exception filter logs ✅ commit 2662f95
  - [x] `AllExceptionsFilter`: `@Injectable()` + inject `PinoLogger` + `logger.error({ errorCode: 'INTERNAL_ERROR' })`
  - [x] `HttpExceptionFilter`: `@Injectable()` + inject `PinoLogger` + `logger.error` (5xx) / `logger.warn` (4xx)
  - [x] `DomainExceptionFilter`: `@Injectable()` + inject `PinoLogger` + `logger.warn({ errorCode: exception.error })`
  - [x] Update/create tests for all three filters (12 tests)

## Phase 3 — PII Remediation
- [x] **Task 3** — Remove `to` and `subject` from email adapter error logs ✅ commit 99c4906
  - [x] `SmtpEmailAdapter`: replaced `{ err, to, subject }` with `{ err, errorCode: 'EMAIL_DELIVERY_FAILED' }`
  - [x] `PostmarkEmailAdapter`: same
  - [x] Tests asserting `to`/`subject` absent from log call (8 tests)

## Checkpoint 2
- [x] All 96 tests pass ✅
- [x] No PII in any logger call ✅
- [x] `errorCode` in all error-level logs ✅

## Phase 4 — userId Propagation
- [x] **Task 4** — Attach `userId` to log context via sign-in/sign-up hooks ✅ commit 0e97817
  - [x] Sign-in after-hook calls `logger.assign({ userId })`
  - [x] Sign-up after-hook calls `logger.assign({ userId })`
  - [x] Pass `this.logger` to hook factories from `BetterAuthService`
  - [x] Tests: `logger.assign` called with correct userId (5 tests)

## Final Checkpoint
- [x] 96 tests pass ✅
- [x] `npm -C apps/api run check:types` ✅
- [x] `npm run lint` ✅
- [x] All 7 schema gaps closed ✅
