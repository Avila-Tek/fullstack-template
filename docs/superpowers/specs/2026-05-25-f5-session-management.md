# F5: Session Management

**Date:** 2026-05-25  
**Status:** Approved  
**Depends on:** F1, F2, F3  
**Blocks:** —

---

## Objetivo

Visibilidad y control administrativo de sesiones activas. Un `super_admin` puede listar todas las sesiones de un usuario y revocarlas (total o individualmente). La revocación elimina la sesión de DB y borra la Redis inactivity key, forzando 401 en el próximo request.

---

## Fuera de scope

- Social OAuth / 2FA (F6)
- `SessionActivityMiddleware` (definida en F2)

---

## Archivos a crear

```
apps/api/src/auth/
│
├── application/
│   ├── events/auth.events.ts                   ← añadir: AuthSessionRevokedEvent
│   ├── ports/
│   │   ├── in/
│   │   │   ├── list-user-sessions.port.ts
│   │   │   └── force-revoke-sessions.port.ts   ← (definida en F3, ahora con implementación completa)
│   │   └── out/
│   │       └── session-audit-log.repository.port.ts  ← findByUserId(userId, limit): Promise<SessionAuditEntry[]>
│   └── use-cases/
│       ├── list-user-sessions.use-case.ts       ← lista sesiones activas del userId con metadata
│       └── force-revoke-sessions.use-case.ts    ← elimina sesiones DB + borra Redis keys + emit
│
└── infrastructure/
    ├── persistence/
    │   └── session-audit-log.repository-adapter.ts
    └── http/
        └── admin-sessions.controller.ts         ← @UseGuards(JwtAuthGuard, AdminGuard)
                                                    GET    /api/v1/admin/users/:userId/sessions
                                                    DELETE /api/v1/admin/users/:userId/sessions
                                                    DELETE /api/v1/admin/users/:userId/sessions/:sessionId
```

---

## Detalles de implementación

### `ListUserSessionsUseCase`

Input port:
```typescript
export abstract class ListUserSessionsPort {
  abstract execute(input: { userId: string }): Promise<SessionSummary[]>;
}

interface SessionSummary {
  id: string;
  createdAt: Date;
  expiresAt: Date;
  userAgent: string | null;
  ipHash: string;        // SHA256(ip) — nunca IP en texto plano
  isCurrentSession: boolean;  // true si coincide con sessionId del JWT del actor
}
```

Implementación: query a la tabla `session` de BA filtrada por `userId`, ordenada por `createdAt DESC`.

### `ForceRevokeSessionsUseCase`

Input port:
```typescript
export abstract class ForceRevokeSessionsPort {
  abstract execute(input: {
    targetUserId: string;
    revokedBy: string;           // userId del actor (super_admin)
    sessionId?: string;          // si se provee, revoca solo esa sesión; si no, todas
    correlationId?: string;
  }): Promise<void>;
}
```

Implementación:
```
1. Obtener sesiones a revocar (todas o la específica) de tabla session
2. Para cada sesión:
   a. DELETE from session WHERE id = sessionId AND userId = targetUserId
   b. DEL Redis key: session:{sessionId}:activity
3. emit('auth.session_revoked', { targetUserId, revokedBy, sessionCount })
```

### `AdminSessionsController`

```typescript
@Controller('admin/users/:userId/sessions')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminSessionsController {
  constructor(
    private readonly listSessions: ListUserSessionsPort,
    private readonly revokeSessions: ForceRevokeSessionsPort,
  ) {}

  @Get()
  async list(
    @Param('userId') userId: string,
    @CurrentUser() actor: JwtUser,
  ): Promise<SessionSummary[]> {
    return this.listSessions.execute({ userId });
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeAll(
    @Param('userId') userId: string,
    @CurrentUser() actor: JwtUser,
  ): Promise<void> {
    await this.revokeSessions.execute({ targetUserId: userId, revokedBy: actor.sub });
  }

  @Delete(':sessionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeOne(
    @Param('userId') userId: string,
    @Param('sessionId') sessionId: string,
    @CurrentUser() actor: JwtUser,
  ): Promise<void> {
    await this.revokeSessions.execute({
      targetUserId: userId,
      sessionId,
      revokedBy: actor.sub,
    });
  }
}
```

### Audit log para revocación

El `AuditLogListener` de F2 captura `auth.session_revoked`:
```typescript
// auth.events.ts
export class AuthSessionRevokedEvent {
  constructor(
    public readonly targetUserId: string,
    public readonly revokedBy: string,
    public readonly sessionCount: number,
    public readonly correlationId?: string,
  ) {}
}
```

El registro en `auth_audit_log` incluye `metadata: { revokedBy, sessionCount }`.

---

## Acceptance Criteria

- [ ] `GET /api/v1/admin/users/:userId/sessions` sin `super_admin` → 403
- [ ] `GET /api/v1/admin/users/:userId/sessions` con `super_admin` → lista de sesiones con `id`, `createdAt`, `expiresAt`, `userAgent`, `ipHash`
- [ ] La sesión actual del actor tiene `isCurrentSession: true`
- [ ] `DELETE /api/v1/admin/users/:userId/sessions` → 204, todas las sesiones del usuario eliminadas
- [ ] Tras revocación total → próximo request del usuario revocado → 401 (sin cookie o con cookie ya inválida)
- [ ] `DELETE /api/v1/admin/users/:userId/sessions/:sessionId` → 204, solo esa sesión eliminada
- [ ] Redis keys `session:{id}:activity` borradas tras revocación
- [ ] `GET /api/v1/admin/users/:userId/sessions` con userId inexistente → 200 lista vacía `[]` (no 404; idempotente)
- [ ] `DELETE /api/v1/admin/users/:userId/sessions` con userId inexistente → 204 sin error (idempotente)
- [ ] `auth_audit_log` contiene entrada `session_revoked` con `revokedBy` en metadata
- [ ] `npx turbo typecheck` y `npx turbo lint` pasan

---

## Notas de implementación

- `ipHash` en `SessionSummary` es el SHA256 de la IP registrada cuando se creó la sesión. La IP en texto plano no se almacena nunca.
- `isCurrentSession` se determina comparando `SessionSummary.id` con el `sid` del JWT del actor (`@CurrentUser()`).
- Si `targetUserId` no existe → retornar lista vacía (no 404); la revocación es idempotente.
- El Redis key `session:{id}:activity` puede no existir si ya expiró por inactividad — `DEL` es idempotente, no lanzar error si no existe.
