---
paths:
  - "**/*.ts"
  - "**/*.spec.ts"
---
# TypeScript Testing

> Extends [common/testing.md](../common/testing.md) with Angular and NestJS specific rules.

## Test Setup

- Test runner: **Vitest** (`vi`, `describe`, `it`, `expect`)
- Angular component tests: `@angular/core/testing` (`TestBed`, `ComponentFixture`)
- Mock functions: `vi.fn()` — not `jest.fn()`
- Mock services: `{ provide: ServiceClass, useValue: mockObject }`

## Angular Component Tests

- Import the standalone component directly in `TestBed.configureTestingModule({ imports: [MyComponent] })`
- Provide mocked dependencies via `providers`
- Call `fixture.detectChanges()` after setup and after state changes
- Use `await fixture.whenStable()` after async interactions
- Assert signals by calling them: `expect(component.isLoading()).toBe(false)`

## Use Case Tests

Use cases are pure functions — no TestBed needed. Pass a mock `deps` object directly and assert on the returned result object.

## NestJS Tests

- Unit test services with mocked repositories (no database)
- Integration test controllers with `@nestjs/testing` `Test.createTestingModule`

## E2E Testing

Use **Playwright** for critical Angular app flows. Use `data-testid` attributes as preferred selectors. Never use `waitForTimeout` — use Playwright's auto-waiting locators.

## Agent Support

- **tdd-guide** — enforces write-tests-first
- **e2e-runner** — Playwright E2E specialist
