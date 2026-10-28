# Índice de features

> **Estado 2026-10-28.** Ninguna funcionalidad (feature) está implementada. Los nombres y los prefijos son los que fija `specs/README.md` del Back, y sus specs vivas se escriben en la fase 1 de contrato.

Cada feature es la carpeta de su spec viva en `specs/features/` de ABET-ULIMA-Back. «Pantallas que sirve» nombra las pantallas de [`01-arquitectura/frontend.md`](../01-arquitectura/frontend.md), y la columna «Spec» da la ruta relativa al Back. Todas las historias del MVP viven además en `specs/001-mvp-carga-r17/spec.md`, y sus escenarios en `specs/001-mvp-carga-r17/aceptacion/`.

| Feature | Reglas | Pantallas que sirve | Estado | Spec |
| --- | --- | --- | --- | --- |
| acceso | BR-ACCESO | P1 Ingreso (`Ingreso.tsx`) y la regla de visibilidad de todas | en revisión (US-04, US-05 y US-06; US-20 en el corte 2) | `specs/features/acceso/acceso.spec.md` |
| periodo | BR-PERIODO | P2 Mis secciones (`MisSecciones.tsx`) | en revisión (US-03 y el listado de US-06) | `specs/features/periodo/periodo.spec.md` |
| carga-export | BR-CARGA | P3 Subir export (`SubirExport.tsx`), P4 Resultado de la carga (`ResultadoCarga.tsx`) y P5 Cargas (`Cargas.tsx`) | en revisión (US-07 a US-14; US-18, US-19 y US-21 en el corte 2) | `specs/features/carga-export/carga-export.spec.md` |
| r17 | BR-R17 | P4 Resultado de la carga (`ResultadoCarga.tsx`) | en revisión (US-15 y US-16) | `specs/features/r17/r17.spec.md` |

US-01, US-02 y US-17 son de plataforma (migración en Neon, rol `abet_app` y despliegue en Vercel), no abren una spec viva y se verifican en `specs/001-mvp-carga-r17/audit.md`. No tienen pantalla, aunque la prueba de humo de US-17 recorre P1 a P4.

## Estados

IQBF no define su vocabulario de estados. Aquí se usa una escala cerrada, en este orden.

| Estado | Significa |
| --- | --- |
| en revisión | Sus historias están en una spec cuyo PR sigue sin merge |
| aprobada | El PR de la spec tiene su merge (la fusión) en `develop` |
| contrato listo | Sus reglas `BR-` y sus rutas están en la spec viva y en `api-contracts.md` |
| implementada | Su código está en `develop` con sus pruebas aprobadas |
| verificada | `audit.md` cruza sus historias con sus pruebas y la spec viva trae su línea `Verification` con fecha |

Un matiz va entre paréntesis, como «implementada (solo hoja Cursos de Carrera)».

## Lo que todavía NO está

1. **Las specs vivas.** Ninguna de las cuatro rutas de la columna «Spec» existe todavía.
2. **La numeración de las reglas.** Los prefijos BR-ACCESO, BR-PERIODO, BR-CARGA y BR-R17 están fijados, y sus números llegan con las specs vivas.
3. **Las pantallas.** Los archivos `.tsx` de la columna «Pantallas que sirve» se escriben en la fase 4.
