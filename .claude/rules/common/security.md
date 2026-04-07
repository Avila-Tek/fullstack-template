# Security Guidelines

## Mandatory Security Checks

Before ANY commit:
- [ ] No hardcoded secrets (API keys, passwords, tokens)
- [ ] All user inputs validated (Zod on NestJS DTOs, `zodFieldValidator` on Angular forms)
- [ ] NestJS routes that require auth have `@UseGuards(AuthGuard)`
- [ ] Admin routes also use `adminGuard` from `@repo/auth`
- [ ] Angular templates do not use `[innerHTML]` with user-controlled data
- [ ] CSRF protection enabled on state-changing NestJS endpoints
- [ ] Rate limiting on public auth endpoints (`/auth/login`, `/auth/register`)
- [ ] Error messages don't leak internal details to HTTP responses

## Secret Management

- NEVER hardcode secrets in source code
- ALWAYS use environment variables
- Validate required secrets are present at NestJS app startup
- Rotate any secrets that may have been exposed

## Angular Security

- Default interpolation `{{ }}` and property binding `[textContent]` are safe — Angular escapes by default
- Flag any use of `[innerHTML]` or `DomSanitizer.bypassSecurityTrust*` — these bypass Angular's XSS protection
- Never store JWT tokens in `localStorage` — use httpOnly cookies via `@repo/services`
- `*appRequireRole` hides UI elements but is NOT a security boundary — always enforce on the API too

## NestJS Security

- Every protected controller or route must have `@UseGuards(AuthGuard)` (or equivalent)
- Admin-only routes must additionally use `adminGuard` or validate role via `RoleService` from `@repo/auth`
- DTOs validated with Zod schemas from `@repo/schemas` or `class-validator`
- Never send raw error stack traces to HTTP responses in production

## Security Response Protocol

If security issue found:
1. STOP immediately
2. Use **security-reviewer** agent
3. Fix CRITICAL issues before continuing
4. Rotate any exposed secrets
5. Review the codebase for similar patterns
