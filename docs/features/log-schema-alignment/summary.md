# Review Summary — Log Schema Standard Alignment

**Date:** 2026-05-26
**Scope:** Commits `4f82b3b`→`9e93a51` (5 commits total, including review fix)
**Branch:** `auth-integration-template-lstanislao`

---

## Findings

| Axis | Severity | Location | Issue | Resolution |
|------|----------|----------|-------|------------|
| Correctness | Important | `all-exceptions.filter.ts:16` | `logger.error` omitía el campo `err`; Loki solo veía `errorCode: 'INTERNAL_ERROR'` sin type/message del error real | Fixed en commit `9e93a51` — añadido `err: exception` al structured log |
| Correctness | Important | `pino.config.ts:buildErrSerializer` | Tipo declarado como `err: Error` pero pino puede recibir cualquier valor thrown; `err.name`/`err.message` serían `undefined` para strings u objetos planos | Fixed en commit `9e93a51` — guard `instanceof Error` con fallback a `UnknownError` |
| Architecture | FYI | `sign-in.hooks.ts:42`, `sign-up.hooks.ts:39` | `logger.assign({ userId })` funciona vía AsyncLocalStorage de nestjs-pino; better-auth corre en su propio middleware layer — si el ALS scope no se propaga, `userId` no aparecerá en logs de la request. No falla en runtime, pero la observabilidad puede estar limitada | Accepted with justification: comportamiento correcto según nestjs-pino docs; verificar en runtime con un log deliberado post-assign |
| Security | FYI | Todos los adapters y filtros | `err.message` puede contener PII en constraint violations de DB o validaciones — comportamiento pre-existente, no introducido por este PR | Won't fix: requiere un error sanitizer global, fuera del scope de este cambio |
| Readability | Nit | `pino.config.ts:7` | Parámetro `production` podría ser `isProduction` para consistencia con la variable local del módulo | Won't fix: preferencia de estilo, mínimo impacto |

---

## Recurring Patterns

- **Schema standard as inline comment** — En varios archivos (`pino.config.ts`, filtros, adapters), los cambios incluyen un comentario `// Schema standard: ...` que referencia la regla específica que implementan. Este patrón apareció en 6+ archivos y es muy valioso: evita que futuros ingenieros reviertan el cambio sin entender el porqué.

- **Tests que verifican ausencia de campos** — Los tests de PII (`smtp-email.adapter.test.ts`, `postmark-email.adapter.test.ts`) verifican que `to` y `subject` estén **ausentes** del log call, no solo que `errorCode` esté presente. Este patrón de "verificar lo que NO debe estar" es más robusto para compliance.

---

## Positive Patterns

- **Exportación de funciones helper para testabilidad** — `buildErrSerializer` fue extraído como función exportada con su propia suite de tests en lugar de quedar inline en el config object. Esto es exactamente el nivel correcto de separación: testable sin ser over-engineered.

- **TDD estricto respetado** — En los 4 tasks, el flujo RED → GREEN se mantuvo consistente. Los tests fallaron primero por razones correctas (el export no existía, el campo no estaba en el log), no por errores de setup.

- **`formatters.bindings` sobre `customProps` para campos estáticos** — Usar `formatters.bindings` para `service.name`, `service.version`, `deployment.environment` asegura que estos campos aparezcan en TODOS los logs (HTTP y non-HTTP). Usar `customProps` solo para `requestId` (per-request) es la separación correcta.

- **Filtros con `@Injectable` vía `APP_FILTER`** — Añadir DI a los filtros sin tocar `main.ts` ni `AppModule` porque ya estaban registrados via `APP_FILTER` es el patrón NestJS canónico. No se introdujeron shortcuts.

---

## Follow-Up Actions

- [ ] Verificar en runtime que `logger.assign({ userId })` en los better-auth after-hooks propaga el userId a los logs subsiguientes de la request. Log de verificación: `deps.logger.info({ userId: user.id }, 'User signed in successfully')` en staging y confirmar que el campo aparece en Grafana Loki.
- [ ] Evaluar agregar `err.message` con sanitización a un error sanitizer global para mitigar PII en constraint violations de DB (tarea separada, requiere análisis de qué errores se pueden exponer).
- [ ] Actualizar la entrada de memoria del proyecto sobre path aliases: la tsconfig actual NO tiene `paths` configurado — la convención `@/` no está disponible en `apps/api`.
