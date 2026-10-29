# ADR-007: La plantilla de proyectos de Capstone es una segunda subida de la sección, sin pantalla nueva

| | |
|---|---|
| **Estado** | Propuesta, pendiente de Jefferson |
| **Fecha** | 2026-10-29 |
| **Ámbito** | `specs/002-capstone/` del Back, `POST /api/secciones/{seccion_id}/proyectos`, bloque `proyectos` de `GET /api/cargas/{carga_id}`, tablas `abet.carga_proyecto`, `abet.proyecto_estudiante` y `abet.rechazo_proyecto`, vista `abet.v_tabla_maestra_capstone`, `pantallas/SubirExport.tsx`, `pantallas/ResultadoCarga.tsx`, `pantallas/MisSecciones.tsx` y `componentes/ZonaProyectos.tsx` (propuesta) del Front |

## Decisión

Los datos de proyecto de un curso Capstone (grupo, título, tipo de empresa, RUC, organización y línea de investigación) entran por una segunda subida de la misma sección. El profesor sube primero el export de Blackboard, como en la spec 001, y después la plantilla de proyectos, un libro con una fila por estudiante. La plantilla se une a los estudiantes del export por una clave foránea hacia `abet.carga_fila`, así que la API la rechaza con 409 mientras la sección no tenga una carga PUBLICADA (decisión D-26 de la spec 002, valor provisional).

La plantilla tiene su propio registro, `abet.carga_proyecto`, con su archivo, su huella, sus conteos y sus rechazos, y escribe todo en una sola transacción, igual que el export (ADR-001). La constancia de esa subida viaja dentro de la constancia de la carga, como el bloque `proyectos` de `GET /api/cargas/{carga_id}` (J-14, valor provisional), y no en una ruta propia.

El Front no suma una pantalla. La plantilla vive como una zona más de P3 Subir export, visible solo cuando la sección es de un curso Capstone, y su resultado vive como un bloque más de P4 Resultado de la carga. P2 Mis secciones muestra el estado de proyectos de cada sección. Con esto el profesor recorre el mismo camino de siempre, sección, subida y resultado, y la pantalla no necesita conocer la tabla de proyectos más que por lo que la API le dice (`tipo_curso` y `proyectos_estado`).

La tabla maestra de Capstone en el formato nuevo es la vista `abet.v_tabla_maestra_capstone`. Entrega 13 columnas, de SO a ARCHIVO, con los seis datos de proyecto repetidos en las filas de cada estudiante, y convive con `abet.v_tabla_maestra_pi`, que no cambia. La alimentan psql y Power BI, y ninguna pantalla del Front la muestra. La plantilla de proyectos no reemplaza ni modifica el export, y la columna ALUMNO del libro se lee para validar y se descarta (FR-018 de la spec 001).

## Invariantes

1. La API rechaza una plantilla en una sección que no es Capstone con 409 «Esta sección no es de un curso Capstone. No se cargó nada.» y en una sección sin export publicado con 409 «Suba primero el export de Blackboard de la sección 420. La plantilla de proyectos se une a los estudiantes de ese export.», antes de abrir la transacción.
2. Una carga tiene como máximo una plantilla PUBLICADA, y reenviar el mismo archivo devuelve la constancia existente sin escribir nada.
3. Ni la constancia ni la pantalla muestran el valor leído de una celda, un nombre de estudiante, un título, una organización ni un RUC. Un rechazo dice la fila, la columna y el motivo.
4. P3 no habilita la zona de la plantilla por su cuenta. La habilitan `tipo_curso` y `proyectos_estado` de `GET /api/secciones`, que salen de la base en cada petición.
5. La tabla maestra de Capstone no cambia la vista tradicional ni el R-17 de una sección de carrera. La sección Capstone sale con la hoja «Cursos Capstone», que elige la API por `tipo_curso` (ADR-005 sigue vigente para el resto).
6. Mientras `GUARDIA_DATOS_INVENTADOS=1`, la plantilla solo admite códigos de 99000000 a 99999999 y RUC inventados (ADR-002), y P3 lo dice junto al campo de archivo.

## Alternativas consideradas

**Una sola subida con el export y la plantilla juntos.** Se descarta por ahora porque la carrera todavía no decide si la plantilla puede llegar antes que el export ni si se sube por tramos (D-26), y dos archivos en una petición duplican el riesgo del límite de 4,5 MB de Vercel.

**Una pantalla P6 propia para la plantilla.** Se descarta porque el profesor llega a la plantilla desde la misma sección y con la misma sesión, y una pantalla más obliga a repetir la elección de sección, el rótulo del piloto y el manejo de errores sin una historia que lo pida.

**Una ruta propia para la constancia de la plantilla (`GET /api/cargas-proyecto/{id}`).** Es la alternativa de J-14. Se descarta porque el bloque `proyectos` dentro de la constancia de la carga evita una ruta y una consulta, y P4 ya recibe la carga.

**Reemplazar la tabla maestra tradicional por la del formato nuevo.** Queda abierta en D-16, porque la muestra del formato nuevo no trae AÑO, CICLO, CÓDIGO DEL CURSO, CURSO, CICLO DEL CURSO ni ESTADO DE EVIDENCIA y falta saber si es un recorte o un diseño. El valor provisional es que las dos vistas conviven.

## Consecuencias

- `api.ts` suma una función, `subirProyectos`, y `tipos.ts` suma los tipos del bloque `proyectos` y de los campos nuevos de `GET /api/secciones`. Ningún componente llama a `fetch` directamente.
- `TablaRechazos.tsx` recibe la columna del encabezado de la plantilla (CÓDIGO, RUC, GRUPO y otras) además del PI, y sigue sin tener columna para un valor leído.
- La spec 001 y el corte 1 no cambian. Lo único que toca la spec 001 es el 409 de J-16, que el Back responde cuando el reemplazo del export (US-18 de la spec 001, corte 2) llega a una sección con plantilla publicada, y P3 debe mostrar ese texto cuando exista.
- La pantalla depende de que el Back publique `tipo_curso` y `proyectos_estado`, así que las fases 4 y 5 del Front esperan el corte 1 de la spec 001 y la migración V1_10.

## Criterios de aceptación

```bash
# 1. Ninguna pantalla nueva: el inventario de pantallas del Front sigue en cinco archivos (raíz del Front).
#    Esperado: 5 líneas (Ingreso, MisSecciones, SubirExport, ResultadoCarga y Cargas).
ls src/pantallas/*.tsx | wc -l
```

```bash
# 2. Ninguna llamada directa a fetch fuera de api.ts (raíz del Front).
#    Esperado: solo src/servicios/api.ts.
grep -rln "fetch(" src/ | sort
```

```bash
# 3. Ni la constancia ni la pantalla repiten un dato de proyecto de la plantilla inventada (raíz del Front, con las pruebas de Vitest).
#    Esperado: 0.
grep -rn "Estudiante Ficticio" src/ | wc -l
```

## Lo que todavía NO está

1. **El cierre de D-15 a D-29 y J-11 a J-16.** D-14 queda decidida el 2026-10-29, y los cursos Capstone son 450025, 450024 y 450026. Jefferson aprueba el PR de la spec 002 y lleva las decisiones a la carrera.
2. **Las reglas `BR-PROYECTOS-NN`.** La spec viva `proyectos-capstone` del Back las numera en la fase 1 (propuesta), y el contrato del Front las cita entonces.
3. **El mapa de celdas de «Cursos Capstone» (D-25).** El R-17 Capstone se prueba con valores provisionales hasta conseguirlo.
4. **El reemplazo de la plantilla y la declaración de US-25.** La primera queda fuera de alcance y la segunda es del corte 2.
