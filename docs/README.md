# Documentación del sistema de medición ABET

> **Estado 2026-10-28.** Primer juego de documentos del producto mínimo viable (minimum viable product, MVP) «Del export de Blackboard al R-17 desde la base» (épica EP-01). Todo lo que describe la API, la base y el despliegue es plan en revisión, porque todavía no existe código de producto en ninguno de los dos repositorios. Cada documento separa lo decidido de lo propuesto con la marca «(propuesta)» y cierra con su sección «Lo que todavía NO está».

Esta carpeta reúne la visión, la arquitectura, el contrato de la API, la operación y las decisiones del sistema completo de la Carrera de Ingeniería Ambiental de la Universidad de Lima. Sigue el esquema de IQBF-ULIMA_Front, con una diferencia deliberada. En IQBF la documentación del sistema vive en el Front por razones históricas, y en ABET vive aquí por decisión, porque el Front es el consumidor del contrato y el lugar donde cada pantalla nombra las historias que la justifican. La especificación (spec) del MVP, las reglas de negocio y los escenarios de aceptación viven en `specs/` de [ABET-ULIMA-Back](https://github.com/jeffangeloss/ABET-ULIMA-Back), y los pasos que los ejecutan viven en `tests/aceptacion/pasos/` del mismo repositorio.

Los datos de todos los ejemplos son inventados. La sección 410 de la asignatura 450002 «Principios de Ingeniería Sostenible» en el periodo 2026-2, los códigos de estudiante de 99000000 a 99999999 y los correos de prueba `docente410@example.invalid`, `docente411@example.invalid` y `coordinacion@example.invalid` no corresponden a ninguna persona.

## Por dónde empezar

| Perfil del lector | Primer documento |
|---|---|
| Quien llega por primera vez al proyecto | [`00-vision/panorama.md`](00-vision/panorama.md) |
| Quien va a escribir una pantalla | [`01-arquitectura/frontend.md`](01-arquitectura/frontend.md) y después [`03-api/contrato.md`](03-api/contrato.md) |
| Quien va a escribir o cambiar un endpoint | [`specs/api-contracts.md`](specs/api-contracts.md), [`03-api/contrato.md`](03-api/contrato.md) y la spec viva de la funcionalidad en el Back |
| Quien abre una funcionalidad nueva | [`specs/workflow.md`](specs/workflow.md) y [`specs/feature-index.md`](specs/feature-index.md) |
| Quien despliega o configura Vercel y Neon | [`05-operacion/entornos-y-despliegue.md`](05-operacion/entornos-y-despliegue.md) y [`devops.md`](devops.md) |
| Quien busca el porqué de cada decisión | [`00-vision/adr/README.md`](00-vision/adr/README.md) |
| Coordinación de la carrera o asesoría | [`00-vision/panorama.md`](00-vision/panorama.md), secciones 1 a 4 |

## El mapa completo

### 00 · Visión

- [`panorama.md`](00-vision/panorama.md) explica qué resuelve el sistema, para quién, qué hace el MVP y qué deja fuera, con el glosario y el mapa de la documentación.
- [`adr/`](00-vision/adr/README.md) guarda las seis decisiones de arquitectura del MVP, cada una con sus invariantes y sus criterios de aceptación ejecutables.

### 01 · Arquitectura

- [`frontend.md`](01-arquitectura/frontend.md) describe las cinco pantallas (P1 a P5), las historias que justifican cada una, lo que muestra y lo que no muestra, y la única puerta HTTP `src/servicios/api.ts`.

### 03 · API

- [`contrato.md`](03-api/contrato.md) fija cada ruta de la API con su cuerpo, su respuesta, sus errores y la historia que la origina.

### 05 · Operación

- [`entornos-y-despliegue.md`](05-operacion/entornos-y-despliegue.md) describe los entornos local, Preview (vista previa) y Production (producción) de Vercel, los dos proyectos de Vercel en São Paulo, las ramas de Neon y las variables que pega Jefferson.
- [`devops.md`](devops.md) fija las ramas, las versiones y los controles de cada cambio.

### Flujo de specs (`docs/specs/`)

- [`workflow.md`](specs/workflow.md) ordena el trabajo desde el objetivo hasta `MEMORIA.md`.
- [`feature-index.md`](specs/feature-index.md) dice qué funcionalidad sirve a qué pantalla y en qué estado está.
- [`api-contracts.md`](specs/api-contracts.md) es el índice corto de rutas, que se actualiza antes de implementar.

## Documentación viva en otros sitios

| Dónde | Qué contiene |
|---|---|
| `specs/001-mvp-carga-r17/` del Back | Spec, revisión de historias, plan, tareas y, al cerrar, `audit.md` del MVP |
| `specs/001-mvp-carga-r17/aceptacion/*.feature` del Back | Escenarios de aceptación en Gherkin en español (`base_neon`, `acceso`, `carga`, `r17_constancia`, `despliegue`, `reemplazo_y_cargas` y `varias_secciones`) |
| `tests/aceptacion/pasos/` del Back | Pasos de pytest-bdd que leen esos `.feature` desde su carpeta, sin copiarlos |
| `specs/features/<feature>/<feature>.spec.md` del Back | Specs vivas `carga-export`, `r17`, `acceso` y `periodo`, con las reglas `BR-<FEATURE>-NN` |
| `db/` del Back (hoy `bd/` del repositorio `ABET_ULIMA`) | Migraciones de Flyway, vistas del R-17 y pruebas de la base |
| `MEMORIA.md` de cada repositorio | Dónde está el trabajo y el registro de cada cambio |

## Cómo mantenerla honesta

Tres hábitos la protegen. Ninguna cifra entra sin el comando que la verifica, y las cifras de prueba de este juego salen de `bd/pruebas/datos_sinteticos.sql`. Cada afirmación sobre el código cita la ruta del archivo, para que el lector pueda comprobarla. Y cuando cambia el comportamiento del sistema, se busca en `docs/` lo que todavía describe el comportamiento anterior antes de dar el trabajo por terminado.

```bash
# Busca lo que describe una ruta o una regla antes de cambiarla.
grep -rn "r17.xlsx" docs/
```

Cuando un documento y el código discrepan, gana el código. Cuando un documento y una fuente de referencia discrepan (las migraciones de la base, la spec aprobada y los `.feature`), gana la fuente.

## Lo que todavía NO está

1. **Código de producto.** Ni el Front ni el Back tienen código todavía, así que ninguna afirmación de esta carpeta se comprueba aún contra una ruta de archivo de implementación.
2. **La spec aprobada.** La spec, el plan, las tareas y estos documentos están en la rama `docs/plan-mvp` de los dos repositorios, sin PR. La aprobación es el merge (la fusión del PR) en `develop`, que decide Jefferson.
3. **`02-datos/` y `04-dominio/`.** Este juego no trae el modelo de datos columna por columna ni la explicación del dominio. Mientras tanto, el modelo se lee en las migraciones V1_01 a V1_08 y en las vistas `R__vista_r17_por_pi.sql` y `R__vista_tabla_maestra_pi.sql`.
4. **`specs/spec-template.md`.** La plantilla de spec viva en español queda para la fase de contrato (fase 1 del plan).
