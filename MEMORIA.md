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
- **Rama de trabajo**: `feat/001-mvp-carga-r17`, solo en local y sobre `docs/plan-mvp` (PR #2), hasta que Jefferson fusione los PR #1 y #2 y autorice el empuje
- **Versión publicada**: ninguna (`VERSION` = 0.0.0)
- **Último cambio**: contrato y documentos para el profesor con varias secciones de varios cursos (en local)
- **En curso**: el corte 1 en el Back (la demo de la carga con el R-17 en su árbol de trabajo)
- **Siguiente paso**: fase 4, las pantallas P1 a P4 (T040 a T045), cuando la API del Back exista
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
