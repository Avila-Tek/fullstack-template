---
name: Monorepo package boundaries (@repo/schemas, @repo/utils)
description: When to import from shared packages vs inline in an app
type: feedback
---

Keep importing from `@repo/schemas` for endpoint request/response DTOs that are shared with the frontend (or any 2+ apps). Keep importing from `@repo/utils` for utility functions used across 2+ apps.

**Why:** These packages exist precisely for cross-app sharing. Replacing them with local copies defeats the purpose and creates drift.

**How to apply:** Only inline from `@repo/schemas` or `@repo/utils` when the export genuinely does not exist in those packages AND the concept is app-specific (e.g. `DomainException`, `LOGGER_PORT`, `httpMessages` are API-internal concerns — correct to inline). If a shared export is missing from the package, add it there rather than duplicating it locally.
