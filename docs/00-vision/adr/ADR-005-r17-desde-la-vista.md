# ADR-005: El R-17 se genera desde `v_r17_por_pi` con valores calculados, sin fórmulas ni personas

| | |
|---|---|
| **Estado** | Propuesta, pendiente de Jefferson |
| **Fecha** | 2026-10-28 |
| **Ámbito** | `abet_carga/r17.py`, `abet_carga/constancia.py`, `plantillas/R017_ambiental_general.xlsx`, `GET /api/cargas/{carga_id}/r17.xlsx`, vistas `abet.v_r17_por_pi` y `abet.v_tabla_maestra_pi`, tabla `abet.medicion` |

## Decisión

El R-17 se genera en el Back con openpyxl y Pillow sobre una copia vaciada y limpia de la plantilla vigente de Ambiental («Plantilla Base - Final.xlsx», hoja «Cursos de Carrera»), sin las referencias `#REF!` de la original. El generador escribe valores calculados, nunca fórmulas, en filas fijas y sin insertar filas.

Los números salen de la base. La cabecera (facultad, carrera, código, asignatura, sección y periodo) sale de las tablas de la sección, y los conteos por nivel, el nivel esperado o superior, el porcentaje y la meta salen de `abet.v_r17_por_pi`. La tabla de estudiantes (SO, PI, código y calificación) sale de `abet.medicion` de la carga, con `abet.estudiante` y `abet.pi`, ordenada por PI y por fila de origen (regla BR-R17-08 de la spec viva `r17` del Back). Son las mismas filas que `abet.v_tabla_maestra_pi` da para la sección, y la tabla no sale de esta vista porque no expone `carga_id` ni `fila_origen`. Como `v_r17_por_pi` solo ve cargas en estado PUBLICADA, una carga rechazada no produce R-17. El profesor escribe a mano las causas, las acciones y el comentario.

La vista no expone el número de calificados. El «(6 de 10)» que acompaña a cada porcentaje lo arma `r17.py` con `n_esperado_o_superior` sobre `n_total - n_sin_evidencia`, ambos de `v_r17_por_pi`, y el porcentaje mismo es `pct_logro_sobre_calificados`.

El R-17 lleva la franja PROVISIONAL y su nombre termina en `_PROVISIONAL`, como `R017_450002_410_2026-2_PROVISIONAL.xlsx`, si y solo si `v_r17_por_pi.provisional` es verdadero, es decir, mientras el conjunto de reglas de la carga no esté APROBADO o no tenga en estado DEFINIDO alguno de los parámetros NIVEL_ESPERADO, META_LOGRO o TRATO_SIN_EVIDENCIA. El libro suma al final la hoja «Constancia» con el archivo, la hoja, la huella SHA-256, las filas leídas, aceptadas y rechazadas, el estado, las fechas, la versión del programa, el conjunto de reglas, los avisos y los rechazos por motivo y fila. Ni el nombre del archivo ni sus propiedades llevan nombres de personas.

Escribir valores evita los rangos desalineados y las celdas vacías en los visores que no recalculan. Llenar la plantilla vigente conserva el logotipo, los anchos y las combinaciones que la Oficina de Calidad reconoce, y Pillow es obligatorio porque sin él openpyxl pierde el logotipo.

## Invariantes

1. Cada porcentaje del R-17 es igual a `pct_logro_sobre_calificados` de `v_r17_por_pi` para esa carga y ese PI.
2. Ninguna celda del libro empieza por «=».
3. Solo una carga PUBLICADA produce R-17. Para otra, la ruta responde 409 con «La carga no está publicada y no tiene R-17.».
4. El libro no contiene nombres de estudiantes, y sus propiedades autor y último autor están vacías o dicen «ABET_SIS_MED».
5. La franja PROVISIONAL aparece si y solo si `provisional` es verdadero en la vista.
6. La salida conserva la imagen del logotipo.

## Alternativas consideradas

**Construir el libro desde cero con estilos en código**, como el RM-04 de IQBF con exceljs. Conviene solo si la Oficina de Calidad aprueba un formato nuevo (D-08), y antes de esa decisión cuesta más que llenar la plantilla.

**Copiar las fórmulas de la plantilla.** Se descarta porque los visores que no recalculan muestran celdas vacías y porque una fórmula desalineada cambia el porcentaje sin que nadie lo vea.

**Portar el movimiento de filas del Colab.** Se descarta para el MVP porque son unas 150 líneas que mueven combinaciones, formatos y validaciones, y las filas fijas bastan para los 3 PI del caso de prueba.

## Consecuencias

- El MVP solo llena la hoja «Cursos de Carrera». La hoja «Cursos Capstone» espera que la base sepa el tipo de curso.
- La plantilla vaciada entra al repositorio con una excepción explícita en `.gitignore` y el preflight verifica que no lleve datos.
- El nombre del profesor no aparece en la cabecera mientras D-12 siga abierta, y la constancia muestra el correo institucional de quien sube el archivo.

## Criterios de aceptación

```sql
-- 1. Los porcentajes y los denominadores del caso con el 5 en la fila 3 (carga publicada de la sección 410).
-- Esperado: 5.1 | 60.0 | 10 ; 5.2 | 60.0 | 10 ; 5.3 | 70.0 | 10 ; provisional verdadero en las tres filas.
SELECT pi, pct_logro_sobre_calificados, n_total - n_sin_evidencia AS calificados, provisional
FROM abet.v_r17_por_pi
WHERE codigo_asignatura = '450002' AND seccion = '410' AND periodo = '2026-2'
ORDER BY pi;
```

```bash
# 2. El libro no tiene fórmulas ni nombres en sus propiedades (raíz del Back).
#    Esperado: «0 formulas» y una línea de autor vacía o «ABET_SIS_MED».
python - "R017_450002_410_2026-2_PROVISIONAL.xlsx" <<'PY'
import sys, openpyxl
wb = openpyxl.load_workbook(sys.argv[1])
n = sum(1 for ws in wb for row in ws.iter_rows() for c in row
        if isinstance(c.value, str) and c.value.startswith("="))
print(n, "formulas")
print("autor:", wb.properties.creator or "", "| ultimo:", wb.properties.lastModifiedBy or "")
PY
```

```bash
# 3. El R-17 de una carga rechazada no se entrega (Preview, con sesión de prueba).
#    Esperado: 409 y un cuerpo JSON con «La carga no está publicada y no tiene R-17.».
curl -s -w '\n%{http_code}\n' -b "$COOKIES_PRUEBA" "$URL_FRONT/api/cargas/$CARGA_RECHAZADA/r17.xlsx"
```

```bash
# 4. La salida conserva el logotipo (raíz del Back).
#    Esperado: al menos una entrada xl/media/ en el listado.
unzip -l R017_450002_410_2026-2_PROVISIONAL.xlsx | grep 'xl/media/'
```

## Lo que todavía NO está

1. **La plantilla oficial del R-17 (D-08).** La copia vaciada es provisional.
2. **El trato del estudiante sin evidencia (D-05).** El R-17 muestra los dos porcentajes de la vista mientras siga abierto.
3. **La hoja «Cursos Capstone»** y el tipo de curso en la base.
4. **El límite de 142 filas de la tabla de estudiantes.** La propuesta es responder 422 con «La sección supera las filas de la plantilla del R-17.» a una sección de más de 47 estudiantes con 3 PI, y falta confirmarla en la spec viva `r17`.
