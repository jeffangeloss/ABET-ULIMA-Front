# Índice de features

> **Estado 2026-11-24.** El contrato de la feature `mejora` de la spec 005 es definitivo desde T011, y su código se construye en `feat/005-oportunidades-de-mejora`. **Cambio del 2026-11-21 (aprobado el 2026-11-21).** La feature `mejora` de la spec 005 pasa a un registro por indicador, y la spec 006 de la programación docente entra sin pantalla ni ruta (párrafo bajo la tabla). **Estado 2026-10-30.** Las funcionalidades del corte 1 están implementadas en local y `audit.md` del Back las cruza con sus pruebas; la línea `Verification` de las specs vivas lleva fecha. El corte 2 sigue sin implementar. Los nombres y los prefijos son los que fija `specs/README.md` del Back.

Cada feature es la carpeta de su spec viva en `specs/features/` de ABET-ULIMA-Back. «Pantallas que sirve» nombra las pantallas de [`01-arquitectura/frontend.md`](../01-arquitectura/frontend.md), y la columna «Spec» da la ruta relativa al Back. Todas las historias del producto mínimo viable (minimum viable product, MVP) viven además en `specs/001-mvp-carga-r17/spec.md`, y sus escenarios en los siete `.feature` de `specs/001-mvp-carga-r17/aceptacion/`. Uno de ellos, `varias_secciones.feature`, prueba las reglas de `acceso` y de `carga-export` con un profesor que dicta tres secciones de dos asignaturas.

| Feature | Reglas | Pantallas que sirve | Estado | Spec |
| --- | --- | --- | --- | --- |
| acceso | BR-ACCESO-01 a BR-ACCESO-10 | P1 Ingreso (`Ingreso.tsx`) y la regla de visibilidad de todas | en revisión (contrato escrito para US-04, US-05 y US-06; US-20 del corte 2 en BR-ACCESO-09, que completa T080) | `specs/features/acceso/acceso.spec.md` |
| periodo | BR-PERIODO-01 a BR-PERIODO-04 | P2 Mis secciones (`MisSecciones.tsx`) | en revisión (contrato escrito para US-03 y el listado de US-06) | `specs/features/periodo/periodo.spec.md` |
| carga-export | BR-CARGA-01 a BR-CARGA-20 | P3 Subir export (`SubirExport.tsx`), P4 Resultado de la carga (`ResultadoCarga.tsx`) y P5 Cargas (`Cargas.tsx`) | en revisión (contrato escrito para US-07 a US-14; US-18, US-19 y US-21 del corte 2 en BR-CARGA-18 a BR-CARGA-20, que completa T080) | `specs/features/carga-export/carga-export.spec.md` |
| r17 | BR-R17-01 a BR-R17-10 | P4 Resultado de la carga (`ResultadoCarga.tsx`) | en revisión (contrato escrito para US-15 y US-16) | `specs/features/r17/r17.spec.md` |
| resultados (spec 004) | BR-RESULTADOS-01 a BR-RESULTADOS-11, con BR-ACCESO-10 en `acceso` | P6 Mis logros por SO (`MisLogros.tsx`) | contrato listo (código y pruebas de la ruta 12 y de P6 en `develop` desde el PR #31 del Back y el PR #20, a la espera del humo contra la vista previa de T071 del Back) | `specs/features/resultados/resultados.spec.md` |
| mejora (spec 005) | BR-MEJORA-01 a BR-MEJORA-NN (propuesta) | P4 Resultado de la carga (`ResultadoCarga.tsx`), con «Análisis por indicador» desde el cambio del 2026-11-21, P2, P5 y P6 que llevan a P4, y `App.tsx` con la navegación por el fragmento | contrato listo en el Front (rutas 13 a 16 definitivas desde T011 del 2026-11-24, con BR-MEJORA-NN por escribir en T010 del Back) | `specs/features/mejora/mejora.spec.md` (por escribir en T010 de la spec 005) |
| avance (spec 007) | BR-AVANCE-01 a BR-AVANCE-NN (propuesta), con BR-ACCESO-12 en `acceso` (propuesta) | P7 Avance del registro (`Avance.tsx`, nueva, solo para el coordinador) y la llegada por rol de `App.tsx` | propuesta (spec 007 en borrador, etapa B, sin contrato definitivo hasta T011 y T012) | `specs/features/avance/avance.spec.md` (por escribir en T011 de la spec 007) |

La spec 006 del Back (`specs/006-programacion-docente/`, propuesta del 2026-11-21) carga la programación docente post-matrícula del ciclo, con las secciones, los profesores y sus asignaciones, mediante un guion que corre desde el Windows de Jefferson. No agrega rutas ni pantallas y no abre una fila en esta tabla mientras no defina reglas `BR-` propias. Su efecto se ve en P2 Mis secciones, donde cada profesor encuentra su sección.

La spec 007 del Back (`specs/007-experiencia-por-cuenta/`, aprobada el 2026-11-22, «Sí, apruébala») muestra lo importante para cada cuenta y en cada momento del registro. Su etapa A cambia solo textos y pantallas del Front que ya existen, que son la línea de lo que falta en P2 del profesor, el apartado «Antes de subir» de P3, «Qué corregir» en P4 de una carga rechazada, el texto de P4 tras un reemplazo rechazado y los rótulos por rol de la cabecera. No define reglas `BR-` y no abre una fila, porque sus textos viven en [`01-arquitectura/frontend.md`](../01-arquitectura/frontend.md), sección 11. Su etapa B abre la fila `avance` de la tabla, con la ruta 17 y P7.

La spec 008 del Back (`specs/008-ciclo-quimica-industrial/`, aprobada por Jefferson en el chat el 2026-11-23 («Sí, apruébala»)) cierra el ciclo de punta a punta de Química General (5643) de Ingeniería Industrial en 2026-1 para la capacitación. No abre una feature nueva y suma reglas a las existentes, BR-ACCESO-13 y BR-ACCESO-14 en `acceso` (alcance de la coordinación por carrera o por curso y su registro), BR-PERIODO-05 y BR-PERIODO-06 en `periodo` (periodo elegido con la ruta 18 y comprobación de arranque por carrera) y BR-R17-13 en `r17` (carrera del encabezado), con cambios fechados en BR-ACCESO-07, BR-ACCESO-08 y BR-CARGA-20, y construye la feature `avance` de la spec 007 con el alcance del curso. Sus pantallas son el selector «Periodo» de la cabecera, P2 «Secciones del curso» y P7 «Avance del registro del curso» (propuestas) para la coordinación del curso, P4 con los consejos de las filas rechazadas, P6 con la fila que no depende solo del color y el rediseño visual de P1 a P7. Su contrato es definitivo desde T011 (2026-11-23), el periodo y los rótulos del curso se construyen con T042 y T043, y los textos de pantalla que la spec marca (propuesta) siguen como propuestas.

La spec 009 del Back (`specs/009-resumen-del-curso/`, aprobada por Jefferson en el chat el 2026-11-24, «Sí, apruébala») lleva a la pantalla P8 «Resumen del curso» la página «Resumen Curso» del tablero de Power BI de Stefanny Montaño, solo para la coordinación. No abre una feature nueva y suma BR-RESULTADOS-12 a BR-RESULTADOS-15 a la spec viva `resultados`, con US-91 a US-94, las rutas 20 y 21 y ADR-010.

US-01, US-02 y US-17 son de plataforma (migración en Neon, rol `abet_app` y despliegue en Vercel), no abren una spec viva y se verifican en `specs/001-mvp-carga-r17/audit.md`. No tienen pantalla, aunque la prueba de humo de US-17 recorre P1 a P4.

Las cuatro features siguen en revisión aunque su contrato ya está escrito, porque el paso «aprobada» de la escala pide la fusión (merge) en `develop` de la solicitud de integración (pull request, PR) de la spec 001 (T004), y el contrato espera además la auditoría de la fase 1 (T019). Jefferson aprueba la spec 001 en el chat el 2026-10-28, y `MEMORIA.md` del Back registra esa aprobación.

## Estados

IQBF no define su vocabulario de estados. Aquí se usa una escala cerrada, en este orden.

| Estado | Significa |
| --- | --- |
| en revisión | Sus historias están en una spec cuyo PR espera la fusión en `develop` |
| aprobada | El PR de la spec tiene su fusión en `develop` |
| contrato listo | Sus reglas `BR-` y sus rutas están en la spec viva y en `api-contracts.md` |
| implementada | Su código está en `develop` con sus pruebas aprobadas |
| verificada | `audit.md` cruza sus historias con sus pruebas y la spec viva trae su línea `Verification` con fecha |

Una feature de una spec sin aprobar lleva el estado «propuesta» antes de entrar en esta escala. Un matiz va entre paréntesis, como «implementada (solo hoja Cursos de Carrera)».

## Lo que todavía NO está

1. **La verificación a mano.** Las cuatro specs vivas traen su línea `Verification` con fecha del 2026-10-30, y queda abierta T062, la prueba en el navegador que Jefferson cumple con la guía de `audit.md`.
2. **Las reglas definitivas del corte 2.** BR-ACCESO-09 y BR-CARGA-18 a BR-CARGA-20 recogen los escenarios del corte 2, y T080 las completa antes de implementarlas.
3. **Las pantallas del corte 2.** Las pantallas P1 a P4 del corte 1 ya existen en `src/`, y las del corte 2 se escriben con T080 y siguientes.
