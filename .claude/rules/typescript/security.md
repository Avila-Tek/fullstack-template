---
paths:
  - "**/*.ts"
  - "**/*.js"
---
# TypeScript Security

> Extends [common/security.md](../common/security.md) with Angular and NestJS specific rules.

## Secret Management

Never hardcode secrets. Use environment variables and validate at startup:

```typescript
const secret = process.env.JWT_SECRET
if (!secret) throw new Error('JWT_SECRET not configured')
```

## NestJS Guards

Every protected route must have `@UseGuards(AuthGuard)`. Admin routes must additionally use `adminGuard` from `@repo/auth`. Never rely on client-side checks alone.

## Angular XSS

Angular escapes interpolation `{{ }}` by default — this is safe. Flag any use of `[innerHTML]` or `DomSanitizer.bypassSecurityTrust*` immediately.

## Token Storage

Never store JWTs in `localStorage`. Use httpOnly cookies managed through `@repo/services`.

## Agent Support

- Use **security-reviewer** agent for any new endpoint, guard, or auth code
