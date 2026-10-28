# Ramas, versiones y entornos

Todo lo que hace falta para reproducir los entornos de prueba y de producción queda versionado en este repositorio, es decir el código, la CI y la configuración de despliegue. Los secretos no se versionan. Este repositorio no debe necesitar ninguno, porque todo lo que se compila llega al navegador, y `.env.example` lista las variables públicas sin valores.

La configuración copia la de IQBF-ULIMA_Front con dos diferencias. La versión vive en el archivo `VERSION`, y cada cambio actualiza `MEMORIA.md`.

## Ramas

| Rama | Sale de | Entra a | Despliegue |
|---|---|---|---|
| `main` | `develop` (versión) o `hotfix/*` | — | Producción (piloto con datos inventados) |
| `develop` (rama por defecto) | `main` al crearla | `main` por PR de versión | Vista previa |
| `feat/*`, `fix/*`, `docs/*`, `chore/*`, `test/*`, `refactor/*` | `develop` | `develop` por PR | Vista previa |
| `hotfix/*` | `main` | `main` por PR; después `main` vuelve a `develop` | Producción |

`main` y `develop` aceptan cambios solo por PR con el check `pruebas` en verde, y `main` exige además `flujo`. Ninguna de las dos admite empujes forzados ni borrado. Los PR se fusionan con rebase, sin commits de fusión.

## Publicar una versión

1. En una rama `chore/version-X.Y.Z` que sale de `develop`, cambiar `VERSION`, pasar la sección «Sin publicar» del `CHANGELOG.md` a `[X.Y.Z] - AAAA-MM-DD` y registrar la versión en `MEMORIA.md`. PR a `develop`.
2. Si la versión depende de un cambio de la API, se publica antes la versión del Back.
3. PR de `develop` a `main` titulado «Versión X.Y.Z». Al fusionarlo, `release.yml` crea el tag `vX.Y.Z` y el Release con la sección del CHANGELOG.

Un arreglo urgente sale de `main` en `hotfix/*`, sube la versión de parche y vuelve a `develop` en cuanto llega a `main`.

## Controles de cada cambio

| Control | Dónde corre | Qué exige |
|---|---|---|
| `pruebas` | CI, en cada PR y en cada push a `develop` y `main` | `scripts/probar_preflight.sh` y `scripts/preflight.sh` sin fallas. Ninguna planilla, export ni respaldo fuera de `tests/datos_inventados/`, solo códigos de estudiante que empiezan con 99 dentro de esa carpeta, ningún `.env` versionado, ningún secreto con valor y, en un PR, `MEMORIA.md` actualizado. Los tipos, las pruebas y la compilación se suman a este job cuando exista el código |
| `flujo` | CI, en cada PR a `main` | Que el origen sea `develop` o `hotfix/*` |
| `pre-commit` | En cada clon, activado con `git config core.hooksPath scripts/hooks` | La misma revisión sobre lo preparado, más `MEMORIA.md` dentro del commit |
| Hook `Stop` de Claude Code | `.claude/settings.json`, al final de cada turno de Claude | Si quedan cambios sin commit y `MEMORIA.md` no está entre ellos, Claude sigue trabajando hasta registrarlos (`scripts/recordar_memoria.sh`) |
| `secretos` | CI, en cada PR y push | gitleaks 8.30.1 sobre todo el historial, fijado por versión y suma SHA-256. Informativo hasta confirmar que no da falsos positivos |
| SonarQube Cloud | Análisis automático, configurado en `.sonarcloud.properties` | Calidad y seguridad del código nuevo con la puerta «Sonar way» |
| Snyk | Integración de Snyk con GitHub, con la política `.snyk` | Vulnerabilidades de las dependencias de npm, con excepciones que vencen |
| Dependabot | `.github/dependabot.yml`, cada lunes | PR a `develop` con la versión nueva de cada acción de GitHub y su SHA |

## SonarQube Cloud, Snyk y secretos

Los tres controles siguen el modelo de IQBF y se refuerzan con gitleaks y Dependabot. El detalle, con los límites de los planes gratuitos y los pasos que Jefferson hace en cada consola, está en `docs/devops.md` de ABET-ULIMA-Back. Lo propio de este repositorio es que Snyk revisa las dependencias de npm cuando exista `package.json`, que SonarQube Cloud leerá la cobertura lcov de Vitest cuando el análisis pase a la CI, y que ninguna variable `VITE_*` puede llevar un secreto, porque todo lo que se compila llega al navegador.

## Memoria del trabajo

`MEMORIA.md` es el punto de partida de cualquier persona o agente. Su «Punto actual» dice dónde quedó el trabajo y su «Registro» guarda una entrada por cambio, la más reciente primero, con lo probado en positivo y en negativo. `AGENTS.md` fija las reglas y el check `pruebas` las hace cumplir.

## Entornos

| Entorno | Código | API |
|---|---|---|
| Producción (piloto) | `main` | API de producción del Back, con solo datos inventados hasta la autorización de la universidad |
| Pruebas | `develop` | API de vista previa del Back, con la rama `develop` de Neon |
| Local | cualquier rama | API local en la Mac |

El Front llama a la API siempre por la ruta relativa `/api`. En Vercel la reescribe `vercel.json` hacia el Back, y en local la reenvía el proxy de Vite (`server.proxy`) hacia la API en la Mac (ADR-004). Ninguna variable `VITE_*` lleva la URL de la API.
