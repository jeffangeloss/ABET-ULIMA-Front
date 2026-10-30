# Contrato de la API

> **Estado 2026-10-30.** El Back implementa las rutas del corte 1 y `specs/001-mvp-carga-r17/audit.md` del Back cruza cada escenario con su prueba. Este contrato se escribió antes del código, como exige [`docs/specs/api-contracts.md`](../specs/api-contracts.md), y cada ruta cita las reglas `BR-` numeradas de las specs vivas del Back. Si el código y este documento discrepan, el documento dice cuál de los dos está mal.

Este documento describe todas las rutas de ABET-ULIMA-Back con su cuerpo, su respuesta y sus errores. El índice corto vive en `docs/specs/api-contracts.md`, y las reglas viven en las specs vivas del Back. Son BR-ACCESO-01 a BR-ACCESO-09 (`specs/features/acceso/acceso.spec.md`), BR-PERIODO-01 a BR-PERIODO-04 (`specs/features/periodo/periodo.spec.md`), BR-CARGA-01 a BR-CARGA-20 (`specs/features/carga-export/carga-export.spec.md`) y BR-R17-01 a BR-R17-10 (`specs/features/r17/r17.spec.md`). Los mensajes literales y la forma de las respuestas salen de los escenarios de `specs/001-mvp-carga-r17/aceptacion/*.feature` del Back. Si un ejemplo de aquí y un escenario discrepan, gana el escenario. Lleva la marca «(propuesta)» lo que ningún escenario fija y también lo que un escenario usa sin que las decisiones de la spec lo fijen, como lo marcan los `.feature`. Los ejemplos usan solo datos inventados.

## 1. Cómo está montada

La API es una aplicación FastAPI en Python 3.12 (ADR-003) con prefijo `/api`, desplegada como proyecto propio de Vercel en `gru1`. El navegador nunca la llama por su dominio. El `vercel.json` del Front reescribe `/api/:path*` hacia el Back (una reescritura de rutas, rewrite en Vercel), así que para el navegador la API vive en el mismo origen que las pantallas y la cookie de sesión es de primera parte (ADR-004). En local, el proxy de Vite hace lo mismo hacia la API en la Mac.

La API lee y escribe en Neon con el rol `abet_app` por la cadena con pooler (el agrupador de conexiones de Neon). Toda carga ocurre en una sola transacción (ADR-001).

Al arrancar, la API comprueba contra la base el periodo de `PERIODO_VIGENTE` y el conjunto de reglas de `CONJUNTO_REGLAS`, porque la base no marca ninguno como vigente (BR-PERIODO-01 y BR-PERIODO-02). Si no los encuentra, se detiene con «PERIODO_VIGENTE 2027-1 no existe en abet.periodo» o «CONJUNTO_REGLAS R-NO-EXISTE no existe para Ambiental» (propuesta). También se detiene si `DATABASE_URL` entra con un rol de administración (superusuario, creación de roles o de bases, sin seguridad por filas o de replicación), con «DATABASE_URL entra con un rol de administración, y la API necesita el rol de la aplicación.» (propuesta), porque la aplicación trabaja solo con el rol `abet_app`.

En local, `scripts/api_local.sh --sin-https` del Back define `ABET_COOKIE_SIN_SECURE=1`, que deja la cookie sin el atributo Secure para servir por http en 127.0.0.1 (propuesta). La API admite esa variable solo con una base local, por socket de Unix, localhost o 127.0.0.1, y fuera de Vercel, y en otro caso no arranca.

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

Los demás errores genéricos también traen un texto. Una ruta que no existe responde 404 con «La ruta no existe.» (propuesta), un método que la ruta no admite responde 405 con «El método no se admite en esta ruta.» (propuesta) y un error no previsto responde 500 con «Ocurrió un error interno. Intente de nuevo.» (propuesta).

Toda respuesta de `/api`, de éxito o de error, lleva `Cache-Control: no-store`, para que ni una caché intermedia ni el historial de un equipo compartido retengan datos de una sesión (propuesta).

### 3.2 Códigos de estado

| Código | Cuándo | Qué hace la persona |
|---|---|---|
| 200 | Lectura correcta, o el mismo archivo ya está publicado en esa misma sección | Sigue |
| 201 | Se registra una carga nueva, PUBLICADA o RECHAZADA (el campo `estado` dice cuál) | Revisa la constancia en P4 |
| 202 | Pedido de código recibido (corte 2) | Revisa su correo |
| 204 | Sesión cerrada | Nada |
| 401 | Sin sesión, sesión vencida o credenciales que no coinciden | Ingresa otra vez |
| 403 | La sección o la carga no está a cargo del usuario | Elige una sección propia |
| 404 | La ruta no existe (propuesta). Una sección o una carga que no existe recibe por ahora el mismo 403 que una ajena (propuesta, sección 9) | Vuelve a P2 |
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

Errores 401 y 422 con «El periodo no tiene la forma AAAA-C.» (propuesta), para un periodo con formato distinto de `AAAA-C`, con C de 0 a 2 como `ck_periodo_ciclo`.

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
| 403 | Una sección que no existe recibe el mismo 403 que una ajena, sin un 404 propio (propuesta, sección 9) |
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

Sin cuerpo. Responde 200 con la constancia de la carga. Para una carga PUBLICADA el cuerpo es igual al de la respuesta 201 de la ruta 5, porque los dos salen de la base, y una carga RECHAZADA también tiene constancia, armada desde `abet.carga`, `abet.archivo_origen` y `abet.rechazo_fila`. En PI_DEL_PLAN_AUSENTE y PI_REPETIDO esta constancia nombra el mismo PI que la respuesta 201, en su `mensaje` y en el `pi` de su rechazo, porque `abet.rechazo_fila.pi_id` lo guarda (BR-R17-10). El coordinador la recibe de cualquier sección. Errores 401 y 403 («La sección no está a su cargo.»), también para una carga que no existe (propuesta, sección 9).

#### `GET /api/cargas/{carga_id}/r17.xlsx`: descargar el R-17 (BR-R17-01 a BR-R17-09 y BR-ACCESO-08)

Sin cuerpo. Responde 200 con el libro y estas cabeceras. El tipo y el nombre del archivo los fijan los escenarios, `attachment` y `Cache-Control` son (propuesta), y `X-Content-Type-Options: nosniff`, que impide que el navegador lea el libro como otro tipo, lo aprueba Jefferson el 2026-10-30 (BR-R17-06).

```
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="R017_450002_410_2026-2_PROVISIONAL.xlsx"
Cache-Control: no-store
X-Content-Type-Options: nosniff
```

Reglas y por qué existen.

- Los números salen de `v_r17_por_pi` (ADR-005, BR-R17-02). Con el export que trae el 5 en la fila 3, el bloque II muestra 60,0 % (6 de 10), 60,0 % (6 de 10) y 70,0 % (7 de 10). El denominador de calificados es `n_total - n_sin_evidencia`, que calcula `r17.py`, porque la vista no lo expone (BR-R17-03).
- La tabla de estudiantes sale de las mediciones de la carga, que son las filas de `v_tabla_maestra_pi` de esa sección, ordenadas por PI y fila de origen, y con el mismo export tiene 30 filas sin el código 99000002 (BR-R17-08).
- Solo una carga PUBLICADA produce R-17, porque la vista no ve las demás (BR-R17-01).
- El libro lleva la franja PROVISIONAL y el sufijo `_PROVISIONAL` si y solo si `v_r17_por_pi.provisional` es verdadero, es decir, mientras el conjunto de reglas de la carga no esté APROBADO o no tenga DEFINIDOS NIVEL_ESPERADO, META_LOGRO y TRATO_SIN_EVIDENCIA (BR-R17-05).
- La hoja «Constancia» va al final con los datos de la constancia, los avisos en la forma «PUNTAJE_MAXIMO_DISTINTO en el PI 5.3» y los rechazos en la forma «Fila 3, PI 5.2, NIVEL_FUERA_DE_ESCALA, RECHAZA_FILA», sin el valor leído (BR-R17-09).
- Ni el nombre del archivo ni sus propiedades llevan nombres de personas. El autor y el último autor del libro están vacíos o dicen «ABET_SIS_MED» (BR-R17-06 y BR-R17-07).
- El profesor descarga el R-17 de sus secciones y el coordinador el de cualquier sección (BR-ACCESO-08).

Errores 401, 403 («La sección no está a su cargo.», también para una carga que no existe, propuesta de la sección 9), 409 («La carga no está publicada y no tiene R-17.», con el código 409 como propuesta) y 422 («La sección supera las filas de la plantilla del R-17.», propuesta, para una sección de más de 47 estudiantes con 3 PI).

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
2. **Las respuestas de los códigos 403 y 404 para un recurso ajeno.** La propuesta es 403 para un recurso que existe fuera del alcance. El Back del corte 1 responde también el mismo 403 «La sección no está a su cargo.» a una sección o una carga que no existe, porque un 404 distinto revelaría qué identificadores existen y `app/permisos.py` ya responde el mismo no (propuesta). La decisión queda para Jefferson, y si la revierte, la API vuelve al 404 y P3 y P4 ofrecen volver a P2.
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

## 11. Rutas de la spec 002, Capstone (propuesta, spec 002)

> **Estado 2026-10-29.** Esta sección es una propuesta de la spec 002 (`specs/002-capstone/` del Back, rama `docs/002-capstone`), pendiente de la aprobación de Jefferson. No lleva reglas `BR-` todavía, porque la spec viva `proyectos-capstone` las numera en la fase 1 del plan de la spec 002 (tarea T010 del Back). Las historias se citan como «US-NN de la spec 002». Las secciones 1 a 10 no cambian, y la tabla de la sección 2 y el índice `docs/specs/api-contracts.md` suman las rutas cuando la spec se apruebe (tarea T014 del Back). Cada mensaje de esta sección lleva la marca de propuesta, aunque un escenario de `specs/002-capstone/aceptacion/` lo fije, porque la comprobación de la sección 10 solo lee los escenarios de la spec 001. Cuando la spec 002 se apruebe, esa comprobación lee las dos carpetas y las marcas se quitan.

Todo el vocabulario nuevo es propuesta. Una sección Capstone es la de un curso que `abet.plan_estudios.tipo_curso` marca como CAPSTONE (J-12), la plantilla de proyectos es el libro de Excel con una fila por estudiante que llena el profesor, y la subida es el registro `abet.carga_proyecto` de una plantilla. El profesor sube la plantilla después del export publicado de la misma sección (D-26).

### 11.1 Resumen de rutas

| # | Método | Ruta | Sesión | Éxito | Qué hace | Historias de la spec 002 | Corte |
|---|---|---|---|---|---|---|---|
| 11 | POST | `/api/secciones/{seccion_id}/proyectos` | Sí | 201 o 200 | Sube la plantilla de proyectos, la une a los estudiantes del export y devuelve la constancia | US-03 a US-17, US-25 | 1 (la declaración, 2) |
| 4 | GET | `/api/secciones?periodo=2026-2` | Sí | 200 | Suma `tipo_curso` y el estado de proyectos a cada sección | US-23 | 1 |
| 6 | GET | `/api/cargas/{carga_id}` | Sí | 200 | Suma el bloque `proyectos` a la constancia | US-18 | 1 |
| 7 | GET | `/api/cargas/{carga_id}/r17.xlsx` | Sí | 200 | Elige la hoja «Cursos Capstone» cuando la sección es Capstone | US-19, US-20 | 1 |

El número 11 es nuevo y los otros tres son rutas de la sección 2 con campos o comportamientos nuevos. La tabla maestra de Capstone no tiene ruta, porque `abet.v_tabla_maestra_capstone` se consulta con psql y Power BI (US-21 de la spec 002).

### 11.2 `POST /api/secciones/{seccion_id}/proyectos`: subir la plantilla de proyectos (propuesta, spec 002)

Recibe `multipart/form-data` con el campo `archivo`, un .xlsx de hasta 1 MB cuya hoja se llama «Hoja1» y cuya fila de encabezado trae CÓDIGO, ALUMNO, GRUPO, TÍTULO DEL PROYECTO, TIPO DE EMPRESA, RUC, NOMBRE DE ORGANIZACIÓN y LÍNEA DE INVESTIGACIÓN (D-26). Desde el corte 2 suma el campo `declaracion_sin_personas`, que solo admite `true` (US-25). Solo el profesor de la sección lo llama en el corte 1, y el coordinador recibe 403.

La API comprueba en este orden y se detiene en el primero que falla. Son la sesión, el permiso, el tipo de curso, el export publicado, el tamaño y la legibilidad del archivo, la huella ya registrada, la plantilla ya publicada, la guardia de datos inventados, la estructura y, al final, las reglas por fila y la del grupo. Las reglas viven en la spec 002 (FR-006 a FR-016) y se numeran como `BR-PROYECTOS-NN` más adelante.

```jsonc
// Respuesta 201 con la plantilla inventada que trae 99000113 en la fila 4 (propuesta, spec 002)
{
  "carga_proyecto_id": 3,
  "carga_id": 7,
  "estado": "PUBLICADA",
  "nombre_archivo": "plantilla_proyectos_inventada_420_con_error.xlsx",
  "hoja": "Hoja1",
  "sha256": "<64 caracteres hexadecimales en minúscula>",
  "filas_de_datos": 11,
  "filas_leidas": 11,
  "filas_aceptadas": 10,
  "filas_rechazadas": 1,
  "estudiantes_en_export": 11,
  "estudiantes_con_proyecto": 10,
  "mensaje": null,
  "rechazos": [
    { "fila": 4, "columna": "CÓDIGO", "motivo": "CODIGO_FUERA_DEL_EXPORT", "efecto": "RECHAZA_FILA",
      "mensaje": "<texto de la API, sin el valor leído>" }
  ],
  "avisos": [
    { "motivo": "ESTUDIANTE_SIN_PROYECTO", "efecto": "AVISO", "cuenta": 1,
      "mensaje": "<texto de la API, sin códigos de estudiante>" }
  ],
  "subida_por": "docente420@example.invalid",
  "iniciada_en": "2026-10-29T10:15:00-05:00",
  "terminada_en": "2026-10-29T10:15:01-05:00"
}
```

El ejemplo usa solo datos inventados, y los campos exactos se fijan al aprobar la spec 002 (J-14). Los motivos de fila son CODIGO_FUERA_DEL_EXPORT, CODIGO_DUPLICADO, CAMPO_VACIO, GRUPO_INVALIDO, TEXTO_DEMASIADO_LARGO, TIPO_EMPRESA_INVALIDO, RUC_FORMATO_INVALIDO, RUC_PERSONA_NATURAL y GRUPO_INCONSISTENTE. Los de estructura, con efecto RECHAZA_CARGA, son PLANTILLA_SIN_HOJA, ENCABEZADO_AUSENTE, ENCABEZADO_REPETIDO y ARCHIVO_SIN_FILAS. Una estructura inválida responde 201 con estado RECHAZADA, 0 filas leídas y un solo rechazo, como el export.

Reglas y por qué existen, sin número de regla todavía.

- **Una sola transacción.** El archivo, la subida, los proyectos y los rechazos entran juntos o no entra nada, y ante un fallo responde 500 sin rastro, como la ruta 5.
- **La columna ALUMNO se descarta.** El lector la exige como encabezado y no la guarda, y ningún campo de la respuesta trae un nombre, el valor leído de una celda, un título, una organización ni un RUC.
- **Un estudiante del export sin fila en la plantilla** deja un solo aviso ESTUDIANTE_SIN_PROYECTO con la cuenta, y la subida se publica (D-23).
- **Un grupo con datos distintos entre sus integrantes** se rechaza entero con GRUPO_INCONSISTENTE (D-22).
- **La misma plantilla en la misma sección** responde 200 con la constancia existente, sin escribir nada.
- **Guardia de datos inventados.** Con `GUARDIA_DATOS_INVENTADOS=1`, un código de 8 dígitos que no empieza con 99 o un RUC con la forma `^20[0-9]{9}$` que no empieza con 20999 responde 422 sin escribir (ADR-002). La guardia solo mira los valores que ya tienen la forma válida, así que una celda vacía o mal formada recibe su motivo por fila.

| Código | `detail` |
|---|---|
| 200 | Cuerpo igual al del 201, para la misma plantilla ya publicada en la misma sección |
| 401 | «La sesión venció. Ingrese otra vez.» (propuesta, spec 002) |
| 403 | «La sección no está a su cargo.» (propuesta, spec 002) |
| 404 | «La sección no existe.» (propuesta, spec 002) |
| 409 | «Esta sección no es de un curso Capstone. No se cargó nada.» (propuesta, spec 002) |
| 422 | «La carrera aún no registra el plan de medición de esta sección.», el texto de la spec 001, cuando la sección no tiene plan y su tipo de curso no se resuelve (propuesta, spec 002) |
| 409 | «Suba primero el export de Blackboard de la sección {numero}. La plantilla de proyectos se une a los estudiantes de ese export.» (propuesta, spec 002) |
| 409 | «Este archivo ya está publicado en otra sección. No se cargó.» (propuesta, spec 002) |
| 409 | «La sección {numero} ya tiene una plantilla de proyectos publicada. No se cargó el archivo.» (propuesta, spec 002) |
| 422 | «El archivo ya está registrado como export de Blackboard. No se cargó nada.» (propuesta, spec 002) |
| 422 | «No se pudo abrir el archivo. No se cargó nada.» (propuesta, spec 002) |
| 422 | «El archivo supera el máximo de 1 MB.» (propuesta, spec 002) |
| 422 | «El piloto solo admite códigos inventados, de 99000000 a 99999999. Revise la fila 4. No se guardó nada.» (propuesta, spec 002) |
| 422 | «El piloto solo admite RUC inventados. Revise la fila 11. No se guardó nada.» (propuesta, spec 002) |
| 422 | «Confirme que los títulos y nombres de organización no nombran personas.» (propuesta, spec 002, corte 2) |
| 500 | «La carga no se completó y no se guardó ningún dato. Intente de nuevo.» (propuesta, spec 002) |

Los mensajes de los rechazos y del aviso van en el campo `mensaje` de cada elemento, con el número de fila y el nombre del encabezado y nunca con el valor leído. Los escenarios de `specs/002-capstone/aceptacion/carga_proyectos.feature` fijan estos textos, con la fila del ejemplo.

| Motivo | `mensaje` |
|---|---|
| CAMPO_VACIO | «Fila 6, falta el dato de {encabezado}. La fila completa queda fuera.» (propuesta, spec 002) |
| GRUPO_INVALIDO | «Fila 6, el grupo debe ser un número entero mayor o igual que 1.» (propuesta, spec 002) |
| TIPO_EMPRESA_INVALIDO | «Fila 11, el tipo de empresa debe ser EMPRESA, ESTADO u ONG.» (propuesta, spec 002) |
| RUC_PERSONA_NATURAL | «Fila 11, RUC, no corresponde a una organización.» (propuesta, spec 002) |
| RUC_FORMATO_INVALIDO | «Fila 11, el RUC debe tener 11 dígitos y empezar con 20.» (propuesta, spec 002) |
| GRUPO_INCONSISTENTE | «Fila 5, el grupo 2 trae datos de proyecto distintos entre sus integrantes. El grupo completo queda fuera.» (propuesta, spec 002) |
| ESTUDIANTE_SIN_PROYECTO | «2 estudiantes del export no tienen fila en la plantilla.» (propuesta, spec 002) |

La sección 8 sigue valiendo, y el 413 de Vercel para un cuerpo de más de 4,5 MB llega antes de FastAPI. El 409 por el reemplazo del export en una sección con plantilla publicada (J-16) lo fija la spec 002 para la ruta 9 del corte 2 de la spec 001, y su texto es «La sección tiene una plantilla de proyectos publicada. Su reemplazo todavía no está disponible.» (propuesta, spec 002).

### 11.3 `GET /api/cargas/{carga_id}`: bloque `proyectos` (propuesta, spec 002)

La constancia de la carga suma el campo `proyectos`. Es igual al cuerpo del 201 de la subida cuando la sección tiene una plantilla (J-14), y es un bloque vacío cuando no la tiene.

```jsonc
// Campo nuevo en la respuesta 200 de la carga 7 sin plantilla (propuesta, spec 002)
"proyectos": { "estado": "SIN_PLANTILLA", "estudiantes_en_export": 11, "estudiantes_con_proyecto": 0 }
```

`estado` vale SIN_PLANTILLA, PUBLICADA o RECHAZADA. Una carga de un curso de carrera trae `proyectos` en `null` (propuesta). Las reglas de acceso son las de la ruta 6 (403 para el profesor ajeno y 200 para el coordinador).

### 11.4 `GET /api/secciones`: campos nuevos (propuesta, spec 002)

Cada sección suma estos campos sin quitar ninguno de la sección 5.

| Campo | Valores | Uso en el Front |
|---|---|---|
| `tipo_curso` | `CARRERA`, `CAPSTONE` o `null` cuando la sección no tiene plan de medición | P3 muestra la zona de la plantilla solo si vale `CAPSTONE` |
| `proyectos_estado` | `NO_APLICA`, `SIN_EXPORT`, `PENDIENTE` o `PUBLICADA` | P2 arma la línea de proyectos y P3 habilita o desactiva la zona |
| `carga_proyecto_id` | entero o `null` | Enlace al bloque de proyectos en P4 |
| `estudiantes_con_proyecto` | entero o `null` | «9 de 11 con proyecto» en P2 |
| `estudiantes_en_export` | entero o `null` | El denominador de la línea de P2 |

Una sección con export y con subidas solo RECHAZADA sale `PENDIENTE`. Una sección de carrera, o una sin plan de medición, sale `NO_APLICA` con los tres campos de conteo en `null`.

### 11.5 `GET /api/cargas/{carga_id}/r17.xlsx`: hoja por tipo de curso (propuesta, spec 002)

La ruta 7 conserva su forma y sus cabeceras, y la API elige la hoja por el tipo de curso. Una sección de carrera sigue saliendo con «Cursos de Carrera». Una sección Capstone sale con «Cursos Capstone» y la hoja «Constancia», con una fila por medición y los seis datos de proyecto de la subida publicada, sin fórmulas, incluidos los conteos y la fecha. El campo Profesor de la cabecera y la columna PROFESOR salen vacíos, y la constancia muestra el correo de quien sube (valor provisional de D-17). La hoja «Cursos Capstone» está decidida el 2026-10-30 (D-25). El instrumento impreso y los detalles del mapa de celdas son provisionales hasta cerrar la parte abierta de D-25.

- Sin plantilla publicada, o con estudiantes sin fila, responde 200 con una franja bajo el título que dice «SIN DATOS DE PROYECTO» o «SIN DATOS DE PROYECTO PARA 2 DE 11 ESTUDIANTES» (propuesta, D-24). El nombre del archivo suma `_SIN_PROYECTOS` solo cuando no hay plantilla.
- La hoja «Constancia» suma la huella de la plantilla y la línea «10 de 11 estudiantes con datos de proyecto».
- Una sección que supera las 224 filas de la hoja (de la 49 a la 272, una por medición) responde 422 con «La sección supera las filas de la plantilla del R-17.» (propuesta, spec 002), como en la ruta 7.

### 11.6 Lo que esta sección no cubre

1. **Reglas `BR-PROYECTOS-NN`.** Faltan hasta que exista la spec viva `proyectos-capstone` del Back.
2. **Una ruta para reemplazar la plantilla** (D-27), una para el R-18 (D-15) y una para consultar la tabla maestra de Capstone.
3. **Los esquemas Pydantic exactos** del bloque `proyectos`, que se fijan con el código.
4. **Los textos de los mensajes por fila** que ningún escenario fija (CODIGO_FUERA_DEL_EXPORT, CODIGO_DUPLICADO, TEXTO_DEMASIADO_LARGO y los de estructura), que la spec 002 cierra al aprobarse.
