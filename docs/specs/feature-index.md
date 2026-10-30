# Índice de features

> **Estado 2026-10-30.** Las funcionalidades del corte 1 están implementadas en local y `audit.md` del Back las cruza con sus pruebas; la línea `Verification` de las specs vivas lleva fecha. El corte 2 sigue sin implementar. Los nombres y los prefijos son los que fija `specs/README.md` del Back.

Cada feature es la carpeta de su spec viva en `specs/features/` de ABET-ULIMA-Back. «Pantallas que sirve» nombra las pantallas de [`01-arquitectura/frontend.md`](../01-arquitectura/frontend.md), y la columna «Spec» da la ruta relativa al Back. Todas las historias del producto mínimo viable (minimum viable product, MVP) viven además en `specs/001-mvp-carga-r17/spec.md`, y sus escenarios en los siete `.feature` de `specs/001-mvp-carga-r17/aceptacion/`. Uno de ellos, `varias_secciones.feature`, prueba las reglas de `acceso` y de `carga-export` con un profesor que dicta tres secciones de dos asignaturas.

| Feature | Reglas | Pantallas que sirve | Estado | Spec |
| --- | --- | --- | --- | --- |
| acceso | BR-ACCESO-01 a BR-ACCESO-09 | P1 Ingreso (`Ingreso.tsx`) y la regla de visibilidad de todas | en revisión (contrato escrito para US-04, US-05 y US-06; US-20 del corte 2 en BR-ACCESO-09, que completa T080) | `specs/features/acceso/acceso.spec.md` |
| periodo | BR-PERIODO-01 a BR-PERIODO-04 | P2 Mis secciones (`MisSecciones.tsx`) | en revisión (contrato escrito para US-03 y el listado de US-06) | `specs/features/periodo/periodo.spec.md` |
| carga-export | BR-CARGA-01 a BR-CARGA-20 | P3 Subir export (`SubirExport.tsx`), P4 Resultado de la carga (`ResultadoCarga.tsx`) y P5 Cargas (`Cargas.tsx`) | en revisión (contrato escrito para US-07 a US-14; US-18, US-19 y US-21 del corte 2 en BR-CARGA-18 a BR-CARGA-20, que completa T080) | `specs/features/carga-export/carga-export.spec.md` |
| r17 | BR-R17-01 a BR-R17-10 | P4 Resultado de la carga (`ResultadoCarga.tsx`) | en revisión (contrato escrito para US-15 y US-16) | `specs/features/r17/r17.spec.md` |

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

Un matiz va entre paréntesis, como «implementada (solo hoja Cursos de Carrera)».

## Lo que todavía NO está

1. **La verificación a mano.** Las cuatro specs vivas traen su línea `Verification` con fecha del 2026-10-30, y queda abierta T062, la prueba en el navegador que Jefferson cumple con la guía de `audit.md`.
2. **Las reglas definitivas del corte 2.** BR-ACCESO-09 y BR-CARGA-18 a BR-CARGA-20 recogen los escenarios del corte 2, y T080 las completa antes de implementarlas.
3. **Las pantallas del corte 2.** Las pantallas P1 a P4 del corte 1 ya existen en `src/`, y las del corte 2 se escriben con T080 y siguientes.
