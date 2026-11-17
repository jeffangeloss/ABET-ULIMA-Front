# ADR-001: La base de datos es la única fuente de verdad y su esquema solo cambia por migraciones

| | |
|---|---|
| **Estado** | Propuesta, pendiente de Jefferson |
| **Fecha** | 2026-10-28 |
| **Ámbito** | `db/migration/` del Back, `db/plataforma/neon/`, `db/datos/`, `abet_carga/`, `app/`, `src/servicios/api.ts` del Front |

## Decisión

La base PostgreSQL 18 del esquema `abet` es la única fuente de verdad del sistema. Las mediciones, el estado de cada carga, sus rechazos y los números del R-17 se leen de la base, nunca de un archivo, de un caché ni de una copia en el navegador. El esquema existe solo como código SQL versionado con Flyway, con las migraciones V1_01 a V1_08 y las vistas repetibles `R__vista_r17_por_pi` y `R__vista_tabla_maestra_pi`, que el MVP usa sin cambios.

La razón es que el R-17 es evidencia ante ABET. Si un número del R-17 no se puede reconstruir desde la base con una consulta, nadie puede defenderlo. El diseño previo de la base ya pone en restricciones e índices únicos parciales las reglas que un programa puede olvidar. Las restricciones `ck_carga_filas` (aceptadas más rechazadas igual a leídas), `ck_carga_conciliada` (una carga publicada lee todas las filas del archivo) y `ck_medicion_nivel` (nivel de 1 a 4) conviven con los índices únicos parciales `uq_carga_publicada_por_seccion` (una sola carga publicada por sección) y `uq_carga_archivo_util` (un mismo archivo publicado en una sola carga). El programa valida antes para dar un mensaje legible, y la base detiene lo que el programa deje pasar.

Lo nuevo del MVP también entra como migración. V1_09__crear_acceso.sql crea el esquema `acceso` (usuarios autorizados, credenciales, sesiones, intentos fallidos de ingreso, docentes por sección y códigos de acceso), agrega `abet.carga.subida_por` y `abet.rechazo_fila.pi_id` y amplía `ck_rechazo_fila_motivo` con COLUMNA_CODIGO_AUSENTE, PI_REPETIDO, PERIODO_NO_COINCIDE y SECCION_SIN_DECLARAR. El esquema `acceso` va aparte de `abet` porque la consulta de control Q04 rechaza cualquier columna de contacto dentro de `abet`.

El traslado de `bd/` al Back se hace con su historia (git subtree) desde `main` de `ABET_ULIMA` (dc2b098), antes del primer `flyway migrate` en Neon y de V1_09, y la rama `preparacion-neon` entra después con `git subtree pull` (decisión J-06 del Back). Después, el repositorio `ABET_ULIMA` queda archivado en solo lectura.

## Invariantes

1. Ningún cambio de esquema sale del código Python ni del Front. No hay `CREATE`, `ALTER` ni `DROP` fuera de `db/`.
2. Una migración versionada aplicada no se edita. Un cambio se escribe como migración nueva.
3. Los números del R-17 salen de `abet.v_r17_por_pi` y la tabla de estudiantes sale de `abet.medicion` de la carga publicada, con las mismas filas que `abet.v_tabla_maestra_pi` da para la sección, nunca de recalcular el export.
4. El Front no tiene cadena de conexión ni habla con la base. Toda lectura y escritura pasa por la API.
5. Las consultas de control Q01 a Q14 de `pruebas.sql` devuelven 0 filas en la CI del Back y después de cada carga de prueba.
6. Los datos operativos (vigencia del catálogo, secciones, plan de medición y usuarios) viven en scripts de `db/datos/`, nunca en migraciones versionadas.

## Alternativas consideradas

**Un ORM que genere el esquema desde el código.** Se descarta porque las restricciones con nombre (`ck_carga_conciliada`) y los índices únicos parciales (`uq_carga_archivo_util`) son el centro del diseño, y un ORM los esconde o los regenera con otro nombre. El esquema ya existe y está probado con 38 casos de rechazo, 3 aceptaciones y 14 consultas de control.

**Guardar el export y recalcular el R-17 cada vez.** Se descarta porque un R-17 recalculado depende del lector del momento, y un cambio del lector cambiaría reportes ya entregados sin dejar rastro.

**Mantener `bd/` en su propio repositorio.** Se descarta porque las migraciones del MVP nacen del código del Back y conviene que viajen en el mismo PR que lo usa, como en IQBF.

## Consecuencias

- Cada regla nueva cuesta una migración y su prueba, lo que hace más lento el primer día y más barato cada corrección posterior.
- La base no puede imponer que la carga sea una sola transacción. Esa regla la cumple el programa y la prueban fallos inyectados en puntos fijos.
- El traslado de `bd/` exige cuidar la ruta de `flyway.toml`, porque copiar `bd/` dentro de `db/` produciría `db/db/migration`.

## Criterios de aceptación

```bash
# 1. Ningún cambio de esquema fuera de db/ (raíz del Back).
#    Esperado: sin salida (código 1 de grep).
grep -rniE '\b(create|alter|drop) (table|view|schema|index)\b' --include=*.py abet_carga/ app/
```

```bash
# 2. El Front no tiene cadena de conexión ni cliente de PostgreSQL (raíz del Front).
#    Esperado: sin salida (código 1 de grep).
grep -rnE 'DATABASE_URL|postgres(ql)?://|from .pg.|psycopg' src/ package.json
```

```sql
-- 3. Las restricciones que sostienen la carga existen con su nombre.
-- Esperado: 6.
SELECT count(*)
FROM pg_constraint
WHERE connamespace = 'abet'::regnamespace
  AND conname IN ('ck_carga_filas', 'ck_carga_publicable', 'ck_carga_conciliada',
                  'ck_carga_terminada', 'ck_medicion_nivel', 'uq_archivo_origen_sha256');
```

```sql
-- 4. Los índices únicos parciales existen con su nombre (no están en pg_constraint).
-- Esperado: 2.
SELECT count(*)
FROM pg_indexes
WHERE schemaname = 'abet'
  AND indexname IN ('uq_carga_publicada_por_seccion', 'uq_carga_archivo_util');
```

```sql
-- 5. La vista del R-17 solo ve cargas en estado PUBLICADA.
-- Esperado: 0.
SELECT count(*)
FROM abet.v_r17_por_pi v
JOIN abet.carga c ON c.carga_id = v.carga_id
WHERE c.estado <> 'PUBLICADA';
```

```bash
# 6. Las consultas de control pasan (raíz del Back, base desechable).
#    Esperado: el resumen final de correr_pruebas.sh sin fallas.
bash db/pruebas/correr_pruebas.sh
```

## Lo que todavía NO está

1. **El archivo de `ABET_ULIMA`.** El traslado de `bd/` al Back está hecho con su historia (T022 y T023), y falta archivar el repositorio en solo lectura.
2. **El caso 60,0 / 60,0 / 70,0 en `pruebas.sql`.** El export con el 5 en la fila 3 todavía no tiene su prueba en la base, y por ahora lo cubren los escenarios de `carga.feature` y `r17_constancia.feature`.
