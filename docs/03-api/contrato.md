# Contrato de la API

> **Estado 2026-10-28.** La interfaz de programación de aplicaciones (application programming interface, API) todavía no existe. Este es el contrato que el Back implementa en la fase 3 del plan, escrito antes del código como exige [`docs/specs/api-contracts.md`](../specs/api-contracts.md), y cada ruta cita las reglas `BR-` numeradas de las specs vivas del Back (fase 1, tareas T011 a T015). Cuando exista el código, cada endpoint cita su archivo y este documento dice, si discrepan, cuál de los dos está mal.

Este documento describe todas las rutas de ABET-ULIMA-Back con su cuerpo, su respuesta y sus errores. El índice corto vive en `docs/specs/api-contracts.md`, y las reglas viven en las specs vivas del Back. Son BR-ACCESO-01 a BR-ACCESO-09 (`specs/features/acceso/acceso.spec.md`), BR-PERIODO-01 a BR-PERIODO-04 (`specs/features/periodo/periodo.spec.md`), BR-CARGA-01 a BR-CARGA-20 (`specs/features/carga-export/carga-export.spec.md`) y BR-R17-01 a BR-R17-10 (`specs/features/r17/r17.spec.md`). Los mensajes literales y la forma de las respuestas salen de los escenarios de `specs/001-mvp-carga-r17/aceptacion/*.feature` del Back. Si un ejemplo de aquí y un escenario discrepan, gana el escenario. Lleva la marca «(propuesta)» lo que ningún escenario fija y también lo que un escenario usa sin que las decisiones de la spec lo fijen, como lo marcan los `.feature`. Los ejemplos usan solo datos inventados.

## 1. Cómo está montada

La API es una aplicación FastAPI en Python 3.12 (ADR-003) con prefijo `/api`, desplegada como proyecto propio de Vercel en `gru1`. El navegador nunca la llama por su dominio. El `vercel.json` del Front reescribe `/api/:path*` hacia el Back (una reescritura de rutas, rewrite en Vercel), así que para el navegador la API vive en el mismo origen que las pantallas y la cookie de sesión es de primera parte (ADR-004). En local, el proxy de Vite hace lo mismo hacia la API en la Mac.

La API lee y escribe en Neon con el rol `abet_app` por la cadena con pooler (el agrupador de conexiones de Neon). Toda carga ocurre en una sola transacción (ADR-001).

Al arrancar, la API comprueba contra la base el periodo de `PERIODO_VIGENTE` y el conjunto de reglas de `CONJUNTO_REGLAS`, porque la base no marca ninguno como vigente (BR-PERIODO-01 y BR-PERIODO-02). Si no los encuentra, se detiene con «PERIODO_VIGENTE 2027-1 no existe en abet.periodo» o «CONJUNTO_REGLAS R-NO-EXISTE no existe para Ambiental» (propuesta).

## 2. Tabla resumen de rutas

| # | Método | Ruta | Sesión | Éxito | Qué hace | Historia | Reglas | Corte |
|---|---|---|---|---|---|---|---|---|
| 1 | POST | `/api/sesion` | No | 200 | Valida correo y contraseña y fija la cookie `abet_sesion` | US-05 | BR-ACCESO-02 a BR-ACCESO-05 | 1 |
| 2 | GET | `/api/sesion` | Sí | 200 | Devuelve el usuario actual (correo y rol) | US-05 | BR-ACCESO-06 | 1 |
| 3 | DELETE | `/api/sesion` | Opcional (propuesta) | 204 | Cierra la sesión y vence la cookie | US-05 | BR-ACCESO-06 | 1 |
| 4 | GET | `/api/secciones?periodo=2026-2` | Sí | 200 | Lista las secciones al alcance del usuario con el estado de su carga | US-06 | BR-PERIODO-01, BR-PERIODO-04 y BR-ACCESO-07 | 1 |
| 5 | POST | `/api/secciones/{seccion_id}/cargas` | Sí | 201 o 200 | Sube el export, lo carga en una transacción y devuelve la constancia | US-07 a US-14, US-21 | BR-CARGA-01 a BR-CARGA-17, BR-CARGA-18 (corte 2), BR-PERIODO-02 y BR-ACCESO-08 | 1 |
| 6 | GET | `/api/cargas/{carga_id}` | Sí | 200 | Devuelve la constancia de una carga | US-16, US-19 | BR-R17-10 y BR-ACCESO-08 | 1 |
| 7 | GET | `/api/cargas/{carga_id}/r17.xlsx` | Sí | 200 | Entrega el R-17 con la hoja «Constancia», solo de cargas en estado PUBLICADA | US-15, US-16 | BR-R17-01 a BR-R17-09 y BR-ACCESO-08 | 1 |
| 8 | GET | `/api/cargas?seccion_id={seccion_id}` | Sí | 200 | Lista las cargas al alcance del usuario | US-19 | BR-CARGA-20 | 2 |
| 9 | POST | `/api/secciones/{seccion_id}/cargas?reemplaza={carga_id}` | Sí | 201 | Reemplaza la carga publicada en una transacción | US-18 | BR-CARGA-19 | 2 |
| 10 | POST | `/api/sesion/codigo` | No | 202 | Envía el código de acceso al correo, con la misma respuesta exista o no | US-20 | BR-ACCESO-09 | 2 |

## 3. Convenciones

### 3.1 Forma del error

Todo error de la API es un objeto JavaScript Object Notation (JSON) con un solo campo, en español y escrito para la persona que usa la pantalla. El Front lo muestra sin reescribirlo.

```jsonc
{ "detail": "La sección no está a su cargo." }
```

Ningún `detail` lleva el valor leído de una celda, un código de estudiante, un nombre ni la ruta local del archivo. Los mensajes de interfaz pueden ir en pretérito («No se guardó nada.»), porque son textos para la pantalla y los escenarios los comparan tal cual.

FastAPI responde por omisión un cuerpo mal formado con una lista en `detail`, así que el Back reemplaza ese manejador para que el 422 de validación también traiga un texto, «La petición no tiene la forma esperada.» (propuesta).

### 3.2 Códigos de estado

| Código | Cuándo | Qué hace la persona |
|---|---|---|
| 200 | Lectura correcta, o el mismo archivo ya está publicado en esa misma sección | Sigue |
| 201 | Se registra una carga nueva, PUBLICADA o RECHAZADA (el campo `estado` dice cuál) | Revisa la constancia en P4 |
| 202 | Pedido de código recibido (corte 2) | Revisa su correo |
| 204 | Sesión cerrada | Nada |
| 401 | Sin sesión, sesión vencida o credenciales que no coinciden | Ingresa otra vez |
| 403 | La sección o la carga no está a cargo del usuario | Elige una sección propia |
| 404 | La sección o la carga no existe (propuesta) | Vuelve a P2 |
| 409 | La sección ya tiene otra carga publicada, el archivo ya está publicado en otra sección o se pide el R-17 de una carga que no está PUBLICADA | Lee el `detail` |
| 422 | El archivo no se puede cargar o espera la confirmación de su sección (corte 2), la sección no tiene plan de medición, el cuerpo o el periodo de la petición no tienen la forma esperada o el R-17 no cabe en la plantilla. No se guarda nada | Lee el `detail` y corrige el archivo o la petición |
| 429 | Demasiados intentos de ingreso | Espera y vuelve a intentar |
| 500 | Error interno, con la transacción deshecha | Intenta de nuevo |

### 3.3 Identificadores

`seccion_id` y `carga_id` son los enteros de `abet.seccion` y `abet.carga` que devuelven las rutas 4 y 5. El Front nunca los arma a mano. La API comprueba en cada petición que el identificador esté al alcance del usuario, así que conocer un número ajeno solo produce 403 (BR-ACCESO-08).

### 3.4 Horas y cifras

Las horas viajan en el formato de la norma ISO 8601 de la Organización Internacional de Normalización (International Organization for Standardization), con el desfase de Lima (`2026-10-28T10:15:00-05:00`) y el Front las muestra en hora de Lima. Los porcentajes no viajan por la API, porque viven solo en el R-17.

## 4. Sesión

La sesión es una cookie `abet_sesion` de primera parte, sin atributo Domain, con HttpOnly, Secure, SameSite=Lax, 12 horas de vida (Max-Age 43200) y `Path=/` (propuesta). Su valor es un token aleatorio cuyo hash SHA-256 (Secure Hash Algorithm de 256 bits) vive en `acceso.sesion`, y en cada petición la API lee el rol y las secciones del usuario desde la base (BR-ACCESO-03 y BR-ACCESO-06). El cuerpo de ninguna respuesta trae el token, y el registro de la aplicación no guarda la contraseña ni el valor de la cookie, porque ninguna credencial entra a los registros (Principio II de la constitución del Back).

#### `POST /api/sesion`: iniciar sesión con contraseña asignada (BR-ACCESO-02 a BR-ACCESO-05)

Cuerpo `IngresoEntrada` (propuesta).

| Campo | Tipo | Obl. |
|---|---|---|
| `correo` | texto, se normaliza a minúsculas sin espacios | Sí |
| `contrasena` | texto | Sí |

```jsonc
// Petición
{ "correo": "docente410@example.invalid", "contrasena": "<la que asigna Jefferson>" }

// Respuesta 200, con la cabecera Set-Cookie de abet_sesion
{ "correo": "docente410@example.invalid", "rol": "PROFESOR" }
```

Reglas y por qué existen.

- El mismo 401 con «Correo o contraseña incorrectos.» para un correo desconocido, un usuario sin contraseña, un usuario inactivo y una contraseña errada, sin cabecera Set-Cookie, para no revelar quién está autorizado (BR-ACCESO-04).
- El correo se compara sin espacios ni mayúsculas, así que « Docente410@EXAMPLE.invalid » entra como `docente410@example.invalid` (BR-ACCESO-03).
- La contraseña se compara contra el hash Argon2id de `acceso.credencial` y nunca aparece en el registro de la aplicación (BR-ACCESO-02).
- Cinco intentos fallidos seguidos de un mismo correo en 15 minutos hacen que el sexto responda 429 con «Demasiados intentos. Espere 15 minutos.», aunque traiga la contraseña correcta, y no bloquean a otro correo (valor provisional, BR-ACCESO-05). La cuenta vive en `acceso.intento_fallido`, que guarda de cada fallo el código de autenticación de mensajes basado en hash (hash-based message authentication code, HMAC) con SHA-256 del correo normalizado, exista o no el usuario. Así, un correo desconocido, un usuario sin contraseña, uno inactivo y una contraseña errada reciben el mismo 429 en el sexto intento, y un ingreso correcto deja fuera de la cuenta los fallos anteriores del mismo usuario sin UPDATE ni DELETE.
- Un usuario marcado inactivo en `acceso.usuario_autorizado` pierde sus sesiones abiertas, que responden 401 (BR-ACCESO-06).

Errores 401, 422 (cuerpo mal formado) y 429.

#### `GET /api/sesion`: usuario actual (BR-ACCESO-06)

Sin cuerpo. Responde 200 con `{ "correo": "...", "rol": "PROFESOR" | "COORDINADOR" }`, o 401 con «La sesión venció. Ingrese otra vez.» (propuesta) si no hay sesión vigente.

#### `DELETE /api/sesion`: cerrar sesión (BR-ACCESO-06)

Sin cuerpo. Fija `expira_en` de la fila de `acceso.sesion` en `least(expira_en, clock_timestamp())`, que es la hora del cierre en una sesión vigente y deja igual una ya vencida, sin borrar la fila, responde 204 y devuelve la cookie con Max-Age 0. Después, la cookie anterior recibe 401. Sin sesión también responde 204, para que cerrar sesión nunca falle (propuesta).

## 5. Secciones

#### `GET /api/secciones?periodo=2026-2`: secciones al alcance del usuario (BR-PERIODO-01, BR-PERIODO-04 y BR-ACCESO-07)

El profesor recibe solo las secciones que `acceso.docente_seccion` le asigna y el coordinador recibe todas las de la carrera, sin necesitar filas en `acceso.docente_seccion`. Sin `periodo`, la API usa `PERIODO_VIGENTE`.

```jsonc
// Respuesta 200 para docente410@example.invalid con la carga publicada del export correcto
[
  {
    "seccion_id": 1,
    "asignatura": { "codigo": "450002", "nombre": "Principios de Ingeniería Sostenible" },
    "numero": "410",
    "periodo": "2026-2",
    "pi": ["5.1", "5.2", "5.3"],
    "tiene_plan": true,
    "estado": "PUBLICADA",
    "carga_id": 7,
    "filas_leidas": 11,
    "filas_aceptadas": 11
  }
]
```

Reglas y por qué existen.

- La regla de visibilidad («los de arriba pueden ver hacia abajo, pero no los de abajo hacia arriba») vive solo aquí y en `app/permisos.py`, y la usan las rutas 5 a 9 (BR-ACCESO-07).
- `estado` vale «PUBLICADA» cuando la sección tiene una carga en ese estado, con su `carga_id`, `filas_leidas` y `filas_aceptadas`, y vale «SIN_CARGA» en otro caso, con esos tres campos en `null`. Una sección cuyas cargas están todas RECHAZADA o REEMPLAZADA sale también «SIN_CARGA» (propuesta).
- `tiene_plan` es falso cuando `abet.plan_medicion` no tiene filas para esa asignatura y periodo, y entonces `pi` viene vacío. P2 muestra «La carrera aún no registra el plan de medición de esta sección» y la ruta 5 rechaza la subida (BR-PERIODO-04).
- La respuesta del profesor no trae ningún dato de secciones ajenas.

Errores 401 y 422 (periodo con formato distinto de `AAAA-C`, propuesta).

## 6. Cargas

#### `POST /api/secciones/{seccion_id}/cargas`: subir el export y cargarlo (BR-CARGA-01 a BR-CARGA-17, BR-CARGA-18 del corte 2, BR-PERIODO-02 y BR-ACCESO-08)

Cuerpo multipart con el campo `archivo` (.xlsx de hasta 1 MB) y, en el corte 2, el campo opcional `confirmar_seccion` (US-21). La API guarda el nombre del archivo sin ruta en `abet.archivo_origen.nombre_archivo` y nunca guarda sus bytes. Ningún campo de la petición apaga la guardia de datos inventados.

En el corte 1 solo sube el profesor asignado a la sección en `acceso.docente_seccion`. El coordinador ve todas las secciones y descarga cualquier R-17, pero no sube, y recibe el mismo 403. En el corte 2 el coordinador puede reemplazar la carga de cualquier sección con la ruta 9.

El orden del trabajo es fijo (BR-CARGA-03). Primero comprueba la sesión, el alcance y el plan de la sección, después calcula la huella SHA-256 de todo cuerpo recibido y comprueba el tamaño, el tipo por la extensión y los primeros bytes, revisa el zip, abre el libro, lee la columna Username y aplica la guardia de datos inventados. Luego busca la huella en `abet.archivo_origen`, comprueba si la sección ya tiene otra carga publicada y si el archivo declara su sección, y solo entonces cuenta las filas, las valida en memoria y escribe el resultado en una transacción. Los 409 y los 422 de este orden se responden antes de escribir. La huella va antes del tope de 1 MB porque el cuerpo ya está en memoria y Vercel detiene todo cuerpo de más de 4,5 MB antes de que llegue a FastAPI, así que el registro de la aplicación guarda la huella de cada rechazo por tamaño, por archivo ilegible o por la guardia (BR-CARGA-08).

```jsonc
// Respuesta 201 con el export que trae un 5 en la columna 5.2 de la fila 3
{
  "carga_id": 7,
  "estado": "PUBLICADA",
  "seccion": { "seccion_id": 1, "asignatura": "450002", "numero": "410", "periodo": "2026-2" },
  "nombre_archivo": "export_inventado_410_con_error.xlsx",
  "hoja": "gc_SINTETICO_20262_450002_410_f",
  "sha256": "<64 caracteres hexadecimales en minúscula>",
  "filas_de_datos": 11,
  "filas_leidas": 11,
  "filas_aceptadas": 10,
  "filas_rechazadas": 1,
  "mensaje": null,
  "columnas": [
    { "pi": "5.1", "puntaje_maximo_declarado": 4 },
    { "pi": "5.2", "puntaje_maximo_declarado": 4 },
    { "pi": "5.3", "puntaje_maximo_declarado": 20 }
  ],
  "rechazos": [
    { "fila": 3, "pi": "5.2", "motivo": "NIVEL_FUERA_DE_ESCALA", "efecto": "RECHAZA_FILA",
      "mensaje": "Fila 3, PI 5.2, nivel fuera de la escala 1 a 4. La fila completa queda fuera, también de 5.1 y 5.3." }
  ],
  "avisos": [
    { "pi": "5.3", "motivo": "PUNTAJE_MAXIMO_DISTINTO", "efecto": "AVISO",
      "mensaje": "PI 5.3. La columna declara 20 puntos y sus notas están entre 1 y 4. Se cargó igual." }
  ],
  "conjunto_reglas": "R-2026-BORRADOR",
  "conjunto_reglas_estado": "BORRADOR",
  "parametros_pendientes": ["TRATO_SIN_EVIDENCIA", "CORTE_ROJO", "CONVERSION_NIVEL_0_1"],
  "provisional": true,
  "programa_version": "<versión de abet_carga>",
  "subida_por": "docente410@example.invalid",
  "iniciada_en": "2026-10-28T10:15:00-05:00",
  "terminada_en": "2026-10-28T10:15:02-05:00"
}
```

```jsonc
// Respuesta 201 con el export sin la columna 5.2, una carga RECHAZADA por su estructura (campos que cambian)
{
  "carga_id": 8,
  "estado": "RECHAZADA",
  "filas_de_datos": 11,
  "filas_leidas": 0,
  "filas_aceptadas": 0,
  "filas_rechazadas": 0,
  "mensaje": "Falta la columna del PI 5.2 que el plan de medición pide para esta sección.",
  "columnas": [],
  "rechazos": [
    { "fila": null, "pi": "5.2", "motivo": "PI_DEL_PLAN_AUSENTE", "efecto": "RECHAZA_CARGA",
      "mensaje": "Falta la columna del PI 5.2 que el plan de medición pide para esta sección." }
  ],
  "avisos": []
}
```

La constancia es plana. `nombre_archivo`, `hoja`, `sha256` y `filas_de_datos` van en el primer nivel, con los mismos nombres de las columnas de `abet.archivo_origen`. `rechazos` trae cada RECHAZA_FILA con su `fila` y su `pi`, que va en `null` en un rechazo por código (CODIGO_VACIO, CODIGO_DUPLICADO o CODIGO_INVALIDO). También trae el RECHAZA_CARGA de una carga rechazada por estructura, sección o periodo, con `fila` en `null`. Su `pi` es el PI que falta en PI_DEL_PLAN_AUSENTE o el que se repite en PI_REPETIDO, que la base guarda en `abet.rechazo_fila.pi_id`, y va en `null` en los demás motivos (BR-R17-10). `avisos` trae cada AVISO, con `pi` en `null` cuando la columna no entra a `carga_columna`, como en COLUMNA_PI_FUERA_DEL_PLAN (BR-R17-10). Ningún rechazo trae un campo `valor` ni `valor_leido`. `mensaje` resume el motivo de una carga RECHAZADA y es `null` en una PUBLICADA (propuesta). El texto de cada aviso y el `mensaje` dentro de un rechazo RECHAZA_CARGA son (propuesta). `conjunto_reglas_estado` y `parametros_pendientes` traen el estado del conjunto de reglas y sus parámetros en PENDIENTE, los mismos que muestra la hoja «Constancia» (requisito funcional FR-021 de la spec 001), y sus dos nombres son (propuesta).

Reglas y por qué existen.

- **Una sola transacción (BR-CARGA-02).** El archivo, la carga, sus columnas, filas, estudiantes y mediciones entran juntos o no entra nada, y ninguna carga queda EN_CURSO al terminar la petición. Ante un fallo responde 500 con «La carga no se completó y no se guardó ningún dato. Intente de nuevo.». De un error de integridad, el registro de la aplicación guarda solo el código SQLSTATE y el nombre de la restricción, nunca el campo DETAIL de PostgreSQL, que repite los valores de la fila (BR-CARGA-08).
- **Tamaño y archivo ilegible (BR-CARGA-04 y BR-CARGA-05).** Un archivo de más de 1 MB, de otro tipo, protegido con contraseña, con macros o vínculos externos, que se infla al descomprimirse o que no abre responde 422 con el mensaje de su caso y no deja rastro en la base. El registro de la aplicación guarda de este rechazo la huella, la hora y el motivo, sin ningún nombre de hoja, celda ni código (BR-CARGA-08).
- **Huella (BR-CARGA-06).** La huella SHA-256 se calcula sobre los bytes recibidos y se guarda en minúscula, igual a `shasum -a 256`. Un export abierto y guardado otra vez en Excel es otro archivo.
- **Guardia de datos inventados (BR-CARGA-07 y BR-CARGA-08).** Con `GUARDIA_DATOS_INVENTADOS=1`, un solo Username fuera de 99000000 a 99999999, incluido uno mal formado como 9900001, responde 422 con «El piloto solo admite códigos inventados, de 99000000 a 99999999. Revise la fila 4. No se guardó nada.» (con la fila que corresponda), sin el código en el cuerpo y sin rastro en la base. El registro de la aplicación guarda de ese rechazo solo la huella y la hora. La respalda `ck_estudiante_codigo_inventado` en Neon (ADR-002).
- **Archivo ya cargado en esta sección (BR-CARGA-09).** Si la huella ya tiene una carga PUBLICADA en esta misma sección, responde 200 con la constancia existente, aunque el archivo llegue con otro nombre, y no escribe nada. `archivo_origen.nombre_archivo` conserva el primer nombre. La respalda `uq_archivo_origen_sha256`.
- **Archivo publicado en otra sección (BR-CARGA-09).** Si la huella ya tiene una carga PUBLICADA en otra sección, responde 409 con «Este archivo ya está publicado en otra sección. No se cargó.», antes de escribir y sin ningún dato de esa sección, porque el índice único parcial `uq_carga_archivo_util` lo impediría.
- **Archivo con cargas que no están publicadas (BR-CARGA-09).** Si la huella solo tiene cargas RECHAZADA o REEMPLAZADA, la carga nueva reutiliza ese `archivo_id`, lo que `uq_carga_archivo_util` permite porque solo limita las PUBLICADA.
- **Sección con otra carga publicada (BR-CARGA-10).** Si la sección ya tiene una carga PUBLICADA de otro archivo, responde 409 con «La sección 410 ya tiene una carga publicada. No se cargó el archivo.» y no escribe nada. En el corte 2 la pantalla ofrece el reemplazo (ruta 9). La respalda el índice único parcial `uq_carga_publicada_por_seccion`.
- **Filas inválidas (BR-CARGA-15).** Un nivel -1, 0 o 5 rechaza la fila completa con NIVEL_FUERA_DE_ESCALA (valor provisional de D-06), y un valor como «3,5», «Needs Grading», «-» o «NP» la rechaza con NIVEL_NO_NUMERICO (valor provisional de D-03), con efecto RECHAZA_FILA (valor provisional de D-01). El estudiante de esa fila sale de todos los indicadores de desempeño (performance indicators, PI) de la carga. Una celda de PI vacía no rechaza la fila y se carga como SIN_EVIDENCIA. Un Username vacío rechaza su fila con CODIGO_VACIO, y uno repetido rechaza la segunda aparición con CODIGO_DUPLICADO. La respalda `ck_medicion_nivel`.
- **Columnas dudosas (BR-CARGA-14).** Un Total Pts distinto de 4 deja un aviso PUNTAJE_MAXIMO_DISTINTO y la carga sigue (valor provisional de D-04). Una columna de un PI que no está en el plan se ignora con el aviso COLUMNA_PI_FUERA_DEL_PLAN.
- **Rechazo por estructura (BR-CARGA-13).** La carga queda RECHAZADA con efecto RECHAZA_CARGA, `filas_leidas` 0 y 201 con esa constancia en cuatro casos. Son el archivo sin filas de datos (ARCHIVO_SIN_FILAS, «El archivo no trae filas de estudiantes.»), la falta de la columna de un PI del plan (PI_DEL_PLAN_AUSENTE, «Falta la columna del PI 5.2 que el plan de medición pide para esta sección.»), la falta de Username y Student ID (COLUMNA_CODIGO_AUSENTE, «El archivo no tiene la columna Username ni Student ID.») y un PI repetido (PI_REPETIDO, «El PI 5.1 aparece en dos columnas del archivo.»).
- **Otra sección o periodo (BR-CARGA-11 y BR-CARGA-12).** El sistema coteja la sección elegida con el nombre de la hoja y, si la hoja no la declara, con el nombre del archivo. Si declaran otra sección u otra asignatura (SECCION_NO_COINCIDE) u otro periodo (PERIODO_NO_COINCIDE), la carga queda RECHAZADA. Con otra sección de la misma asignatura, el mensaje nombra la sección que declara el archivo y la sección elegida, con la misma forma para cualquier par de secciones, las dicte o no el mismo profesor, como «El archivo corresponde a la sección 411 y usted eligió la 410. No se publicó.». Con la 410 y la 412 de 450010 de `varias_secciones.feature`, esa forma da «El archivo corresponde a la sección 410 y usted eligió la 412. No se publicó.» (propuesta). Para otra asignatura, aunque la sección tenga el mismo número, el texto es «El archivo corresponde a la asignatura 450010 y usted eligió la 450002. No se publicó.» (propuesta), y el de otro periodo también es (propuesta).
- **Archivo que no declara su sección (BR-CARGA-11 y BR-CARGA-18).** En el corte 1 (D-02), si ni la hoja ni el nombre del archivo declaran la sección, responde 422 sin rastro con «El archivo no indica su sección. Sube el export de Blackboard sin cambiar el nombre de su hoja.». En el corte 2 (US-21) responde primero 422 con «El archivo no indica su sección. ¿Confirma que es de la sección 410 de 450002 en 2026-2?» y `"requiere_confirmacion": true`. Con `confirmar_seccion=true` la carga sigue en la sección elegida y registra en `abet.rechazo_fila` un AVISO con el motivo SECCION_SIN_DECLARAR, que V1_09 agrega junto con COLUMNA_CODIGO_AUSENTE, PI_REPETIDO y PERIODO_NO_COINCIDE, y la constancia lo trae entre sus avisos. El campo solo admite «true», así que un número de sección responde 422 con «La sección confirmada no es la sección elegida. No se guardó nada.». La confirmación no pasa por encima de una sección declarada distinta, que sigue en SECCION_NO_COINCIDE. El 422 a la espera de la confirmación y el campo `requiere_confirmacion` son (propuesta).
- **Todas las filas rechazadas (BR-CARGA-16).** La carga queda RECHAZADA con «Ninguna fila se pudo aceptar. La carga no se publicó.» (propuesta), porque `ck_carga_publicable` impide publicar sin filas aceptadas.
- **Conciliación (BR-CARGA-16).** Una carga publicada lee tantas filas como trae el archivo, y aceptadas más rechazadas suman las leídas. Lo respaldan `ck_carga_conciliada` y `ck_carga_filas`.
- **Descarte de datos personales (BR-CARGA-17).** La base guarda solo el código de 8 dígitos y las celdas de los PI del plan. Nombres, último acceso, disponibilidad, actividades y valores leídos se descartan, y Q04 lo vigila.
- **Quién sube (BR-CARGA-01).** `abet.carga.subida_por` guarda el usuario de la sesión, y la constancia muestra su correo (valor provisional de D-12). El conjunto de reglas de la carga sale de `CONJUNTO_REGLAS` (BR-PERIODO-02).

Errores, todos sin rastro en la base salvo el 201 de una carga RECHAZADA.

| Código | `detail` |
|---|---|
| 401 | «La sesión venció. Ingrese otra vez.» (propuesta) |
| 403 | «La sección no está a su cargo.» |
| 404 | «La sección no existe.» (propuesta) |
| 409 | «La sección 410 ya tiene una carga publicada. No se cargó el archivo.» |
| 409 | «Este archivo ya está publicado en otra sección. No se cargó.» |
| 422 | «No se pudo abrir el archivo. Descárguelo otra vez desde Blackboard.» |
| 422 | «El archivo está protegido con contraseña. Guárdelo sin contraseña y súbalo.» |
| 422 | «Solo se admiten exports de Blackboard en formato .xlsx.» |
| 422 | «El contenido del archivo no es un libro de Excel aunque su nombre termine en .xlsx.» |
| 422 | «El archivo trae macros o vínculos externos y no se admite.» |
| 422 | «El contenido del archivo supera el tamaño admitido al descomprimirse.» (propuesta) |
| 422 | «El archivo supera el máximo de 1 MB.» |
| 422 | «El piloto solo admite códigos inventados, de 99000000 a 99999999. Revise la fila 4. No se guardó nada.» |
| 422 | «El archivo no indica su sección. Sube el export de Blackboard sin cambiar el nombre de su hoja.» (corte 1) |
| 422 | «El archivo no indica su sección. ¿Confirma que es de la sección 410 de 450002 en 2026-2?» (corte 2, con `requiere_confirmacion`) |
| 422 | «La sección confirmada no es la sección elegida. No se guardó nada.» (corte 2) |
| 422 | «La carrera aún no registra el plan de medición de esta sección.» (propuesta) |
| 500 | «La carga no se completó y no se guardó ningún dato. Intente de nuevo.» |

#### `GET /api/cargas/{carga_id}`: constancia de una carga (BR-R17-10 y BR-ACCESO-08)

Sin cuerpo. Responde 200 con la constancia de la carga. Para una carga PUBLICADA el cuerpo es igual al de la respuesta 201 de la ruta 5, porque los dos salen de la base, y una carga RECHAZADA también tiene constancia, armada desde `abet.carga`, `abet.archivo_origen` y `abet.rechazo_fila`. En PI_DEL_PLAN_AUSENTE y PI_REPETIDO esta constancia nombra el mismo PI que la respuesta 201, en su `mensaje` y en el `pi` de su rechazo, porque `abet.rechazo_fila.pi_id` lo guarda (BR-R17-10). El coordinador la recibe de cualquier sección. Errores 401, 403 («La sección no está a su cargo.») y 404 («La carga no existe.», propuesta).

#### `GET /api/cargas/{carga_id}/r17.xlsx`: descargar el R-17 (BR-R17-01 a BR-R17-09 y BR-ACCESO-08)

Sin cuerpo. Responde 200 con el libro y estas cabeceras. El tipo y el nombre del archivo los fijan los escenarios, y `attachment` y `Cache-Control` son (propuesta).

```
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="R017_450002_410_2026-2_PROVISIONAL.xlsx"
Cache-Control: no-store
```

Reglas y por qué existen.

- Los números salen de `v_r17_por_pi` (ADR-005, BR-R17-02). Con el export que trae el 5 en la fila 3, el bloque II muestra 60,0 % (6 de 10), 60,0 % (6 de 10) y 70,0 % (7 de 10). El denominador de calificados es `n_total - n_sin_evidencia`, que calcula `r17.py`, porque la vista no lo expone (BR-R17-03).
- La tabla de estudiantes sale de las mediciones de la carga, que son las filas de `v_tabla_maestra_pi` de esa sección, ordenadas por PI y fila de origen, y con el mismo export tiene 30 filas sin el código 99000002 (BR-R17-08).
- Solo una carga PUBLICADA produce R-17, porque la vista no ve las demás (BR-R17-01).
- El libro lleva la franja PROVISIONAL y el sufijo `_PROVISIONAL` si y solo si `v_r17_por_pi.provisional` es verdadero, es decir, mientras el conjunto de reglas de la carga no esté APROBADO o no tenga DEFINIDOS NIVEL_ESPERADO, META_LOGRO y TRATO_SIN_EVIDENCIA (BR-R17-05).
- La hoja «Constancia» va al final con los datos de la constancia, los avisos en la forma «PUNTAJE_MAXIMO_DISTINTO en el PI 5.3» y los rechazos en la forma «Fila 3, PI 5.2, NIVEL_FUERA_DE_ESCALA, RECHAZA_FILA», sin el valor leído (BR-R17-09).
- Ni el nombre del archivo ni sus propiedades llevan nombres de personas. El autor y el último autor del libro están vacíos o dicen «ABET_SIS_MED» (BR-R17-06 y BR-R17-07).
- El profesor descarga el R-17 de sus secciones y el coordinador el de cualquier sección (BR-ACCESO-08).

Errores 401, 403 («La sección no está a su cargo.»), 404 (propuesta), 409 («La carga no está publicada y no tiene R-17.», con el código 409 como propuesta) y 422 («La sección supera las filas de la plantilla del R-17.», propuesta, para una sección de más de 47 estudiantes con 3 PI).

## 7. Rutas del corte 2

#### `GET /api/cargas?seccion_id={seccion_id}`: cargas al alcance del usuario (US-19, BR-CARGA-20)

Responde 200 con una lista de constancias resumidas, de la más reciente a la más antigua. Cada una trae `carga_id`, la sección, `estado`, `filas_leidas`, `filas_aceptadas`, `filas_rechazadas`, `nombre_archivo`, los primeros 12 caracteres de la huella, el correo de `subida_por`, `iniciada_en` y `terminada_en` con el desfase «-05:00», el motivo de una carga RECHAZADA y la carga a la que reemplaza, si la hay. Sin `seccion_id`, lista todas las cargas al alcance del usuario del periodo vigente (propuesta). Un `seccion_id` ajeno responde 403 con «La sección no está a su cargo.».

La constancia de una carga REEMPLAZADA sigue disponible en la ruta 6 y dice qué carga la reemplaza, pero su R-17 responde 409.

#### `POST /api/secciones/{seccion_id}/cargas?reemplaza={carga_id}`: reemplazar la carga publicada (US-18, BR-CARGA-19)

El mismo cuerpo y las mismas reglas de la ruta 5. En una sola transacción, la carga nueva entra EN_CURSO, la anterior pasa a REEMPLAZADA y la nueva pasa a PUBLICADA con `reemplaza_carga_id` igual a la anterior. Si la carga nueva queda RECHAZADA, su `reemplaza_carga_id` queda nulo desde el INSERT y la anterior sigue PUBLICADA, porque `uq_carga_reemplaza` bloquearía el siguiente reemplazo válido. Volver a un export anterior reutiliza su `archivo_id`.

El profesor reemplaza en su sección y el coordinador en cualquiera, con el plazo que fije D-11. El mismo archivo de la carga publicada responde 200 con su constancia y el aviso «Es el mismo archivo de la carga publicada. No se reemplazó.» (propuesta). El reemplazo de una carga que ya no es la publicada de la sección responde 409 (propuesta), y el de una sección ajena responde 403. Si el archivo nuevo no se abre, responde 422 con «No se pudo abrir el archivo. La carga publicada no cambió.» y nada cambia.

#### `POST /api/sesion/codigo`: pedir el código de acceso (US-20, BR-ACCESO-09)

Cuerpo `{ "correo": "..." }`. Responde 202 con `{ "detail": "Si el correo está autorizado, recibirá un código en unos minutos." }` exista o no el correo, esté activo o no, y aunque no tenga forma de correo. Más de 3 pedidos de un mismo correo en 15 minutos reciben la misma respuesta y no envían otro mensaje. El código tiene 6 dígitos, vale 10 minutos, se usa una vez y admite 5 intentos, y la base guarda solo su hash en `acceso.codigo_acceso` (valores provisionales).

El código se verifica en `POST /api/sesion` con el correo y el código (propuesta). Un código que ya no sirve responde 401 con «El código venció. Pida uno nuevo.», «El código ya se usó. Pida uno nuevo.» o «El código ya no es válido. Pida uno nuevo.».

## 8. Errores que no son JSON

| Origen | Cuándo | Qué hace el Front |
|---|---|---|
| Vercel, 413 | Cuerpo de más de 4,5 MB, antes de llegar a FastAPI | Muestra «El archivo supera el máximo de 1 MB.» |
| Vercel, 502 o 504 | La función no responde a tiempo | Muestra «El servicio no respondió. Intente de nuevo.» (propuesta) |
| Protección de despliegues | Página HTML de inicio de sesión de Vercel en Preview | Muestra «El entorno de pruebas no está disponible.» (propuesta) |

## 9. Lo que el contrato no cubre todavía

1. **Los textos marcados «(propuesta)».** Ninguna decisión de la spec los fija todavía, aunque algunos ya figuran en un escenario, y las specs vivas los conservan con esa marca hasta que la revisión del contrato los confirme.
2. **Las respuestas de los códigos 403 y 404 para un recurso ajeno.** La propuesta es 403 para un recurso que existe fuera del alcance, y conviene revisar si un 404 distinto para el que no existe revela su existencia.
3. **Una ruta de salud** (`/api/salud`) para la prueba de humo y el monitoreo, que ninguna historia pide.
4. **Los nombres de los esquemas Pydantic**, que se fijan con el código.
5. **El plazo del reemplazo (D-11).** Quién reemplaza está decidido para el corte 2, y hasta cuándo sigue abierto.

## 10. Cómo verificar este documento

Cuando exista el Back, cada ruta de la tabla 2 debe aparecer en el esquema OpenAPI que publica FastAPI.

```bash
# Esperado: 5 caminos en el corte 1 (las 7 rutas, porque /api/sesion reúne tres métodos)
# y 7 caminos al cerrar el corte 2, sin caminos que este documento no describa.
curl -s "$URL_FRONT/api/openapi.json" | python -c "import json,sys; print('\n'.join(sorted(json.load(sys.stdin)['paths'])))"
```

Los mensajes literales de este contrato y los de los escenarios coinciden en los dos sentidos. La comprobación corre desde la carpeta que contiene los dos repositorios, y las variables `BACK` y `FRONT` cambian sus rutas si viven en otro lugar.

```bash
# Esperado: «0 mensajes del contrato sin escenario» y «0 mensajes de los escenarios sin contrato».
# Un mensaje del contrato es un texto entre «» que termina en punto o en signo de pregunta y que no
# lleva «propuesta» justo después. Uno de los escenarios es el texto que sigue a detail, mensaje o
# aviso, el del cuerpo {"detail": ...} y la columna mensaje de las tablas de Ejemplos. Los mensajes
# del contrato salen solo de los textos entre «», así que la comprobación no lee los ejemplos JSON,
# cuyos textos van entre comillas rectas. En el otro sentido, cada texto de los escenarios se busca
# en el documento entero.
BACK="${BACK:-ABET-ULIMA-Back}" FRONT="${FRONT:-ABET-ULIMA-Front}" python3 -I - <<'PY'
import os
import pathlib
import re

contrato = pathlib.Path(os.environ["FRONT"], "docs/03-api/contrato.md").read_text(encoding="utf-8")
carpeta = pathlib.Path(os.environ["BACK"], "specs/001-mvp-carga-r17/aceptacion")
escenarios = "\n".join(p.read_text(encoding="utf-8") for p in sorted(carpeta.glob("*.feature")))

del_contrato = {
    m.group(1)
    for m in re.finditer(r"«([^»]+?[.?])»(?=(.{0,14}))", contrato, flags=re.S)
    if "propuesta" not in m.group(2)
}
de_escenarios = set(re.findall(r'(?:detail|mensaje|aviso) "([^"<>]+?)"', escenarios))
de_escenarios |= set(re.findall(r'"detail": "([^"<>]+?)"', escenarios))
columna = None
for linea in escenarios.splitlines():
    limpia = linea.strip()
    if not limpia.startswith("|"):
        columna = None
        continue
    celdas = [c.strip() for c in limpia.strip("|").split("|")]
    if columna is None:
        columna = celdas.index("mensaje") if "mensaje" in celdas else -1
    elif columna >= 0:
        de_escenarios.add(celdas[columna])

faltan = sorted(t for t in del_contrato if t not in escenarios)
sobran = sorted(t for t in de_escenarios if t not in contrato)
print(f"{len(faltan)} mensajes del contrato sin escenario")
for texto in faltan:
    print("  -", texto)
print(f"{len(sobran)} mensajes de los escenarios sin contrato")
for texto in sobran:
    print("  -", texto)
PY
```
