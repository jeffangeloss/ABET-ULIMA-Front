# ADR-010: El resumen del curso se muestra a la coordinación en el sistema, desde la ruta 20

| | |
|---|---|
| **Estado** | Aceptada (spec 009 del Back, aprobada por Jefferson en el chat el 2026-11-24, «Sí, apruébala»), vigente con el código de la spec 009 |
| **Fecha** | 2026-11-24 |
| **Enmienda** | ADR-008, en sus frases «Power BI queda para la coordinación, en una spec aparte» y «Mientras D-32 siga abierta, P6 no suma secciones ni resume un SO en una cifra». Sus invariantes 1 a 8 de la ruta 12 no cambian |
| **Ámbito** | La ruta 20 y la 21 de `docs/03-api/contrato.md` (sección 16), `app/rutas/resumen_curso.py` (propuesta), `abet_carga/resultados.py`, `db/herramientas/conciliar_tabla_maestra.py`, `src/pantallas/ResumenCurso.tsx` (P8, propuesta), `src/App.tsx` y `src/pantallas/Avance.tsx` |

## Decisión

La coordinación ve el resumen de un curso en el propio sistema, en la pantalla P8 «Resumen del curso», con la forma de la página «Resumen Curso» del tablero de Power BI de Stefanny Montaño y con las cifras de `abet.v_r17_por_pi`. Power BI no es necesario para ese resumen, porque la base ya calcula cada sección y el sistema ya conoce el alcance de cada coordinación, mientras Power BI no puede saber quién la mira sin llevar a su inquilino una tabla de correos y la tabla maestra con códigos de estudiantes.

Las cifras salen de la ruta 20, `GET /api/resumen-curso?periodo=2026-1&asignatura=5643`, que atiende solo a la cuenta COORDINADOR y no a la ruta 12, porque la ruta 12 es una por usuario, no recibe identificadores y también la usa el profesor (J-61). La ruta suma estudiantes por PI y curso, que es el valor provisional de D-32 que el tablero ya usa, y marca el resultado como provisional mientras el conjunto de reglas lo sea (J-60). El porcentaje y el promedio de calificación se redondean en PostgreSQL con numeric, y la meta sale de la misma función que el plan de acción del R-17.

P8 dibuja las barras con HTML y Tailwind, sin biblioteca de gráficos, como fija J-24 de ADR-008. La torta de secciones del tablero se reemplaza por el conteo escrito con una barra de dos tramos (J-62), y las vistas por profesor del tablero no entran, porque la base no guarda nombres de profesores, BR-RESULTADOS-10 prohíbe un orden de docentes y D-57 sigue abierta.

## Invariantes

1. Cada porcentaje de sección de la ruta 20 es igual a `pct_logro_sobre_calificados` de `abet.v_r17_por_pi` para su carga y al porcentaje del bloque II de su R-17.
2. El curso suma conteos y nunca promedia porcentajes.
3. La ruta 20 solo responde con datos a la cuenta COORDINADOR y dentro de su alcance, y fuera de él responde 200 con `indicadores` vacío.
4. La respuesta trae solo las claves de su lista cerrada, sin datos de personas.
5. P8 no recalcula cifras, ordena por número de sección y no muestra profesores.

## Alternativas consideradas

**El campo `agregados` de la ruta 12 (US-80 de la spec 008).** Se descarta porque la coordinación de la carrera recibiría unas 150 secciones para ver un curso y porque la ruta 12 no recibe identificadores. La sección 15.6 del contrato queda sustituida.

**Power BI con seguridad por filas para la coordinación.** Se descarta por las mismas razones de ADR-008, con licencias sin confirmar y una copia de los códigos de estudiante en el inquilino de Microsoft.

**Recharts u otra biblioteca de gráficos.** Se descarta como en ADR-008, porque las barras de P6 ya resuelven el dibujo sin dependencias.

## Consecuencias

- El contrato suma la sección 16 con las rutas 20 y 21, y el esquema OpenAPI pasa a 11 y 12 caminos cuando llega su código.
- La spec viva `resultados` del Back suma BR-RESULTADOS-12 a BR-RESULTADOS-15 y un cambio fechado de BR-RESULTADOS-10.
- `abet_app` no gana permisos y no hay migraciones.
- Si D-32 fija otro método o D-56 muestra otra fórmula en el tablero, cambian la consulta del curso y sus escenarios, no la pantalla.
