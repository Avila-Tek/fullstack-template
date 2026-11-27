# Triage Labels

> **Plantilla estándar Avila Tek.** Vive en `docs/agents/triage-labels.md`. La columna derecha se
> ajusta solo si el repo usa otras cadenas de label.

The skills speak in terms of five canonical triage roles. This file maps those roles to the actual label strings used in this repo's issue tracker.

| Label in mattpocock/skills | Label in our tracker | Meaning                                  |
| -------------------------- | -------------------- | ---------------------------------------- |
| `needs-triage`             | `needs-triage`       | Maintainer needs to evaluate this issue  |
| `needs-info`               | `needs-info`         | Waiting on reporter for more information |
| `ready-for-agent`          | `ready-for-agent`    | Fully specified, ready for an AFK agent  |
| `ready-for-human`          | `ready-for-human`    | Requires human implementation            |
| `wontfix`                  | `wontfix`            | Will not be actioned                     |

When a skill mentions a role (e.g. "apply the AFK-ready triage label"), use the corresponding label string from this table.

Edit the right-hand column to match whatever vocabulary you actually use.

---

## La tríada

Los cinco labels de arriba son **estados**: dónde está el issue. La tríada es un segundo eje —**de
quién se espera el siguiente movimiento**—. Tres roles, cada uno con liderazgo en su área. No es
jerarquía: es autoridad repartida.

| Label          | Rol            | Decide                                                                    |
| -------------- | -------------- | ------------------------------------------------------------------------- |
| `rol:producto` | Producto       | alcance, prioridad, criterios de aceptación, qué se le promete al cliente |
| `rol:tecnico`  | Líder técnico  | arquitectura, factibilidad, estimación en horas, orden de los tickets     |
| `rol:diseno`   | Diseño         | flujo de usuario, jerarquía visual, accesibilidad, qué se prototipa       |

### Dónde vive el rol (regla clave)

**El `rol:*` vive SOLO en los tickets de decisión del mapa** (`wayfinder:*`). Es el eje que responde
*¿en la cancha de quién está esta decisión?* durante el descubrimiento.

- **El spec NO lleva rol. Los tickets de entrega NO llevan rol.** La entrega la dirige el líder
  técnico por defecto; no hace falta un label para decirlo, y ponerlo ensucia el eje.
- En un ticket de decisión, un solo rol a la vez, siempre. Dos labels de rol esconden de quién se
  espera algo, que es justo lo que este eje existe para hacer visible.
- `needs-info` **en un ticket de decisión** se acompaña del rol de quien debe la información. Sin él
  es una pregunta al aire y nadie la recoge.

### Decisiones cruzadas

Cuando un ticket de decisión necesita una respuesta fuera del área de su rol, el dueño corre
`/to-questionnaire`, publica el cuestionario como comentario y **mueve** el label de rol al rol que
responde. El label regresa cuando la respuesta aterriza en el ticket.

### Tickets de wayfinder

En los tickets de decisión, cada rol abre **su propia frontera** sobre el mismo mapa —mismo query,
filtrado por su label—. Tres frentes, un mapa. El rol por defecto según el tipo de ticket está en
`issue-tracker.md`.

Los tickets `grilling` y `prototype` son **HITL**: el skill prohíbe que el agente hable por el
humano. Un ticket HITL **solo lo resuelve la persona de su rol** — ninguna otra sesión lo cierra,
aunque lo vea en la frontera y sin asignar. Eso es lo que vuelve el label vinculante en vez de
decorativo.

Al cartografiar, etiqueta con un rol cuya persona vaya a estar disponible. Un HITL en manos de
alguien ausente es un bloqueo que el grafo de dependencias no muestra.
