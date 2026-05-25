# F3: JWT + Guards + RBAC

**Date:** 2026-05-25  
**Status:** Approved  
**Depends on:** F1, F2  
**Blocks:** F4, F5, F7

---

## Objetivo

Sistema de autorización completo. Al terminar: rutas protegidas por JWT ES256, permisos evaluados sin DB hit en guards, roles asignables por `super_admin`, y el endpoint `/auth/token` operativo para que clientes obtengan un JWT fresco desde la sesión.

---

## Fuera de scope

- Change password / reset / email (F4)
- Social OAuth / 2FA (F6)

---

## Archivos a crear

```
apps/api/src/
│
├── auth/
│   ├── domain/
│   │   └── exceptions/
│   │       ├── session-expired.exception.ts       ← (definida en F2, reutilizada aquí)
│   │       ├── session-invalidated.exception.ts
│   │       ├── auth-forbidden.exception.ts
│   │       └── auth-role-not-found.exception.ts
│   │
│   ├── application/
│   │   ├── events/auth.events.ts                  ← añadir: AuthJwtRefreshedEvent, AuthSessionExpiredEvent
│   │   ├── ports/
│   │   │   ├── in/
│   │   │   │   ├── get-token.port.ts              ← abstract GetTokenPort { execute(...) }
│   │   │   │   └── force-revoke-sessions.port.ts
│   │   │   └── out/
│   │   │       └── jwt-mint.port.ts               ← abstract JwtMintPort { mint(claims): Promise<string> }
│   │   └── use-cases/
│   │       ├── get-token.use-case.ts              ← inactivity check + sessionInvalidBefore +
│   │       │                                         resolveRoles + mint ES256 + slide TTL + emit
│   │       └── force-revoke-sessions.use-case.ts  ← borra todas las sesiones del userId en DB + Redis
│   │
│   └── infrastructure/
│       ├── guards/
│       │   └── admin.guard.ts                     ← chequea roles[] del JWT, sin DB hit
│       ├── jwt/
│       │   └── es256-jwt-mint.adapter.ts          ← firma con JWK de BA (drizzle-jwk-repository)
│       └── hooks/
│           └── token.hooks.ts                     ← @BeforeHook /token → GetTokenPort.execute()
│
├── rbac/
│   ├── module.ts
│   │
│   ├── domain/
│   │   ├── entities/
│   │   │   ├── Role.ts
│   │   │   └── Permission.ts
│   │   └── value-objects/
│   │       ├── RoleId.ts
│   │       └── PermissionId.ts
│   │
│   ├── application/
│   │   ├── ports/
│   │   │   ├── in/
│   │   │   │   ├── assign-role.port.ts
│   │   │   │   └── revoke-role.port.ts
│   │   │   └── out/
│   │   │       ├── role.repository.port.ts
│   │   │       ├── permission.repository.port.ts
│   │   │       └── facades/
│   │   │           └── rbac-facade.port.ts        ← resolveRoles(userId), resolvePermissions(userId)
│   │   ├── services/
│   │   │   └── permission-resolver.service.ts     ← filtra expiresAt; retorna Set<string>
│   │   └── use-cases/
│   │       ├── assign-role.use-case.ts            ← upsert + audit + emit('auth.role_assigned')
│   │       └── revoke-role.use-case.ts            ← idempotente + emit('auth.role_revoked')
│   │
│   └── infrastructure/
│       ├── persistence/
│       │   ├── role.schema.ts
│       │   ├── permission.schema.ts
│       │   ├── role-permission.schema.ts
│       │   ├── user-role.schema.ts                ← expiresAt nullable, grantedBy TEXT
│       │   ├── role.repository-adapter.ts
│       │   └── permission.repository-adapter.ts
│       ├── facades/
│       │   └── rbac-facade.adapter.ts             ← implements RbacFacadePort con PermissionResolver
│       └── web/
│           ├── roles.controller.ts                ← POST/DELETE /rbac/users/:userId/roles
│           │                                         @UseGuards(AdminGuard)
│           └── dto/
│               ├── assign-role.request.ts         ← { roleKey: string, expiresAt?: string }
│               └── revoke-role-params.dto.ts
│
├── shared/
│   └── guards/
│       ├── jwt-auth.guard.ts                      ← doble modo: cookie BA + Bearer ES256
│       ├── permissions.guard.ts                   ← @RequirePermissions vía RbacFacadePort
│       ├── public.decorator.ts                    ← @Public()
│       ├── current-user.decorator.ts              ← @CurrentUser(): JwtUser
│       ├── current-permissions.decorator.ts       ← @CurrentPermissions(): Set<string>
│       ├── require-permissions.decorator.ts       ← @RequirePermissions({permissions, operator})
│       └── jwt-user.interface.ts                  ← JwtUser { sub, email, emailVerified, sid, roles }
│
└── scripts/
    └── seed.ts                                    ← roles + permisos base en transaction
```

---

## Detalles de implementación

### `GetTokenUseCase`

```typescript
async execute(params: {
  userId: string; sessionId: string; email: string;
  emailVerified: boolean; sessionCreatedAt: Date; correlationId?: string;
}): Promise<{ token: string }> {
  // 1. Inactivity check
  const active = await redis.get(`session:${params.sessionId}:activity`);
  if (!active) {
    await sessionRepo.deleteById(params.sessionId);
    this.eventEmitter.emit('auth.session_expired', new AuthSessionExpiredEvent(...));
    throw new SessionExpiredException();
  }

  // 2. sessionInvalidBefore check
  const session = await sessionRepo.findById(params.sessionId);
  if (!session || (session.invalidBefore && params.sessionCreatedAt < session.invalidBefore)) {
    await sessionRepo.deleteById(params.sessionId);
    throw new SessionInvalidatedException();
  }

  // 3. Resolver roles desde RBAC
  const roles = await rbacFacade.resolveRoles(params.userId);

  // 4. Mint JWT ES256
  const token = await jwtMint.mint({
    sub: params.userId, email: params.email,
    emailVerified: params.emailVerified, sid: params.sessionId, roles,
  });

  // 5. Slide Redis TTL
  await redis.expire(`session:${params.sessionId}:activity`, env.SESSION_INACTIVITY_TIMEOUT_SECONDS);

  // 6. Audit
  this.eventEmitter.emit('auth.jwt_refreshed', new AuthJwtRefreshedEvent(...));

  return { token };
}
```

### `JwtAuthGuard` — doble modo

```typescript
async canActivate(ctx: ExecutionContext): Promise<boolean> {
  if (this.reflector.get(IS_PUBLIC_KEY, ctx.getHandler())) return true;

  const req = ctx.switchToHttp().getRequest();

  // Modo 1: Session cookie (browser/SPA)
  const session = await auth.api.getSession({ headers: req.headers });
  if (session) {
    req.user = { sub: session.user.id, email: session.user.email,
                 emailVerified: session.user.emailVerified, sid: session.session.id };
    return true;
  }

  // Modo 2: Bearer JWT (API clients / mobile)
  const token = extractBearerToken(req);
  if (token) {
    const payload = await verifyJwt(token, {
      issuer:   env.API_BASE_URL,
      audience: env.API_BASE_URL,
      jwksUri:  `${env.API_BASE_URL}/api/v1/auth/.well-known/jwks.json`,
    });
    req.user = payload;
    return true;
  }

  throw new UnauthorizedException();
}
```

### `PermissionsGuard`

- Lee `@RequirePermissions` del handler/class via `Reflector`
- Si no hay `@RequirePermissions` → permite (solo JwtAuthGuard bloquea)
- Llama `RbacFacadePort.resolvePermissions(req.user.sub)`
- Soporta `operator: 'AND' | 'OR'` (default AND)
- Guarda `resolvedPermissions` en `req` para `@CurrentPermissions()`

### `AdminGuard`

- Lee `roles[]` del `req.user` (ya populado por JwtAuthGuard)
- Sin DB hit
- `roles.includes('super_admin')` → permite; caso contrario `throw ForbiddenException`

### `AssignRoleUseCase` — contrato

```typescript
interface AssignRoleInput {
  targetUserId: string;
  roleKey: string;      // debe existir en tabla role
  grantedBy: string;    // userId del actor
  expiresAt: Date | null;
}
// Valida que roleKey exista → RoleNotFoundException si no
// Upsert en user_role (no duplica)
// emit('auth.role_assigned')
```

### `RevokeRoleUseCase` — contrato

```typescript
interface RevokeRoleInput {
  targetUserId: string;
  roleKey: string;
  revokedBy: string;
}
// Valida que targetUserId !== actor.sub si roleKey === 'super_admin' → AUTH_SELF_ROLE_REVOKE
// DELETE idempotente (no error si no existía)
// emit('auth.role_revoked')
// NO llama ForceRevokeSessionsUseCase — revocación efectiva en ≤15min (JWT TTL)
```

### `seed.ts`

```typescript
// Roles
await db.insert(roleTable).values([
  { key: 'super_admin', name: 'Super Admin', isSystem: true },
  { key: 'admin',       name: 'Admin',       isSystem: true },
  { key: 'viewer',      name: 'Viewer',      isSystem: false },
]).onConflictDoNothing();

// Permisos base
await db.insert(permissionTable).values([
  { code: 'users:read',   resource: 'users', action: 'read' },
  { code: 'users:write',  resource: 'users', action: 'write' },
  { code: 'users:delete', resource: 'users', action: 'delete' },
  { code: 'users:admin',  resource: 'users', action: 'admin' },
]).onConflictDoNothing();
```

### Registro en `AppModule`

```typescript
providers: [
  // Guards globales
  { provide: APP_GUARD, useClass: JwtAuthGuard },
  { provide: APP_GUARD, useClass: PermissionsGuard },
],
```

JWKS endpoint en `auth.ts`:
```typescript
// En BetterAuthService, después de crear la instancia:
// BA expone automáticamente /.well-known/jwks.json
// Marcarlo como @Public() en el guard o excluirlo de autenticación
```

---

## Acceptance Criteria

- [ ] Ruta sin `@Public()` sin token/cookie → 401
- [ ] `@Public()` en health → acceso sin autenticación
- [ ] Token Bearer ES256 válido (15min TTL) → request pasa JwtAuthGuard
- [ ] Token Bearer ES256 expirado → 401
- [ ] Cookie de sesión válida → request pasa JwtAuthGuard
- [ ] `@RequirePermissions({ permissions: ['users:read'] })` con usuario sin ese permiso → 403
- [ ] `@RequirePermissions({ permissions: ['x', 'y'], operator: 'OR' })` con uno de ellos → 200
- [ ] `POST /rbac/users/:id/roles` sin rol `super_admin` → 403
- [ ] `POST /rbac/users/:id/roles` con `super_admin` + roleKey inválido → 404 `AUTH_ROLE_NOT_FOUND`
- [ ] `super_admin` intenta revocar su propio rol → 422 `AUTH_SELF_ROLE_REVOKE`
- [ ] `POST /api/v1/auth/token` con sesión válida → JWT fresco, TTL 15min
- [ ] JWT contiene claims `sub` (string), `email` (string), `emailVerified` (boolean), `sid` (string), `roles` (string[] — ej: `['admin', 'viewer']`)
- [ ] `GET /api/v1/auth/.well-known/jwks.json` → 200 sin autenticación
- [ ] Seed: roles y permisos presentes en DB después de ejecutar `seed.ts`
- [ ] `npx turbo typecheck` y `npx turbo lint` pasan

---

## Notas de implementación

- `disableSettingJwtHeader: true` en el plugin `jwt()` — el JWT se obtiene **solo** via `/auth/token`, nunca automáticamente en `/get-session`.
- `es256-jwt-mint.adapter.ts` lee el JWK activo de la tabla `jwks` de BA (usando `drizzle-jwk-repository`) para firmar. BA rota las llaves automáticamente.
- La semántica de revocación post-rol-revoke: efecto en ≤15min (JWT TTL). Para revocación inmediata, el caller puede invocar `ForceRevokeSessionsUseCase` por separado.
- `JWKS_CONTROLLER` / endpoint de BA: Better-Auth lo sirve automáticamente. Marcarlo como `@Public()` en el guard usando el path `/api/v1/auth/.well-known/*`.
- **`SessionExpiredException` vs `SessionInvalidatedException`**: son dos errores distintos. `SessionExpiredException` se lanza cuando la Redis inactivity key (`session:{id}:activity`) no existe — el usuario estuvo inactivo más de `SESSION_INACTIVITY_TIMEOUT_SECONDS`. `SessionInvalidatedException` se lanza cuando `session.invalidBefore` está seteado y la sesión fue creada antes de ese timestamp — ocurre después de cambio de contraseña o email (F4). Mapean al mismo HTTP 401 pero con codes distintos (`AUTH_SESSION_EXPIRED` vs `AUTH_SESSION_INVALIDATED`).
- **`ForceRevokeSessionsUseCase` — ownership:** el port se define en F3 (dentro de `auth/application/ports/in/`), pero la implementación completa con `AdminSessionsController` se hace en F5. En F3 solo se necesita el use-case para `JwtAuthGuard` y `GetTokenUseCase`; en F5 se añade el endpoint HTTP.
