# ADR-002: La base vive en Neon en São Paulo y solo admite códigos inventados hasta la autorización

| | |
|---|---|
| **Estado** | Propuesta, pendiente de Jefferson (decisión J-02) |
| **Fecha** | 2026-10-28 |
| **Ámbito** | Proyecto de Neon en `aws-sa-east-1`, `db/plataforma/neon/guardia_datos_inventados.sql`, `db/plataforma/neon/crear_rol_app.sql`, `db/datos/periodo_2026_2_inventado.sql`, variable `GUARDIA_DATOS_INVENTADOS` del Back, `scripts/preflight.sh` de los dos repositorios |

## Decisión

La base del piloto vive en Neon, con PostgreSQL 16 en la región `aws-sa-east-1` (São Paulo), sin pasar por el área de informática de la universidad. Jefferson crea el proyecto y aplica las migraciones con Flyway por la conexión directa (sin «-pooler»), y la API se conecta por la cadena con pooler (el agrupador de conexiones de Neon).

Mientras la universidad no autorice el tratamiento de datos reales fuera del Perú (decisión D-10, Ley 29733 y DS 016-2024-JUS), el sistema solo admite códigos de estudiante inventados, de 99000000 a 99999999. La regla vive en tres lugares, porque cada uno cubre un hueco distinto.

1. La API rechaza con 422, antes de calcular la huella o escribir nada, todo export que traiga un código fuera de ese rango, incluido uno mal formado como 9900001 (US-08), mientras `GUARDIA_DATOS_INVENTADOS=1`. El mensaje dice la fila y nunca el código, como en «El piloto solo admite códigos inventados, de 99000000 a 99999999. Revise la fila 4. No se guardó nada.».
2. La base repite la regla con `ck_estudiante_codigo_inventado CHECK (codigo LIKE '99%')` en `abet.estudiante`, aplicada solo en Neon desde `db/plataforma/neon/`. Así, un defecto del programa, un script de siembra o una sesión de psql tampoco escriben un código real.
3. El preflight (la revisión previa de cada commit) de cada repositorio rechaza planillas fuera de `tests/datos_inventados/` y códigos de 8 dígitos que no empiezan con 99 dentro de esa carpeta.

La aplicación entra a Neon con un solo rol, `abet_app` (decisión J-02), con privilegio mínimo. Inserta en las tablas de la carga, actualiza solo las columnas de estado y conteos de `abet.carga`, lee el catálogo, el plan, las reglas y las dos vistas, y no tiene DELETE ni TRUNCATE en `abet`.

## Invariantes

1. Ninguna fila de `abet.estudiante` en Neon tiene un código que no empieza con 99.
2. Un export con un solo código fuera de rango no deja fila en `archivo_origen`, `carga`, `rechazo_fila` ni `estudiante`, y el registro de la aplicación no contiene ese código.
3. La guardia no se apaga desde ninguna pantalla, ruta ni campo de la petición. Solo la apaga Jefferson con la variable del despliegue y un cambio revisado, después de la autorización.
4. `abet_app` no puede borrar ni cambiar el catálogo, el plan, las reglas ni las secciones.
5. Los correos de prueba terminan en `@example.invalid` (`docente410@example.invalid`, `docente411@example.invalid` y `coordinacion@example.invalid`) y no corresponden a ninguna persona.

## Alternativas consideradas

**Una base en la infraestructura de la universidad.** Se descarta para el MVP porque exige al área de informática, cuyo plazo no controla el proyecto. Queda como camino para datos reales si la universidad lo pide.

**Neon en una región de Estados Unidos.** Se descarta porque São Paulo deja la base en la misma región que la función de Vercel (`gru1`) y más cerca del Perú.

**Guardia solo en el programa.** Se descarta porque un error de código o una llamada directa con psql escribiría códigos reales sin que la base proteste.

## Consecuencias

- La guardia evita guardar un código real, pero no evita que el archivo llegue a la función de Vercel. Por eso la pantalla P3 lleva el rótulo «Solo exports con códigos inventados (99000000 a 99999999)» y las cuentas del piloto son de personas que conocen la regla.
- Una carga rechazada por la guardia no deja rastro en la base. El registro de la aplicación guarda solo la huella SHA-256 y la hora.
- Pasar a datos reales exige retirar el CHECK con un script revisado, cambiar la variable y mover el cómputo a Cloud Run en `southamerica-east1` (`05-operacion/entornos-y-despliegue.md`).

## Criterios de aceptación

```sql
-- 1. La base de Neon rechaza un código real aunque el programa falle (en una transacción que se deshace).
-- Esperado: ERROR por la restricción ck_estudiante_codigo_inventado.
BEGIN;
INSERT INTO abet.estudiante (codigo, carrera_id)
SELECT '10000004', carrera_id FROM abet.carrera LIMIT 1;
ROLLBACK;
```

```sql
-- 2. No hay códigos reales en Neon.
-- Esperado: 0.
SELECT count(*) FROM abet.estudiante WHERE codigo NOT LIKE '99%';
```

```sql
-- 3. El rol de la aplicación no borra en abet.
-- Esperado: 0 filas.
SELECT table_name, privilege_type
FROM information_schema.role_table_grants
WHERE grantee = 'abet_app' AND table_schema = 'abet'
  AND privilege_type IN ('DELETE', 'TRUNCATE');
```

```bash
# 4. La guardia de la API (raíz del Back). Los escenarios de US-08 traen 10000004 en la fila 4.
#    Esperado: los escenarios @US-08 pasan y la cuenta de abet.carga no cambia.
pytest tests/aceptacion -m US-08
```

```bash
# 5. El preflight rechaza un código real en la carpeta de datos inventados (cualquiera de los dos repositorios).
#    Esperado: «0 mal» en el resumen.
bash scripts/probar_preflight.sh
```

## Lo que todavía NO está

1. **El proyecto de Neon.** Lo crea Jefferson, y los scripts `crear_rol_app.sql` y `guardia_datos_inventados.sql` están diseñados y no escritos.
2. **La decisión J-02.** El valor recomendado es un solo rol de aplicación, y Jefferson todavía no lo confirma.
3. **Una lectura de la columna Username en el navegador antes de enviar.** La crítica de arquitectura la propone para que el archivo real no salga del equipo, y ninguna historia del MVP la pide.
4. **El acuerdo de tratamiento de datos (data processing agreement, DPA) escrito de Neon y Databricks.** Hace falta antes de cargar datos reales.
