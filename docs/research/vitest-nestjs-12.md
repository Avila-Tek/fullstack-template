# Investigación: Vitest con NestJS 12 en `apps/api`

Fecha: 2026-11-27. Rama: `research/vitest-nestjs-12` (worktree aislado, a partir de `new-template-updated` @ `cddee25`).
Entorno: Windows 11, Node v24.15.0, npm 11, Vitest 4.1.12, Vite 7.3.1.

## Pregunta

La API (`apps/api`) usa NestJS 11, compila a CommonJS con `nest build` y prueba con Vitest 4. NestJS 12 publica sus paquetes como ES modules. ¿Carga Vitest los paquetes de NestJS 12 sin problemas desde la API actual? ¿Pasan build, typecheck y tests con NestJS 12? Si no, ¿qué hay que cambiar?

## Respuesta

**Sí, con dos ajustes además del cambio de versiones.** (Resultado propio del experimento.) Vitest 4 carga los paquetes ESM de NestJS 12 sin ningún error de resolución (no aparecieron `ERR_REQUIRE_ESM`, "Cannot use import statement" ni similares) y los 4 tests existentes pasan sin tocar código fuente. `nest build` (salida CommonJS) y `biome lint` pasan sin cambios. Lo que NO funciona tal cual es: (1) `tsc --noEmit` falla, pero por TypeScript 6 y no por NestJS 12: hay que declarar `types` en `tsconfig.json`; (2) el `package-lock.json` que deja un `npm install` directo conserva `@nestjs/common` y `@nestjs/core` 11.2.12 en la raíz junto a los 12.6.3, y `@nestjs/throttler` y `@nestjs/jwt` se enlazan a la copia 11. Eso rompe la inyección de dependencias (`ThrottlerGuard` no resuelve `Reflector`) y obliga a regenerar las entradas `@nestjs/*` del lockfile. No hizo falta cambiar `zodValidationPipe.ts`, `zodSwagger.ts` ni ningún otro archivo de `src/`.

## Versiones aplicadas (`apps/api/package.json`)

| Paquete | Antes | Después |
|---|---|---|
| `@nestjs/common`, `core`, `platform-express`, `testing` | `^11.2.12` | `^12.6.3` |
| `@nestjs/cqrs` | `^11.0.3` | `^12.1.3` |
| `@nestjs/jwt` | `^11.0.2` | `^12.0.5` |
| `@nestjs/swagger` | `^11.4.8` | `^12.1.3` |
| `@nestjs/cli` | `^11.0.24` | `^12.0.15` |
| `@nestjs/schematics` | `^11.1.0` | `^12.0.17` |
| `typescript` (solo en `apps/api`) | `^5.9.3` | `^6.0.3` |
| `@nestjs/throttler` | `^6.8.0` | sin cambio |

La guía oficial indica que `@nestjs/schematics` v12 exige TypeScript 6 como peer y que todos los paquetes core son ahora solo ESM, utilizables desde apps CommonJS vía `require(esm)` (fuente: https://docs.nestjs.com/migration-guide).

## Comandos ejecutados

Todos dentro del worktree; nunca en el checkout principal.

```
npm install
npx turbo build --filter=@repo/api
npx tsc --noEmit                      # en apps/api
npx turbo test --filter=@repo/api     # con CI=1 para que vitest no quede en watch
npx turbo lint --filter=@repo/api
npx vitest run src/test/probe         # test sonda temporal, no commiteado (ver abajo)
node -e "require('@nestjs/core'); require('@nestjs/swagger'); require('@nestjs/platform-express')"   # en apps/api
npm audit --json
```

## Resultados (experimento propio)

| Comando | 1.ª pasada (solo cambio de versiones) | Final (con los arreglos) |
|---|---|---|
| `npm install` | OK, exit 0, sin `ERESOLVE` ni avisos de peer dependency (solo avisos `deprecated`) | OK |
| `npx turbo build --filter=@repo/api` | PASA (3/3 tareas) | PASA (3/3) |
| `npx tsc --noEmit` (TS 6.0.3) | **FALLA**, exit 2, 5 errores en `src/app.controller.spec.ts` | PASA, exit 0 |
| `npx turbo test --filter=@repo/api` | PASA: 1 archivo, 4 tests | PASA: 1 archivo, 4 tests |
| `npx turbo lint --filter=@repo/api` | PASA: 95 archivos, sin fixes | PASA: 95 archivos |
| Sonda Vitest (DI real con Nest 12) | 2 de 4 fallan | 3 de 4 pasan (el que falla es preexistente, ver Error 3) |
| `require()` de Nest 12 ESM desde CJS (Node 24.15) | no ejecutado | OK |

Sobre la carga ESM en Vitest: `users.test.ts` importa `UnauthorizedException` de `@nestjs/common` (valor) y la sonda importó además `@nestjs/core`, `@nestjs/testing`, `@nestjs/jwt` y `@nestjs/throttler`; todos cargaron. No se observó ningún `ERR_REQUIRE_ESM`, `ERR_REQUIRE_ASYNC_MODULE` ni "Cannot use import statement".

## Errores y arreglos

### Error 1: `tsc --noEmit` falla con TypeScript 6

```
src/app.controller.spec.ts(5,1): error TS2593: Cannot find name 'describe'. ...
src/app.controller.spec.ts(8,2): error TS2593: Cannot find name 'beforeEach'. ...
src/app.controller.spec.ts(17,2): error TS2593: Cannot find name 'describe'. ...
src/app.controller.spec.ts(18,3): error TS2593: Cannot find name 'it'. ...
src/app.controller.spec.ts(19,4): error TS2304: Cannot find name 'expect'.
```

Causa (observado): con el mismo árbol de NestJS 12, `tsc` 5.9.3 (el de la raíz) pasa con exit 0 y `tsc` 6.0.3 falla. Por tanto es efecto de TypeScript 6, no de NestJS 12. Inferencia: TS 6 ya no incluye automáticamente todos los `node_modules/@types/*`; antes los globales venían de `@types/jest`, instalado en la raíz por otra app.

Arreglo: en `apps/api/tsconfig.json` añadir `"types": ["node", "vitest/globals"]`. Efecto: `tsc --noEmit` exit 0; build, tests y lint siguen pasando. (`app.controller.spec.ts` no lo ejecuta Vitest: el `include` es `src/test/**/*.test.ts`.)

### Error 2: dos copias de NestJS (11 y 12) tras `npm install`

Tras el primer `npm install`, `npm ls` mostraba:

```
+-- @nestjs/jwt@12.0.5
| `-- @nestjs/common@11.2.12
+-- @nestjs/throttler@6.8.0
| +-- @nestjs/common@11.2.12 deduped
| `-- @nestjs/core@11.2.12
```

npm dejó `@nestjs/common` y `@nestjs/core` 11.2.12 en `node_modules/` raíz (heredados del lockfile; satisfacen los peers `^11 || ^12` de jwt y throttler) y puso los 12.6.3 en `apps/api/node_modules/`. Build, typecheck, lint y los 4 tests existentes pasan igualmente, así que **este problema es silencioso**. La sonda lo destapó al inicializar `SecurityModule`:

```
Error: Nest can't resolve dependencies of the ThrottlerGuard (THROTTLER:MODULE_OPTIONS, Symbol(ThrottlerStorage), ?). Please make sure that the argument Reflector at index [2] is available in the SecurityModule module.
```

Inferencia: la API real fallaría igual al arrancar, porque `AppModule` importa `SecurityModule` (no se arrancó la API para comprobarlo).

Arreglos probados:

1. Borrar del lockfile solo `node_modules/@nestjs/common` y `node_modules/@nestjs/core` y reinstalar: **no sirve**. jwt y throttler quedan en la raíz sin su peer (`Cannot find package '@nestjs/common' imported from ...\node_modules\@nestjs\jwt\dist\jwt.module.js`).
2. Borrar del lockfile todas las entradas `node_modules/@nestjs/*` y `apps/api/node_modules/@nestjs/*`, borrar esas carpetas y `npm install`: **funciona**. Queda una sola copia 12.x de common, core, cqrs, jwt, platform-express, swagger, testing y throttler en la raíz (cli y schematics quedan en `apps/api/node_modules`). La sonda de `SecurityModule` pasa.

Al aplicar esto en el repo real, verificar con `npm ls @nestjs/common @nestjs/core` que no aparezca ninguna 11.x.

### Error 3 (preexistente, no arreglado): Vitest no emite metadata de decoradores

En la sonda, un controller con inyección implícita por tipo (`constructor(private readonly svc: ExplicitService)`) recibe `undefined` bajo Vitest:

```
TypeError: Cannot read properties of undefined (reading 'hello')
```

Inferencia (no verificada contra NestJS 11 en este experimento): es la limitación conocida del transformador de Vite 7 (esbuild), que no implementa `emitDecoratorMetadata`; no depende de NestJS 12. No afecta a los tests actuales porque instancian los casos de uso a mano. Si se quieren tests con `Test.createTestingModule` e inyección por tipo, haría falta un transformador con metadata (por ejemplo `unplugin-swc`) en `vitest.config.ts`. No se aplicó por no ser necesario para la pregunta.

## Sonda temporal (no commiteada)

Archivo `apps/api/src/test/probe/nest12Probe.test.ts`, creado, ejecutado y borrado. Cuatro tests:

1. `@nestjs/common/package.json` es 12.x y `"type": "module"`: pasa.
2. `Test.createTestingModule` con controller de inyección implícita: falla (Error 3).
3. `JwtModule.register` más `JwtService.sign/verify`: pasa.
4. `Test.createTestingModule({ imports: [SecurityModule, ...] })`, `createNestApplication()`, `useGlobalPipes(new ZodValidationPipe())`, `app.init()`, `app.close()` (sin `listen`): falla antes del arreglo del lockfile, pasa después.

## Diff mínimo final

- `apps/api/package.json`: las versiones de la tabla de arriba.
- `apps/api/tsconfig.json`: se añade `"types": ["node", "vitest/globals"]` en `compilerOptions`.
- `package-lock.json`: regenerado para `@nestjs/*` (una sola copia 12.x) y `typescript` 6.0.3 bajo `apps/api`.
- Ningún cambio en `apps/api/src/` ni en `apps/api/example/`.

`zodValidationPipe.ts` compila sin cambios con las firmas de pipe refinadas de v12 (la guía avisa de que los pipes con firmas escritas a mano pueden necesitar ajustes de tipos: https://docs.nestjs.com/migration-guide). `zodSwagger.ts` compila sin cambios con `@nestjs/swagger` 12.1.3.

## `npm audit`

Resultado propio: total **40** (1 low, 20 moderate, 19 high, 0 critical). El aviso de **`proxy-addr` no aparece** en la salida. Instalado: `express` 5.3.0 bajo `@nestjs/platform-express` 12.6.3, con `proxy-addr` 2.0.8. No se ejecutó `npm audit fix`. No se midió el total previo al cambio en este experimento.

## Lo que NO se verificó

- **La API nunca se arrancó** (ni `nest start` ni `node dist/...`). Sin verificar en runtime: login/sign-in, conexión a base de datos, Swagger UI (`/api/docs`), helmet, CORS, throttling efectivo.
- Orden de los lifecycle hooks: la guía indica que en v12 se ejecutan por nivel de jerarquía de componentes y que el orden puede cambiar (https://docs.nestjs.com/migration-guide). No comprobado.
- Formato de las respuestas de error HTTP: la guía indica que el mapeo de errores de los adaptadores se rehízo y recomienda verificarlo. No comprobado.
- Herencia de `@Optional()` (cambio rompedor según la guía). No se revisó si el código lo usa.
- `AppModule` completo no se compiló en un módulo de test (necesita base de datos); solo `SecurityModule`, `JwtModule` y un módulo sonda.
- El `require()` de los paquetes ESM desde CommonJS solo se probó en Node 24.15.0. La guía exige Node 20.19+ o 22.12+ para ejecutar v12; el `engines` raíz (`>=20`) es más laxo. No se probó en Node 20 ni 22.
- Solo se cambió TypeScript en `apps/api`; el resto del monorepo sigue en 5.9.3 y no se validó con TS 6. `ts-node`, `ts-loader`, `typescript-eslint` y `vite-tsconfig-paths` siguen resolviendo el TypeScript 5.9.3 de la raíz.
- Comandos de la CLI v12 (`nest generate`, `nest upgrade`, `nest start --watch`): no ejecutados.
- Observación preexistente, ajena a NestJS 12: el build emite `dist/src/main.js` (igual con TS 5.9.3), mientras que `start:prod` apunta a `dist/main.js`.
