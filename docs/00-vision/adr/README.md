# Registros de decisiones de arquitectura (Architecture Decision Records, ADR) del sistema de medición ABET

> **Estado 2026-10-28.** Los seis ADR del producto mínimo viable (MVP) están en estado «Propuesta, pendiente de Jefferson». Pasan a «Aceptada y vigente» con el merge (la fusión del PR) que los trae a `develop`, y su fecha de cabecera se actualiza ese día.

Un ADR se escribe aquí cuando la decisión (a) es difícil de revertir, (b) condiciona código que todavía no existe o (c) responde a una obligación legal o de la universidad. Las decisiones pequeñas y reversibles van en la spec o en el plan.

## Índice

| ADR | Decisión | Decisión abierta que cierra | Historias que la exigen |
|---|---|---|---|
| [ADR-001](ADR-001-base-fuente-de-verdad.md) | La base de datos es la única fuente de verdad y su esquema solo cambia por migraciones de Flyway | J-06 (traslado de `bd/` al Back) | US-01, US-07, US-15 |
| [ADR-002](ADR-002-neon-us-east-1-datos-inventados.md) | La base vive en Neon en us-east-1, la aplicación entra con un solo rol y solo admite códigos inventados hasta la autorización | J-02 (un solo rol `abet_app`); D-10 sigue en espera de la universidad | US-01, US-02, US-03, US-08 |
| [ADR-003](ADR-003-backend-python-fastapi.md) | El Back es Python 3.12 con FastAPI y la biblioteca `abet_carga` | J-01 | US-07 a US-16 |
| [ADR-004](ADR-004-sesion-propia-mismo-origen.md) | La sesión es propia, viaja en una cookie HttpOnly y el Front y la API comparten origen | J-03 (depende de J-02) | US-05, US-06, US-20 |
| [ADR-005](ADR-005-r17-desde-la-vista.md) | El R-17 se genera desde `v_r17_por_pi` con valores calculados, sin fórmulas ni personas | D-08 y D-12 quedan abiertas | US-15, US-16 |
| [ADR-006](ADR-006-historias-gherkin-auditadas.md) | Ninguna historia entra a la spec sin Gherkin en español y sin pasar la auditoría de refutación | J-09 (dónde corre la prueba de humo) | Todas |

La autoridad final está en las migraciones de la base y en la spec aprobada. Si un ADR contradice a una de las dos, el ADR está mal y se corrige con un ADR nuevo que lo reemplaza.

## Cómo se lee un ADR de este proyecto

Cada ADR sigue el formato de IQBF-ULIMA_Front, en este orden.

1. Título con la decisión como frase.
2. Tabla de cabecera con **Estado**, **Fecha** y **Ámbito** (los archivos y carpetas que la decisión gobierna).
3. `## Decisión`, con el contexto y el porqué dentro, sin sección de contexto aparte.
4. `## Invariantes`, numeradas para citarlas en un PR o en una spec («ADR-002, invariante 3»).
5. `## Alternativas consideradas`, cada una con el motivo del descarte.
6. `## Consecuencias`, con el precio y las deudas conocidas.
7. `## Criterios de aceptación`, con bloques bash o SQL que dicen en un comentario qué se espera.
8. `## Lo que todavía NO está`, con lo que la decisión deja pendiente.

## Comprobarlos todos de una vez

Los criterios se corren cuando exista el código. Los de bash se corren desde la raíz del repositorio que indica el comentario, y los de SQL contra la base local de pruebas, nunca contra Production.

```bash
# Extrae todos los bloques de criterios para revisarlos antes de un PR de versión.
# Esperado: un bloque por criterio, con su línea «Esperado».
grep -n "Esperado" docs/00-vision/adr/ADR-*.md
```

## Deudas registradas en estos ADR

- ADR-001. El traslado de `bd/` al Back está hecho con su historia (T022 y T023), y falta archivar `ABET_ULIMA` en solo lectura.
- ADR-002. La guardia evita guardar un código real, pero no evita que el archivo llegue a la función de Vercel.
- ADR-003. Falta la prueba de que la función de Python arranca a tiempo en Vercel sin pandas.
- ADR-004. Falta probar que la reescritura de rutas de Vercel conserva la cookie de primera parte.
- ADR-005. La plantilla oficial del R-17 (D-08) sigue abierta, así que la plantilla vaciada es provisional.
- ADR-006. Falta la prueba de 30 minutos de pytest-bdd con `# language: es`.

## Lo que todavía NO está

1. **El principio de la constitución en el índice.** IQBF liga cada ADR a un principio de su constitución. La constitución de ABET ya existe en `.specify/memory/constitution.md` del Back y espera la ratificación de Jefferson, así que mientras tanto la columna equivalente es la decisión abierta que el ADR cierra.
2. **Un campo de ADR reemplazado.** Cuando un ADR reemplace a otro, la cabecera suma la fila **Reemplaza**.
