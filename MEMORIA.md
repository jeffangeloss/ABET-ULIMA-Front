# Memoria de ABET-ULIMA-Front

Este archivo es la memoria de trabajo del repositorio. Lo lee primero cualquier persona o agente que retome el trabajo, y se actualiza en el mismo commit de cada cambio (`AGENTS.md`, regla 2). El hook `pre-commit` y el check `pruebas` rechazan un cambio que no lo actualiza.

## Cómo se usa

1. Antes de empezar, leer «Punto actual».
2. Al terminar un cambio y antes del commit, actualizar «Punto actual» y agregar una entrada al comienzo del «Registro» con la plantilla de abajo.
3. Una entrada anterior no se borra ni se reescribe. Una corrección se registra como entrada nueva que cita la anterior por su fecha y título.
4. El commit de cada entrada se encuentra con `git log -- MEMORIA.md`.
5. Nunca se copian credenciales, datos personales ni nombres o códigos de estudiantes reales.

## Punto actual

- **Fecha**: 2026-10-29
- **Rama de trabajo**: `docs/002-capstone` (spec 002, apilada sobre `feat/001-mvp-carga-r17`, solo en local); el corte 1 sigue en `feat/001-mvp-carga-r17`, solo en local y sobre `docs/plan-mvp` (PR #2), hasta que Jefferson fusione los PR #1 y #2 y autorice el empuje
- **Versión publicada**: ninguna (`VERSION` = 0.0.0)
- **Último cambio**: contrato 11.5 y ADR-007 ajustados con la estructura de ocho R-17 reales de PIA (en local), pendiente de aprobación
- **En curso**: el corte 1 en el Back (la demo de la carga con el R-17 y los escenarios del profesor con varias secciones)
- **Siguiente paso**: Jefferson aprueba la spec 002 del Back; hasta entonces las secciones de Capstone de estos documentos son propuesta, salvo D-14. El corte 1 sigue como antes
- **Bloqueos**: la API del Back todavía no existe; SonarQube Cloud y Snyk esperan que Jefferson importe los repos en sus consolas (`docs/devops.md` del Back)
- **Repos relacionados**: `jeffangeloss/ABET-ULIMA-Back` (API, specs y base)

## Plantilla de una entrada

```
### AAAA-MM-DD HH:MM (Lima) · <rama> · <título corto>
- Quién: persona o agente; subagentes que participaron y qué verificó cada uno
- Qué cambió: archivos y efecto
- Por qué: historia (US-NN), regla (BR-XXX-NN) o pedido
- Lo que debe hacer, cómo se probó: comando y resultado
- Lo que no debe hacer, cómo se probó: caso negativo, comando y resultado
- Correcciones: errores encontrados y cómo se resolvieron
- Cómo se reporta: PR, CHANGELOG, audit.md o constancia
- Pendiente y siguiente paso
```

## Registro

### 2026-11-02 15:09 (Lima) · feat/001-mvp-carga-r17 · Corte 1 aprobado para develop
- Quién: Jefferson aprueba en el chat («Sí, fusiónalo») fusionar el corte 1 en `develop`. Claude Code, sin subagentes, comprueba los checks y escribe esta entrada.
- Qué cambió: solo esta memoria. Después de este commit, el PR #3 entra a `develop` con rebase.
- Por qué: llevar el corte 1 a `develop`, con todos sus checks aprobados.
- Lo que debe hacer, cómo se probó: con a698d71, el quality gate de SonarQube Cloud del PR #3 pasa, igual que `pruebas`, `secretos` y GitGuardian.
- Lo que no debe hacer, cómo se probó: la CI no corre scripts de instalación (`npm ci --ignore-scripts`), y el proyecto del Front en SonarQube Cloud sigue privado, porque su API no lo muestra sin sesión.
- Correcciones: ninguna.
- Cómo se reporta: esta entrada y el PR #3 del Front.
- Pendiente y siguiente paso: rebasar `docs/002-capstone` sobre el `develop` nuevo. Siguen T062, la decisión sobre el 403 frente al 404, la enmienda de la constitución del Back (Playwright para Node), la aprobación de la spec 002, Neon y Vercel.

### 2026-11-02 10:26 (Lima) · feat/001-mvp-carga-r17 · CI del Front con npm ci --ignore-scripts por SonarQube Cloud
- Quién: Jefferson aprueba en el chat («Sí, corrígelo») corregir la nota C de seguridad que SonarQube Cloud da al PR #3. Claude Code, sin subagentes, confirma el hallazgo, hace el cambio y escribe esta entrada.
- Qué cambió: `.github/workflows/ci.yml` (`npm ci --ignore-scripts`, con el comentario que explica por qué) y `CHANGELOG.md`.
- Por qué: la anotación del check de SonarQube Cloud en el PR #3 apunta a la línea 29 de `.github/workflows/ci.yml`, el `npm ci` que corre sin `--ignore-scripts`. Es el mismo caso que el `--no-build` de uv en el Back.
- Lo que debe hacer, cómo se probó: en un worktree limpio, `npm ci --ignore-scripts` instala 122 paquetes, `npm test` da 76 pruebas aprobadas en 8 archivos, `npm run build` compila y `bash scripts/preflight.sh` sale sin fallas.
- Lo que no debe hacer, cómo se probó: ningún paquete corre scripts de instalación en la CI. En `package-lock.json` solo `fsevents` declara uno (`hasInstallScript`), y ese paquete se instala únicamente en macOS, así que la CI de Linux no pierde nada.
- Correcciones: ninguna.
- Cómo se reporta: esta entrada, `CHANGELOG.md` y el PR #3 del Front.
- Pendiente y siguiente paso: el análisis nuevo de SonarQube Cloud debe confirmar que la nota de seguridad del PR #3 vuelve a A. Siguen T062, la decisión sobre el 403 frente al 404, la enmienda de la constitución del Back (Playwright para Node), Neon y Vercel.

### 2026-10-30 14:52 (Lima) · feat/001-mvp-carga-r17 · Contrato del R-17 con X-Content-Type-Options: nosniff
- Quién: Jefferson aprueba en el chat («Sí, corrígelos») los dos arreglos de SonarQube Cloud del PR #3 del Back. Claude Code actualiza el contrato y escribe esta entrada. En el flujo de agentes del Back, el revisor de seguridad (modelo principal) revisa la prosa nueva del contrato y el verificador (Sonnet) corre Vitest y la revisión previa.
- Qué cambió: `docs/03-api/contrato.md` (las cabeceras de `GET /api/cargas/{carga_id}/r17.xlsx` suman `X-Content-Type-Options: nosniff`) y `CHANGELOG.md`.
- Por qué: BR-R17-06 del Back pide ahora esa cabecera por el hallazgo pythonsecurity:S5131 de SonarQube Cloud, y el contrato debe decir lo mismo que la API.
- Lo que debe hacer, cómo se probó: `npm test` da 76 pruebas aprobadas en 8 archivos y `bash scripts/preflight.sh` sale sin fallas. Solo cambian documentos.
- Lo que no debe hacer, cómo se probó: el contrato no cambia otra ruta ni otra cabecera, y antes de esta entrada el diff solo toca `docs/03-api/contrato.md` y `CHANGELOG.md`.
- Correcciones: ninguna en el Front.
- Cómo se reporta: esta entrada, `CHANGELOG.md` y el PR #3 del Front.
- Pendiente y siguiente paso: T062 para Jefferson, la decisión sobre el 403 frente al 404, la enmienda de la constitución del Back (Playwright para Node), Neon y Vercel.

### 2026-10-30 14:30 (Lima) · feat/001-mvp-carga-r17 · PR #1 y #2 fusionados en develop, ramas rebasadas y empujadas y PR #3 y #4 abiertos
- Quién: Jefferson autoriza en el chat «Sí, fusiona y empuja», con el pedido de fusionar los PR #1 y #2 en `develop`, empujar `feat/001-mvp-carga-r17` y `docs/002-capstone` en los dos repos y abrir sus PR a `develop` sin fusionarlos. Claude Code, sin subagentes, fusiona, rebasa, empuja, abre los PR y escribe esta entrada.
- Qué cambió: `develop` recibe los PR #1 y #2 con rebase. Esta rama se rebasa sobre `develop` desde el commit viejo de `docs/plan-mvp`, y `docs/002-capstone`, sobre el commit nuevo del contrato, porque GitHub reescribe los SHA al fusionar con rebase. Las dos suben con sus PR #3 y #4 a `develop`. En el repositorio solo cambia esta memoria.
- Por qué: el permiso de empujar que esperaba el «Punto actual» y el paso 5 («Aprobación») de la skill specs-back-front.
- Lo que debe hacer, cómo se probó: `git diff --quiet` entre la punta vieja y la nueva de cada rama sale sin diferencias, y `git merge-base --is-ancestor` confirma que esta rama contiene `develop` y que `docs/002-capstone` sale del contrato rebasado.
- Lo que no debe hacer, cómo se probó: ningún commit ni PR trae `Co-Authored-By` ni la firma de una herramienta (0 coincidencias), y lo que agregan las dos ramas no trae números de 8 cifras fuera de los inventados, de 99000000 a 99999999.
- Correcciones: el PR #2 chocaba con `develop` después de fusionar el #1 con rebase, y se rebasó sobre `develop` antes de fusionarlo, con el mismo árbol.
- Cómo se reporta: esta entrada y los PR #3 (corte 1) y #4 (spec 002, apilado sobre el #3), enlazados con los PR #3 y #4 del Back.
- Pendiente y siguiente paso: los checks de los PR #3 y #4 corren en GitHub. Siguen T062, la decisión sobre el 403 frente al 404, la enmienda de la constitución del Back (Playwright para Node), Neon y Vercel.

### 2026-10-30 13:41 (Lima) · feat/001-mvp-carga-r17 · Documentación del Front y auditoría del corte 1 (T063, T049 y T059)
- Quién: Claude Code como integrador. El documentador (Sonnet) actualiza `docs/` con P1 a P4 y el enlace al contrato. El revisor (modelo principal) detecta que la cabecera del contrato, el índice de funcionalidades y `docs/README.md` siguen con el estado del 2026-10-28. Este commit y sus ajustes los hace Sonnet.
- Qué cambió: `docs/01-arquitectura/frontend.md` (columna «Rutas que consume», P2 corregida contra el código y la prueba de humo descrita como existe), `docs/README.md`, `docs/03-api/contrato.md` y `docs/specs/feature-index.md` (estado del 2026-10-30), y `CHANGELOG.md`.
- Por qué: T063, y las auditorías de fase T049 y T059 del plan, con `audit.md` del Back como cruce de historia, escenario y prueba.
- Lo que debe hacer, cómo se probó: `npm test` da 76 pruebas aprobadas en 8 archivos y `bash scripts/preflight.sh` sale sin fallas. `npm run build` compiló en la entrada del 2026-10-30 13:20 y este commit solo cambia documentos.
- Lo que no debe hacer, cómo se probó: ya no queda «Playwright para Python» fuera de la constitución ni del historial de `MEMORIA.md` y `CHANGELOG.md` (`grep -rIniE "playwright.{0,40}python"`).
- Correcciones: la cabecera del contrato decía que la API no existe, el índice decía que ninguna funcionalidad está implementada y `docs/README.md` nombraba la rama `docs/plan-mvp` como la del trabajo. Las tres frases quedan al día.
- Cómo se reporta: esta entrada, `CHANGELOG.md` y `audit.md` del Back.
- Pendiente y siguiente paso: T062 para Jefferson, con la guía de `audit.md` del Back, y la decisión sobre el 403 frente al 404. El despliegue (fase 7) espera Neon, Vercel y el permiso de empujar. La enmienda de la constitución del Back (Playwright para Node) la decide Jefferson.

### 2026-10-30 13:20 (Lima) · feat/001-mvp-carga-r17 · ADR-006 con Playwright para Node (T053)
- Quién: Claude Code como integrador, con los agentes de la fase 5 del Back (arnés, escenarios, cobertura en Sonnet; refutación y corrección con el modelo principal). Ninguno escribe en este repositorio. El integrador corrige la documentación y verifica el Front.
- Qué cambió: `docs/00-vision/adr/ADR-006-historias-gherkin-auditadas.md` y `docs/01-arquitectura/frontend.md`, que ahora nombran Playwright para Node y `e2e/humo.spec.ts` como la prueba de humo, y `CHANGELOG.md`.
- Por qué: T053 queda cubierta por la prueba de humo que el Front ya trae, y los documentos decían Playwright para Python.
- Lo que debe hacer, cómo se probó: `npm test` da 76 aprobadas en 8 archivos, `npm run build` compila y `bash scripts/preflight.sh` sale sin fallas.
- Lo que no debe hacer, cómo se probó: el cambio no toca `src/`, `tests/` ni `e2e/`, y `git diff --stat` muestra solo dos archivos de documentación.
- Correcciones: ninguna.
- Cómo se reporta: esta entrada y `CHANGELOG.md`.
- Pendiente y siguiente paso: la prueba de humo comprueba el nombre del archivo y la firma PK, y las cifras 60,0 / 60,0 / 70,0 las comprueba el Back en `r17_constancia.feature`. Falta que corra en la CI y contra Preview (T075). Siguen la auditoría de la fase 6 y el despliegue.

### 2026-10-30 12:05 (Lima) · feat/001-mvp-carga-r17 · Front del corte 1, pantallas P1 a P4 con su prueba de humo (T040 a T045)
- Quién: Claude Code como integrador, con seis subagentes. El constructor del Front (Sonnet) escribe T040 a T045, y el constructor de la API (modelo principal, esfuerzo medio) escribe en el Back las rutas que estas pantallas consumen. El integrador de la unión (Sonnet) agrega la prueba de humo con Playwright y la corre contra la API real. Tres verificadores (seguridad con esfuerzo alto, contrato y pantallas con Sonnet) dejan dos hallazgos de severidad media y varios bajos, el corrector (Sonnet) los cierra y el reverificador (Sonnet) aprueba con tres bajos. Antes de aceptar el trabajo, el integrador corre en este árbol `npm test`, `npm run build`, `bash scripts/preflight.sh` y `bash scripts/probar_preflight.sh`, comprueba que `node_modules/`, `dist/` y `test-results/` quedan ignorados (`playwright-report/` ya figura en `.gitignore`) y lee los informes de los seis agentes. Una salvedad del constructor, que ejecuta `git add -N .` y lo deshace con `git restore --staged .`, deja el índice como estaba.
- Qué cambió: proyecto con Vite, React, TypeScript y Tailwind (`package.json`, `package-lock.json` con versiones exactas, `vite.config.ts` con el proxy de `/api`, `tsconfig.json`, `index.html`), `src/` con `servicios/api.ts` como única puerta HTTP, `servicios/tipos.ts` y las pantallas P1 Ingreso, P2 Mis secciones, P3 Subir export y P4 Resultado, 76 pruebas en `tests/` con las respuestas del contrato solo allí, la prueba de humo en `e2e/`, `playwright.config.ts` y `scripts/e2e.sh`, la regla 7 de `scripts/preflight.sh` con sus 9 casos en `scripts/probar_preflight.sh`, el job de Node en `ci.yml` (con `actions/setup-node` v7.1.0 fijada por SHA), Dependabot de npm con espera de 14 días, `docs/01-arquitectura/frontend.md` y `docs/03-api/contrato.md`.
- Por qué: US-05 a US-16 en su parte de pantallas, T040 a T045 del plan del corte 1.
- Lo que debe hacer, cómo se probó: `npm test` da 76 de 76 en 8 archivos, `npm run build` pasa (`tsc --noEmit` y `vite build`), `bash scripts/preflight.sh` sale sin fallas y `bash scripts/probar_preflight.sh` da 28 bien y 0 mal. La prueba de humo con `scripts/e2e.sh` da 2 de 2 contra la API y Vite reales, en la corrida del reverificador. `docente410` recorre P1 a P4 con «11 filas leídas, 10 aceptadas y 1 rechazada», el rechazo de la fila 3 del PI 5.2, el aviso del PI 5.3 y el R-17 descargado con firma de xlsx. Las 5 capturas quedan fuera del repositorio, en `ABET_SIS_MED/demo_corte1/capturas/`.
- Lo que no debe hacer, cómo se probó: la regla 7 falla si un archivo de `src/` usa `localStorage`, `sessionStorage` o `indexedDB`, una URL absoluta, otro canal HTTP, `fetch` fuera de `api.ts` o una ruta literal que no empiece con `/api`, y sus casos negativos pasan sin mostrar el contenido. Las pruebas comprueban que el navegador no guarda nada de la sesión. `docente.varias` recibe el 403 «La sección no está a su cargo.» al pedir la 410 de otra asignatura. Las capturas no muestran contraseñas, nombres ni valores leídos, y `test-results/` queda vacío e ignorado.
- Correcciones: P3 oculta el control nativo «Choose File» y ofrece el botón propio «Elegir archivo», con dos pruebas. El 403 único frente al 404 queda como propuesta en `contrato.md` (tabla 3.2, rutas 5 a 7 y sección 9.2), y el Front no maneja 404 mientras la API no lo emita. El contrato suma como propuesta los textos que la API emite y no estaban registrados.
- Cómo se reporta: esta entrada, `CHANGELOG.md` y el registro de tareas en `specs/001-mvp-carga-r17/tasks.md` del Back. Sin PR.
- Pendiente y siguiente paso: Hallazgos bajos abiertos tras la reverificación. (1) El candado de la cuenta se mantiene durante la verificación Argon2id y `now()` es la hora de inicio de la transacción, así que un fallo que espera detrás de un ingreso correcto puede quedar fechado antes y no contar para el límite; se corrige con `clock_timestamp()`. (2) Sigue abierta la decisión de Jefferson entre 403 y 404 para una sección o una carga inexistente; con 404, P3 y P4 deben ofrecer volver a P2. (3) La prueba de humo no corre en la CI y exige una API recién arrancada, y la ADR-006 todavía habla de Playwright para Python aunque se usó el de Node. La condición de la API recién arrancada para la prueba de humo queda documentada en su spec. Siguen pendientes las pruebas de aceptación ejecutables (T050 a T053), la auditoría de la fase 6 (T049 queda abierta) y el despliegue, que espera el proyecto de Neon, el de Vercel y el permiso de Jefferson. El orden de foco con teclado y el contraste no se revisaron en el navegador.

### 2026-10-29 09:15 (Lima) · docs/002-capstone · Spec 002 ajustada con la estructura de R-17 reales de PIA

- **Quién**: Jefferson adjunta el 2026-10-29 ocho R-17 reales de Capstone con «aquí hay cursos capstone como PIA». Claude Code coordina el flujo. Un agente en Sonnet extrae la estructura sin copiar datos personales, otro en Sonnet revisa la privacidad, un agente de ajuste edita los documentos, otro en Sonnet revisa el resultado, y esta entrada y el commit los hace Claude Code. Se verificó que el diff no trae nombres ni códigos reales y que `preflight.sh` no falla.
- **Qué cambió**: `docs/03-api/contrato.md` (apartado 11.5) y `docs/00-vision/adr/ADR-007-plantilla-proyectos-segunda-subida.md` reflejan la hoja «Cursos Capstone» con su cabecera, la tabla de 224 filas y los valores provisionales de D-16, D-17, D-25 y D-29.
- **Por qué**: la spec 002 del Back se ajusta con la evidencia de los R-17 reales de PIA, y el Front debe decir lo mismo.
- **Lo que debe hacer, cómo se probó**: `bash scripts/preflight.sh` en este worktree termina sin fallas.
- **Lo que no debe hacer, cómo se probó**: ningún dato personal entra al repositorio, según la revisión de privacidad del diff, y las copias temporales de los R-17 se borraron.
- **Correcciones**: ninguna en esta entrada.
- **Cómo se reporta**: este registro y el PR de `docs/002-capstone`.
- **Pendiente y siguiente paso**: Jefferson responde D-16, D-17, D-25 y D-29 y aprueba la spec 002 del Back.

### 2026-10-29 08:47 (Lima) · docs/002-capstone · D-14 decidida, menciones de los cursos Capstone (en local)

- **Quién**: Jefferson decide, en el chat del 2026-10-29 y en nombre de la carrera, que los cursos Capstone son 450025 «Formulación y Evaluación de Proyectos Sostenibles», 450024 «Proyecto de Ingeniería Aplicada I» y 450026 «Proyecto de Ingeniería Aplicada II». Claude Code solo registra la decisión en la documentación, sin subagentes.
- **Qué cambió**: `docs/01-arquitectura/frontend.md` (punto 3 de lo abierto) y `docs/00-vision/adr/ADR-007-plantilla-proyectos-segunda-subida.md` (punto 1 del cierre) nombran los tres cursos y pasan D-14 a decidida. El contrato y el resto de los documentos no nombran cursos y no cambian.
- **Por qué**: D-14 de la spec 002 del Back, que registra la misma fecha y las palabras de Jefferson.
- **Lo que debe hacer, cómo se probó**: `bash scripts/preflight.sh` en este worktree termina con «Revisión previa sin fallas (todo)».
- **Lo que no debe hacer, cómo se probó**: `git diff --stat` toca solo esos dos documentos y `MEMORIA.md`, sin cambiar rutas, campos ni pantallas.
- **Correcciones**: ninguna en esta entrada.
- **Cómo se reporta**: este registro y el PR de `docs/002-capstone`.
- **Pendiente y siguiente paso**: Jefferson aprueba la spec 002 del Back; D-15 a D-29 siguen abiertas.

### 2026-10-29 08:30 (Lima) · docs/002-capstone · Documentación del sistema para la spec 002 de Capstone (en local)

- **Quién**: Claude Code con un flujo de agentes (wf_3c294f14-761). Tres redactores en Sonnet (profesor, coordinador y evidencia) escriben 46 candidatas de historia. Tres auditores en Sonnet verifican la necesidad, el solapamiento y el tamaño, y la verificabilidad contra la base. Un crítico de arquitectura propone las decisiones. Un redactor en Sonnet escribe la spec del Back y otro los documentos del Front. Dos revisores (constructor; hechos y forma) hallan una falla de severidad alta y cuatro medias. Un corrector las cierra y un reverificador aprueba con tres hallazgos bajos. Quedan 25 historias (US-01 a US-25), FR-001 a FR-029, SC-001 a SC-013, D-14 a D-29 y las decisiones J-11 a J-16 renumeradas. Un intento anterior del flujo se detuvo a los pocos minutos para bajar su costo (modelos y esfuerzo por etapa) y sus agentes no dejaron archivos. Claude Code integra el trabajo en dos commits locales y verifica antes de aceptarlo la renumeración, el Gherkin y la revisión previa.
- **Qué cambió**: `docs/00-vision/adr/ADR-007-plantilla-proyectos-segunda-subida.md` (nuevo) y su fila en el README de los ADR; la sección 8 de `docs/01-arquitectura/frontend.md`; la sección 11 de `docs/03-api/contrato.md` (propuesta, spec 002); la sección de la spec 002 en `docs/specs/feature-index.md`; y `CHANGELOG.md`. Las J de la spec 002 pasan de J-10 a J-15 a J-11 a J-16 en todos esos documentos, y las J-01 a J-09 y las D-14 a D-29 no cambian.
- **Por qué**: la spec 002 de Capstone del Back (`specs/002-capstone/`, rama `docs/002-capstone`), pedida por Jefferson como «Spec 002 aparte». Los libros de Excel que Jefferson adjunta traen datos reales y no entran al repositorio ni se citan.
- **Lo que debe hacer, cómo se probó**: `bash scripts/preflight.sh` pasa sin fallas en este worktree; el recuento de J-11 a J-16 por documento coincide con el de J-10 a J-15 antes del cambio.
- **Lo que no debe hacer, cómo se probó**: `grep -rn "J-10" docs` da 0, y ninguna J de la spec 001 ni ninguna D cambia de número.
- **Correcciones**: la colisión de J-10 con el respaldo del esquema `acceso` de la spec 001 se resuelve renumerando en el orden J-15, J-14, J-13, J-12, J-11, J-10. Todo lo de la spec 002 queda marcado como propuesta.
- **Cómo se reporta**: esta entrada, `CHANGELOG.md` y la entrada de la misma fecha en `MEMORIA.md` del Back.
- **Pendiente y siguiente paso**: la aprobación de Jefferson (fusión del PR o su «apruebo» en el chat), sus respuestas a D-14 a D-29 y J-11 a J-16, y los tres hallazgos bajos del reverificador. Nada de Capstone se implementa antes. Nada se empuja sin permiso de Jefferson.

### 2026-10-29 08:22 (Lima) · feat/001-mvp-carga-r17 · Contrato y documentos para el profesor con varias secciones
- Quién: Claude Code como integrador, con el trabajo de los subagentes del flujo wf_d0250dfb-fda, el mismo de la entrada de esta fecha en `MEMORIA.md` del Back. El agente escribir:escenarios redacta los cambios de `docs/`, y un corrector cierra los hallazgos que tocan el contrato y la fila de `SESION_SECRETO`. Tres verificadores y un reverificador revisan en solo lectura, y el reverificador aprueba. Antes de aceptar el trabajo, Claude Code corre `scripts/preflight.sh` del Front y compara los seis archivos cambiados con la lista del informe.
- Qué cambió: `docs/03-api/contrato.md` (dos mensajes nuevos de BR-CARGA-11, uno para otra sección de la misma asignatura y otro para otra asignatura, ambos marcados «(propuesta)», y la aclaración de que los mensajes del contrato salen de los textos entre «»); `docs/00-vision/adr/ADR-006-historias-gherkin-auditadas.md`, `docs/README.md`, `docs/specs/feature-index.md` y `docs/specs/workflow.md` (siete archivos `.feature` y la aprobación de la spec registrada en el Back); `docs/05-operacion/entornos-y-despliegue.md` (la fila de `SESION_SECRETO`); `CHANGELOG.md`.
- Por qué: el pedido de Jefferson del 2026-10-28 sobre el profesor que dicta varias secciones de varios cursos, con la aprobación «Sí, agrégalos», y los mensajes que `varias_secciones.feature` del Back necesita del contrato (BR-CARGA-11 y BR-ACCESO-08).
- Lo que debe hacer, cómo se probó: `bash scripts/preflight.sh` pasa sin fallas. La comprobación de la sección 10 del contrato, corrida por el agente en el Back, da 0 mensajes del contrato sin escenario y 0 de los escenarios sin contrato.
- Lo que no debe hacer, cómo se probó: el contrato no afirma como definitivo ningún texto nuevo, porque los dos mensajes y el de otro periodo quedan marcados «(propuesta)» hasta que Jefferson los confirme. El cambio no toca código, y `preflight.sh` no encuentra datos reales ni secretos.
- Correcciones: la fila de `SESION_SECRETO` decía que la base guarda el token con HMAC, lo que contradecía a BR-ACCESO-03, que guarda el SHA-256 del token sin clave. La fila ahora describe la clave de los intentos fallidos. La viñeta «Otra sección o periodo» de la sección 6 pasa a nombrar las dos formas de mensaje.
- Cómo se reporta: esta entrada y `CHANGELOG.md`, junto con el commit de los escenarios del Back.
- Pendiente y siguiente paso: Jefferson decide si el token de sesión se guarda con SHA-256 sin clave o con un HMAC, qué mensaje va cuando difieren a la vez la asignatura y la sección, y si el texto «El archivo corresponde a la sección 410 y usted eligió la 412» deja de ser propuesta. La fase 4, las pantallas P1 a P4 (T040 a T045), espera la API del Back.

### 2026-10-28 20:50 (Lima) · feat/001-mvp-carga-r17 · Contrato de la API con reglas BR y alineado con V1_09 (T015, en local)

- **Quién**: Claude Code con dos flujos de agentes, los mismos de la entrada de esta fecha en `MEMORIA.md` del Back (pista A). En la primera vuelta, un implementador escribe en el contrato los números BR reales; tres verificadores (consistencia, forma y refutación) encuentran que ADR-002 invertía el orden de la guardia y la huella, y un corrector lo cierra. En la segunda vuelta, un corrector alinea el contrato con V1_09 y un reverificador lo aprueba con seis hallazgos bajos. Claude Code repite la comprobación de la sección 10 y la revisión previa antes de aceptar el trabajo.
- **Qué cambió**: `docs/03-api/contrato.md` (reglas BR reales, el 429 contado en `acceso.intento_fallido` por el HMAC del correo, el cierre de sesión con `least()`, la huella antes del tope de 1 MB, el PI de los rechazos de estructura desde `rechazo_fila.pi_id` y la sección 9 con cinco puntos abiertos); `docs/specs/api-contracts.md` y `docs/specs/feature-index.md` (reglas reales y features «en revisión»); `docs/specs/workflow.md`; `docs/01-arquitectura/frontend.md` (textos «(propuesta)» y la excepción del rótulo del piloto); ADR-001, ADR-002, ADR-004 y ADR-005.
- **Por qué**: T015, que vive en el Front como en IQBF, y la regla del contrato antes del código. Jefferson aprueba la spec 001 en el chat el 2026-10-28 («Apruebo el plan»), y esta entrada lo registra en el Front.
- **Lo que debe hacer, cómo se probó**: la comprobación de la sección 10 de `contrato.md` da «0 mensajes del contrato sin escenario» y «0 mensajes de los escenarios sin contrato» contra los `.feature` del Back; `bash scripts/preflight.sh` pasa sin fallas.
- **Lo que no debe hacer, cómo se probó**: la prueba negativa de la sección 10 detecta un mensaje alterado en los dos sentidos; ninguna regla BR citada deja de existir en las specs vivas del Back; el grep de nombres viejos de V1_09 da 0.
- **Correcciones**: ADR-002 dice ahora que la guardia actúa antes de buscar la huella en la base o escribir nada; ADR-004 da J-03 por confirmada, y ADR-005 saca la tabla de estudiantes de `abet.medicion` de la carga.
- **Cómo se reporta**: esta entrada, `CHANGELOG.md` y la entrada de la misma fecha en `MEMORIA.md` del Back.
- **Pendiente y siguiente paso**: la comprobación con OpenAPI de la sección 10 espera la API (fase 3); la sección 10 no lee los ejemplos JSON; `entornos-y-despliegue.md` describe `SESION_SECRETO` sin la clave del HMAC de BR-ACCESO-05; quedan documentos vencidos (`docs/README.md`, `panorama.md`, ADR-002 y ADR-003) y siglas sin glosa que vienen de antes. Pasan a la vuelta de varias secciones.

### 2026-10-28 16:40 (Lima) · docs/plan-mvp · Documentación del sistema para el MVP

- **Quién**: Claude Code, con flujos de agentes. Cinco redactores escribieron la spec, los `.feature`, el plan y estos documentos con el esquema de IQBF. Cuatro revisores independientes (constructor, consistencia, hechos contra la base y estilo) hallaron 99 problemas, y dos vueltas de corrección los resolvieron, cada una cerrada por un verificador.
- **Qué cambió**: `docs/README.md`, `docs/00-vision/panorama.md`, `docs/00-vision/adr/` (ADR-001 a ADR-006, en estado Propuesta), `docs/01-arquitectura/frontend.md` (pantallas P1 a P5, cada una con sus historias), `docs/03-api/contrato.md`, `docs/05-operacion/entornos-y-despliegue.md` y `docs/specs/` (flujo de trabajo, índice de features y de la API). `docs/devops.md` deja de nombrar `VITE_API_BASE_URL`, porque el Front llama a la API por la ruta relativa `/api` que reescribe `vercel.json`.
- **Por qué**: pedido de Jefferson del 28/10/2026 («Dime el plan que implementaremos») con el esquema de specs de IQBF y las historias auditadas.
- **Lo que debe hacer, cómo se probó**: el verificador final confirma que los IDs US-01 a US-21, los nombres de las specs vivas y sus prefijos BR, las rutas, los mensajes y la forma de las respuestas coinciden con los `.feature` del Back. `bash scripts/preflight.sh --staged` pasa sin fallas.
- **Lo que no debe hacer, cómo se probó**: ningún ejemplo usa un dominio real; los correos de prueba son `@example.invalid` (barrido con grep del verificador) y no hay credenciales.
- **Correcciones**: la carpeta de la spec se llamaba `001-export-a-r17` y los prefijos de reglas no coincidían con el Back; un correo de ejemplo usaba el dominio de la universidad; el export sin sección declarada tenía tres comportamientos; todo quedó alineado con las resoluciones de la revisión.
- **Cómo se reporta**: PR de `docs/plan-mvp` a `develop`; su merge es la aprobación del plan.
- **Pendiente y siguiente paso**: decisiones D-01 a D-13 de la carrera y J-01 a J-09 de Jefferson, listadas en la spec del Back.

### 2026-10-28 14:55 (Lima) · chore/seguridad-y-memoria · Descarga de gitleaks solo por HTTPS

- **Quién**: Claude Code, tras el hallazgo de SonarQube Cloud en el PR #1 del Back («Not enforcing HTTPS here might allow for redirections to insecure websites», `.github/workflows/ci.yml:50`), que dejó la puerta de calidad en «C Security Rating on New Code».
- **Qué cambió**: el `curl` del job `secretos` lleva `--proto '=https' --tlsv1.2`, de modo que una redirección no puede llevar la descarga a HTTP. Corrige la entrada «Hook de memoria, secretos, SonarQube Cloud y Snyk» de esta misma fecha.
- **Por qué**: la suma SHA-256 ya detectaba un archivo alterado, pero la regla de SonarQube Cloud pide además que la descarga no salga de HTTPS.
- **Lo que debe hacer, cómo se probó**: la nueva corrida del PR debe dejar la puerta de calidad de SonarQube Cloud en verde y el job `secretos` en verde.
- **Lo que no debe hacer, cómo se probó**: con `--proto '=https'`, curl rechaza seguir una redirección a una dirección http.
- **Correcciones**: esta entrada corrige la anterior; la anterior no se edita.
- **Cómo se reporta**: el check de SonarQube Cloud y el job `secretos` del PR.
- **Pendiente y siguiente paso**: ninguno nuevo.

### 2026-10-28 14:15 (Lima) · chore/seguridad-y-memoria · Hook de memoria, secretos, SonarQube Cloud y Snyk

- **Quién**: Claude Code, a pedido de Jefferson, con la misma investigación verificada que el cambio del Back (SonarQube Cloud, Snyk, seguridad de GitHub en repos privados y skills de DevOps).
- **Qué cambió**: `.claude/settings.json` con el hook `Stop` que llama a `scripts/recordar_memoria.sh`; job `secretos` con gitleaks 8.30.1 y `.gitleaks.toml`; `.github/dependabot.yml`; `.sonarcloud.properties` y `.snyk`; excepción de la regla de memoria para los PR de Dependabot; sección «SonarQube Cloud, Snyk y secretos» en `docs/devops.md`.
- **Por qué**: que la memoria se actualice siempre, también dentro de las sesiones de Claude, y blindar el repositorio (pedido de Jefferson del 28/10/2026).
- **Lo que debe hacer, cómo se probó**: `bash scripts/probar_preflight.sh` da «19 bien, 0 mal», con los mismos casos del hook que en el Back, y `jq -e` confirma la declaración del hook.
- **Lo que no debe hacer, cómo se probó**: el hook bloquea con salida 2 un cambio o un archivo nuevo sin `MEMORIA.md`, y no bloquea dos veces seguidas.
- **Correcciones**: ninguna en esta entrada.
- **Cómo se reporta**: este registro, `CHANGELOG.md` («Sin publicar») y los checks `pruebas` y `secretos` del PR.
- **Pendiente y siguiente paso**: Jefferson importa el repo en SonarQube Cloud y Snyk; decidir si `secretos` pasa a check requerido.

### 2026-10-28 13:05 (Lima) · main · Arranque del repositorio

- **Quién**: Claude Code, a pedido de Jefferson («Implementa la branch develop … quiero que apliques la misma configuración para tener un correcto versionado»). Configuración copiada de `IQBF-ULIMA_Front` y `IQBF-ULIMA_Back`, leída con `gh api` (protección de `main` y `develop`, `ci.yml`, `release.yml` y `docs/devops.md`).
- **Qué cambió**: primer commit en `main` con `README.md`, `AGENTS.md`, `CLAUDE.md`, `MEMORIA.md`, `CHANGELOG.md`, `VERSION`, `.gitignore`, `docs/devops.md`, `.github/workflows/ci.yml` (checks `pruebas` y `flujo`), `.github/workflows/release.yml`, la plantilla de PR, `scripts/preflight.sh`, `scripts/probar_preflight.sh` y `scripts/hooks/pre-commit`. Después se crea `develop` desde `main`, queda como rama por defecto, y se protegen las dos ramas como en IQBF (`main` con `pruebas` y `flujo`, `develop` con `pruebas`, PR obligatorio, sin empujes forzados ni borrado).
- **Por qué**: versionado con `develop` y `main` como en IQBF, y memoria de cada cambio para que un agente retome el trabajo con certeza (pedido de Jefferson del 28/10/2026).
- **Lo que debe hacer, cómo se probó**: `bash scripts/probar_preflight.sh` da «15 bien, 0 mal». Pasan el commit y el PR con `MEMORIA.md`, el xlsx y el csv inventados con códigos 99 dentro de `tests/datos_inventados/`, `.env.example` sin valores, la referencia `${{ secrets.X }}` y el repositorio limpio.
- **Lo que no debe hacer, cómo se probó**: en la misma corrida fallan, como se espera, el commit y el PR sin `MEMORIA.md`, un xlsx fuera de `tests/datos_inventados/`, un xlsx y un csv con un código que no empieza con 99, un `.env` versionado, una cadena de conexión con clave y un token con valor, y ninguno de esos mensajes muestra el secreto falso.
- **Correcciones**: las mismas del Back, porque el script de revisión es idéntico en los dos repositorios, incluida la exclusión de `scripts/probar_preflight.sh` del escaneo de secretos, que trae un secreto falso a propósito.
- **Cómo se reporta**: este registro, `CHANGELOG.md` («Sin publicar») y el check `pruebas` de cada PR.
- **Pendiente y siguiente paso**: comprobar en GitHub la rama por defecto y la protección; abrir la documentación del sistema en `docs/` cuando el plan del MVP quede aprobado; agregar SonarQube Cloud y Snyk cuando existan los tokens.
