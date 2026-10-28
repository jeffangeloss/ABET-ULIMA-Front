# Memoria de ABET-ULIMA-Front

Este archivo es la memoria de trabajo del repositorio. Lo lee primero cualquier persona o agente que retome el trabajo, y se actualiza en el mismo commit de cada cambio (`AGENTS.md`, regla 2). El hook `pre-commit` y el check `pruebas` rechazan un cambio que no lo actualiza.

## Cómo se usa

1. Antes de empezar, leer «Punto actual».
2. Al terminar un cambio y antes del commit, actualizar «Punto actual» y agregar una entrada al comienzo del «Registro» con la plantilla de abajo.
3. Una entrada anterior no se borra ni se reescribe. Una corrección se registra como entrada nueva que cita la anterior por su fecha y título.
4. El commit de cada entrada se encuentra con `git log -- MEMORIA.md`.
5. Nunca se copian credenciales, datos personales ni nombres o códigos de estudiantes reales.

## Punto actual

- **Fecha**: 2026-10-28
- **Rama de trabajo**: `docs/plan-mvp`, en PR a `develop` (después de `chore/seguridad-y-memoria`, PR #1)
- **Versión publicada**: ninguna (`VERSION` = 0.0.0)
- **Último cambio**: documentación del sistema para el MVP en `docs/` (visión, ADR, pantallas, contrato de la API, entornos y flujo de specs)
- **En curso**: aprobación del plan del MVP por Jefferson (spec `specs/001-mvp-carga-r17/` del Back y esta documentación)
- **Siguiente paso**: con la spec aprobada, fase 1 (contrato) y fase 4 (pantallas P1 a P4 en `feat/001-mvp-carga-r17`)
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
