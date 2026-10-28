# ADR-003: El Back es Python 3.12 con FastAPI y la biblioteca `abet_carga`

| | |
|---|---|
| **Estado** | Propuesta, pendiente de Jefferson (decisión J-01) |
| **Fecha** | 2026-10-28 |
| **Ámbito** | `abet_carga/` (`lector.py`, `validacion.py`, `carga.py`, `r17.py`, `constancia.py`), `app/` (`main.py`, `sesion.py`, `permisos.py`, `rutas/`), `plantillas/R017_ambiental_general.xlsx`, `tests/` del Back |

## Decisión

El Back se escribe en Python 3.12 con FastAPI. El trabajo de dominio vive en la biblioteca `abet_carga`, que no importa FastAPI y sirve igual a la API y a un comando. La API llama a una función pura que recibe los bytes del archivo y la sección y devuelve la constancia, y el comando llama a la misma función.

El lector abre el export con openpyxl en modo de solo lectura (`read_only=True, data_only=True`) y sin pandas. Antes de abrir el libro, revisa el zip con `zipfile` (tamaño descomprimido total y por parte, número de partes, sin `vbaProject.bin` ni `externalLinks`) y rechaza todo lo que no sea un .xlsx por sus primeros bytes. openpyxl usa defusedxml cuando está instalado, lo que cierra los ataques de XML conocidos sobre archivos subidos por usuarios. La conexión a Neon usa psycopg 3 con `prepare_threshold=None`, porque el pooler de Neon trabaja en modo transacción.

Tres razones sostienen la decisión frente a TypeScript con Hono, que es la pila de IQBF-ULIMA_Back. El único lector de Excel de IQBF es exceljs, cuyas vulnerabilidades IQBF acepta en `.snyk` porque su API no lee archivos de usuarios, justificación que en ABET no vale. El Colab que hoy usa la carrera y el generador de V1_03 ya están en Python con openpyxl. Y el equipo de la carrera revisa reglas de lectura en Python.

## Invariantes

1. `abet_carga` no importa `fastapi` ni `starlette`.
2. Ningún módulo del camino de la petición importa pandas.
3. Una prueba falla si `openpyxl.xml.DEFUSEDXML` es falso.
4. Un archivo de más de 1 MB, con macros, con vínculos externos o que no es un .xlsx se rechaza antes de abrir el libro.
5. Toda escritura de una carga ocurre en una sola transacción de psycopg, que se deshace entera ante cualquier error.
6. Los errores de la API tienen la forma `{ "detail": "mensaje" }` en español para el usuario, como en IQBF.

## Alternativas consideradas

**TypeScript con Hono, como IQBF-ULIMA_Back.** Daría el andamiaje en horas, pero obliga a elegir y auditar un lector de .xlsx en Node sin precedente en los repositorios de Jefferson y rompe la reutilización del Colab.

**Jinja2 con HTMX servido por el mismo FastAPI.** Quitaría el segundo despliegue y el problema de cookies entre dominios. Se descarta porque el repositorio del Front ya existe con la pila de IQBF (React, Vite, TypeScript y Tailwind), y la reescritura de rutas al mismo origen del ADR-004 resuelve las cookies.

**pandas para leer el export.** Se descarta porque una sola celda vacía en Username convierte la columna en decimal («99000001.0»), defecto que hoy detiene el Colab, y porque pandas agranda el arranque en frío de la función.

## Consecuencias

- El preflight de secretos y los jobs de la CI que IQBF tiene en Node se portan a bash o a Python, sin cambiar su regla.
- La prueba de pytest-bdd con escenarios en español (ADR-006) corre sobre la misma pila de pytest.
- Si Jefferson elige Hono (J-01), este ADR se reemplaza y cambian el lector, las pruebas y la estructura del Back, pero no el contrato de la API.

## Criterios de aceptación

```bash
# 1. abet_carga no depende de FastAPI (raíz del Back).
#    Esperado: sin salida (código 1 de grep).
grep -rnE '^\s*(from|import) (fastapi|starlette)' abet_carga/
```

```bash
# 2. Nada del camino de la petición importa pandas (raíz del Back).
#    Esperado: sin salida (código 1 de grep).
grep -rnE '^\s*(from|import) pandas' abet_carga/ app/
```

```bash
# 3. openpyxl usa defusedxml en el entorno del Back.
#    Esperado: True.
python -c "import openpyxl.xml as x; print(x.DEFUSEDXML)"
```

```bash
# 4. El lector rechaza un archivo que no es .xlsx aunque su nombre lo diga (raíz del Back).
#    Esperado: la prueba pasa y la respuesta es 422 con «El contenido del archivo no es un libro
#    de Excel aunque su nombre termine en .xlsx.», sin filas nuevas en abet.archivo_origen.
pytest tests/unit -k "renombrado_desde_pdf"
```

## Lo que todavía NO está

1. **La decisión J-01.** Jefferson todavía no elige entre FastAPI y Hono.
2. **La medida del arranque en frío** de la función de Python en Vercel.
3. **El límite de la tabla de estudiantes del R-17.** La hoja «Cursos de Carrera» admite 142 filas, así que con 3 PI una sección de más de 47 estudiantes la desborda. La propuesta de la spec es responder 422 con «La sección supera las filas de la plantilla del R-17.» en lugar de truncar la tabla, y falta confirmarla en la spec viva `r17`.
