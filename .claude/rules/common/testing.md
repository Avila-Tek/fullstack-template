# Testing Requirements

## Minimum Test Coverage: 80%

Test types required:
1. **Unit** — use cases, pure helpers, services in isolation
2. **Component** — Angular widgets and forms with Angular TestBed
3. **Integration** — NestJS API endpoints, database operations
4. **E2E** — critical user flows with Playwright

## Test Runner

All apps and packages use **Vitest**. Angular component tests use `@angular/core/testing` alongside Vitest.

Test commands:
- Single app: `npm -C apps/client test` / `npm -C apps/api test`
- Single package: `npx turbo test --filter @repo/<package>`
- All: `npx turbo test`

## Test-Driven Development

MANDATORY workflow:
1. Write test first (RED) — place `.spec.ts` next to the file under test
2. Run test — confirm it FAILS
3. Write minimal implementation (GREEN)
4. Run test — confirm it PASSES
5. Refactor (IMPROVE) — tests must stay green
6. Verify coverage (80%+)

## Troubleshooting Test Failures

1. Use **tdd-guide** agent
2. Check test isolation — no shared mutable state between tests
3. Verify mocks are correct — use `vi.fn()` from Vitest
4. Fix implementation, not tests (unless the test is wrong)

## Agent Support

- **tdd-guide** — use PROACTIVELY for new features, enforces write-tests-first
- **e2e-runner** — Playwright E2E specialist for Angular apps
