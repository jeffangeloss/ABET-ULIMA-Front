# Contratos de la API (índice)

> **Regla de oro.** `src/servicios/api.ts` del Front llama solo a estas rutas. Cualquier cambio de una ruta se refleja aquí y en [`docs/03-api/contrato.md`](../03-api/contrato.md) antes de implementarse, en una solicitud de integración (pull request, PR) del Front que cita el PR de la spec viva del Back que la cambia.

> **Cambio del 2026-11-21 (propuesta, pendiente de reaprobación de Jefferson).** Las rutas 13 a 16 de la spec 005 pasan a trabajar por indicador de desempeño (performance indicator, PI). La ruta 13 suma el hallazgo y el tipo de registro de cada PI, y las rutas 14 a 16 llevan el arreglo `indicadores`, con la causa y la acción de cada PI rotuladas como oportunidad de mejora o buena práctica según el semáforo (sección 13 de `docs/03-api/contrato.md`). La spec 006 de la programación docente no agrega rutas. **Estado 2026-11-18.** La sección 12 de `docs/03-api/contrato.md` fija la forma definitiva de la ruta 12 de la spec 004 del Back (T011), antes de su código. **Estado 2026-11-17.** Las siete rutas del corte 1 existen en el Back desde el 2026-10-30. La sección 7 de `docs/03-api/contrato.md` fija la forma definitiva del reemplazo, la lista de cargas y la confirmación de la sección del corte 2 (T080), antes de su código, y el código de acceso por correo espera a T018. **Estado 2026-10-28.** Contrato escrito antes del código, con las reglas `BR-` numeradas en las specs vivas del Back (fase 1, tareas T011 a T015).

Este archivo es el índice corto del contrato de la API, que sigue el estilo de transferencia de estado representacional (representational state transfer, REST). Los cuerpos, las respuestas, las reglas y los errores de cada ruta están en [`docs/03-api/contrato.md`](../03-api/contrato.md), y las reglas `BR-` numeradas, en la spec viva de cada funcionalidad del Back. Esas specs son `specs/features/acceso/acceso.spec.md` (BR-ACCESO-01 a BR-ACCESO-10), `specs/features/periodo/periodo.spec.md` (BR-PERIODO-01 a BR-PERIODO-04), `specs/features/carga-export/carga-export.spec.md` (BR-CARGA-01 a BR-CARGA-20), `specs/features/r17/r17.spec.md` (BR-R17-01 a BR-R17-10) y `specs/features/resultados/resultados.spec.md` (BR-RESULTADOS-01 a BR-RESULTADOS-11).

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
| POST | `/api/secciones/{seccion_id}/cargas` | Sí | Subir el export (.xlsx, .csv o .xls) y cargarlo en una transacción (solo el profesor asignado en el corte 1) | US-07 a US-14, US-21, US-27 a US-32 y US-36 (spec 003) | BR-CARGA-01 a BR-CARGA-17, BR-CARGA-18 (corte 2), BR-PERIODO-02 y BR-ACCESO-08 | 1 |
| GET | `/api/cargas/{carga_id}` | Sí | Constancia de una carga, con `hoja` nula en un export de texto | US-16, US-19, US-34 (spec 003) | BR-R17-10 y BR-ACCESO-08 | 1 |
| GET | `/api/cargas/{carga_id}/r17.xlsx` | Sí | R-17 con la hoja «Constancia», solo de cargas en estado PUBLICADA | US-15, US-16 | BR-R17-01 a BR-R17-09 y BR-ACCESO-08 | 1 |
| GET | `/api/cargas?seccion_id={seccion_id}` | Sí | Cargas al alcance del usuario, con `seccion_id` opcional | US-19 | BR-CARGA-20 y BR-ACCESO-07 | 2 |
| POST | `/api/secciones/{seccion_id}/cargas?reemplaza={carga_id}` | Sí | Reemplazar la carga publicada (profesor en su sección, coordinador en cualquiera) | US-18 | BR-CARGA-19 y BR-ACCESO-08 | 2 |
| POST | `/api/sesion/codigo` | No | Pedir el código de acceso al correo | US-20 | BR-ACCESO-09 | 2 |
| GET | `/api/resultados?periodo=2026-2` | Sí | Logros por resultado del estudiante (student outcome, SO) de las secciones al alcance, ruta 12 del contrato | US-37 a US-44 (spec 004) | BR-RESULTADOS-01 a BR-RESULTADOS-11, BR-ACCESO-07 y BR-ACCESO-10 | spec 004 |
| GET | `/api/cargas/{carga_id}/indicadores` | Sí | Cifras, semáforo, hallazgo y tipo de registro de cada PI de una carga publicada, ruta 13 del contrato (propuesta, cambio del 2026-11-21) | US-45 y US-46 (spec 005) | BR-MEJORA-NN (propuesta) y BR-ACCESO-08 | spec 005 |
| GET | `/api/cargas/{carga_id}/mejora` | Sí | Declaración vigente y borrador con un elemento por PI, el estado PROPUESTA derivado de cada PI declarado y `puede_editar`, ruta 14 del contrato (propuesta, cambio del 2026-11-21) | US-47, US-48 y US-54 (spec 005) | BR-MEJORA-NN (propuesta) y BR-ACCESO-07 | spec 005 |
| PUT | `/api/cargas/{carga_id}/mejora/borrador` | Sí | Guardar el borrador de la causa y la acción de cada PI, con una sola versión por carga y sin responsable, plazo ni estado, ruta 15 del contrato (propuesta, cambio del 2026-11-21) | US-47, US-48 y US-53 (spec 005) | BR-MEJORA-NN (propuesta) y BR-ACCESO-08 | spec 005 |
| POST | `/api/cargas/{carga_id}/mejora/declaracion` | Sí | Declarar una versión del borrador, completa en cada PI con calificaciones y que quepa en los recuadros A y B del R-17, ruta 16 del contrato (propuesta, cambio del 2026-11-21) | US-47 y US-49 a US-53 (spec 005) | BR-MEJORA-NN (propuesta) y BR-ACCESO-08 | spec 005 |

La ruta 7 suma, con la spec 005 (propuesta), un 409 para una carga publicada sin declaración, y con el cambio del 2026-11-21 compone los recuadros A y B con un párrafo por PI. La sección 13.6 de `docs/03-api/contrato.md` lo describe. La tabla de la sección 2 de ese contrato y su sección 10 se ajustan al aprobar la spec 005 (tarea T011).

Las reglas que no pertenecen a una sola ruta viven en las mismas specs vivas. BR-ACCESO-01 fija el esquema `acceso` y los usuarios de prueba, BR-ACCESO-10 la sesión que exige cada router con datos y la lista cerrada de rutas públicas, BR-PERIODO-03 los datos inventados del periodo 2026-2 y BR-PERIODO-01 y BR-PERIODO-02 la comprobación de la configuración al arrancar la API.

## Cómo se cambia una ruta

1. Se cambia la spec viva de la funcionalidad en el Back, con su regla `BR-`.
2. Se cambia esta tabla y la sección de la ruta en `docs/03-api/contrato.md`.
3. Se escribe la prueba que falla, en el Back y, si cambia una pantalla, en el Front.
4. Recién entonces se implementa.

## Pruebas

Los escenarios de aceptación de estas rutas viven en `specs/001-mvp-carga-r17/aceptacion/*.feature` del Back, para los exports .csv y .xls y la constancia sin hoja en `specs/003-exports-blackboard/aceptacion/exports_blackboard.feature`, y para la ruta 12 en `specs/004-reportes-docente/aceptacion/*.feature`, y sus pasos en `tests/aceptacion/pasos/`, que los leen desde esa carpeta. La prueba de humo (recorrido mínimo de punta a punta que confirma que el sistema desplegado responde) con Playwright recorre `POST /api/sesion`, `GET /api/secciones`, `POST /api/secciones/{seccion_id}/cargas` y `GET /api/cargas/{carga_id}/r17.xlsx` con el export que trae el 5 en la fila 3, contra el entorno Preview (vista previa) de Vercel y nunca en Production (producción), como valor provisional de J-09. La spec 004 suma a esa prueba de humo la pantalla P6, que lee `GET /api/resultados` después de la subida de la 410 (T043). La sección 10 de `docs/03-api/contrato.md` comprueba en los dos sentidos que los mensajes literales del contrato y los de los escenarios de las specs 001, 003 y 004 coinciden.

## Lo que todavía NO está

1. **La revisión del contrato.** Las reglas numeradas y este índice esperan la auditoría de la fase 1 (T019) y la revisión de Jefferson en sus PR.
2. **Los casos que `docs/03-api/contrato.md` deja abiertos** en su sección «Lo que el contrato no cubre todavía», entre ellos las respuestas 403 y 404 para un recurso ajeno (BR-ACCESO-08) y el plazo del reemplazo (D-11).
3. **El código de acceso por correo.** BR-CARGA-18 a BR-CARGA-20 quedan definitivas con T080 (2026-11-17), y BR-ACCESO-09 espera a T018, el dominio y la cuenta de Resend de Jefferson, así que `POST /api/sesion/codigo` todavía no existe.
