# Flujo de un requerimiento

> **Plantilla estándar Avila Tek.** Vive en `docs/agents/flujo.md`. Describe cómo corre un
> requerimiento de punta a punta. Compañero de `issue-tracker.md` (mecánica) y `triage-labels.md`
> (roles y estados).

El flujo de un requerimiento, de punta a punta: del mapa de decisiones hasta el equipo construyendo.

## La espina

```
/wayfinder      mapa de decisiones charteado por épicas, resuelto de a un ticket
      ↓
                resolución de niebla — se cierran los tickets de decisión
      ↓
/to-spec        el spec: síntesis de lo decidido —incluidas las User Stories—, publicado al tracker
      ↓
/to-tickets     sobre el spec → tickets verticales con dependencias nativas
      ↓
/triage → /implement → /tdd → /code-review
```

El spec de `/to-spec` es **el punto final del wayfinder y el punto de partida de todo lo demás**.
Las User Stories viven **dentro del spec**, así que `/to-tickets` rebana directo del spec: **no hay
capa HU intermedia ni pasos de `/epic-hypothesis` o `/epic-breakdown-advisor`** en la espina.
El spec puede ser **general o por épica**; en cualquier caso, al correr `/to-tickets` el rol técnico
**asocia a cada ticket el milestone de su épica**, para poder filtrar por épica en el Project.
Aguas abajo nadie re-abre una decisión ya cerrada en el mapa: eso vuelve al mapa como ticket de
decisión nuevo.

## Descubrimiento — los tres roles sobre un mapa

`/wayfinder` ya es multijugador: reclamar un ticket es asignárselo, y la frontera son los hijos
abiertos, sin bloqueos y **sin asignar**. Los tres roles trabajan el mismo mapa en paralelo sin
pisarse; cada uno filtra la frontera por su `rol:*`.

**El mapa lo dueña Producto.** `Destination` fija el alcance y `Notes` las preferencias del
esfuerzo — eso no deriva por acumulación de tickets ni se decide en comité. Los otros dos roles
dueñan tickets, no el mapa.

Por lo mismo, **`Out of scope` lo escribe solo Producto**: sacar algo de alcance no es resolver una
decisión, es redibujar el destino.

### Los tres ejes

Tres ejes independientes sobre cada ticket de decisión. No se mezclan: cada uno responde otra pregunta.

| Eje        | Cómo se expresa            | Responde                                        |
| ---------- | -------------------------- | ----------------------------------------------- |
| **Qué**    | milestone de la épica      | de qué estamos hablando — el lenguaje común     |
| **Quién**  | `rol:*`                    | de quién se espera el siguiente movimiento      |
| **Cuándo** | dependencias nativas       | qué tiene que cerrar antes                      |

El eje **cuándo** es causal y no se negocia: nadie diseña una pantalla antes de que exista el modelo
que la pantalla muestra. El eje **qué** es el que se habla en una reunión — nadie dice "estamos en la
onda 3", pero sí "tal épica está abierta y falta la firma de tal rol". El eje **quién** vive solo en
los tickets de decisión (ver `triage-labels.md`): **el spec y los tickets de entrega no llevan rol**.

### Cartografiar

De la preventa viene un **preliminar de muy alto nivel** de las épicas y del mapa de decisiones. El
mapa **no suele estar claro al recibir el proyecto**: se puede intentar resolver parte de la niebla
**antes del kick off con el cliente** o **llevar esas preguntas al kick off**, y **chartear el mapa
después de él**.

Una vez por esfuerzo, en este orden. Los pasos 1, 4 y 6 son de `/wayfinder`; el 2, el 3 y el 5 los
agrega este flujo.

1. **Producto nombra el destino.** `/grilling` + `/domain-modeling`. Fija el alcance, así que va
   primero.
2. **Deriva las épicas del insumo de preventa y créalas como milestones**, antes del primer ticket.
   Son nombrables el día cero aunque el modelo que llevan debajo no lo sea. Esto es lo que evita
   inventar épicas más tarde leyendo el spec.
3. **Grilla breadth-first** para sacar las decisiones abiertas. Cada ticket nace con
   `wayfinder:<tipo>` + `rol:*` + milestone —o sin milestone si es transversal—.
   **Filtro de peso/riesgo:** se chartea como ticket solo lo de **mayor peso o riesgo** (lo que
   bloquea el spec o hace daño si sale mal). Lo parcialmente trivial y de bajo riesgo **no se
   ticketea**: se anota en `Not yet specified` y se resuelve en desarrollo. Por eso **el mapa puede
   cerrar el Discovery/planificación con niebla**: es válido y esperado que queden decisiones menores
   sin resolver.
4. **Cablea los bloqueos** en segunda pasada: los issues necesitan id antes de poder referenciarse.
5. **Corre la grilla épica × rol.** Una celda vacía es una pregunta que falta: créala, o anota en el
   mapa por qué esa épica no necesita a ese rol. Un hueco sin justificar es un agujero, no una
   simplificación.
6. **Dispara los subagentes de research.** Los tickets AFK corren en paralelo y sin humano.

El paso 5 es el que hace que la tríada exista de verdad. Sin él, los tickets de Producto absorben las
decisiones técnicas y de diseño que llevan dentro, y los otros dos roles terminan mirando una
frontera vacía.

### Cuando algo surge a mitad de camino

Dos preguntas en orden, y cada respuesta tiene su casillero. Confundirlos es lo que ensucia el mapa.

```
Surge algo mientras resuelvo mi ticket
   │
   ├─ ¿Puedo formular la pregunta con precisión ya?
   │     (el test es formularla, no responderla)
   │
   │     NO ──→ Not yet specified. Nadie la dueña. Mi ticket cierra igual.
   │
   │     SÍ
   │      │
   │      ├─ ¿Me bloquea AHORA para cerrar mi ticket?
   │      │
   │      │     NO ──→ ticket hijo nuevo, wired al mapa, con el rol del área
   │      │            donde cae — no el mío. Mi ticket cierra.
   │      │
   │      │     SÍ ──→ /to-questionnaire como comentario, muevo `rol:*` al que
   │      │            responde. Mi ticket queda abierto y reclamado, en pausa.
```

El ticket nuevo lleva **el rol del área donde cae, no el de quien lo creó**. Ahí está el traspaso, y
es asíncrono: al otro rol le aparece en su frontera, nadie tiene que llamarlo.

La rama de la derecha es la única que produce una espera bloqueante — úsala con tacañería. Si puedes
cerrar tu ticket dejando la pregunta viva para otro, ciérralo.
