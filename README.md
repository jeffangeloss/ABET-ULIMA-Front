# ABET-ULIMA-Front

Pantallas del sistema de medición ABET de la Carrera de Ingeniería Ambiental de la Universidad de Lima. El profesor elige su sección, sube el export de Blackboard, revisa las filas aceptadas y rechazadas y descarga el R-17 con la constancia de la carga. El coordinador de la carrera ve todas las cargas. Las pantallas consumen la API de `jeffangeloss/ABET-ULIMA-Back`.

**Estado al 28/10/2026.** El repositorio está en arranque. El plan del MVP está en revisión y todavía no hay código de producto. Como en IQBF, la carpeta `docs/` de este repositorio reúne la visión, la arquitectura y las decisiones del sistema completo, y las specs de cada funcionalidad viven en `specs/` del Back.

## Antes de trabajar

1. Leer `MEMORIA.md`, que dice dónde quedó el trabajo, y `AGENTS.md`, que fija las reglas para personas y agentes.
2. Activar la revisión local una vez por clon con `git config core.hooksPath scripts/hooks`.
3. Revisar `docs/devops.md` para las ramas, las versiones y los entornos.

## Reglas que no cambian

- Solo datos inventados (códigos de estudiante que empiezan con 99) en el repositorio, en las pruebas y en las capturas, hasta que la universidad autorice los reales.
- Ningún nombre de estudiante se guarda ni se muestra.
- Ninguna credencial entra al repositorio, al código que llega al navegador ni a los registros.
- Todo cambio entra por PR a `develop` y actualiza `MEMORIA.md`.
