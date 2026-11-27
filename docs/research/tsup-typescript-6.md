# Investigación: tsup 8.5.1 con TypeScript 6.0.3

Fecha: 2026-11-27. Rama: `research/tsup-typescript-6` (creada desde `new-template-updated`, commit `cddee25`).
Entorno del experimento: Windows 11, Node 24, npm 11, worktree aislado.

## Pregunta

¿`tsup` 8.5.1 genera correctamente las declaraciones de tipos (`.d.ts`) de los paquetes compartidos
(`packages/utils`, `packages/schemas`, `packages/services`, `packages/feature-flags`) al subir TypeScript
de 5.9.3 a 6.0.3? Si no, ¿cuál es el cambio mínimo que lo arregla? ¿Qué más rompe TypeScript 6.0.3 en el
build / typecheck del repo?

## Respuesta corta

**No, tal cual está el repo no funciona; sí funciona con cambios pequeños de configuración y sin subir tsup.**
Con TypeScript 6.0.3, el build de DTS de tsup 8.5.1 falla en los cuatro paquetes con
`error TS5101: Option 'baseUrl' is deprecated...`, aunque esos paquetes no declaran `baseUrl`: es tsup quien lo
inyecta siempre (`baseUrl: compilerOptions.baseUrl || "."` en su `dist/rollup.js`). Por eso quitar `baseUrl` de
los tsconfig del repo **no** arregla tsup; lo que lo arregla es pasar `ignoreDeprecations: '6.0'` al compilador
de DTS (en `tsup.config.ts` o en el tsconfig). Superado eso aparece un segundo fallo, propio de TS 6 y no de
tsup: el preset `library.json` solo declara `lib: ["ESNext"]` y los paquetes usan `fetch`, `URL`, `RequestInfo`
y `window`; hay que añadir `"DOM"` a `lib`. Con esos dos cambios los cuatro paquetes generan `.d.ts` y `.d.mts`.
Para dejar verde el resto del repo hicieron falta tres cambios más (apps Next, `apps/api`), detallados abajo.
Con todo aplicado, `turbo build`, `turbo typecheck`, `turbo test` y `tsc --noEmit` en `apps/api` pasan
(resultado de mi experimento).

## Qué se ejecutó

Todo dentro del worktree, nunca en el checkout principal. Cada ronda ejecuta, en este orden y con `--force`
(sin caché de turbo):

```sh
npx turbo build --filter=@repo/utils --filter=@repo/schemas --filter=@repo/services --filter=@repo/feature-flags
(cd packages/feature-flags && npx tsup)   # ver nota sobre feature-flags
npx turbo build
npx turbo typecheck --continue
npx turbo test --continue
(cd apps/api && npx tsc --noEmit)
```

Rondas:

0. **Línea base**: `npm ci` con TypeScript 5.9.3, sin cambios.
1. **TS 6.0.3 sin arreglos**: `typescript` a `6.0.3` en los 10 `package.json` que lo declaran
   (`^6.0.3` en `apps/api`) + `npm install`.
2. **+ arreglos de paquetes**: `ignoreDeprecations` en el DTS de tsup y `"DOM"` en `library.json`.
3. **+ arreglos de apps**: quitar `baseUrl`, `noUncheckedSideEffectImports: false` en `nextjs.json`,
   `types` explícito en `apps/api`.

Nota sobre `feature-flags`: su `package.json` tiene `"build": ""`, así que `turbo build` **no ejecuta tsup**
en ese paquete (turbo reporta 3 tareas, no 4) y las apps lo consumen desde `src/`. Para responder la pregunta
ejecuté `npx tsup` a mano en ese paquete en cada ronda.

## Resultados (experimento propio)

| Comando | 0. TS 5.9.3 | 1. TS 6.0.3 sin arreglos | 2. + arreglos paquetes | 3. + arreglos apps |
| --- | --- | --- | --- | --- |
| `turbo build` de los 4 paquetes | OK (3/3 tareas) | FALLA: TS5101 en `@repo/utils` (0/1) | OK (3/3) | OK (3/3) |
| `npx tsup` en `feature-flags` | OK | FALLA: TS5101 | OK | OK |
| `.d.ts` + `.d.mts` en `dist` de los 4 | sí | no | sí | sí |
| `turbo build` completo | OK (6/6) | FALLA en `@repo/utils` | FALLA: `@repo/admin` (4/6) | OK (6/6) |
| `turbo typecheck` | OK (6/6) | FALLA | FALLA: admin y client, TS5101 (4/6) | OK (6/6) |
| `turbo test` | OK (6/6) | exit 1 por los build fallidos; los tests en sí pasan | OK (6/6) | OK (6/6) |
| `tsc --noEmit` en `apps/api` | OK | FALLA: 5 errores | FALLA: 5 errores | OK |

Tests en todas las rondas: api 4/4 (vitest), admin 1/1 y client 1/1 (jest).
Los `.d.ts` de la ronda 3 tienen el mismo tamaño que los de la línea base
(utils 3.70 KB, schemas 29.70 KB, services 11.12 KB, feature-flags web 2.55 KB). No comparé el contenido byte a byte.

## Errores encontrados y su arreglo

### 1. TS5101 en el build de DTS de tsup (los 4 paquetes)

```
@repo/utils:build: DTS Build start
@repo/utils:build: error TS5101: Option 'baseUrl' is deprecated and will stop functioning in TypeScript 7.0.
  Specify compilerOption '"ignoreDeprecations": "6.0"' to silence this error.
@repo/utils:build: Error: error occurred in dts build
```

- Causa (observada en `packages/utils/node_modules/tsup/dist/rollup.js`, línea 6837 de tsup 8.5.1):
  `baseUrl: compilerOptions.baseUrl || "."`. tsup fuerza `baseUrl` aunque el tsconfig no lo tenga. Los builds
  CJS/ESM (esbuild) sí terminan; solo falla el DTS.
- Coincide con el issue upstream egoist/tsup#1388 (abierto 2026-03-24, cerrado 2026-10-14), donde se señala la
  misma línea en `src/rollup.ts` y se propone el mismo workaround. Fuente:
  <https://github.com/egoist/tsup/issues/1388>. No verifiqué en qué versión de tsup quedó corregido.
- Arreglo aplicado (alcance mínimo, solo afecta al DTS de tsup), en los 4 `tsup.config.ts`:

  ```ts
  dts: { compilerOptions: { ignoreDeprecations: '6.0' } },
  ```

- Alternativa también probada (solo en `packages/utils`): `"ignoreDeprecations": "6.0"` en el `tsconfig.json`
  del paquete. Supera TS5101 igual. La descarté porque silencia las deprecaciones también para `tsc`/editor.
- No existe aquí un "arreglo real" sin `ignoreDeprecations` mientras se siga en tsup 8.5.1: la opción
  deprecada la pone tsup, no el repo. Según las notas de TypeScript 6.0, `ignoreDeprecations: "6.0"` deja de
  servir en TypeScript 7.0. Fuente: <https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/>.

### 2. Globales de DOM ausentes en los paquetes (aparece al superar el error 1)

```
src/safe-fetch.ts(26,40): error TS2304: Cannot find name 'RequestInfo'.
src/safe-fetch.ts(26,54): error TS2304: Cannot find name 'URL'.
src/safe-fetch.ts(26,66): error TS2304: Cannot find name 'RequestInit'.
src/safe-fetch.ts(27,31): error TS2304: Cannot find name 'fetch'.
src/safe-fetch.ts(29,46): error TS18046: 'response.data' is of type 'unknown'.      (packages/utils)
src/components/auth.ts(55,17): error TS2304: Cannot find name 'window'.              (packages/services)
```

- Causa: en TS 6.0 `types` pasa a ser `[]` por defecto (antes se cargaba todo `node_modules/@types`).
  Fuente: notas de TypeScript 6.0 (enlace arriba). `library.json` declara `lib: ["ESNext"]` sin DOM.
  Inferencia mía (no demostrada): en 5.9.3 los tipos de DOM entraban de rebote por algún paquete `@types/*`
  hoisteado.
- Probé primero `"types": ["node"]` en `library.json`: insuficiente (`RequestInfo` y `window` siguen sin existir).
- Arreglo aplicado: `packages/typescript-config/library.json` → `"lib": ["ESNext", "DOM"]`. Con solo esto
  (sin `types: ["node"]`) compilan los cuatro paquetes.
- `schemas` y `services` fallaban además con TS7016 (`Could not find a declaration file for module '@repo/utils'`),
  pero era efecto cascada de que `utils` no generaba su `.d.ts`; desaparece solo.

### 3. `next build` de `apps/admin`: import de CSS por efecto secundario

```
@repo/admin:build: ./src/app/layout.tsx:5:8
@repo/admin:build: Type error: Cannot find module or type declarations for side-effect import of './globals.css'.
```

- Causa: `noUncheckedSideEffectImports` es `true` por defecto en TS 6.0 (fuente: notas de TypeScript 6.0).
  `apps/client` tiene el mismo import; turbo abortó su build al fallar admin, así que su fallo es inferido,
  no observado.
- Arreglo aplicado: `"noUncheckedSideEffectImports": false` en `packages/typescript-config/nextjs.json`
  (restaura el comportamiento de 5.9).
- Alternativa NO probada: mantener el valor por defecto y añadir un `declare module '*.css';` en un `.d.ts` de cada app.

### 4. TS5101 en `tsc --noEmit` de `apps/admin` y `apps/client`

```
@repo/admin:typecheck: tsconfig.json(4,5): error TS5101: Option 'baseUrl' is deprecated ...
@repo/client:typecheck: tsconfig.json(4,5): error TS5101: Option 'baseUrl' is deprecated ...
```

- Arreglo real aplicado: eliminar `"baseUrl": "."`. Los `paths` ya eran relativos (`"./*"`,
  `"../../packages/ui/src/*"`), así que no hubo que tocarlos. Es la migración que recomiendan las notas de TS 6.0.
- Lo mismo en `packages/ui/tsconfig.json` y `packages/feature-flags/tsconfig.api.json` por coherencia.
  Ningún script del repo ejecuta `tsc` con esos dos archivos, así que no fallaban en los comandos de la tabla;
  tras el cambio, `tsc --noEmit -p packages/ui/tsconfig.json` no emite errores.
- `next build` no reportó TS5101 aunque `baseUrl` seguía presente en la ronda 2; solo lo hizo `tsc`.

### 5. `tsc --noEmit` en `apps/api`: globales de test

```
src/app.controller.spec.ts(5,1): error TS2593: Cannot find name 'describe'. ...
src/app.controller.spec.ts(8,2): error TS2593: Cannot find name 'beforeEach'. ...
src/app.controller.spec.ts(17,2): error TS2593: Cannot find name 'describe'. ...
src/app.controller.spec.ts(18,3): error TS2593: Cannot find name 'it'. ...
src/app.controller.spec.ts(19,4): error TS2304: Cannot find name 'expect'.
```

- Causa: mismo cambio de `types: []` por defecto. `apps/api` no declara `@types/jest`; en 5.9.3 esos globales
  llegaban (inferencia) del `@types/jest` de admin/client hoisteado a la raíz.
- Arreglo aplicado: `"types": ["node", "vitest/globals"]` en `apps/api/tsconfig.json`
  (vitest ya está configurado con `globals: true`).

## Diff mínimo final

Para que **tsup genere los `.d.ts`** (la pregunta original) bastan estos 5 archivos:

- `packages/utils/tsup.config.ts`, `packages/schemas/tsup.config.ts`, `packages/services/tsup.config.ts`,
  `packages/feature-flags/tsup.config.ts`: `dts: true` → `dts: { compilerOptions: { ignoreDeprecations: '6.0' } }`.
- `packages/typescript-config/library.json`: `"lib": ["ESNext"]` → `"lib": ["ESNext", "DOM"]`.

Para que **todo el repo** quede verde con TS 6.0.3, además:

- `packages/typescript-config/nextjs.json`: añadir `"noUncheckedSideEffectImports": false`.
- `apps/admin/tsconfig.json`, `apps/client/tsconfig.json`: quitar `"baseUrl": "."`.
- `packages/ui/tsconfig.json`, `packages/feature-flags/tsconfig.api.json`: quitar `"baseUrl": "."` (preventivo).
- `apps/api/tsconfig.json`: añadir `"types": ["node", "vitest/globals"]`.
- `typescript` → `6.0.3` en: `package.json` raíz, `apps/admin`, `apps/client`, `apps/api` (`^6.0.3`),
  `packages/auth`, `packages/feature-flags`, `packages/schemas`, `packages/services`, `packages/ui`,
  `packages/utils`; y `package-lock.json` regenerado con `npm install`.

No hizo falta tocar `rootDir`, `strict`, `module` ni `moduleResolution`.

## Otros hallazgos para el ticket "subir a TypeScript 6"

- **`nest build` no usa TypeScript 6**: `@nestjs/cli@11.0.24` fija `typescript: 5.9.3` como dependencia propia
  y queda anidado en `apps/api/node_modules/@nestjs/cli/node_modules/typescript`. El build de `apps/api` pasó,
  pero compilado con 5.9.3. TS 6 solo se ejercitó en la API vía `tsc --noEmit`.
- **Peer dependency fuera de rango**: `tsconfck@3.1.6` (vía `vite-tsconfig-paths@6.1.1`, usado en
  `apps/api/vitest.config.ts`) declara `typescript: ^5.0.0` como peer opcional. `npm install` terminó bien sin
  flags, pero `npm ls typescript` reporta `invalid`. Los tests de vitest pasaron igualmente.
- `packages/ui/tsconfig.lint.json` (no lo usa ningún script) da 1 error con 5.9.3 y 41 con 6.0.3
  (36 son TS2835). No lo arreglé.
- `packages/feature-flags/tsconfig.api.json` con `tsc --noEmit` da 7 errores tanto en 5.9.3 como en 6.0.3
  (preexistente, no lo usa ningún script).
- `turbo lint` pasa (1/1). `biome check` sobre los tsconfig reporta errores de formato en archivos que no toqué
  de contenido, también antes de mis cambios; parecen de finales de línea en Windows. No lo investigué.

## Qué NO se verificó

- Ejecución en runtime de las apps (no se arrancó ningún servidor) ni tests e2e/Cypress.
- CI, Docker y Linux/macOS: todo se corrió en Windows.
- Que el contenido de los `.d.ts` sea idéntico al de 5.9.3 (solo coinciden nombres y tamaños).
- El build de `apps/api` compilado realmente con TS 6 (ver nota sobre `@nestjs/cli`).
- El fallo de `next build` en `apps/client` sin el arreglo 3 (inferido).
- En qué versión de tsup se corrigió el issue #1388; tsup 9 quedó fuera de alcance y no se probó.
- Compatibilidad con TypeScript 7 (donde `ignoreDeprecations: "6.0"` deja de aplicar según Microsoft).
- La alternativa `declare module '*.css'` y la variante de `ignoreDeprecations` en `base.json`.

## Fuentes

- Notas oficiales de TypeScript 6.0 (deprecación de `baseUrl`, `ignoreDeprecations`, nuevos valores por
  defecto de `types`, `rootDir`, `strict`, `noUncheckedSideEffectImports`):
  <https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/>
- Issue upstream de tsup: <https://github.com/egoist/tsup/issues/1388>
- Código de tsup 8.5.1 instalado en el worktree (`node_modules/tsup/dist/rollup.js`): lectura directa.
- Todo lo demás: resultados de mi propio experimento en este worktree.
