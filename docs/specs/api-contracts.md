# Contratos de la API (índice)

> **Regla de oro.** `src/servicios/api.ts` del Front llama solo a estas rutas. Cualquier cambio de una ruta se refleja aquí y en [`docs/03-api/contrato.md`](../03-api/contrato.md) antes de implementarse, en una solicitud de integración (pull request, PR) del Front que cita el PR de la spec viva del Back que la cambia.

> **Estado 2026-10-28.** Contrato escrito antes del código, con las reglas `BR-` numeradas en las specs vivas del Back (fase 1, tareas T011 a T015). Ninguna ruta existe todavía.

Este archivo es el índice corto del contrato de la API, que sigue el estilo de transferencia de estado representacional (representational state transfer, REST). Los cuerpos, las respuestas, las reglas y los errores de cada ruta están en [`docs/03-api/contrato.md`](../03-api/contrato.md), y las reglas `BR-` numeradas, en la spec viva de cada funcionalidad del Back. Esas specs son `specs/features/acceso/acceso.spec.md` (BR-ACCESO-01 a BR-ACCESO-09), `specs/features/periodo/periodo.spec.md` (BR-PERIODO-01 a BR-PERIODO-04), `specs/features/carga-export/carga-export.spec.md` (BR-CARGA-01 a BR-CARGA-20) y `specs/features/r17/r17.spec.md` (BR-R17-01 a BR-R17-10).

## Principios globales

- La base de las rutas es `/api`, y el Front la llama siempre por ruta relativa, gracias a la reescritura de rutas al mismo origen de su `vercel.json` (ADR-004).
- La sesión viaja en la cookie `abet_sesion` (HttpOnly, Secure, SameSite=Lax, 12 horas). No hay cabecera `Authorization` ni token en el cuerpo.
- El rol (PROFESOR o COORDINADOR) y las secciones al alcance del usuario se leen de la base en cada petición.
- Todo error tiene la forma `{ "detail": "mensaje" }`, en español para la persona que usa la pantalla, sin valores leídos, códigos de estudiante ni nombres. Una ruta de sección o de carga fuera del alcance del usuario responde 403 con «La sección no está a su cargo.».
- Las secciones y las cargas se identifican por los enteros `seccion_id` y `carga_id` que devuelve la propia API.
- Solo datos inventados mientras `GUARDIA_DATOS_INVENTADOS=1`.

## Rutas

| Método | Ruta | Sesión | Descripción | Historia | Reglas | Corte |
| --- | --- | --- | --- | --- | --- | --- |
| POST | `/api/sesion` | No | Iniciar sesión con contraseña asignada | US-05 | BR-ACCESO-02 a BR-ACCESO-05 | 1 |
| GET | `/api/sesion` | Sí | Usuario actual | US-05 | BR-ACCESO-06 | 1 |
| DELETE | `/api/sesion` | Opcional (propuesta) | Cerrar sesión | US-05 | BR-ACCESO-06 | 1 |
| GET | `/api/secciones?periodo=2026-2` | Sí | Secciones al alcance del usuario, cada una con su campo `estado` | US-06 | BR-PERIODO-01, BR-PERIODO-04 y BR-ACCESO-07 | 1 |
| POST | `/api/secciones/{seccion_id}/cargas` | Sí | Subir el export y cargarlo en una transacción (solo el profesor asignado en el corte 1) | US-07 a US-14, US-21 | BR-CARGA-01 a BR-CARGA-17, BR-CARGA-18 (corte 2), BR-PERIODO-02 y BR-ACCESO-08 | 1 |
| GET | `/api/cargas/{carga_id}` | Sí | Constancia de una carga | US-16, US-19 | BR-R17-10 y BR-ACCESO-08 | 1 |
| GET | `/api/cargas/{carga_id}/r17.xlsx` | Sí | R-17 con la hoja «Constancia», solo de cargas en estado PUBLICADA | US-15, US-16 | BR-R17-01 a BR-R17-09 y BR-ACCESO-08 | 1 |
| GET | `/api/cargas?seccion_id={seccion_id}` | Sí | Cargas al alcance del usuario | US-19 | BR-CARGA-20 | 2 |
| POST | `/api/secciones/{seccion_id}/cargas?reemplaza={carga_id}` | Sí | Reemplazar la carga publicada (profesor en su sección, coordinador en cualquiera) | US-18 | BR-CARGA-19 | 2 |
| POST | `/api/sesion/codigo` | No | Pedir el código de acceso al correo | US-20 | BR-ACCESO-09 | 2 |

Las reglas que no pertenecen a una sola ruta viven en las mismas specs vivas. BR-ACCESO-01 fija el esquema `acceso` y los usuarios de prueba, BR-PERIODO-03 los datos inventados del periodo 2026-2 y BR-PERIODO-01 y BR-PERIODO-02 la comprobación de la configuración al arrancar la API.

## Cómo se cambia una ruta

1. Se cambia la spec viva de la funcionalidad en el Back, con su regla `BR-`.
2. Se cambia esta tabla y la sección de la ruta en `docs/03-api/contrato.md`.
3. Se escribe la prueba que falla, en el Back y, si cambia una pantalla, en el Front.
4. Recién entonces se implementa.

## Pruebas

Los escenarios de aceptación de estas rutas viven en `specs/001-mvp-carga-r17/aceptacion/*.feature` del Back, y sus pasos en `tests/aceptacion/pasos/`, que los leen desde esa carpeta. La prueba de humo (recorrido mínimo de punta a punta que confirma que el sistema desplegado responde) con Playwright recorre `POST /api/sesion`, `GET /api/secciones`, `POST /api/secciones/{seccion_id}/cargas` y `GET /api/cargas/{carga_id}/r17.xlsx` con el export que trae el 5 en la fila 3, contra el entorno Preview (vista previa) de Vercel y nunca en Production (producción), como valor provisional de J-09. La sección 10 de `docs/03-api/contrato.md` comprueba en los dos sentidos que los mensajes literales del contrato y los de los escenarios coinciden.

## Lo que todavía NO está

1. **El código.** Ninguna ruta existe en el Back ni en `src/servicios/api.ts`, así que la comprobación con el esquema OpenAPI de la sección 10 de `docs/03-api/contrato.md` espera a la fase 3.
2. **La revisión del contrato.** Las reglas numeradas y este índice esperan la auditoría de la fase 1 (T019) y la revisión de Jefferson en sus PR.
3. **Los casos que `docs/03-api/contrato.md` deja abiertos** en su sección «Lo que el contrato no cubre todavía», entre ellos las respuestas 403 y 404 para un recurso ajeno (BR-ACCESO-08) y el plazo del reemplazo (D-11).
4. **Las reglas definitivas del corte 2.** BR-CARGA-18 a BR-CARGA-20 y BR-ACCESO-09 recogen los escenarios del corte 2, y T080 las completa antes de implementarlas.
