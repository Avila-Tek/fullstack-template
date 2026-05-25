# F7: Users Module + Polish

**Date:** 2026-05-25  
**Status:** Approved  
**Depends on:** F1, F2, F3  
**Blocks:** —

---

## Objetivo

Dos responsabilidades: (1) **UsersModule** como demo funcional del patrón hexagonal con RBAC — muestra cómo cualquier módulo de negocio usa `@RequirePermissions` y el patrón de ports & adapters; (2) **Polish** — Sentry completo con user context, métricas OTel, Swagger virtual para Better-Auth, health indicators completos y el checklist de pre-producción documentado.

---

## Fuera de scope

- Lógica de negocio real de usuarios (el módulo es demo/scaffold, no feature completa)
- Endpoints de gestión de usuarios (crear, editar, eliminar) — eso lo agrega cada proyecto

---

## Archivos a crear

```
apps/api/src/
│
├── users/
│   ├── module.ts
│   ├── domain/
│   │   ├── entities/
│   │   │   └── User.ts                          ← User.restore({ id, email, name, createdAt })
│   │   └── value-objects/
│   │       └── UserId.ts
│   │
│   ├── application/
│   │   ├── ports/
│   │   │   ├── in/
│   │   │   │   ├── get-users.port.ts
│   │   │   │   └── get-user-by-id.port.ts
│   │   │   └── out/
│   │   │       └── user.repository.port.ts
│   │   └── use-cases/
│   │       ├── get-users.use-case.ts
│   │       └── get-user-by-id.use-case.ts
│   │
│   └── infrastructure/
│       ├── persistence/
│       │   ├── user.schema.ts                   ← lee tabla 'user' de Better-Auth (no la crea)
│       │   └── user.repository-adapter.ts       ← query a BA user table via Drizzle
│       └── web/
│           ├── user.controller.ts               ← @RequirePermissions({ permissions: ['users:read'] })
│           └── dto/
│               ├── user.response.ts
│               └── get-users-query.dto.ts       ← paginación opcional
│
├── infrastructure/
│   ├── telemetry/
│   │   ├── sentry-scope.middleware.ts           ← tags: service, env, correlation_id por request
│   │   └── sentry-user.interceptor.ts           ← adjunta user.id al scope de Sentry post-auth
│   │
│   ├── metrics/
│   │   └── auth-metrics.ts                      ← auth_events_total OTel counter
│   │                                               labels: event, provider, error_type
│   │
│   └── swagger/
│       ├── better-auth-docs.module.ts           ← solo si NODE_ENV !== 'production'
│       └── better-auth-virtual.controller.ts    ← rutas BA documentadas en Swagger con tipos
│
└── app.module.ts                                ← añadir UsersModule, SentryScopeMiddleware,
                                                    SentryUserInterceptor, auth-metrics
```

---

## `UsersModule` — patrón completo

### Entidad

```typescript
// users/domain/entities/User.ts
export class User {
  private constructor(private readonly props: UserProps) {}

  static restore(props: UserProps): User {
    return new User(props);
  }

  get id(): UserId    { return this.props.id; }
  get email(): string { return this.props.email; }
  get name(): string  { return this.props.name ?? ''; }
}
```

### Output port

```typescript
// users/application/ports/out/user.repository.port.ts
export abstract class UserRepositoryPort {
  abstract findAll(page: number, perPage: number): Promise<PaginatedResult<User>>;
  abstract findById(id: UserId): Promise<User | null>;
}
```

### Input ports

```typescript
// users/application/ports/in/get-users.port.ts
export abstract class GetUsersPort {
  abstract execute(input: { page: number; perPage: number }): Promise<PaginatedResult<User>>;
}

// users/application/ports/in/get-user-by-id.port.ts
export abstract class GetUserByIdPort {
  abstract execute(input: { id: string }): Promise<User>;
  // lanza NotFoundException si no existe
}
```

### Controller

```typescript
// users/infrastructure/web/user.controller.ts
@Controller('users')
export class UserController {
  constructor(
    private readonly getUsers: GetUsersPort,
    private readonly getUserById: GetUserByIdPort,
  ) {}

  @Get()
  @RequirePermissions({ permissions: ['users:read'] })
  async findAll(@Query() query: GetUsersQueryDto): Promise<PaginatedResult<UserResponse>> {
    const result = await this.getUsers.execute({ page: query.page ?? 1, perPage: query.perPage ?? 20 });
    return { ...result, items: result.items.map(userToResponse) };
  }

  @Get(':id')
  @RequirePermissions({ permissions: ['users:read'] })
  async findOne(@Param('id') id: string): Promise<UserResponse> {
    const user = await this.getUserById.execute({ id });
    return userToResponse(user);
  }
}
```

### Module wiring

```typescript
@Module({
  providers: [
    { provide: UserRepositoryPort, useClass: DrizzleUserRepositoryAdapter },
    { provide: GetUsersPort,       useClass: GetUsersUseCase },
    { provide: GetUserByIdPort,    useClass: GetUserByIdUseCase },
  ],
  controllers: [UserController],
})
export class UsersModule {}
```

---

## Sentry + OTel polish

### `SentryScopeMiddleware`

```typescript
// Añadir al scope de Sentry por request:
Sentry.setTag('service', env.APP_NAME);
Sentry.setTag('env', env.NODE_ENV);
Sentry.setTag('correlation_id', req.correlationId);
```

### `SentryUserInterceptor`

```typescript
// Post-guards: req.user ya está populado por JwtAuthGuard
// Si req.user existe → Sentry.setUser({ id: req.user.sub, email: req.user.email })
@Injectable()
export class SentryUserInterceptor implements NestInterceptor {
  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx.switchToHttp().getRequest();
    if (req.user?.sub) {
      Sentry.setUser({ id: req.user.sub });
    }
    return next.handle();
  }
}
```

### `auth-metrics.ts`

```typescript
// OTel counter: auth_events_total
// labels: event (sign_in, sign_up, ...), provider (email, google), error_type (optional)
// Incrementado por AuditLogListener al procesar cada auth.* event
const authEventsCounter = meter.createCounter('auth_events_total', {
  description: 'Total auth events',
});

// En AuditLogListener:
authEventsCounter.add(1, { event: event.type, provider: event.provider ?? 'email' });
```

### `BetterAuthVirtualController`

Documenta en Swagger las rutas de Better-Auth que no son controladores NestJS:

```typescript
@ApiTags('auth')
@Controller('api/v1/auth')
export class BetterAuthVirtualController {
  @Post('sign-up/email')
  @ApiOperation({ summary: 'Register with email/password' })
  @ApiBody({ type: SignUpEmailDto })
  signUp() {}

  @Post('sign-in/email')
  @ApiOperation({ summary: 'Sign in with email/password' })
  signIn() {}

  // ... resto de rutas BA
}
```

Solo se importa en el `AppModule` si `NODE_ENV !== 'production'`.

---

## Health indicators completos

Con F7 todos los health indicators están activos:

```typescript
// GET /health/ready → checks:
{
  database: HealthIndicatorResult,  // F1 - SELECT 1
  redis:    HealthIndicatorResult,  // F2 - PING
  auth:     HealthIndicatorResult,  // F2 - SELECT 1 FROM session LIMIT 1
}
```

---

## Acceptance Criteria

### UsersModule
- [ ] `GET /users` sin token → 401
- [ ] `GET /users` sin permiso `users:read` → 403
- [ ] `GET /users` con permiso → 200 lista paginada de usuarios (de tabla BA)
- [ ] `GET /users/:id` con permiso → 200 usuario o 404 si no existe
- [ ] `GET /users/:id` sin permiso → 403

### Sentry
- [ ] `SENTRY_DSN` ausente → app arranca normalmente sin error (degradación graceful)
- [ ] Cada request tiene `correlation_id` en el scope de Sentry (cuando DSN configurado)
- [ ] Requests autenticados tienen `user.id` en el scope de Sentry
- [ ] Errores 5xx reportados a Sentry con contexto completo
- [ ] El código de error real (no `INTERNAL_ERROR`) aparece en Sentry para ≥500

### Métricas
- [ ] `auth_events_total{event="sign_in"}` se incrementa en cada login exitoso
- [ ] `auth_events_total{event="sign_up"}` se incrementa en cada registro
- [ ] Métricas accesibles via OTLP (si `OTEL_EXPORTER_OTLP_ENDPOINT` configurado)

### Swagger
- [ ] `/api/docs` accesible en development y staging
- [ ] Rutas de Better-Auth visibles en Swagger con tipos y ejemplos
- [ ] Swagger **no** accesible en `NODE_ENV=production`

### Polish
- [ ] `GET /health/ready` retorna status de database, redis y auth juntos
- [ ] `checklist-pre-produccion.md` generado en `docs/`
- [ ] `npx turbo typecheck` y `npx turbo lint` pasan en toda la API

---

## Notas de implementación

- `user.schema.ts` en UsersModule **no crea** la tabla — es una referencia de lectura a la tabla `user` de Better-Auth. Usar `drizzle-orm/pg-core` con `pgTable` apuntando al mismo nombre de tabla.
- Relaciones cross-dominio entre `users.user` y `rbac.user_role` se declaran en `src/infrastructure/database/schema.ts` (siguiendo el estándar del CLAUDE.md).
- `SentryScopeMiddleware` registrarse **después** de `CorrelationIdMiddleware` para que `req.correlationId` ya esté disponible.
- El orden de registro en `AppModule` para el interceptor de Sentry: después del `ApiResponseInterceptor` para que el scope de Sentry tenga el user antes de que cualquier excepción sea capturada.
