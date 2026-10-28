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
| SonarQube Cloud y Snyk | CI, como checks informativos | Se agregan cuando Jefferson cree los proyectos y guarde los tokens como secretos del repositorio |

## Memoria del trabajo

`MEMORIA.md` es el punto de partida de cualquier persona o agente. Su «Punto actual» dice dónde quedó el trabajo y su «Registro» guarda una entrada por cambio, la más reciente primero, con lo probado en positivo y en negativo. `AGENTS.md` fija las reglas y el check `pruebas` las hace cumplir.

## Entornos

| Entorno | Código | API |
|---|---|---|
| Producción (piloto) | `main` | API de producción del Back, con solo datos inventados hasta la autorización de la universidad |
| Pruebas | `develop` | API de vista previa del Back, con la rama `develop` de Neon |
| Local | cualquier rama | API local en la Mac |

La dirección de la API llega en `VITE_API_BASE_URL` con un valor propio para Producción y otro para Vista previa en Vercel.
