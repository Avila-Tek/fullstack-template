# Issue tracker: GitHub

> **Plantilla estándar Avila Tek.** Este archivo vive en `docs/agents/issue-tracker.md` de cada
> repo y lo lee `/wayfinder` automáticamente. Trae de fábrica cómo se chartea el mapa. Lo único a
> completar por proyecto es la sección **"Este repo"** al final.

Issues and specs for this repo live as GitHub issues. Use the `gh` CLI for all operations.

## Conventions

- **Create an issue**: `gh issue create --title "..." --body "..."`. Use a heredoc for multi-line bodies.
- **Read an issue**: `gh issue view <number> --comments`, filtering comments by `jq` and also fetching labels.
- **List issues**: `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'` with appropriate `--label` and `--state` filters.
- **Comment on an issue**: `gh issue comment <number> --body "..."`
- **Apply / remove labels**: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **Close**: `gh issue close <number> --comment "..."`

Infer the repo from `git remote -v` — `gh` does this automatically when run inside a clone.

## Pull requests as a triage surface

**PRs as a request surface: no.** _(Set to `yes` if this repo treats external PRs as feature requests; `/triage` reads this flag.)_

When set to `yes`, PRs run through the same labels and states as issues, using the `gh pr` equivalents:

- **Read a PR**: `gh pr view <number> --comments` and `gh pr diff <number>` for the diff.
- **List external PRs for triage**: `gh pr list --state open --json number,title,body,labels,author,authorAssociation,comments` then keep only `authorAssociation` of `CONTRIBUTOR`, `FIRST_TIME_CONTRIBUTOR`, or `NONE` (drop `OWNER`/`MEMBER`/`COLLABORATOR`).
- **Comment / label / close**: `gh pr comment`, `gh pr edit --add-label`/`--remove-label`, `gh pr close`.

GitHub shares one number space across issues and PRs, so a bare `#42` may be either — resolve with `gh pr view 42` and fall back to `gh issue view 42`.

## When a skill says "publish to the issue tracker"

Create a GitHub issue.

## When a skill says "fetch the relevant ticket"

Run `gh issue view <number> --comments`.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a single issue with **child** issues as tickets.

- **Map**: a single issue labelled `wayfinder:map`, holding the Notes / Decisions-so-far / Fog body. `gh issue create --label wayfinder:map`.
- **Child ticket**: an issue linked to the map as a GitHub sub-issue (`gh api` on the sub-issues endpoint). Where sub-issues aren't enabled, add the child to a task list in the map body and put `Part of #<map>` at the top of the child body. Labels: `wayfinder:<type>` (`research`/`prototype`/`grilling`/`task`) **y un `rol:*`** (ver _Rol por defecto al cartografiar_ abajo). Once claimed, the ticket is assigned to the driving dev.
- **Blocking**: GitHub's **native issue dependencies** — the canonical, UI-visible representation. Add an edge with `gh api --method POST repos/<owner>/<repo>/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>`, where `<blocker-db-id>` is the blocker's numeric **database id** (`gh api repos/<owner>/<repo>/issues/<n> --jq .id`, _not_ the `#number` or `node_id`). GitHub reports `issue_dependencies_summary.blocked_by` (open blockers only — the live gate). Where dependencies aren't available, fall back to a `Blocked by: #<n>, #<n>` line at the top of the child body. A ticket is unblocked when every blocker is closed.
- **Frontier query**: list the map's open children (`gh issue list --state open`, scoped to the map's sub-issues / task list), drop any with an open blocker (`issue_dependencies_summary.blocked_by > 0`, or an open issue in the `Blocked by` line) or an assignee; first in map order wins. **Filtra por tu rol** —`--label rol:<mío>`—: cada rol de la tríada abre su propia frontera sobre el mismo mapa.
- **Claim**: `gh issue edit <n> --add-assignee @me` — the session's first write.
- **Resolve**: `gh issue comment <n> --body "<answer>"`, then `gh issue close <n>`, then append a context pointer (gist + link) to the map's Decisions-so-far.

### Rol por defecto al cartografiar

Cada ticket del mapa nace con un `rol:*` y con el **milestone** de su épica —o sin milestone si
es transversal, ver _La épica_ abajo—. El tipo ya casi decide el rol:

| Tipo        | HITL / AFK | Rol por defecto | Por qué                                                     |
| ----------- | ---------- | --------------- | ----------------------------------------------------------- |
| `research`  | AFK        | ninguno         | Lo resuelve un subagente `/research`; cualquiera lo dispara |
| `prototype` | HITL       | `rol:diseno`    | Su pregunta es *cómo se ve* o *cómo se comporta*            |
| `grilling`  | HITL       | el del área     | El caso por defecto; lo fija quien cartografía              |
| `task`      | HITL o AFK | `rol:tecnico`   | Provisionar accesos, mover datos, evaluar una API           |

Qué obliga ese label está en `triage-labels.md`.

### La épica: el milestone, desde el charteo

Una épica es un **milestone**, y se crea **al cartografiar el mapa** —no al escribir el spec—. Las
épicas se derivan del insumo de preventa: son nombrables el día cero aunque el modelo que llevan
debajo no lo sea, y vienen en el idioma del cliente.

Un milestone abarca el esfuerzo completo de su épica: primero sus tickets de decisión, después sus
tickets de entrega. GitHub admite **un solo milestone por issue**, así que "una épica por
ticket" no hay que vigilarlo, y la barra de progreso del milestone es la vista de convergencia.

- Los labels separan la fase dentro del milestone: `wayfinder:*` es decisión, `ticket` es
  entrega. Las decisiones pendientes de una épica salen con
  `gh issue list --milestone "<épica>" --state open --label wayfinder:grilling` y sus hermanos.
- **Una épica cierra cuando su milestone no tiene issues abiertas.** Durante descubrimiento eso
  quiere decir que los tres roles firmaron.
- **Sin milestone = transversal.** Las decisiones que atraviesan todas las épicas —alcance,
  concurrencia, integraciones— no se fuerzan dentro de una: se quedan sin milestone, se listan con
  `--no-milestone`, y no les aplica la regla de cierre.

### Cartografiar: el orden (una vez por esfuerzo)

De la preventa viene un **preliminar de muy alto nivel** de las épicas y del mapa de decisiones. El
mapa **no suele estar claro al recibir el proyecto**: se puede intentar resolver parte de la niebla
**antes del kick off con el cliente** o **llevar esas preguntas al kick off**, y **chartear el mapa
después de él**.

Los pasos 1, 4 y 6 son de `/wayfinder`; el 2, 3 y 5 los agrega este estándar.

1. **Producto nombra el destino.** `/grilling` + `/domain-modeling`. Fija el alcance, va primero.
2. **Deriva las épicas del insumo de preventa y créalas como milestones, ANTES del primer ticket.**
   Esto es lo que evita inventar épicas más tarde leyendo el spec.
3. **Grilla breadth-first** para sacar decisiones abiertas. Cada ticket nace con `wayfinder:<tipo>`
   + `rol:*` + milestone —o `--no-milestone` si es transversal—.
   - **Filtro de peso/riesgo:** se chartea como ticket solo lo de **mayor peso o riesgo** (lo que
     bloquea el spec o hace daño si sale mal). Lo parcialmente trivial y de bajo riesgo **no se
     ticketea**: se anota en `Not yet specified` y se resuelve en desarrollo. Por eso **el mapa puede
     cerrar el Discovery/planificación con niebla**: es válido y esperado que queden decisiones
     menores sin resolver.
4. **Cablea los bloqueos** en segunda pasada (los issues necesitan id antes de referenciarse).
5. **Corre la grilla épica × rol.** Una celda vacía es una pregunta que falta: créala, o anota en
   el mapa por qué esa épica no necesita a ese rol. Un hueco sin justificar es un agujero.
6. **Dispara los subagentes de `/research`** (tickets AFK, en paralelo, sin humano).

### Capas de entrega: épica, spec, ticket (sin capa HU)

Dos capas de entrega, dos contratos. El **spec** captura lo que se construye —incluidas sus User
Stories—; el **ticket** es el contrato con el dev, una rebanada vertical del spec. Un requerimiento
se cumple con uno o varios tickets.

| Capa       | En GitHub                | Nace de                           | Cierra cuando                 |
| ---------- | ------------------------ | --------------------------------- | ----------------------------- |
| **Spec**   | issue con label `spec`   | `/to-spec` (general o por épica)  | sus épicas cierran            |
| **Ticket** | issue con label `ticket` | `/to-tickets` sobre el spec       | el trabajo aterriza en `main` |

La **épica** no está en esa tabla porque no es una capa de entrega: es el **lenguaje común** del
esfuerzo, y nace antes que todo lo demás.

**No hay capa HU aparte.** Las User Stories viven **dentro del spec** —`/to-spec` las produce como
lista extensa— y `/to-tickets` las rebana en tickets verticales directamente. El contrato de firma
con el cliente vive en el **PRD de la vía-cliente**, no en el tracker.

- El cuerpo de cada épica abre con `Spec: #<n>`; el de cada ticket, también con `Spec: #<n>`. Sin
  esa línea el issue no tiene contrato del que colgarse.
- Los criterios de aceptación viven en el **ticket** (contrato con el dev). Los **Gherkin de firma
  del cliente** viven en el **PRD**, y `/test-scenarios` los convierte en pruebas de aceptación.
- Las **dependencias nativas** conectan tickets entre sí; el orden funcional lo da el milestone.
- **El spec puede ser general (todo el esfuerzo) o por épica** — `/to-spec` genera uno u otro. **Sea
  cual sea, al correr `/to-tickets` el rol técnico asocia a cada ticket el milestone de su épica**,
  para poder **filtrar por épica en el Project**.
- **El spec y los tickets de entrega NO llevan `rol:*`.** Ese eje es exclusivo de los **tickets de
  decisión del mapa** (`wayfinder:*`). `/to-tickets` corre sobre el spec y sus tickets salen sin rol.

Los labels `wayfinder:*` marcan tickets de **decisión** —el mapa y sus hijos—, no de entrega. Una
decisión resuelta entra al spec vía `/to-spec`.

### La espina, de punta a punta

```
/wayfinder  →  resolución de niebla  →  /to-spec  →  /to-tickets  →  /triage → /implement → /tdd → /code-review
```

El spec de `/to-spec` es el punto final del wayfinder y el arranque de todo lo demás. **No hay
`/epic-hypothesis` ni `/epic-breakdown-advisor` en la espina** (las User Stories ya vienen en el
spec). La **vía-cliente** (`/prd-development`, prototipos) corre en paralelo sobre el mismo spec.

### El sprint: campo `Iteration` del Project

El milestone lo ocupa la épica y GitHub admite **uno por issue**, así que el sprint vive fuera: un
campo **Iteration** llamado `Sprint` en el GitHub Project del repo. **La duración del sprint se
define por proyecto** (1 o 2 semanas) — no la fija este estándar.

Iteration y no single-select porque trae fechas nativas: el corte por sprint queda ubicado en el
tiempo sin mantener un campo aparte.

- **La épica dice _qué_; el sprint dice _cuándo se entrega_.** Una épica cruza varios sprints; un
  sprint toca varias épicas. Son ejes independientes y ninguno se deduce del otro.
- Solo los tickets de entrega llevan sprint. Los tickets de decisión del mapa no: el
  descubrimiento no se corta en sprints, se corta en épicas.

### Este repo

- Repo: `Avila-Tek/fullstack-template`
- **El mapa activo se encuentra por label**, nunca por número anotado acá:
  `gh issue list --label wayfinder:map --state open`.
- Sub-issues y **dependencias nativas** deben estar habilitados; si no lo están, aplica el fallback
  de `Blocked by:` en el cuerpo que describe *Wayfinding operations*.
