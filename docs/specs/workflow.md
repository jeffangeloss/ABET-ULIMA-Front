# Flujo de specs de ABET

> **Estado 2026-10-28.** Los pasos 1 a 3 del producto mínimo viable (minimum viable product, MVP) quedan hechos el 2026-10-28 en la fase de descubrimiento, y Jefferson aprueba la spec en el chat el mismo día. `MEMORIA.md` del Back registra la aprobación en el chat, y la aprobación formal que pide el Principio V de la constitución del Back es la fusión de su solicitud de integración (pull request, PR) en `develop` (T004), que espera su permiso. Las reglas del paso 5 esperan la auditoría de la fase (T019), y el paso 7 empieza en local en la rama `feat/001-mvp-carga-r17`.

Adaptación del flujo de IQBF a ABET, con dos cambios. Las historias pasan por una auditoría de refutación antes de la especificación (spec), y el flujo cubre también el sentido inverso, cuando el Back cambia el contrato y el Front se adapta. La regla que ordena todo es que la prisa cambia el tamaño de cada paso, nunca su orden ni su existencia.

## Orden de trabajo

1. **Objetivo.** Se copia el pedido literal en el campo Input de la spec y se fija el objetivo que prioriza el sprint. En el MVP son los cuatro resultados de Jefferson (base en la nube, subir el export, datos cargados en la base y R-17 desde la base).
2. **Historias en Gherkin desde varios ángulos.** Al menos tres escritores (en el MVP, el profesor, el coordinador con la base, y la evidencia y la privacidad) proponen historias candidatas con escenarios en Gherkin en español (`# language: es`). Las candidatas se numeran C-01, C-02 y así en adelante, para no confundirlas con las historias finales. Cada una nombra sus tablas, restricciones y consultas de control, y la pantalla donde ocurre.
3. **Auditoría de refutación.** Tres lentes intentan refutar cada candidata (necesidad frente al objetivo, solapamiento y tamaño, verificabilidad contra la base real) y un crítico ataca las decisiones técnicas. Cada candidata recibe SOBREVIVE, REFUTADA, MOVER_A_DESPUES, FUSIONAR, PARTIR o CORREGIR, y el resultado queda en `specs/NNN-slug/revision-historias.md` del Back, con la historia final US-NN que absorbe cada candidata.
4. **Spec aprobada.** `specs/NNN-slug/spec.md` reúne las historias finales, con los encabezados de Spec Kit en inglés y el cuerpo en español, y lista por historia el `.feature` donde viven sus escenarios. Los `.feature` viven en un solo lugar, `specs/NNN-slug/aceptacion/`, y los pasos de `tests/aceptacion/pasos/` los leen desde allí sin copiarlos. Cada escenario lleva `@US-NN` y `@corte1` o `@corte2`. La spec entra por PR a `develop`, y el merge (la fusión del PR) es la aprobación formal que pide el Principio V de la constitución del Back. Sin aprobación no hay código.
5. **Contrato y reglas BR en las specs vivas.** Antes de implementar, las reglas `BR-<FEATURE>-NN` se escriben en `specs/features/<feature>/<feature>.spec.md` del Back, y el contrato se actualiza en [`docs/specs/api-contracts.md`](api-contracts.md) y en [`docs/03-api/contrato.md`](../03-api/contrato.md). En el MVP las funcionalidades (features) son `carga-export`, `r17`, `acceso` y `periodo`.
6. **Plan y tareas.** `plan.md` ordena las fases 0 a 7 (descubrimiento, contrato, base, backend, frontend, pruebas, auditoría y despliegue) y `tasks.md` lista las tareas `- [ ] T0NN descripción [US-NN]`, numeradas por decenas según la fase, con el repositorio de cada una y las historias que habilita o audita.
7. **Implementación con pruebas que primero fallan.** Cada tarea empieza con la prueba que falla, que cubre lo que debe pasar y lo que no debe pasar, y solo después se escribe el código que la hace pasar. Los archivos que se tocan son los que la spec viva declara en `targets`.
8. **`audit.md`.** Al cerrar el MVP, `specs/NNN-slug/audit.md` cruza cada historia con su escenario, su prueba y su resultado, y las specs vivas reciben su línea `Verification` con fecha.
9. **`MEMORIA.md` en cada cambio.** Cada commit actualiza `MEMORIA.md` del repositorio donde ocurre, con «Punto actual» y una entrada que dice qué cambia, por qué, lo probado que debe pasar, lo probado que no debe pasar, las correcciones, cómo se reporta y qué hace cada subagente. El hook `pre-commit` y la verificación `pruebas` de la CI lo exigen.

## Quién hace qué

| Paso | Lo hace | Lo aprueba |
|---|---|---|
| 1 Objetivo | Jefferson | Jefferson |
| 2 y 3 Historias y auditoría | Claude Code con subagentes por ángulo y por lente | Jefferson, al leer `revision-historias.md` |
| 4 Spec | Claude Code | Jefferson, con el merge del PR |
| 5 Contrato y reglas | Claude Code | Jefferson, en el PR de contrato |
| 6 Plan y tareas | Claude Code | Jefferson |
| 7 Implementación | Claude Code, con revisión de Jefferson | La CI (`pruebas`) y el merge |
| 8 `audit.md` | Claude Code | Jefferson |
| 9 `MEMORIA.md` | Quien hace el cambio | El hook y la CI |

Los commits y los PR van solo a nombre de Jefferson, y nada se empuja sin su permiso.

## De la pantalla a la spec

Una funcionalidad nueva parte de la necesidad, no de la pantalla. La pantalla aparece después, en [`01-arquitectura/frontend.md`](../01-arquitectura/frontend.md), con las historias que la justifican, y lo que ninguna historia pide no se muestra. Si una pantalla necesita algo que el contrato no trae, se vuelve al paso 5 antes de escribir código en el Front.

## Del Back al Front

Cuando el Back cambia una ruta, el cambio sigue este orden.

1. La spec viva del Back cambia en un PR del Back, antes del código.
2. `docs/specs/api-contracts.md`, `docs/03-api/contrato.md` y `src/servicios/tipos.ts` del Front se actualizan en un PR del Front que cita el PR del Back, como pide la regla de oro de `api-contracts.md`.
3. Un cambio incompatible publica primero la versión del Back y después la del Front (`docs/devops.md`).
4. Se busca en `docs/` con `grep -rn` lo que todavía describe la ruta anterior y se corrige.

## Contexto de datos

Un cambio de modelo empieza en el SQL de `db/migration/` del Back, se aprueba, se aplica a la base local y a la rama `develop` de Neon, y solo después llega al código. Las restricciones y los índices únicos parciales de la base son la última línea de defensa, y el programa valida antes para dar un mensaje legible (ADR-001).

## Lo que todavía NO está

1. **La fusión de la spec del MVP.** Jefferson la aprueba en el chat el 2026-10-28, y `MEMORIA.md` del Back registra la aprobación. Su PR desde la rama `docs/plan-mvp` espera la fusión en `develop` (T004), que es la aprobación formal del Principio V.
2. **`specs/spec-template.md` en español** con `targets` alineados con el Back real.
3. **La revisión de las specs vivas.** `carga-export`, `r17`, `acceso` y `periodo` ya tienen sus reglas `BR-` de la fase 1 de contrato, y esperan la auditoría de la fase (T019) y la revisión de Jefferson en su PR.
