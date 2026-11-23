# Cambios

Los cambios visibles de este repositorio quedan aquí. El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y las versiones siguen [SemVer](https://semver.org/lang/es/). La versión vigente está en `VERSION`.

## [Sin publicar]

### Agregado

- Contrato propuesto de la spec 008 del Back en la sección 15 de `docs/03-api/contrato.md`, con la ruta 18 de periodos, el campo `alcance` de la sesión, el periodo de la ruta 8, la ruta 17 con el alcance del curso y el campo condicional `agregados` de la ruta 12, las rutas 17 y 18 marcadas (propuesta) en la tabla de la sección 2 y la sección 12 de `docs/01-arquitectura/frontend.md`.

## [0.3.0] - 2026-11-23

### Agregado

- Etapa A de la spec 007 en las pantallas: P2 dice el estado y el siguiente paso de cada sección, también la última carga rechazada (US-59); P3 muestra «Antes de subir» con los nombres de columna de la sección (US-60); P4 de una carga rechazada da «Qué corregir» (US-61); P4 dice «Esta carga no tiene R-17.» y P3 avisa qué pasa con un reemplazo rechazado (US-62); y un menú con la pantalla actual marcada y rótulos por rol (US-63).
- La documentación del sistema suma la propuesta de la spec 007 del Back: P2 a P4 con el siguiente paso, «Antes de subir» y «Qué corregir», rótulos por rol, la ruta 17 y P7 «Avance del registro» de la coordinación, en borrador para la aprobación de Jefferson.

## [0.2.0] - 2026-11-23

### Agregado

- Documentación del sistema de la spec 005 del Back, las oportunidades de mejora en la carga, aprobada por Jefferson en el chat el 2026-11-18. Son ADR-009, las rutas 13 a 16 en la sección 13 de `docs/03-api/contrato.md` y en `docs/specs/api-contracts.md`, P4 con el semáforo, el formulario de causas y acciones y la navegación con el botón atrás en la sección 10 de `docs/01-arquitectura/frontend.md` y la fila `mejora` de `docs/specs/feature-index.md`. Ningún código cambia.
- P6 «Mis logros por SO» con los logros de cada PI de las secciones del usuario agrupados por SO, la barra de cada fila en HTML con `aria-hidden` y la meta marcada con una línea y con texto, el reparto por nivel, la marca provisional por sección, el R-17 de cada sección publicada y lo que no se mide escrito con texto. La abre el enlace «Ver mis logros por SO» de la cabecera y de P4, o «Ver los logros por SO de la carrera» para el coordinador (US-37 a US-44 de la spec 004, T040 a T042).
- `obtenerResultados()` en `api.ts` para `GET /api/resultados`, con sus tipos y las cifras con coma decimal de `formato.ts`.
- La prueba de humo `e2e/humo.spec.ts` suma P6, que compara sus cifras con el R-17 de la misma carga de la 410, y comprueba que el profesor ajeno no ve la 410 en su P6 (T043).
- Contrato definitivo de la ruta 12 `GET /api/resultados` de la spec 004 del Back (T011), con sus reglas BR-RESULTADOS-01 a BR-RESULTADOS-11 y BR-ACCESO-10, la sección 3.4 que reserva los porcentajes a la ruta 12, la cuenta de 7 caminos de OpenAPI y la carpeta de la spec 004 en la comprobación de mensajes, y la forma definitiva de P6 en la sección 9 de `docs/01-arquitectura/frontend.md`.
- Documentación del sistema de la spec 004 del Back, los logros del profesor por SO, aprobada por Jefferson en el chat el 2026-11-18. Son ADR-008, la ruta 12 `GET /api/resultados` en la sección 12 de `docs/03-api/contrato.md` y en `docs/specs/api-contracts.md`, la pantalla P6 «Mis logros por SO» en la sección 9 de `docs/01-arquitectura/frontend.md` y la fila `resultados` de `docs/specs/feature-index.md`. Ningún código cambia.
- P5 Cargas, con las secciones del usuario y sus cargas de la más reciente a la más antigua, la marca de la vigente y de la reemplazada, la huella corta, quién sube cada carga, «Ver constancia», «Descargar R-17» y «Reemplazar carga» en la publicada, para el profesor en su sección y el coordinador en cualquiera (US-18 y US-19, T085).
- P3 pregunta «La sección 410 ya tiene una carga publicada. ¿Desea reemplazarla?» ante el 409 con `carga_publicada` y reenvía el archivo con `?reemplaza=`, entra en modo reemplazo desde P5 y muestra el aviso del mismo archivo (US-18).
- P3 muestra la pregunta del 422 con `requiere_confirmacion` y reenvía el archivo con `confirmar_seccion=true` cuando el profesor confirma la sección (US-21).
- P4 muestra a qué carga reemplaza la carga y cuál la reemplaza, y la cabecera suma los botones «Mis secciones» y «Cargas».
- `api.ts` suma `listarCargas()`, las opciones `reemplaza` y `confirmarSeccion` de `subirExport()` y los campos `requiereConfirmacion` y `cargaPublicada` de `ErrorApi`.
- La prueba de humo `e2e/humo.spec.ts` suma el reemplazo en P5 de la carga con el error por el export correcto, con el R-17 guardado con el nombre que fija la API (T087 del Back).

### Cambiado

- El contrato de las rutas 13 a 16 y la pantalla P4 pasan a un registro por indicador, con oportunidades de mejora y buenas prácticas, en borrador para la aprobación de Jefferson.
- Las pantallas ya no muestran «Solo exports con códigos inventados (99000000 a 99999999)», porque D-10 queda decidida el 2026-11-19.
- El contrato precisa que el 200 del mismo archivo de la carga publicada manda aunque `reemplaza` nombre otra carga, porque la huella se busca antes que la carga vigente (BR-CARGA-19).
- El contrato de la API fija la forma definitiva de las rutas del corte 2, con el reemplazo de la carga publicada (`?reemplaza=`), la lista de cargas (`GET /api/cargas`), la confirmación de la sección (`confirmar_seccion=true` y `requiere_confirmacion`), `carga_publicada` en el 409 y `reemplaza_carga_id` y `reemplazada_por` en la constancia (T080 de la spec 001 del Back).
- `docs/05-operacion/entornos-y-despliegue.md` registra la versión 0.1.0 en Production, la decisión J-07 en Hobby y el entrenamiento de IA del equipo de Vercel, que sigue encendido (T079 y T070 de la spec 001 del Back).
- jsdom 30.1.3, vitest 5.0.5, vite 8.3.5 y `@vitejs/plugin-react` 6.2.1, todos con al menos 14 días publicados, en un solo cambio que reemplaza los PR de Dependabot #5, #6, #9 y #12. El bundle de producción sale idéntico al de `develop`.

## [0.1.0] - 2026-11-17

### Cambiado

- `VERSION` pasa a 0.1.0, la versión que ya declaran `package.json` y `package-lock.json` (T076 de la spec 001 del Back).
- P3 admite los tres formatos del export de Blackboard, `.xlsx`, `.csv` y `.xls`, en su selector, su etiqueta y su aviso, sin revisar el tipo, y P4 muestra «Sin hoja (export de texto)» cuando la constancia trae `hoja` nula (spec 003 del Back, US-33 y US-34).
- El contrato documenta los tres formatos, el texto dañado, el tope de 5 000 filas, el nivel «3.00», SIN_CALIFICACIONES, el texto nuevo de la sección sin declarar y `hoja` nula (spec 003, T011).
- Prueba de humo `e2e/humo_csv.spec.ts`, que sube el `.csv` inventado de la 410 y el `.xls` inventado de la 411 (spec 003, T042).
- La prueba de humo de Playwright corre también contra una vista previa de Vercel (T075), con `docente411` en el caso del 403, la clave de omisión de la protección solo en las peticiones del navegador y los resultados en la carpeta de `DIR_RESULTADOS`.
- ADR-001, ADR-002 (ahora `ADR-002-neon-us-east-1-datos-inventados.md`), el contrato, la arquitectura y `entornos-y-despliegue.md` con Neon en us-east-1 y PostgreSQL 18 (J-17), la protección de despliegues del Back y el traslado de `bd/` hecho.
- ADR-006 y arquitectura del Front con Playwright para Node (`e2e/humo.spec.ts`) como prueba de humo.
- Documentación del Front con las pantallas P1 a P4, el enlace al contrato y el estado del 2026-10-30 en el contrato, el índice de funcionalidades y `docs/README.md` (T063).

### Agregado

- `vercel.json` con la región iad1, junto a Neon en us-east-1 (J-17), y la reescritura de `/api/:path*` hacia el Back de Production desde el dominio de Production y hacia el alias de `develop` del Back desde cualquier otro dominio, con su prueba (T072).
- Ramas `main` y `develop` con la configuración de IQBF: `develop` por defecto, PR obligatorio, checks `pruebas` y `flujo`, sin empujes forzados ni borrado (`docs/devops.md`).
- CI con la revisión previa `scripts/preflight.sh` (datos inventados, secretos y memoria) y `release.yml`, que crea el tag y el Release desde este archivo.
- `MEMORIA.md` como memoria de trabajo, `AGENTS.md` con las reglas para personas y agentes, y el hook `pre-commit`.
- Hook `Stop` de Claude Code (`.claude/settings.json`) que no deja terminar un turno con cambios sin registrar en `MEMORIA.md`.
- Documentación del sistema para el MVP «del export de Blackboard al R-17 desde la base»: visión, ADR-001 a ADR-006, pantallas, contrato de la API, entornos y flujo de specs, aprobada por Jefferson en el chat el 2026-10-28.
- Contrato de la API con las reglas BR reales de las specs vivas del Back, alineado con V1_09.
- Contrato y documentos para el profesor con varias secciones de varios cursos, con dos mensajes de BR-CARGA-11 marcados «(propuesta)» y los siete `.feature` del Back.
- Front del corte 1 con Vite, React, TypeScript y Tailwind, las pantallas P1 a P4 (ingreso, mis secciones, subir export y resultado de la carga), `src/servicios/api.ts` como única puerta HTTP, 76 pruebas con Vitest y Testing Library, la prueba de humo con Playwright (`e2e/`, `scripts/e2e.sh`), la regla 7 de `scripts/preflight.sh` y el job de Node en la CI.

### Seguridad

- Job `secretos` con gitleaks 8.30.1 fijado por suma SHA-256, y `.gitleaks.toml`.
- Dependabot para las acciones de GitHub, `.sonarcloud.properties` para SonarQube Cloud y `.snyk` con excepciones que vencen.
- El contrato de `GET /api/cargas/{carga_id}/r17.xlsx` suma `X-Content-Type-Options: nosniff`, que el Back agrega por un hallazgo de SonarQube Cloud (BR-R17-06).
- La CI instala las dependencias con `npm ci --ignore-scripts`, así que ningún paquete corre sus scripts de instalación, por el hallazgo de seguridad que SonarQube Cloud marca en esa línea del PR #3. En `package-lock.json` solo `fsevents`, que se instala únicamente en macOS, trae uno.
