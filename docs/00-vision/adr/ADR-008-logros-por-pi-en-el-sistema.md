# ADR-008: Los logros por PI se muestran en el sistema desde `v_r17_por_pi`, con el alcance de cada usuario

| | |
|---|---|
| **Estado** | Aceptada y vigente (spec 004 del Back, aprobada por Jefferson en el chat el 2026-11-18) |
| **Fecha** | 2026-11-18 |
| **Ámbito** | `GET /api/resultados` (ruta 12 de `docs/03-api/contrato.md`), `app/rutas/resultados.py`, `abet_carga/resultados.py`, `_plan_de_accion` de `abet_carga/r17.py`, `app/permisos.py` (sin cambios), los routers de `app/rutas/`, `src/pantallas/MisLogros.tsx` (P6), `src/servicios/api.ts`, la sección 3.4 del contrato y la vista `abet.v_r17_por_pi` |

## Decisión

El profesor ve sus logros por resultado del estudiante (student outcome, SO) en el propio sistema, en la pantalla P6 «Mis logros por SO» (propuesta), y no en Power BI (J-21 de la spec 004). Power BI no puede saber hoy quién es el profesor, porque el rol `powerbi_lectura` no entra al esquema `acceso` y la tabla maestra trae la columna PROFESOR siempre nula. Filtrar por profesor obligaría a llevar a Power BI una tabla de correos y secciones, y esa misma tabla maestra entrega el código de cada estudiante. Las licencias siguen sin confirmar (H75 y P27), el prototipo no tiene seguridad por filas y muestra a cualquier usuario la lista y el orden de los docentes (H05). Power BI queda para la coordinación, en una spec aparte.

La ruta 12, `GET /api/resultados?periodo=2026-2`, es una por usuario y no recibe identificadores de sección ni de carga (J-23). Devuelve solo las secciones que `app/permisos.secciones_visibles()` da al usuario y lee `abet.v_r17_por_pi` por el `carga_id` de la carga PUBLICADA de cada una, en una sola instantánea. El SO, el indicador de desempeño (performance indicator, PI) y el instrumento salen del plan de la carga por `pi_id` y `so_id`, nunca por un código suelto, porque los números y códigos solo son únicos dentro de una versión del catálogo.

Los porcentajes viajan por la API como números de un decimal, los mismos que redondea la vista, junto a los conteos y a `en_meta` (J-22). Esta decisión cambia la frase de la sección 3.4 del contrato, que hoy reserva los porcentajes al R-17. Si el Front recibiera solo conteos, redondearía en binario lo que PostgreSQL redondea en `numeric`, y una diferencia de 0,05 bastaría para que la pantalla y el R-17 discreparan, el mismo defecto que H13 encuentra en el tablero. `en_meta` lo decide una sola función pura del Back, la que usa el plan de acción del bloque II del R-17, y el Front solo da formato.

P6 dibuja cada barra con HTML y Tailwind, con el ancho en `style`, sin biblioteca de gráficos (J-24). Cada fila escribe su PI, su sección, su porcentaje, su fracción y su estado, y la barra lleva `aria-hidden`, de modo que el lector de pantalla lee el texto y ningún estado depende solo del color. Tailwind 4 genera solo las clases que encuentra escritas en el código, y por eso el ancho no puede ser una clase armada en ejecución.

Antes de la ruta 12, cada router con datos declara la dependencia de sesión, y una prueba recorre las rutas registradas en la aplicación con una lista cerrada de rutas públicas (J-25). Hoy cada ruta pide la sesión por su cuenta y ninguna prueba recorre las rutas, así que una ruta nueva que la olvide respondería 200 sin sesión. La vista no cambia en este sprint (J-26), así que el despliegue lleva solo código.

## Invariantes

1. Cada `pct_sobre_calificados` de la ruta 12 es igual a `pct_logro_sobre_calificados` de `abet.v_r17_por_pi` para esa carga y ese PI, y al porcentaje del bloque II de su R-17. Este invariante amplía el invariante 1 de ADR-005.
2. `en_meta` sale de una sola función del Back, la misma del plan de acción del R-17, y el Front no compara cifras.
3. La ruta 12 devuelve solo las secciones de `app/permisos.secciones_visibles()` y no recibe identificadores, así que un `seccion_id` en la consulta no cambia la respuesta.
4. Ninguna ruta con datos responde sin una sesión vigente.
5. La respuesta trae solo las claves de su lista cerrada, sin códigos ni nombres de estudiantes, correos, `subida_por`, `nombre_archivo` ni `sha256`.
6. Un nulo de la vista viaja como `null`, y P6 nunca lo dibuja como una barra de 0 %.
7. P6 no usa biblioteca de gráficos, y cada barra tiene su cifra y su estado escritos.
8. P2 y P4 siguen sin mostrar porcentajes, que solo muestran P6 y el R-17.

## Alternativas consideradas

**Power BI con seguridad por filas sobre la tabla maestra** y una tabla de alcance con USERPRINCIPALNAME() (H05). Se descarta para el profesor, porque exige licencias sin confirmar, datos de los docentes fuera de `acceso` y una copia de los códigos de estudiante en el inquilino de Microsoft, y porque calcula aparte una cifra que ya calcula la base. Queda para la coordinación, con esas condiciones previas.

**Que el Front calcule los porcentajes desde los conteos.** Se descarta porque su redondeo puede diferir del de la vista y del R-17 (H13), y porque abre una segunda regla de la meta.

**Una ruta por carga**, `GET /api/cargas/{carga_id}/resultados`. Se descarta porque el Front haría una petición por sección, del orden de 150 para el coordinador, y repetiría el control de alcance en cada una.

**Un `seccion_id` opcional en la ruta 12.** Se descarta porque ninguna historia lo pide y abre la única superficie de identificador ajeno de la ruta.

**Recharts o Chart.js.** Se descartan porque suman peso al paquete y una dependencia más que vigilar con Dependabot, y porque sus gráficos no se leen con un lector de pantalla sin trabajo propio.

**Ampliar `abet.v_r17_por_pi` con `seccion_id`, `pi_id`, `so_id` y `n_calificados`.** Queda para después (J-26), porque exige Flyway en Neon y el permiso del callback, y el sprint no necesita migración.

## Consecuencias

- La sección 3.4 del contrato cambia con la aprobación de la spec 004 (T011, 2026-11-18), y su sección 10 suma `/api/resultados` a la cuenta de caminos de OpenAPI y la carpeta `specs/004-reportes-docente/aceptacion/` a la comprobación de mensajes.
- El Back gana una función pura de la meta, que `abet_carga/r17.py` también usa, y un router más con la dependencia de sesión.
- `abet_app` no gana permisos, porque ya lee la vista, `abet.so`, `abet.pi`, `abet.instrumento` y `abet.plan_medicion`.
- El coordinador recibe del orden de 150 secciones y 450 indicadores, que P6 agrupa por asignatura y nunca ordena por resultado, para no armar el ranking de docentes que critica H05.
- Mientras D-32 siga abierta, P6 no suma secciones ni resume un SO en una cifra, y tampoco repite el agregado de M24 a M26 del R-17, que usa el corte fijo en el nivel 3.

## Criterios de aceptación

Los criterios se corren cuando exista el código, contra la base desechable de las pruebas o contra la vista previa (Preview) de `develop`, nunca contra Production.

```sql
-- 1. Las cifras de la vista que la ruta 12 repite para la 410 de 450002, con el export que trae el 5 en la fila 3.
-- Esperado: 5.1 | 60.0 ; 5.2 | 60.0 ; 5.3 | 70.0.
SELECT pi, pct_logro_sobre_calificados
FROM abet.v_r17_por_pi
WHERE codigo_asignatura = '450002' AND seccion = '410' AND periodo = '2026-2'
ORDER BY pi;
```

```bash
# 2. La ruta 12 no trae códigos de estudiante ni correos (Preview, con la sesión de prueba de docente410).
#    Esperado: «0 códigos» y «0 correos».
curl -s -b "$COOKIES_PRUEBA" "$URL_FRONT/api/resultados?periodo=2026-2" \
  | python3 -I -c "import re, sys; t = sys.stdin.read(); print(len(re.findall(r'(?<![0-9])[0-9]{8}(?![0-9])', t)), 'códigos'); print(t.count('@'), 'correos')"
```

```bash
# 3. Sin sesión no hay resultados (Preview).
#    Esperado: una línea con 401 y otra con «cache-control: no-store».
curl -s -o /dev/null -D - "$URL_FRONT/api/resultados?periodo=2026-2" | grep -i -E '^HTTP|^cache-control'
```

```bash
# 4. El Front no suma una biblioteca de gráficos (raíz del Front).
#    Esperado: «0».
node -e "const p = require('./package.json'); const d = { ...p.dependencies, ...p.devDependencies }; console.log(Object.keys(d).filter((n) => /chart|recharts|d3|plotly|victory|nivo/i.test(n)).length)"
```

## Lo que todavía NO está

1. **Los criterios 2 y 3 en la vista previa de `develop`.** La ruta 12, P6 y la guardia de sesión por router existen desde el 2026-11-18 en `feat/004-reportes-docente` del Back y del Front, y sus pruebas cubren los cuatro criterios en la base desechable, en Vitest y en el humo local (`specs/004-reportes-docente/audit.md` del Back). Los criterios 2 y 3 corren contra la vista previa de `develop` después de fusionar los dos PR (T071).
2. **Las decisiones de la carrera.** D-32 (consolidado y cifra por SO), D-33 (agregado del curso o de la carrera) y D-34 (descripción del instrumento) siguen abiertas.
3. **Power BI para la coordinación**, con sus licencias, la región de su inquilino y una vista sin códigos de estudiante.
