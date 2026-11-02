# Cambios

Los cambios visibles de este repositorio quedan aquí. El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y las versiones siguen [SemVer](https://semver.org/lang/es/). La versión vigente está en `VERSION`.

## [Sin publicar]

### Cambiado

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
