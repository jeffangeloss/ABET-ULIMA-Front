# Memoria de ABET-ULIMA-Front

Este archivo es la memoria de trabajo del repositorio. Lo lee primero cualquier persona o agente que retome el trabajo, y se actualiza en el mismo commit de cada cambio (`AGENTS.md`, regla 2). El hook `pre-commit` y el check `pruebas` rechazan un cambio que no lo actualiza.

## Cómo se usa

1. Antes de empezar, leer «Punto actual».
2. Al terminar un cambio y antes del commit, actualizar «Punto actual» y agregar una entrada al comienzo del «Registro» con la plantilla de abajo.
3. Una entrada anterior no se borra ni se reescribe. Una corrección se registra como entrada nueva que cita la anterior por su fecha y título.
4. El commit de cada entrada se encuentra con `git log -- MEMORIA.md`.
5. Nunca se copian credenciales, datos personales ni nombres o códigos de estudiantes reales.

## Punto actual

- **Fecha**: 2026-11-18
- **Rama de trabajo**: `docs/004-reportes-docente`, que sale de `develop` (2a22fb3) y se actualiza con `develop` (f10fdc3) después del corte 2, con la documentación del sistema de la spec 004 del Back, en el PR #18
- **Versión publicada**: 0.1.0, con el tag `v0.1.0` sobre 0d693b9 de `main` y su Release, en Production de Vercel desde el 2026-11-17
- **Último cambio**: la actualización de esta rama con `develop`, que trae el corte 2 de la spec 001 del Back en este repositorio (PR #19), sin cambios en la documentación de la spec 004
- **En curso**: el registro de la aprobación de la spec 004, que Jefferson da en el chat de la sesión principal el 2026-11-18, y la fusión del PR #18 después del PR #27 del Back. Los escenarios pendientes de US-17 siguen en `audit.md` del Back, y el del humo con el 5 en la fila 3 corre `e2e/humo.spec.ts` de este repositorio contra la vista previa de `develop` con `ABET_SIS_MED/herramientas_neon/humo_preview_con_error.sh`, que Jefferson corre en su terminal
- **Siguiente paso**: con la aprobación registrada, fusionar el PR #18 después del PR #27 del Back con la CI en verde; con la spec fusionada, T011 deja definitivo el contrato de la ruta 12. Sigue la prueba de humo del corte 2 contra la vista previa de `develop` (T099 del Back)
- **Bloqueos**: US-20 (código de acceso por correo en P1) espera a T018, el dominio y la cuenta de Resend de Jefferson; D-32 a D-34 de la spec 004 esperan a la Coordinación de Ambiental o a la Oficina de Calidad; Snyk espera que Jefferson importe los repos en su consola (`docs/devops.md` del Back); el entrenamiento de IA del equipo de Vercel lo apaga Jefferson en Team Settings, Data Preferences (T070 del Back)
- **Repos relacionados**: `jeffangeloss/ABET-ULIMA-Back` (versión 0.1.0, con el tag `v0.1.0` sobre 7325231 de `main`, el corte 2 fusionado en `develop` con su PR #28 y la spec 004 en su rama `docs/004-reportes-docente`, en el PR #27)

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

### 2026-11-18 14:21 (Lima) · docs/004-reportes-docente · Actualización con develop tras el corte 2
- Quién: la sesión principal transmite la aprobación de la spec 004 que Jefferson da en su chat y pide poner al día esta rama y la del Back sin forzar el empuje. Claude Code, sin subagentes, integra `origin/develop` (f10fdc3) con un merge, resuelve `CHANGELOG.md` y `MEMORIA.md` y escribe esta entrada.
- Qué cambió: la rama trae el corte 2 de la spec 001 del Back en este repositorio (PR #19). `CHANGELOG.md` junta la línea de la spec 004 con las del corte 2, y `MEMORIA.md` intercala por fecha las entradas de las dos ramas y junta «Punto actual». La documentación de la spec 004 no cambia.
- Por qué: `develop` avanza después del rebase de las 07:44, y el PR #18 vuelve a chocar en `CHANGELOG.md` y `MEMORIA.md`. El permiso de empuje forzado de la mañana cubre solo aquel rebase, así que esta vez la rama integra `develop` con un merge.
- Lo que debe hacer, cómo se probó: `git merge-tree --write-tree origin/develop HEAD` no da conflictos, `git diff --stat origin/develop...HEAD` muestra solo la documentación de la spec 004, `CHANGELOG.md` y esta memoria, y `bash scripts/preflight.sh --pr origin/develop` termina sin fallas.
- Lo que no debe hacer, cómo se probó: `git diff origin/develop HEAD -- docs/` muestra solo la documentación de la spec 004, `contrato.md` y `frontend.md` no repiten ningún número de sección ni de ruta, y cada entrada de `MEMORIA.md` que trae `develop` sigue completa según una comparación bloque por bloque.
- Correcciones: ninguna.
- Cómo se reporta: esta entrada y el PR #18, que recibe el merge sin empuje forzado.
- Pendiente y siguiente paso: registrar la aprobación de la spec 004 y fusionar el PR #18 después del PR #27 del Back, con la CI en verde.

### 2026-11-18 07:44 (Lima) · docs/004-reportes-docente · PR #18 abierto y rama rebasada sobre develop con el cierre de la spec 003
- Quién: Jefferson autoriza en el chat empujar esta rama y abrir su PR («Sí, empuja y abre») y, después, rebasarla y empujarla con `--force-with-lease` («Sí, rebásalas»). Claude Code, sin subagentes, abre el PR #18, que cita el PR #27 del Back, rebasa el commit de la spec 004 sobre `develop` (2a22fb3), resuelve el conflicto de `MEMORIA.md` y escribe esta entrada.
- Qué cambió: el commit «Documentación del sistema para la spec 004 de los logros por SO» queda sobre el cierre de la spec 003 del Back en el Front (PR #17) con otro SHA. En `MEMORIA.md`, su entrada queda encima de la del 2026-11-17 23:30 por orden de fecha, y «Punto actual» junta lo pendiente de US-17 que trae `develop` con la spec 004. Ningún archivo de `docs/`, `src/` ni de las pruebas cambia.
- Por qué: `develop` recibe el PR #17 después de abrir el PR #18, y los dos cambian «Punto actual» y el comienzo del «Registro», así que el PR #18 choca con `develop`. `docs/devops.md` pide fusionar los PR con rebase.
- Lo que debe hacer, cómo se probó: `git merge-tree --write-tree origin/develop HEAD` no da conflictos, `git diff --stat origin/develop...HEAD` muestra solo la documentación de la spec 004, `CHANGELOG.md` y esta memoria, y `bash scripts/preflight.sh --pr origin/develop` termina sin fallas.
- Lo que no debe hacer, cómo se probó: `git diff eda19d1 HEAD -- docs/ CHANGELOG.md` sale vacío, así que la documentación de la spec 004 no cambia con el rebase, y cada entrada de `MEMORIA.md` que trae `develop` sigue completa, según una comparación bloque por bloque con `git show origin/develop:MEMORIA.md`.
- Correcciones: «Punto actual» del commit anterior todavía dice que la rama espera el permiso para empujar, y esta entrada lo deja al día.
- Cómo se reporta: esta entrada y el PR #18, que recibe la rama con `--force-with-lease`, sin cambio en `CHANGELOG.md`.
- Pendiente y siguiente paso: la aprobación de la spec 004 del Back (T004); con ella, T011 de la spec 004 deja definitivo el contrato de la ruta 12.

### 2026-11-18 07:30 (Lima) · feat/001-corte-2 · Actualización con develop tras el cierre de la spec 003
- Quién: la sesión principal de Jefferson avisa que `docs/003-cierre` ya está en `develop` (2a22fb3, PR #17), con Jefferson de acuerdo. Claude Code, en la sesión lateral del corte 2 y sin subagentes, fusiona `develop` en esta rama, resuelve el choque de esta memoria, corre las comprobaciones y escribe esta entrada.
- Qué cambió: la rama trae de `develop` la entrada del cierre de la spec 003 en esta memoria, el único archivo que cambia el PR #17. «Punto actual» queda con el estado de la rama fusionada y su PR #19 abierto, y el «Registro» conserva las entradas de los dos lados en orden de hora, la más reciente primero.
- Por qué: la regla de actualizar la rama con `develop` antes de fusionar su PR, porque el PR #17 y esta rama cambian las mismas líneas de esta memoria.
- Lo que debe hacer, cómo se probó: `npm test` da 10 archivos y 139 pruebas aprobadas, `npm run build` compila sin errores, `bash scripts/probar_preflight.sh` da 28 bien y 0 mal y `bash scripts/preflight.sh` no da fallas.
- Lo que no debe hacer, cómo se probó: fuera de esta memoria, la rama fusionada no difiere de d074842 (`git diff --stat d074842 -- . ':!MEMORIA.md'` sale vacío), y la compilación da los mismos `index-0T_CrYEk.js` e `index-5cA2jNHI.css`, así que la vista previa recibe el mismo código. En el árbol no queda ningún marcador de choque.
- Correcciones: «Punto actual» decía que la rama seguía sin empujar, y su PR #19 está abierto desde las 06:10 del 2026-11-18.
- Cómo se reporta: esta entrada y el PR #19, cuando Jefferson autorice empujar la actualización.
- Pendiente y siguiente paso: fusionar jeffangeloss/ABET-ULIMA-Back#28 y después el PR #19, la prueba de humo contra la vista previa de `develop` (T099), P1 con el código por correo (T083, que espera a T018) y la versión 0.2.0, que publica Jefferson (T089).

### 2026-11-18 00:15 (Lima) · feat/001-corte-2 · P5 Cargas, reemplazo y confirmación de la sección en P3 (T085 de la spec 001 del Back)
- Quién: Claude Code, en la sesión lateral del corte 2. Un subagente con el modelo de la sesión y esfuerzo medio implementa T085 con las pruebas de Vitest escritas antes que el código, sobre el contrato del commit anterior, y no hace commit. Claude Code revisa su diff completo, corrige el texto de P4 que el mismo subagente señala como posiblemente falso, cambia el nombre con que la prueba de humo guarda el R-17, corre las comprobaciones y escribe esta entrada. Otro subagente, con el modelo de la sesión y esfuerzo alto, revisa en solo lectura el diff de los dos repositorios y no halla defectos de severidad alta ni media.
- Qué cambió: `src/pantallas/Cargas.tsx` (P5) es nuevo, y cambian `SubirExport.tsx` (P3, con el modo reemplazo, la pregunta del 409 y la del 422), `ResultadoCarga.tsx` (P4), `App.tsx` (vista de P5 y botones de la cabecera), `servicios/api.ts`, `servicios/tipos.ts` y `servicios/formato.ts`, con sus pruebas en `tests/` y el nuevo `tests/pantallas/Cargas.test.tsx`. `e2e/humo.spec.ts` suma el reemplazo en P5, `docs/01-arquitectura/frontend.md` describe las pantallas del corte 2 y `docs/03-api/contrato.md` precisa que el 200 del mismo archivo manda aunque `reemplaza` nombre otra carga.
- Por qué: T085 y T087 de la spec 001 del Back, para US-18 (reemplazo), US-19 (lista de cargas) y US-21 (confirmación de la sección), con BR-CARGA-18 a 20. P1 no cambia, porque el código por correo (US-20) espera a T018.
- Lo que debe hacer, cómo se probó: `npx vitest run` da 10 archivos y 139 pruebas aprobadas, frente a 9 y 85 en `develop`. Las tres pruebas que citan los pasos de aceptación del Back existen con su nombre exacto. `npx tsc --noEmit` y `npm run build` terminan sin errores y `bash scripts/preflight.sh` sin fallas. La prueba de humo, con `bash scripts/e2e.sh e2e/humo.spec.ts` contra `scripts/api_local.sh --sin-https` del Back y Vite en 5173, da 3 passed, y en P5 la carga nueva queda «Vigente, reemplaza a la carga 1» y la anterior «Reemplazada por la carga 2». El R-17 que descarga pasa `herramientas_neon/revisar_r17.py` con 0 fallas, 33 filas y 63,6 %, 63,6 % y 72,7 %.
- Lo que no debe hacer, cómo se probó: P5 no muestra el código de `motivo`, nombres de estudiantes, valores leídos ni rutas, aunque la respuesta simulada los traiga de más («no muestra nombres de estudiantes, valores leídos ni rutas locales»). «No» cierra cada pregunta sin ninguna petición, un 409 sin `carga_publicada` no pregunta por el reemplazo y P3 nunca ofrece escribir el número de la sección confirmada. Ningún archivo de `src/` guarda nada en el navegador ni llama a `fetch` fuera de `api.ts`.
- Correcciones: el texto de P4 para una carga REEMPLAZADA decía que su sucesora «es la publicada», lo que deja de ser cierto si la sucesora también se reemplaza, y pasa a «La carga 11 la reemplaza, así que esta carga no tiene R-17.» (propuesta). La prueba de humo guardaba el R-17 como `R017_reemplazo_410.xlsx`, y `revisar_r17.py` marcaba dos fallas porque coteja la franja PROVISIONAL con el nombre, así que ahora lo guarda con el nombre que fija la API, en `DIR_CAPTURAS/reemplazo/`. La revisión independiente deja un hallazgo de severidad baja aceptado, porque P3 no vuelve a ofrecer el reemplazo si otra persona reemplaza la carga mientras pregunta, y la pantalla muestra el 409 tal cual.
- Cómo se reporta: esta entrada, el CHANGELOG, la sección «Corte 2» de `specs/001-mvp-carga-r17/audit.md` del Back, las capturas de `ABET_SIS_MED/demo_corte2/` y el PR de esta rama, cuando Jefferson autorice empujar.
- Pendiente y siguiente paso: P1 con el código por correo (T083, que espera a T018), la prueba de humo contra la vista previa de `develop` después de fusionar las dos ramas (T099) y la versión 0.2.0, que publica Jefferson (T089).

### 2026-11-17 23:57 (Lima) · docs/004-reportes-docente · Documentación del sistema para la spec 004 de los logros del profesor por SO (en local)
- Quién: Claude Code, en la misma sesión que escribe la spec 004 del Back. La entrada de la misma fecha en `MEMORIA.md` del Back nombra los subagentes que auditan las historias y las decisiones técnicas. En el Front no participa ningún subagente, y Claude Code escribe los documentos a partir de la spec y de la crítica de arquitectura.
- Qué cambió: `docs/00-vision/adr/ADR-008-logros-por-pi-en-el-sistema.md` es nuevo, en propuesta, con su fila y su deuda en el índice de ADR. `docs/03-api/contrato.md` suma la fila de la ruta 12, una nota en la sección 3.4, un punto en la sección 9 y la sección 12 con `GET /api/resultados`. `docs/specs/api-contracts.md` suma su fila, `docs/01-arquitectura/frontend.md` suma la sección 9 con P6 «Mis logros por SO» y `docs/specs/feature-index.md` suma la fila `resultados`. Ningún archivo de `src/` ni de las pruebas cambia.
- Por qué: FR-017 de la spec 004 y el método del proyecto piden el contrato y la pantalla en el Front antes de implementar, y la regla 3 de `AGENTS.md` pide que cada pantalla nombre las historias que la justifican, que son US-37 a US-44.
- Lo que debe hacer, cómo se probó: la comprobación de la sección 10 del contrato, corrida desde `ABET_SIS_MED/wt` con `BACK=back-004 FRONT=front-004`, da 0 mensajes de los escenarios sin contrato, también con la carpeta de la spec 004 sumada a su lectura. `bash scripts/preflight.sh --staged` termina sin fallas con esta memoria.
- Lo que no debe hacer, cómo se probó: la misma comprobación da 1 mensaje del contrato sin escenario, el de la marca de entorno de T077, que ya daba `develop` antes del cambio, así que los textos nuevos, todos con la marca (propuesta), no suman ninguno. La ruta 12 y la sección 12 no chocan con la ruta 11 y la sección 11 de la spec 002, ni la sección 9 de `frontend.md` con su sección 8. Las secciones 1 a 7 de `frontend.md`, que edita el corte 2 en otra sesión, no cambian.
- Correcciones: el borrador numeraba 11 la ruta nueva, que la spec 002 de la rama `docs/002-capstone` ya usa, y pasa a 12.
- Cómo se reporta: esta entrada, `CHANGELOG.md` y el PR de esta rama, que cita el de la spec 004 del Back, cuando Jefferson autorice empujar.
- Pendiente y siguiente paso: la aprobación de Jefferson y T011, que deja definitivos la sección 3.4, la cuenta de caminos de OpenAPI de la sección 10 y la lectura de la carpeta de la spec 004 en la comprobación de mensajes. El mensaje de la marca de entorno sin escenario queda para su propia corrección.

### 2026-11-17 23:30 (Lima) · docs/003-cierre · Cierre de la spec 003 del Back en el Front (T053 y T061)
- Quién: Jefferson aprueba en el chat empezar a cerrar lo que queda de la versión 0.1.0 («Sí, empieza»). Claude Code corre en un worktree de `develop` la parte del Front de T053 y escribe esta entrada. En el flujo de agentes wf_844270c1-e83, un verificador (Sonnet, esfuerzo medio) corre `tests/pantallas/SubirExport.test.tsx` con `--reporter=verbose` y otro (Sonnet, esfuerzo medio) revisa la memoria y el registro de cambios de los commits de la spec 003 de este repositorio. Claude Code compara sus cifras con los registros de la corrida antes de aceptarlas.
- Qué cambió: esta memoria, con «Punto actual» al día. El código, las pruebas y `CHANGELOG.md` no cambian.
- Por qué: T053 y T061 de la spec 003 del Back piden la suite del Front, la revisión previa y la memoria y el registro de cambios de cada repositorio, y «Punto actual» seguía con la rama de Dependabot en curso.
- Lo que debe hacer, cómo se probó: sobre `develop` (7f6c72b), `npm ci --ignore-scripts --prefer-offline` instala el lockfile, `npm test` da 9 archivos y 85 pruebas aprobadas, `npm run build` compila sin errores, `bash scripts/probar_preflight.sh` da 28 bien y 0 mal y `bash scripts/preflight.sh` no da fallas. `npx vitest run tests/pantallas/SubirExport.test.tsx --reporter=verbose` da 18 de 18, y entre ellas están las tres que cubren los escenarios de US-33. La CI de `develop` termina en verde en 7f6c72b (corrida 44209561524).
- Lo que no debe hacer, cómo se probó: la compilación da los mismos `index-D0rec67o.js` e `index-5cA2jNHI.css` que la entrada del 2026-11-17 18:25, así que la vista previa y Production no reciben código distinto. Los seis commits de la spec 003 y de su salida a `develop` en este repositorio tocan `MEMORIA.md`, y `CHANGELOG.md` falta solo en b75de56 y 706139d, que no traen un cambio visible.
- Correcciones: ninguna en este repositorio. En el Back, el verificador del historial encuentra que `[0.1.0]` no nombraba la sección que sale del nombre de un export de texto (US-30), y esa línea se agrega allí.
- Cómo se reporta: esta entrada, `specs/003-exports-blackboard/audit.md` del Back y el PR de esta rama, cuando Jefferson autorice empujar.
- Pendiente y siguiente paso: los escenarios pendientes de US-17 y T062 en `audit.md` del Back, y D-30 (T005 de la spec 003), que espera a Stefanny Montaño o a la Oficina de Calidad.

### 2026-11-17 23:25 (Lima) · feat/001-corte-2 · Contrato de la API del corte 2 (T080 de la spec 001 del Back)
- Quién: Claude Code, en una sesión lateral que abre la sesión principal de Jefferson para implementar el corte 2 de la spec 001 (US-18 a US-21, tareas T080 a T088 y T099), sin subagentes en este cambio. La spec 001 ya está aprobada, así que el corte 2 no pide otra aprobación.
- Qué cambió: `docs/03-api/contrato.md` fija las rutas 8 y 9 con su cuerpo, sus casos y sus errores, el campo `confirmar_seccion` de la ruta 5, que solo admite `true`, el 422 con `requiere_confirmacion` y el 409 con `carga_publicada` (sección 3.1), los campos `reemplaza_carga_id` y `reemplazada_por` de la constancia, `sha256_corto` y `motivo` de la lista de cargas y los seis caminos que el esquema OpenAPI debe tener sin US-20. `docs/specs/api-contracts.md` pone al día su estado, sus reglas y lo que todavía no existe.
- Por qué: T080 y la regla del contrato de `docs/specs/api-contracts.md`, que pide cambiar el contrato antes de implementar la ruta. La pregunta de la sección reemplaza desde el corte 2 al 422 del corte 1 (D-02), así que el contrato ya no cita aquel texto.
- Lo que debe hacer, cómo se probó: la comprobación de la sección 10 del contrato, contra los `.feature` de la rama `feat/001-corte-2` del Back, da 0 mensajes de los escenarios sin contrato, y todos los textos nuevos del contrato están en un escenario o llevan «(propuesta)». `npx vitest run` sigue en 9 archivos y 85 pruebas aprobadas, porque el cambio es solo de documentos.
- Lo que no debe hacer, cómo se probó: la misma comprobación da 1 mensaje del contrato sin escenario, el de la marca de entorno de T077 («La base de DATABASE_URL está marcada para production…»), que ya falta en `develop` antes de este cambio, así que no lo trae el corte 2. Ningún ejemplo del contrato usa un dato real, y los correos son de `example.invalid`.
- Correcciones: ninguna.
- Cómo se reporta: esta entrada, el CHANGELOG y el PR de esta rama, cuando Jefferson autorice empujar.
- Pendiente y siguiente paso: P5 Cargas y el reemplazo y la confirmación en P3 (T085), con sus pruebas, y el texto de T077 que falta en un escenario, como observación aparte del corte 2.

### 2026-11-17 18:25 (Lima) · chore/dependencias-dependabot · jsdom, vitest, vite y `@vitejs/plugin-react` en un solo cambio (PR de Dependabot #5, #6, #9 y #12)
- Quién: Claude Code, por el encargo de la sesión principal de Jefferson del 2026-11-17, aplica los cuatro saltos en un solo cambio, corre las pruebas y escribe esta entrada. Jefferson aprueba en el chat empujar las ramas del Front y del Back, fusionarlas con la CI en verde y cerrar los diez PR de Dependabot. Un subagente (Sonnet, esfuerzo medio) lee en solo lectura las notas de cada versión, las fechas del registro de npm, la base de avisos de GitHub y los diffs de los cuatro PR. Claude Code vuelve a tomar con `npm view` las fechas de los nueve paquetes del lockfile nuevo antes de aceptar su informe.
- Qué cambió: `package.json` fija jsdom 30.1.3, vitest 5.0.5, vite 8.3.5 y `@vitejs/plugin-react` 6.2.1. En `package-lock.json` cambian además cinco dependencias que solo usan las pruebas, `@asamuzakjp/dom-selector` de 9.2.4 a 10.0.5, porque jsdom 30.1.3 pide ^10.0.3, `@vitest/mocker` y `@vitest/spy` a 5.0.5, magic-string a 1.4.5 dentro de `@vitest/mocker` y `@types/estree` a 1.0.10, que pide su estree-walker.
- Por qué: los PR de Dependabot #5, #6, #9 y #12, que Jefferson deja para después de la versión 0.1.0. Van juntos porque #9 choca con #6 y #12 con #5 en `package.json` y `package-lock.json`. Cada lockfile de Dependabot agrega además los mismos seis paquetes anidados de `@tailwindcss/oxide-wasm32-wasi`, que el npm local no escribe, así que un solo cambio evita cuatro rebases y las entradas sobrantes.
- Lo que debe hacer, cómo se probó: `npm ci --ignore-scripts` instala el lockfile nuevo, `npm test` da 9 archivos y 85 pruebas aprobadas, igual que en `develop`, y `npm run build` compila sin errores. El bundle sale idéntico al de `develop`, con los mismos `index-D0rec67o.js` e `index-5cA2jNHI.css`, así que la vista previa y Production no reciben código distinto.
- Lo que no debe hacer, cómo se probó: `npm install --before=2026-11-03T23:00:00Z` no admite ninguna versión con menos de 14 días, y `npm view` fecha los nueve paquetes entre el 2026-10-15 y el 2026-11-02. La base de avisos de GitHub no trae avisos vigentes para las versiones nuevas ni para las dependencias de `package.json`, de modo que ningún salto corrige una vulnerabilidad conocida.
- Correcciones: ninguna.
- Cómo se reporta: esta entrada, el CHANGELOG y el PR de esta rama, que reemplaza los PR #5, #6, #9 y #12.
- Pendiente y siguiente paso: al fusionar el PR, se cierran los cuatro PR de Dependabot con un comentario que remite a él. Como el bundle no cambia, la prueba de la vista previa de `develop` hace falta solo por el Back.

### 2026-11-17 17:45 (Lima) · docs/001-version-0.1.0 · Versión 0.1.0 en Production (T076 y T079 de la spec 001 del Back)
- Quién: Jefferson autoriza en el chat empujar y fusionar cada PR con la CI en verde, y corre `ABET_SIS_MED/herramientas_neon/comprobar_version.sh`, que le pide las contraseñas. Claude Code fusiona el PR de versión, comprueba Production y escribe esta entrada. El subagente revisor del registro del Back (Sonnet, esfuerzo medio) revisa también este cambio en solo lectura y marca la sección 2.2 de `entornos-y-despliegue.md`, que daba el entrenamiento de IA por desactivado, y la fuente de los términos de marzo de 2026, y las dos se corrigen.
- Qué cambió: `main` recibe la versión 0.1.0 (PR #14, 0d693b9), `release.yml` crea el tag `v0.1.0` y su Release, y Production del Front sale de `main`. En este repositorio, `docs/05-operacion/entornos-y-despliegue.md` registra la versión en Production, J-07 en Hobby y el entrenamiento de IA del equipo, que sigue encendido.
- Por qué: T076 y T079 de la spec 001 del Back.
- Lo que debe hacer, cómo se probó: el despliegue de Production `dpl_EjScFgZmaZ8AugUs458zYHfeA92v` sale de `main` en iad1 con el alias `abet-ulima-front.vercel.app`. `GET /` responde 200 sin la protección de Vercel, y `GET /api/sesion` sin cookie da por la reescritura el 401 en JSON del Back, que antes de la versión era 404. `produccion.spec.ts` da 3 passed, con el ingreso de docente410 en P1 y la cookie `abet_sesion` guardada solo para `abet-ulima-front.vercel.app`, HttpOnly, Secure y SameSite=Lax.
- Lo que no debe hacer, cómo se probó: la respuesta de `/api/sesion` no trae `Access-Control-Allow-Origin`, localStorage y sessionStorage no tienen ningún valor, `document.cookie` no muestra `abet_sesion` y ninguna prueba sube un export en Production.
- Correcciones: la sección 7 decía que Jefferson aún no aceptaba desplegar en Hobby, y ahora registra la versión 0.1.0 en Hobby con la consulta a soporte todavía pendiente.
- Cómo se reporta: esta entrada, el CHANGELOG, el PR de esta rama y `audit.md` del Back.
- Pendiente y siguiente paso: los PR de Dependabot (#5, #6, #9 y #12) y el entrenamiento de IA del equipo de Vercel (T070 del Back).

### 2026-11-17 17:25 (Lima) · chore/version-0.1.0 · Versión 0.1.0 del Front (T076 de la spec 001 del Back)
- Quién: Claude Code prepara la versión por el encargo de la sesión principal de Jefferson del 2026-11-17. Jefferson decide en el chat no fusionar los PR de Dependabot antes de la versión y autoriza empujar y fusionar cada PR con la CI en verde.
- Qué cambió: `VERSION` pasa a 0.1.0, la versión que ya declaran `package.json` y `package-lock.json`, y la sección «Sin publicar» del `CHANGELOG.md` pasa a `[0.1.0] - 2026-11-17`, con otra vacía encima.
- Por qué: T076 de la spec 001 del Back, que publica la versión primero en el Back y después en el Front, con V1_10 ya en la rama principal de Neon (T077 de la spec 003).
- Lo que debe hacer, cómo se probó: `npm test` da 9 archivos y 85 pruebas aprobadas, `npm run build` compila sin errores, `scripts/preflight.sh` termina sin fallas y el `awk` de `release.yml` extrae la sección [0.1.0].
- Lo que no debe hacer, cómo se probó: ningún archivo de `src/` ni `vercel.json` cambia, así que Production recibe desde `main` el mismo código que pasa la prueba de la vista previa del 2026-11-09. Los cuatro PR de Dependabot (#5, #6, #9 y #12) quedan abiertos.
- Correcciones: ninguna.
- Cómo se reporta: esta entrada, el CHANGELOG, el PR de esta rama y el PR «Versión 0.1.0».
- Pendiente y siguiente paso: el PR «Versión 0.1.0» de `develop` a `main` después del Back, y la comprobación de la reescritura de `/api` y del ingreso en Production sin cargas (T079 de la spec 001 del Back).

### 2026-11-09 11:49 (Lima) · docs/003-vista-previa · Prueba de humo de los exports de texto en la vista previa (T076 de la spec 003)
- Quién: Jefferson corre `ABET_SIS_MED/herramientas_neon/humo_preview.sh` en su terminal, que asigna las contraseñas de docente410 y docente411 en la rama `develop` de Neon y corre la prueba. Claude Code prepara la vista previa, comprueba el resultado en Neon y escribe esta entrada.
- Qué cambió: solo esta memoria.
- Por qué: T042 y T076 de la spec 003 del Back, la prueba de cierre de P3 y P4 con los exports de texto.
- Lo que debe hacer, cómo se probó: `npx playwright test e2e/humo_csv.spec.ts` contra `abet-ulima-front-git-develop-jeffangeloss-projects.vercel.app` da 2 passed; P4 muestra «Publicada», 11 de 11 filas aceptadas, los 5 avisos y «Sin hoja (export de texto)» para el `.csv` de la 410 y el `.xls` de la 411, y Neon `develop` confirma las dos cargas con 63,6 / 63,6 / 72,7 %.
- Lo que no debe hacer, cómo se probó: las contraseñas viajan solo por `ABET_CLAVES_ARCHIVO`, un archivo temporal con permisos 600 que el guion borra; los resultados de Playwright van a una carpeta temporal y las capturas, solo con datos inventados, quedan fuera del repositorio en `ABET_SIS_MED/demo_spec003/capturas/`.
- Correcciones: ninguna en este repositorio.
- Cómo se reporta: esta entrada y el PR de esta rama.
- Pendiente y siguiente paso: la versión 0.1.0 hacia `main` cuando la rama principal de Neon tenga V1_10.

### 2026-11-09 11:26 (Lima) · feat/003-exports-blackboard · Ayudas comunes de las pruebas de humo
- Quién: Claude Code, a partir del análisis de SonarQube Cloud del PR jeffangeloss/ABET-ULIMA-Front#10.
- Qué cambió: `e2e/comun.ts` (nuevo) reúne la lectura de la contraseña, las capturas, el ingreso, la clave de omisión de Vercel y la ruta de los exports inventados, y `e2e/humo.spec.ts` y `e2e/humo_csv.spec.ts` la importan en lugar de repetirla.
- Por qué: la puerta de calidad de SonarQube Cloud del PR falla con 8,6 % de duplicación en el código nuevo (el máximo es 3 %), por las ayudas que `humo_csv.spec.ts` copiaba de `humo.spec.ts`.
- Lo que debe hacer, cómo se probó: `npx playwright test --list` lista los cuatro recorridos de los dos archivos; `npm test` sigue con 9 archivos y 85 pruebas aprobadas y `npm run build` compila.
- Lo que no debe hacer, cómo se probó: los recorridos no cambian sus pasos ni sus comprobaciones, y las contraseñas siguen leyéndose solo de `ABET_CLAVES_ARCHIVO`. `tsc` no revisa `e2e/` porque el proyecto no instala los tipos de Node, igual que antes del cambio.
- Correcciones: ninguna.
- Cómo se reporta: esta entrada y el PR #10.
- Pendiente y siguiente paso: la corrida de `e2e/humo_csv.spec.ts` contra la vista previa de `develop` (T076 de la spec 003).

### 2026-11-09 10:40 (Lima) · feat/003-exports-blackboard · P3 y P4 con los exports de texto de Blackboard (spec 003)
- Quién: Claude Code reparte el trabajo y revisa el resultado; un subagente con Sonnet y esfuerzo medio cambia el contrato, P3, P4 y sus pruebas y escribe `e2e/humo_csv.spec.ts`, y Claude Code suma a esa prueba el `.xls` de la 411 con docente411, corrige una coma del contrato y vuelve a correr las pruebas y la compilación antes de aceptarlo.
- Qué cambió: `docs/03-api/contrato.md` (campo `archivo` con `.xlsx`, `.csv` o `.xls`, orden del trabajo, texto dañado y tope de 5 000 filas, «3.00» vale 3, SIN_CALIFICACIONES, sección sin declarar con el texto nuevo, `hoja` texto o nula y tabla de 422), `docs/specs/api-contracts.md`, `docs/01-arquitectura/frontend.md`, `src/pantallas/SubirExport.tsx` (`accept`, etiqueta y aviso), `src/pantallas/ResultadoCarga.tsx` y `src/servicios/tipos.ts` (`hoja: string | null`), sus pruebas y `e2e/humo_csv.spec.ts`.
- Por qué: spec 003 del Back, aprobada por Jefferson el 2026-11-09, historias US-27, US-28, US-33 y US-34, con T011, T040, T041 y T042.
- Lo que debe hacer, cómo se probó: `npm test` da 9 archivos y 85 pruebas aprobadas (19 fallaban antes del cambio), `npm run build` compila sin errores y `npx playwright test --list e2e/humo_csv.spec.ts` lista los dos recorridos, el `.csv` de la 410 y el `.xls` de la 411.
- Lo que no debe hacer, cómo se probó: P3 no revisa el tipo ni la extensión; la prueba con `export_410.pdf` y `applyAccept: false` comprueba que el archivo se envía una vez tal cual y que el 422 muestra el `detail` de la API. La prueba de humo lee las contraseñas solo de `ABET_CLAVES_ARCHIVO` y deja sus resultados en `DIR_RESULTADOS`.
- Correcciones: faltaba la coma antes de «un PI repetido» en la lista de rechazos por estructura del contrato. La comprobación de la sección 10 del contrato, corrida contra la rama del Back, encuentra que el escenario de periodo de la spec 003 usa un texto literal que el contrato no escribía, y el contrato lo suma; queda solo la diferencia que ya traía `develop` con el mensaje de la marca de entorno de T077.
- Cómo se reporta: esta entrada, `CHANGELOG.md` y el PR de la rama.
- Pendiente y siguiente paso: la prueba de humo de los exports de texto no corrió todavía, porque necesita la API de la rama del Back; corre contra la vista previa de `develop` en T076.

### 2026-11-02 21:30 (Lima) · feat/001-humo-preview · Prueba de humo contra la vista previa de develop (T075)
- Quién: Jefferson crea la clave de omisión del proyecto del Front, asigna las contraseñas y corre la prueba en su terminal. Claude Code adapta la prueba y escribe esta entrada. Una revisión con dos revisores y un refutador por hallazgo confirma cuatro hallazgos, corregidos antes de la corrida.
- Qué cambió: `playwright.config.ts` (`DIR_RESULTADOS`), `e2e/humo.spec.ts` (modo de vista previa con docente411 y la clave de omisión por `context.route`), `scripts/e2e.sh` (exige la clave con una URL https), `docs/05-operacion/entornos-y-despliegue.md`, `docs/01-arquitectura/frontend.md`, `CHANGELOG.md` y esta memoria.
- Por qué: T075 de la spec 001 del Back. La vista previa del Front está protegida, Neon no tiene a docente.varias y la prueba solo apuntaba al Front local.
- Lo que debe hacer, cómo se probó: Playwright da 2 passed contra `https://abet-ulima-front-git-develop-jeffangeloss-projects.vercel.app`. En local, `npx playwright test --list` muestra los mismos dos casos que antes, con docente.varias.
- Lo que no debe hacer, cómo se probó: la clave de omisión no va en `extraHTTPHeaders`, cuyo registro de llamadas la mostraría al fallar una petición de `page.request`. Los resultados no quedan en `test-results`, porque el error-context.md de un fallo copia el valor del campo de contraseña. Sin la clave, `scripts/e2e.sh` se detiene con una URL https.
- Correcciones: los cuatro hallazgos de la revisión (la contraseña en error-context.md, la clave en el registro de llamadas, un fallo silencioso al leer la clave y la corrida que no se puede repetir sin restablecer `develop`).
- Cómo se reporta: esta entrada, `CHANGELOG.md` y el PR.
- Pendiente y siguiente paso: la prueba todavía no corre en la CI. Sigue la versión 0.1.0 (T076).

### 2026-11-02 19:36 (Lima) · feat/001-despliegue-vercel · Marca de entorno de cada rama de Neon en el documento de despliegue
- Quién: Jefferson aprueba en el chat agregar la marca antes de fusionar («Sí, agrégala»). Claude Code implementa la marca en el Back (T077), actualiza este documento y escribe esta entrada.
- Qué cambió: `docs/05-operacion/entornos-y-despliegue.md` (un párrafo nuevo en la sección 4, el paso 4 de la sección 5 y el punto 9 de la sección 7, que se quita), `docs/03-api/contrato.md` (la parada del arranque por la marca y por `VERCEL_ENV`) y esta memoria.
- Por qué: la marca ya existe en el Back, así que deja de ser una propuesta, y el procedimiento de la prueba de humo debe volver a marcar `develop` después de restablecerla.
- Lo que debe hacer, cómo se probó: `npm test`, `npm run build` y `scripts/preflight.sh` pasan. Las pruebas de la marca viven en el Back (`tests/test_api_sesion.py` y `db/pruebas/correr_pruebas.sh`).
- Lo que no debe hacer, cómo se probó: el documento no promete que la marca reemplaza la comprobación de la sección 4, que sigue igual, y avisa que una rama recién creada o restablecida desde la principal lleva la marca production hasta volver a marcarla.
- Correcciones: ninguna.
- Cómo se reporta: esta entrada y el PR #7.
- Pendiente y siguiente paso: marcar las dos ramas de Neon, fusionar los dos PR y comprobar la vista previa de `develop`.

### 2026-11-02 19:25 (Lima) · feat/001-despliegue-vercel · Documentos con la revisión de los PR de despliegue
- Quién: Jefferson aprueba empujar las dos ramas («Sí, al terminar»). Una revisión con tres revisores (seguridad con el modelo de la sesión y esfuerzo alto; configuración y documentos con Sonnet y esfuerzo medio) y un refutador por hallazgo de severidad media o alta confirma cinco hallazgos sin refutar ninguno. Claude Code corrige los del Front y escribe esta entrada.
- Qué cambió: `docs/05-operacion/entornos-y-despliegue.md` (estado y secciones 2.1, 2.2, 2.4, 4, 5 y 7), `docs/01-arquitectura/frontend.md` (punto 1 de la sección 7) y esta memoria.
- Por qué: el documento decía que los proyectos de Vercel no existen, que apagar la protección abre solo la API de `develop` y que `tests/vercel.test.ts` comprueba que una vista previa nunca escribe en la base del piloto, cuando esa prueba solo cubre la reescritura.
- Lo que debe hacer, cómo se probó: `npm test`, `npm run build` y `scripts/preflight.sh` pasan. La comprobación de Preview que describe la sección 4 corre el 2026-11-02 y deja una sesión de `abet_app` con actividad nueva en la rama `develop` de Neon y ninguna en la principal.
- Lo que no debe hacer, cómo se probó: el documento ya no afirma que la prueba del Front cubre la base, y explica por qué no se vuelve a desplegar el despliegue de la importación y por qué un dominio nuevo de Production se suma a la primera regla.
- Correcciones: la memoria del Front dejaba como pendiente lo que el Back ya registra como hecho, y la sigla IA aparecía sin glosa.
- Cómo se reporta: esta entrada y el PR #7.
- Pendiente y siguiente paso: la decisión de Jefferson sobre la marca de entorno en Neon, la fusión de los dos PR, T074 y T075.

### 2026-11-02 18:50 (Lima) · feat/001-despliegue-vercel · Dominio real del Back en la reescritura de Production y rama de Production observada en Vercel
- Quién: Jefferson crea los dos proyectos de Vercel y pega las variables del Back. Claude Code, sin subagentes, revisa con la CLI y la API de Vercel los dominios, los nombres de las variables, la rama de Production, la protección y los despliegues, corrige la prueba, el archivo y los documentos, y escribe esta entrada.
- Qué cambió: `vercel.json` y `tests/vercel.test.ts` (destino `abet-ulima-back-gray.vercel.app` y una prueba nueva), y `docs/05-operacion/entornos-y-despliegue.md` (bloque y texto de la sección 2.1, paso 1 de la sección 5 y punto 4 de la sección 7).
- Por qué: Vercel da al Back el dominio `abet-ulima-back-gray.vercel.app`, porque `abet-ulima-back.vercel.app` ya es de otro proyecto, que hoy responde 404 DEPLOYMENT_NOT_FOUND. Con el destino anterior, la reescritura de Production mandaría la cookie de sesión y las contraseñas del ingreso a ese dominio ajeno. Además, `vercel ls --meta githubCommitRef=develop` muestra que el despliegue de Production de la importación sale de `develop`, aunque la API de Vercel da `main` como rama de Production de los dos proyectos (`link.productionBranch`).
- Lo que debe hacer, cómo se probó: con el destino anterior, dos de las seis pruebas de `tests/vercel.test.ts` fallan, y con `abet-ulima-back-gray.vercel.app` pasan las seis. `npm test`, `npm run build` y `scripts/probar_preflight.sh` pasan.
- Lo que no debe hacer, cómo se probó: ninguna regla manda una petición a `https://abet-ulima-back.vercel.app/` (prueba nueva), y ninguna regla sin el dominio de Production llega al Back de Production.
- Correcciones: la rama de Production de los dos proyectos es `main`, como dice la entrada anterior, y lo que sale de `develop` es solo el despliegue de Production de la importación, que Vercel construye desde la rama predeterminada de GitHub. El paso 1 pide confirmar `main` y no volver a desplegar ese despliegue.
- Cómo se reporta: esta entrada y el PR.
- Pendiente y siguiente paso: Jefferson desactiva Vercel Authentication en el Back y rehace la `DATABASE_URL` de Preview. El alias de `develop` del Back ya existe en el despliegue de la importación.

### 2026-11-02 17:49 (Lima) · feat/001-despliegue-vercel · vercel.json del Front con la reescritura de /api por entorno (T072) y documentos de J-17
- Quién: Jefferson aprueba en el chat seguir con el despliegue en Vercel («Sí, sigamos»), con las funciones en iad1 y los documentos del Front al día. Claude Code, sin subagentes, escribe primero la prueba, hace el cambio y escribe esta entrada.
- Qué cambió: `vercel.json` y `tests/vercel.test.ts` (nuevos), `docs/05-operacion/entornos-y-despliegue.md`, ADR-001, ADR-002 (ahora `ADR-002-neon-us-east-1-datos-inventados.md`) y su índice, `docs/03-api/contrato.md`, `docs/01-arquitectura/frontend.md` y `docs/README.md`.
- Por qué: T072 de la spec 001 del Back y J-17. La vista previa del Front necesita una API que no escriba en la base del piloto, y los documentos todavía decían São Paulo, `gru1` y PostgreSQL 16.
- Lo que debe hacer, cómo se probó: las cinco pruebas de `tests/vercel.test.ts` fallan sin `vercel.json` y pasan con él. Comprueban la región iad1, la regla del dominio de Production en primer lugar y el alias de `develop` del Back para cualquier otro dominio. `npm test`, `npm run build` y `scripts/probar_preflight.sh` pasan.
- Lo que no debe hacer, cómo se probó: ninguna regla sin el dominio de Production llega al Back de Production. Con el destino de la segunda regla cambiado a mano por el Back de Production, dos de las cinco pruebas fallan. El archivo no trae la regla de `index.html`, porque el Front no cambia de ruta.
- Correcciones: la guía de Vercel dice que un proyecto nuevo toma `main` como Production cuando existe, y no la rama predeterminada de GitHub, así que el paso 1 de `entornos-y-despliegue.md` pide confirmarla en Settings, Environments, Production.
- Cómo se reporta: esta entrada, `CHANGELOG.md` y el PR.
- Pendiente y siguiente paso: T070 y T073 de Jefferson, con la protección del Back desactivada y sin conectar al Back la base de la integración. Los dominios de la reescritura se confirman cuando Vercel cree los proyectos.

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
