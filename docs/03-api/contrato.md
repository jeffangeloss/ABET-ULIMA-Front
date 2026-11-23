# Contrato de la API

> **Estado 2026-11-23.** La sección 15 fija la forma definitiva de las rutas de la spec 008 del Back (T011), con la ruta 18 de periodos, el campo `alcance` de la ruta 2, el parámetro `periodo` de la ruta 8 y la ruta 17 con el alcance de la coordinación del curso, escrita antes de su código en la rama `feat/008-ciclo-quimica-industrial` después de la aprobación de Jefferson del 2026-11-23. **Cambio del 2026-11-21 (aprobado por Jefferson el 2026-11-21, «Sí, apruébalas»).** La sección 13 cambia las rutas 13 a 16 de la spec 005 del Back. El profesor registra una causa y una acción por indicador de desempeño, rotuladas como oportunidad de mejora o buena práctica según el semáforo, en lugar de un texto por carga. **Estado 2026-11-18.** La sección 12 fija la forma definitiva de la ruta 12 de la spec 004 del Back (T011), los logros por resultado del estudiante (student outcome, SO) de las secciones al alcance del usuario, escrita antes de su código en la rama `feat/004-reportes-docente` después de la aprobación de Jefferson del 2026-11-18. **Estado 2026-11-17.** El Back implementa las rutas del corte 1 y `specs/001-mvp-carga-r17/audit.md` del Back cruza cada escenario con su prueba. La sección 7 fija la forma definitiva de las rutas del corte 2 (T080), con el reemplazo de la carga publicada, la lista de cargas y la confirmación de la sección, escrita antes de su código en la rama `feat/001-corte-2`. El código de acceso por correo (ruta 10) sigue en espera de T018, el dominio y la cuenta de Resend de Jefferson. Este contrato se escribió antes del código, como exige [`docs/specs/api-contracts.md`](../specs/api-contracts.md), y cada ruta cita las reglas `BR-` numeradas de las specs vivas del Back. Si el código y este documento discrepan, el documento dice cuál de los dos está mal.

Este documento describe todas las rutas de ABET-ULIMA-Back con su cuerpo, su respuesta y sus errores. El índice corto vive en `docs/specs/api-contracts.md`, y las reglas viven en las specs vivas del Back. Son BR-ACCESO-01 a BR-ACCESO-10 (`specs/features/acceso/acceso.spec.md`), BR-PERIODO-01 a BR-PERIODO-04 (`specs/features/periodo/periodo.spec.md`), BR-CARGA-01 a BR-CARGA-20 (`specs/features/carga-export/carga-export.spec.md`), BR-R17-01 a BR-R17-10 (`specs/features/r17/r17.spec.md`) y BR-RESULTADOS-01 a BR-RESULTADOS-11 (`specs/features/resultados/resultados.spec.md`). Los mensajes literales y la forma de las respuestas salen de los escenarios de `specs/001-mvp-carga-r17/aceptacion/*.feature` del Back y de los de las specs 003, 004 y 008. Si un ejemplo de aquí y un escenario discrepan, gana el escenario. Lleva la marca «(propuesta)» lo que ningún escenario fija y también lo que un escenario usa sin que las decisiones de la spec lo fijen, como lo marcan los `.feature`. Los ejemplos usan solo datos inventados.

## 1. Cómo está montada

La API es una aplicación FastAPI en Python 3.12 (ADR-003) con prefijo `/api`, desplegada como proyecto propio de Vercel en `iad1`, junto a Neon en us-east-1 (decisión J-17 del Back). El navegador nunca la llama por su dominio. El `vercel.json` del Front reescribe `/api/:path*` hacia el Back (una reescritura de rutas, rewrite en Vercel), así que para el navegador la API vive en el mismo origen que las pantallas y la cookie de sesión es de primera parte (ADR-004). En local, el proxy de Vite hace lo mismo hacia la API en la Mac.

La API lee y escribe en Neon con el rol `abet_app` por la cadena con pooler (el agrupador de conexiones de Neon). Toda carga ocurre en una sola transacción (ADR-001).

Al arrancar, la API comprueba contra la base el periodo de `PERIODO_VIGENTE` y el conjunto de reglas de `CONJUNTO_REGLAS`, porque la base no marca ninguno como vigente (BR-PERIODO-01 y BR-PERIODO-02). Si no los encuentra, se detiene con «PERIODO_VIGENTE 2027-1 no existe en abet.periodo» o «CONJUNTO_REGLAS R-NO-EXISTE no existe para la carrera AMB.», que nombra cada carrera con plan de medición que no tiene esa versión, o «CONJUNTO_REGLAS R-NO-EXISTE no existe en abet.conjunto_reglas.» (propuesta) cuando la base no tiene ningún plan (cambio del 2026-11-23, T033 del Back). También se detiene si `DATABASE_URL` entra con un rol de administración (superusuario, creación de roles o de bases, sin seguridad por filas o de replicación), con «DATABASE_URL entra con un rol de administración, y la API necesita el rol de la aplicación.» (propuesta), porque la aplicación trabaja solo con el rol `abet_app`. En Production y Preview de Vercel, la API también se detiene si la base no está marcada para ese entorno, con «La base de DATABASE_URL está marcada para production y el despliegue es de preview. Revise DATABASE_URL o marque la rama con db/plataforma/neon/marcar_entorno.sql.», y en Vercel se detiene si falta `VERCEL_ENV` (T077 del Back).

En local, `scripts/api_local.sh --sin-https` del Back define `ABET_COOKIE_SIN_SECURE=1`, que deja la cookie sin el atributo Secure para servir por http en 127.0.0.1 (propuesta). La API admite esa variable solo con una base local, por socket de Unix, localhost o 127.0.0.1, y fuera de Vercel, y en otro caso no arranca.

## 2. Tabla resumen de rutas

| # | Método | Ruta | Sesión | Éxito | Qué hace | Historia | Reglas | Corte |
|---|---|---|---|---|---|---|---|---|
| 1 | POST | `/api/sesion` | No | 200 | Valida correo y contraseña y fija la cookie `abet_sesion` | US-05 | BR-ACCESO-02 a BR-ACCESO-05 | 1 |
| 2 | GET | `/api/sesion` | Sí | 200 | Devuelve el usuario actual (correo, rol y, desde la spec 008, `alcance`, sección 15.3) | US-05 y US-71 (spec 008) | BR-ACCESO-06 y BR-ACCESO-13 | 1 |
| 3 | DELETE | `/api/sesion` | Opcional (propuesta) | 204 | Cierra la sesión y vence la cookie | US-05 | BR-ACCESO-06 | 1 |
| 4 | GET | `/api/secciones?periodo=2026-2` | Sí | 200 | Lista las secciones al alcance del usuario con el estado de su carga | US-06 | BR-PERIODO-01, BR-PERIODO-04 y BR-ACCESO-07 | 1 |
| 5 | POST | `/api/secciones/{seccion_id}/cargas` | Sí | 201 o 200 | Sube el export (.xlsx, .csv o .xls), lo carga en una transacción y devuelve la constancia | US-07 a US-14, US-21, US-27 a US-32 y US-36 (spec 003) | BR-CARGA-01 a BR-CARGA-17, BR-CARGA-18 (corte 2), BR-PERIODO-02 y BR-ACCESO-08 | 1 |
| 6 | GET | `/api/cargas/{carga_id}` | Sí | 200 | Devuelve la constancia de una carga, con `hoja` nula en un export de texto | US-16, US-19, US-34 (spec 003) | BR-R17-10 y BR-ACCESO-08 | 1 |
| 7 | GET | `/api/cargas/{carga_id}/r17.xlsx` | Sí | 200 | Entrega el R-17 con la hoja «Constancia», solo de cargas en estado PUBLICADA | US-15, US-16 | BR-R17-01 a BR-R17-09 y BR-ACCESO-08 | 1 |
| 8 | GET | `/api/cargas?seccion_id={seccion_id}` | Sí | 200 | Lista las cargas al alcance del usuario, con `seccion_id` opcional y, sin él, `periodo` opcional desde la spec 008 (sección 15.4) | US-19 y US-73 (spec 008) | BR-CARGA-20 y BR-ACCESO-07 | 2 |
| 9 | POST | `/api/secciones/{seccion_id}/cargas?reemplaza={carga_id}` | Sí | 201 o 200 | Reemplaza la carga publicada en una transacción (profesor en su sección, coordinador en cualquiera) | US-18 | BR-CARGA-19 y BR-ACCESO-08 | 2 |
| 10 | POST | `/api/sesion/codigo` | No | 202 | Envía el código de acceso al correo, con la misma respuesta exista o no | US-20 | BR-ACCESO-09 | 2 |
| 12 | GET | `/api/resultados?periodo=2026-2` | Sí | 200 | Devuelve los logros por SO y PI de las secciones al alcance del usuario (sección 12) | US-37 a US-44 (spec 004) | BR-RESULTADOS-01 a BR-RESULTADOS-11, BR-ACCESO-07 y BR-ACCESO-10 | spec 004 |
| 17 | GET | `/api/avance?periodo=2026-2` | Sí | 200 | Devuelve a la coordinación la etapa de cada sección de su carrera o de su curso en el periodo y el conteo por etapa, secciones 14 y 15.5 | US-64 a US-66 (spec 007) y US-79 (spec 008) | Las reglas BR-AVANCE de la spec 007, BR-ACCESO-07, BR-ACCESO-12 y BR-ACCESO-13 | specs 007 y 008 |
| 18 | GET | `/api/periodos` | Sí | 200 | Periodo vigente y periodos con secciones al alcance, sección 15.2 | US-73 (spec 008) | BR-PERIODO-05 | spec 008 |

## 3. Convenciones

### 3.1 Forma del error

Todo error de la API es un objeto JavaScript Object Notation (JSON) con el campo `detail`, en español y escrito para la persona que usa la pantalla. El Front lo muestra sin reescribirlo.

```jsonc
{ "detail": "La sección no está a su cargo." }
```

Dos errores del corte 2 suman un segundo campo, que la pantalla usa para ofrecer el paso siguiente sin leer el texto del `detail` (propuesta). El 422 de un archivo que no declara su sección trae `"requiere_confirmacion": true`, y el 409 de una sección con otra carga publicada trae `"carga_publicada"` con el `carga_id` de esa carga, que el profesor ya ve en su sección (sección 6).

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

Las horas viajan en el formato de la norma ISO 8601 de la Organización Internacional de Normalización (International Organization for Standardization), con el desfase de Lima (`2026-10-28T10:15:00-05:00`) y el Front las muestra en hora de Lima. Las rutas 1 a 10 no llevan porcentajes, que viven en el R-17. La ruta 12 de la spec 004 lleva los logros de `abet.v_r17_por_pi` como números JSON con el decimal de la vista, junto a sus conteos y a `en_meta`, y el Front los muestra sin recalcularlos ni compararlos (ADR-008 y J-22). Un nulo de la vista viaja como `null`, nunca como 0.

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

- La regla de visibilidad («los de arriba pueden ver hacia abajo, pero no los de abajo hacia arriba») vive solo aquí y en `app/permisos.py`, y la usan las rutas 5 a 9 y la 12 (BR-ACCESO-07).
- `estado` vale «PUBLICADA» cuando la sección tiene una carga en ese estado, con su `carga_id`, `filas_leidas` y `filas_aceptadas`, y vale «SIN_CARGA» en otro caso, con esos tres campos en `null`. Una sección cuyas cargas están todas RECHAZADA o REEMPLAZADA sale también «SIN_CARGA» (propuesta).
- `tiene_plan` es falso cuando `abet.plan_medicion` no tiene filas para esa asignatura y periodo, y entonces `pi` viene vacío. P2 muestra «La carrera aún no registra el plan de medición de esta sección» y la ruta 5 rechaza la subida (BR-PERIODO-04).
- La respuesta del profesor no trae ningún dato de secciones ajenas.

Errores 401 y 422 con «El periodo no tiene la forma AAAA-C.» (propuesta), para un periodo con formato distinto de `AAAA-C`, con C de 0 a 2 como `ck_periodo_ciclo`.

## 6. Cargas

#### `POST /api/secciones/{seccion_id}/cargas`: subir el export y cargarlo (BR-CARGA-01 a BR-CARGA-17, BR-CARGA-18 del corte 2, BR-PERIODO-02 y BR-ACCESO-08)

Cuerpo multipart con el campo `archivo` (.xlsx, .csv o .xls de hasta 1 MB, y el contenido elige el lector, según la spec 003 del Back) y, en el corte 2, el campo opcional `confirmar_seccion` (US-21), que solo admite el texto `true`. La API guarda el nombre del archivo sin ruta en `abet.archivo_origen.nombre_archivo` y nunca guarda sus bytes. Ningún campo de la petición apaga la guardia de datos inventados, y la API lee solo `archivo`, `confirmar_seccion` y el parámetro `reemplaza` de la ruta 9.

En el corte 1 y en el corte 2 solo sube el profesor asignado a la sección en `acceso.docente_seccion`. El coordinador ve todas las secciones y descarga cualquier R-17, pero no sube una carga nueva, y recibe el mismo 403. En el corte 2 el coordinador reemplaza la carga publicada de cualquier sección de la carrera con la ruta 9.

El orden del trabajo es fijo (BR-CARGA-03). Primero comprueba la sesión, el alcance, la forma de la petición y el plan de la sección, después calcula la huella SHA-256 de todo cuerpo recibido y comprueba el tamaño, el tipo por la extensión y el contenido, la revisión del zip o la lectura del texto, lee la columna Username y aplica la guardia de datos inventados. Luego busca la huella en `abet.archivo_origen`, comprueba si la sección ya tiene otra carga publicada y si el archivo declara su sección, y solo entonces cuenta las filas, las valida en memoria y escribe el resultado en una transacción. Los 409 y los 422 de este orden se responden antes de escribir. La huella va antes del tope de 1 MB porque el cuerpo ya está en memoria y Vercel detiene todo cuerpo de más de 4,5 MB antes de que llegue a FastAPI, así que el registro de la aplicación guarda la huella de cada rechazo por tamaño, por archivo ilegible o por la guardia (BR-CARGA-08).

```jsonc
// Respuesta 201 con el export que trae un 5 en la columna 5.2 de la fila 3
{
  "carga_id": 7,
  "estado": "PUBLICADA",
  "reemplaza_carga_id": null, // corte 2, la carga que esta reemplaza (ruta 9)
  "reemplazada_por": null,    // corte 2, la carga que reemplaza a esta
  "seccion": { "seccion_id": 1, "asignatura": "450002", "numero": "410", "periodo": "2026-2" },
  "nombre_archivo": "export_inventado_410_con_error.xlsx",
  "hoja": "gc_SINTETICO_20262_450002_410_f", // null en un export de texto (.csv o .xls)
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

La constancia es plana. `nombre_archivo`, `hoja`, `sha256` y `filas_de_datos` van en el primer nivel, con los mismos nombres de las columnas de `abet.archivo_origen`. `hoja` es texto o `null`, y va en `null` en un export de texto, que no tiene hoja, sin que la API la reemplace por ningún texto (spec 003, US-34 y BR-R17-10). P4 y la hoja «Constancia» del R-17 muestran en ese caso «Sin hoja (export de texto)», un texto de presentación que no se guarda en la base. `rechazos` trae cada RECHAZA_FILA con su `fila` y su `pi`, que va en `null` en un rechazo por código (CODIGO_VACIO, CODIGO_DUPLICADO o CODIGO_INVALIDO). También trae el RECHAZA_CARGA de una carga rechazada por estructura, sección o periodo, con `fila` en `null`. Su `pi` es el PI que falta en PI_DEL_PLAN_AUSENTE o el que se repite en PI_REPETIDO, que la base guarda en `abet.rechazo_fila.pi_id`, y va en `null` en los demás motivos (BR-R17-10). `avisos` trae cada AVISO, con `pi` en `null` cuando la columna no entra a `carga_columna`, como en COLUMNA_PI_FUERA_DEL_PLAN (BR-R17-10). Ningún rechazo trae un campo `valor` ni `valor_leido`. `mensaje` resume el motivo de una carga RECHAZADA y es `null` en una PUBLICADA (propuesta). El texto de cada aviso y el `mensaje` dentro de un rechazo RECHAZA_CARGA son (propuesta). `conjunto_reglas_estado` y `parametros_pendientes` traen el estado del conjunto de reglas y sus parámetros en PENDIENTE, los mismos que muestra la hoja «Constancia» (requisito funcional FR-021 de la spec 001), y sus dos nombres son (propuesta). Desde el corte 2, `reemplaza_carga_id` trae el `carga_id` de la carga que esta reemplaza, el mismo de `abet.carga.reemplaza_carga_id`, y `reemplazada_por` el de la carga que la reemplaza, y los dos son `null` cuando no hay reemplazo (BR-CARGA-19 y BR-CARGA-20, propuesta de los nombres).

Reglas y por qué existen.

- **Una sola transacción (BR-CARGA-02).** El archivo, la carga, sus columnas, filas, estudiantes y mediciones entran juntos o no entra nada, y ninguna carga queda EN_CURSO al terminar la petición. Ante un fallo responde 500 con «La carga no se completó y no se guardó ningún dato. Intente de nuevo.». De un error de integridad, el registro de la aplicación guarda solo el código SQLSTATE y el nombre de la restricción, nunca el campo DETAIL de PostgreSQL, que repite los valores de la fila (BR-CARGA-08).
- **Tamaño y archivo ilegible (BR-CARGA-04 y BR-CARGA-05).** Un archivo de más de 1 MB, de otro tipo, protegido con contraseña, con macros o vínculos externos, que se infla al descomprimirse, que no abre, con el texto dañado o con más de 5 000 filas de datos responde 422 con el mensaje de su caso y no deja rastro en la base. El registro de la aplicación guarda de este rechazo la huella, la hora y el motivo, sin ningún nombre de hoja, celda ni código (BR-CARGA-08).
- **Huella (BR-CARGA-06).** La huella SHA-256 se calcula sobre los bytes recibidos y se guarda en minúscula, igual a `shasum -a 256`. Un export abierto y guardado otra vez en Excel es otro archivo.
- **Guardia de datos inventados (BR-CARGA-07 y BR-CARGA-08).** Con `GUARDIA_DATOS_INVENTADOS=1`, un solo Username fuera de 99000000 a 99999999, incluido uno mal formado como 9900001, responde 422 con «El piloto solo admite códigos inventados, de 99000000 a 99999999. Revise la fila 4. No se guardó nada.» (con la fila que corresponda), sin el código en el cuerpo y sin rastro en la base. El registro de la aplicación guarda de ese rechazo solo la huella y la hora. La respalda `ck_estudiante_codigo_inventado` en Neon (ADR-002).
- **Archivo ya cargado en esta sección (BR-CARGA-09).** Si la huella ya tiene una carga PUBLICADA en esta misma sección, responde 200 con la constancia existente, aunque el archivo llegue con otro nombre, y no escribe nada. `archivo_origen.nombre_archivo` conserva el primer nombre. La respalda `uq_archivo_origen_sha256`.
- **Archivo publicado en otra sección (BR-CARGA-09).** Si la huella ya tiene una carga PUBLICADA en otra sección, responde 409 con «Este archivo ya está publicado en otra sección. No se cargó.», antes de escribir y sin ningún dato de esa sección, porque el índice único parcial `uq_carga_archivo_util` lo impediría.
- **Archivo con cargas que no están publicadas (BR-CARGA-09).** Si la huella solo tiene cargas RECHAZADA o REEMPLAZADA, la carga nueva reutiliza ese `archivo_id`, lo que `uq_carga_archivo_util` permite porque solo limita las PUBLICADA.
- **Sección con otra carga publicada (BR-CARGA-10).** Si la sección ya tiene una carga PUBLICADA de otro archivo, responde 409 con «La sección 410 ya tiene una carga publicada. No se cargó el archivo.» y no escribe nada. En el corte 2 el cuerpo suma `"carga_publicada"` con el `carga_id` de esa carga (propuesta), y P3 pregunta «La sección 410 ya tiene una carga publicada. ¿Desea reemplazarla?» antes de ofrecer la ruta 9. La respalda el índice único parcial `uq_carga_publicada_por_seccion`.
- **Filas inválidas (BR-CARGA-15).** Un nivel -1, 0 o 5 rechaza la fila completa con NIVEL_FUERA_DE_ESCALA (valor provisional de D-06). El texto «3.00» vale 3, como «3,00» y «4.0» (spec 003, US-29), y un valor como «3.50», «3,5», «Needs Grading», «-» o «NP» la rechaza con NIVEL_NO_NUMERICO (valor provisional de D-03), con efecto RECHAZA_FILA (valor provisional de D-01). El estudiante de esa fila sale de todos los indicadores de desempeño (performance indicators, PI) de la carga. Una celda de PI vacía no rechaza la fila y se carga como SIN_EVIDENCIA. Un Username vacío rechaza su fila con CODIGO_VACIO, y uno repetido rechaza la segunda aparición con CODIGO_DUPLICADO. La respalda `ck_medicion_nivel`.
- **Columnas dudosas (BR-CARGA-14).** Un Total Pts distinto de 4 deja un aviso PUNTAJE_MAXIMO_DISTINTO y la carga sigue (valor provisional de D-04). Una columna de un PI que no está en el plan se ignora con el aviso COLUMNA_PI_FUERA_DEL_PLAN.
- **Rechazo por estructura (BR-CARGA-13).** La carga queda RECHAZADA con efecto RECHAZA_CARGA, `filas_leidas` 0 y 201 con esa constancia en cinco casos. Son el archivo sin filas de datos (ARCHIVO_SIN_FILAS, «El archivo no trae filas de estudiantes.»), la falta de la columna de un PI del plan (PI_DEL_PLAN_AUSENTE, «Falta la columna del PI 5.2 que el plan de medición pide para esta sección.»), la falta de Username y Student ID (COLUMNA_CODIGO_AUSENTE, «El archivo no tiene la columna Username ni Student ID.»), un PI repetido (PI_REPETIDO, «El PI 5.1 aparece en dos columnas del archivo.») y el archivo cuyas filas aceptadas no traen ningún nivel en las columnas de los PI del plan (SIN_CALIFICACIONES, «El archivo no trae ningún nivel en las columnas de los PI del plan. La carga no se publicó.», spec 003, US-36 y BR-CARGA-16).
- **Otra sección o periodo (BR-CARGA-11 y BR-CARGA-12).** El sistema coteja la sección elegida con el nombre de la hoja y, si la hoja no la declara, con el nombre del archivo. Un export de texto no tiene hoja, así que su sección y su periodo salen solo del nombre (spec 003, US-30). Si declaran otra sección u otra asignatura (SECCION_NO_COINCIDE) u otro periodo (PERIODO_NO_COINCIDE), la carga queda RECHAZADA. Con otra sección de la misma asignatura, el mensaje nombra la sección que declara el archivo y la sección elegida, con la misma forma para cualquier par de secciones, las dicte o no el mismo profesor, como «El archivo corresponde a la sección 411 y usted eligió la 410. No se publicó.». Con la 410 y la 412 de 450010 de `varias_secciones.feature`, esa forma da «El archivo corresponde a la sección 410 y usted eligió la 412. No se publicó.» (propuesta). Para otra asignatura, aunque la sección tenga el mismo número, el texto es «El archivo corresponde a la asignatura 450010 y usted eligió la 450002. No se publicó.» (propuesta), y el de otro periodo es «El archivo corresponde al periodo 2026-1 y la sección elegida es de 2026-2. No se publicó.» (propuesta), que la spec 003 comprueba con un export de texto.
- **Archivo que no declara su sección (BR-CARGA-11 y BR-CARGA-18).** Si ni la hoja ni el nombre del archivo declaran la sección, la API responde 422 sin rastro con «El archivo no indica su sección. ¿Confirma que es de la sección 410 de 450002 en 2026-2?», que nombra la sección, la asignatura y el periodo elegidos, y `"requiere_confirmacion": true`, para los tres formatos (US-21 y valor del corte 2 de D-02). Esta pregunta reemplaza desde el corte 2 al 422 del corte 1, que detenía el archivo sin ofrecer la confirmación. Con `confirmar_seccion=true` la carga sigue en la sección elegida y registra en `abet.rechazo_fila` un AVISO con el motivo SECCION_SIN_DECLARAR, que V1_09 agrega junto con COLUMNA_CODIGO_AUSENTE, PI_REPETIDO y PERIODO_NO_COINCIDE, y la constancia lo trae entre sus avisos con «El archivo no indica su sección. Quien lo subió confirmó la sección elegida.» (propuesta). El campo solo admite «true», así que un número de sección, como 411, responde 422 con «La sección confirmada no es la sección elegida. No se guardó nada.», y cualquier otro valor recibe ese mismo 422 (propuesta), antes de leer el archivo. La confirmación no pasa por encima de una sección declarada distinta, que sigue en SECCION_NO_COINCIDE, y en un archivo que declara su sección no cambia nada. El 422 a la espera de la confirmación y el campo `requiere_confirmacion` son (propuesta).
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
| 409 | «La sección 410 ya tiene una carga publicada. No se cargó el archivo.», con `carga_publicada` en el corte 2 |
| 409 | «Este archivo ya está publicado en otra sección. No se cargó.» |
| 422 | «No se pudo abrir el archivo. Descárguelo otra vez desde Blackboard.» |
| 422 | «El archivo está protegido con contraseña. Guárdelo sin contraseña y súbalo.» |
| 422 | «Solo se admiten exports de Blackboard en formato .xlsx, .csv o .xls.» |
| 422 | «El contenido del archivo no es un export de Blackboard aunque su nombre termine en .xlsx, .csv o .xls.» |
| 422 | «El archivo trae macros o vínculos externos y no se admite.» |
| 422 | «El contenido del archivo supera el tamaño admitido al descomprimirse.» (propuesta) |
| 422 | «El archivo supera el máximo de 1 MB.» |
| 422 | «El piloto solo admite códigos inventados, de 99000000 a 99999999. Revise la fila 4. No se guardó nada.» |
| 422 | «El archivo no indica su sección. ¿Confirma que es de la sección 410 de 450002 en 2026-2?» (corte 2, con `requiere_confirmacion`) |
| 422 | «La sección confirmada no es la sección elegida. No se guardó nada.» (corte 2) |
| 422 | «La petición no tiene la forma esperada.» (propuesta), sin el campo `archivo` o con un `reemplaza` que no es un entero positivo |
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

Responde 200 con una lista de constancias resumidas, de la más reciente a la más antigua por `iniciada_en` y, a igual hora, por `carga_id`. Sin `seccion_id`, lista las cargas de las secciones que el usuario ve en el periodo vigente, las mismas de la ruta 4 (propuesta). Con `seccion_id`, lista solo las de esa sección, y una sección ajena, o que no existe, responde 403 con «La sección no está a su cargo.», sin ninguna carga. Un `seccion_id` que no es un entero responde 422 con el texto de la sección 3.1. La lista lee el alcance en `app/permisos.py` en cada petición, así que el profesor recibe solo las cargas de sus secciones, también las que reemplaza el coordinador, y el coordinador las de todas las secciones de la carrera.

```jsonc
// Respuesta 200 para coordinacion@example.invalid, con la 410 reemplazada y la 411 publicada (dos de las cargas)
[
  {
    "carga_id": 12,
    "estado": "PUBLICADA",
    "seccion": { "seccion_id": 2, "asignatura": "450002", "numero": "411", "periodo": "2026-2" },
    "nombre_archivo": "export_inventado_411.xlsx",
    "sha256_corto": "<los primeros 12 caracteres de la huella>",
    "filas_leidas": 11,
    "filas_aceptadas": 11,
    "filas_rechazadas": 0,
    "motivo": null,
    "reemplaza_carga_id": null,
    "reemplazada_por": null,
    "subida_por": "docente411@example.invalid",
    "iniciada_en": "2026-11-17T10:20:00.000000-05:00",
    "terminada_en": "2026-11-17T10:20:01.000000-05:00"
  },
  {
    "carga_id": 11,
    "estado": "PUBLICADA",
    "seccion": { "seccion_id": 1, "asignatura": "450002", "numero": "410", "periodo": "2026-2" },
    "nombre_archivo": "sintetico_20262_450002_410.xlsx",
    "sha256_corto": "<los primeros 12 caracteres de la huella>",
    "filas_leidas": 11,
    "filas_aceptadas": 11,
    "filas_rechazadas": 0,
    "motivo": null,
    "reemplaza_carga_id": 10,
    "reemplazada_por": null,
    "subida_por": "docente410@example.invalid",
    "iniciada_en": "2026-11-17T10:15:00.000000-05:00",
    "terminada_en": "2026-11-17T10:15:01.000000-05:00"
  }
]
```

Reglas y por qué existen.

- La lista no trae la huella completa, que vive en la constancia de la ruta 6, sino `sha256_corto`, con sus primeros 12 caracteres, que bastan para reconocer el archivo en P5 (propuesta del nombre).
- `motivo` trae el motivo del RECHAZA_CARGA de una carga RECHAZADA, como SECCION_NO_COINCIDE, y es `null` en las demás, también en la carga RECHAZADA porque ninguna fila se aceptó, que no tiene un motivo único (propuesta). El detalle de cada rechazo está en la constancia.
- `reemplaza_carga_id` y `reemplazada_por` tienen el sentido de la constancia (sección 6), así que P5 marca la carga vigente que reemplaza a otra y la carga REEMPLAZADA con su sucesora.
- Ningún elemento trae nombres de estudiantes, valores leídos ni la ruta local del archivo, porque la base no los guarda (BR-CARGA-17).

La constancia de una carga REEMPLAZADA sigue disponible en la ruta 6 y dice qué carga la reemplaza, pero su R-17 responde 409 con «La carga no está publicada y no tiene R-17.», porque solo una carga PUBLICADA produce R-17 (BR-R17-01).

Errores 401, 403 («La sección no está a su cargo.») y 422 («La petición no tiene la forma esperada.» (propuesta)).

#### `POST /api/secciones/{seccion_id}/cargas?reemplaza={carga_id}`: reemplazar la carga publicada (US-18, BR-CARGA-19)

El mismo cuerpo, el mismo orden y las mismas reglas de la ruta 5, con el parámetro `reemplaza`, que nombra la carga PUBLICADA vigente de la sección. Un `reemplaza` que no es un entero positivo responde 422 con «La petición no tiene la forma esperada.» (propuesta). En una sola transacción, la carga nueva entra EN_CURSO con `reemplaza_carga_id` igual a la anterior, la anterior pasa a REEMPLAZADA y la nueva pasa a PUBLICADA, sin borrar nada. Si la carga nueva queda RECHAZADA, por su estructura, su sección, su periodo o porque no acepta ninguna fila, su `reemplaza_carga_id` queda nulo desde el INSERT, sin un UPDATE de esa columna, y la anterior sigue PUBLICADA, porque `uq_carga_reemplaza` bloquearía el siguiente reemplazo válido. Volver a un export anterior reutiliza su `archivo_id` (BR-CARGA-09).

El profesor reemplaza en su sección y el coordinador en cualquiera de la carrera, sin fecha de cierre mientras D-11 siga abierta. Una sección ajena responde 403 antes de leer el cuerpo, y ninguna carga cambia.

| Caso | Respuesta |
|---|---|
| El archivo nuevo se publica | 201 con la constancia de la carga nueva, en PUBLICADA y con `reemplaza_carga_id` igual a la anterior, que queda REEMPLAZADA |
| El archivo nuevo queda RECHAZADA | 201 con su constancia, en RECHAZADA y con `reemplaza_carga_id` nulo, y la anterior sigue PUBLICADA |
| Es el mismo archivo de la carga publicada | 200 con la constancia de la carga publicada y el campo `"aviso"` con «Es el mismo archivo de la carga publicada. No se reemplazó.» (propuesta), sin escribir nada, también si `reemplaza` nombra otra carga, porque la huella se busca antes que la carga vigente (propuesta) |
| `reemplaza` no es la carga PUBLICADA de la sección, porque ya la reemplazó otra, porque la sección no tiene una carga publicada o porque la carga es de otra sección | 409 con «La carga que pide reemplazar no es la publicada de la sección 410. No se cargó el archivo.» (propuesta), sin escribir nada |
| El archivo nuevo no se abre | 422 con «No se pudo abrir el archivo. La carga publicada no cambió.», sin escribir nada |
| Cualquier otro 409 o 422 de la ruta 5 | El mismo `detail` de la ruta 5, sin escribir nada, y la carga publicada no cambia |

Dos reemplazos a la vez de la misma carga dejan una sola carga nueva PUBLICADA. La transacción que llega segunda choca con `uq_carga_reemplaza`, se deshace entera y responde el 409 de la carga que ya no es la publicada, o el 200 del mismo archivo si las dos subieron el mismo, como las subidas simultáneas de BR-CARGA-10.

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
6. **Lo que la ruta 12 deja para después**, en su sección 12.3, con las decisiones D-32 a D-34 de la spec 004.

## 10. Cómo verificar este documento

Cuando exista el Back, cada ruta de la tabla 2 debe aparecer en el esquema OpenAPI que publica FastAPI. Las rutas 17 y 18 entran en esta comprobación desde la fase de contrato de la spec 008 (T011, 2026-11-23), y cada una aparece en el esquema cuando llega su código (T038 y T033 del Back).

```bash
# Esperado: 5 caminos en el corte 1 (las 7 rutas, porque /api/sesion reúne tres métodos), 6 con el corte 2
# sin US-20 (suma /api/cargas, porque el reemplazo usa el camino de la ruta 5), 7 con la ruta 12 de la spec 004
# (suma /api/resultados), 8 con la ruta 18 de la spec 008 (suma /api/periodos), 9 con la ruta 17 de las
# specs 007 y 008 (suma /api/avance) y 10 cuando llegue /api/sesion/codigo, sin caminos que este documento
# no describa. Las rutas 13 a 16 de la spec 005 suman sus caminos cuando esa spec quite su marca.
curl -s "$URL_FRONT/api/openapi.json" | python -c "import json,sys; print('\n'.join(sorted(json.load(sys.stdin)['paths'])))"
```

Los mensajes literales de este contrato y los de los escenarios de las specs 001, 003, 004 y 008 coinciden en los dos sentidos. La comprobación corre desde la carpeta que contiene los dos repositorios, y las variables `BACK` y `FRONT` cambian sus rutas si viven en otro lugar.

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
carpetas = [pathlib.Path(os.environ["BACK"], "specs", c, "aceptacion")
            for c in ("001-mvp-carga-r17", "003-exports-blackboard", "004-reportes-docente",
                      "008-ciclo-quimica-industrial")]
escenarios = "\n".join(p.read_text(encoding="utf-8") for c in carpetas for p in sorted(c.glob("*.feature")))

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

## 12. Rutas de la spec 004, logros por SO

> **Estado 2026-11-18.** Forma definitiva de la ruta 12 de la spec 004 del Back (`specs/004-reportes-docente/`), que Jefferson aprueba en el chat el 2026-11-18 con J-21 a J-28, escrita antes de su código en la rama `feat/004-reportes-docente` (T011). Sus reglas son BR-RESULTADOS-01 a BR-RESULTADOS-11 de `specs/features/resultados/resultados.spec.md` y BR-ACCESO-10. La sección 11 queda para las rutas de la spec 002 de Capstone, que esperan su aprobación en la rama `docs/002-capstone`, y por eso esta ruta lleva el número 12.

### 12.1 Resumen

| # | Método | Ruta | Sesión | Éxito | Qué hace | Historia | Reglas | Corte |
|---|---|---|---|---|---|---|---|---|
| 12 | GET | `/api/resultados?periodo=2026-2` | Sí | 200 | Devuelve los logros por resultado del estudiante (student outcome, SO) y por indicador de desempeño (performance indicator, PI) de las secciones al alcance del usuario | US-37 a US-44 (spec 004) | BR-RESULTADOS-01 a BR-RESULTADOS-11, BR-ACCESO-07 y BR-ACCESO-10 | spec 004 |

### 12.2 `GET /api/resultados?periodo=2026-2`: logros por SO de las secciones al alcance (BR-RESULTADOS-01 a BR-RESULTADOS-11)

Sin cuerpo y sin identificadores de sección ni de carga (J-23 de la spec 004). Sin `periodo`, la ruta usa `PERIODO_VIGENTE`, y un `seccion_id` u otro parámetro que la ruta no declara deja la respuesta igual. La pantalla P6 «Mis logros por SO» (propuesta) es la única que la consume.

```jsonc
// Respuesta 200 recortada para docente.varias@example.invalid, con la 412 de 450002 publicada y la 410 de
// 450010 sin carga. Los identificadores son de ejemplo y salen siempre de la API, y las descripciones del SO se
// recortan aquí con «…».
{
  "periodo": "2026-2",
  "so": [
    { "numero": 2, "descripcion": "Habilidad para aplicar diseños de ingeniería …" },
    { "numero": 5, "descripcion": "Habilidad para trabajar efectivamente en un equipo …" }
  ],
  "secciones": [
    {
      "seccion_id": 3,
      "asignatura": { "codigo": "450002", "nombre": "Principios de Ingeniería Sostenible" },
      "numero": "412",
      "estado": "PUBLICADA",
      "carga_id": 9,
      "pi": ["5.1", "5.2", "5.3"],
      "conjunto_reglas": "R-2026-BORRADOR",
      "conjunto_reglas_estado": "BORRADOR",
      "parametros_pendientes": ["TRATO_SIN_EVIDENCIA", "CORTE_ROJO", "CONVERSION_NIVEL_0_1"],
      "provisional": true,
      "indicadores": [
        {
          "so": 5, "pi": "5.1", "instrumento": "Trabajo Integrador", "nivel_esperado": 3,
          "estudiantes_por_nivel": [1, 1, 5, 4], "logrados": 9, "calificados": 11, "sin_evidencia": 0, "total": 11,
          "pct_sobre_calificados": 81.8, "pct_sobre_total": 81.8, "meta_pct": 80.0, "en_meta": true
        }
      ]
    },
    {
      "seccion_id": 4,
      "asignatura": { "codigo": "450010", "nombre": "Gestión Sostenible de Residuos" },
      "numero": "410",
      "estado": "SIN_CARGA",
      "carga_id": null,
      "pi": ["2.1", "2.2", "5.1"],
      "conjunto_reglas": null,
      "conjunto_reglas_estado": null,
      "parametros_pendientes": null,
      "provisional": null,
      "indicadores": []
    }
  ]
}
```

Reglas y por qué existen.

- El alcance sale solo de `app/permisos.secciones_visibles()`, el único dueño de la regla de visibilidad (BR-ACCESO-07). El profesor recibe las secciones de `acceso.docente_seccion` y el coordinador todas las de la carrera, sin filas propias. La ruta no recibe identificadores, así que no tiene un caso 403 propio (BR-RESULTADOS-02).
- Cada router con datos exige la sesión, y una prueba recorre las rutas registradas con una lista cerrada de rutas públicas (BR-ACCESO-10 y J-25).
- Las cifras salen de `abet.v_r17_por_pi` por el `carga_id` de la carga PUBLICADA de cada sección, en una sola instantánea, y son las del bloque II del R-17 de esa carga (ADR-008, invariante 1). `estudiantes_por_nivel` son `n_nivel_1` a `n_nivel_4`, `logrados` es `n_esperado_o_superior`, `calificados` es `n_total` menos `n_sin_evidencia`, `pct_sobre_calificados` es `pct_logro_sobre_calificados`, `pct_sobre_total` es `pct_logro_sobre_total_con_sin_evidencia` y `meta_pct` es `meta_logro_pct` (BR-RESULTADOS-03).
- El SO, su descripción, el PI y el instrumento salen del plan de la carga, y `instrumento` es `null` cuando el plan no lo define (BR-RESULTADOS-04).
- Los porcentajes y la meta viajan como números JSON de un decimal, y un nulo de la vista viaja como `null`, nunca como 0. Un PI sin calificaciones trae `pct_sobre_calificados` y `en_meta` en `null` aunque `pct_sobre_total` valga 0.0 (BR-RESULTADOS-05).
- `en_meta` es verdadero si `pct_sobre_calificados` es mayor o igual que `meta_pct`, falso si es menor y nulo si falta alguno, con la misma función del plan de acción del R-17. El Front no compara cifras (BR-RESULTADOS-06).
- Las secciones van por código de asignatura y número de sección, nunca por resultado, y los indicadores por número de SO y número de PI, así que el 5.10 va después del 5.2. `so` trae una vez cada SO que mide el plan de alguna sección de la respuesta.
- Una sección sin carga PUBLICADA llega con `estado` «SIN_CARGA», `carga_id` nulo, los PI de su plan en `pi` e `indicadores` vacío, también si sus cargas están todas RECHAZADAS (BR-RESULTADOS-07).
- La marca provisional va por sección, con los campos y el orden del conjunto de reglas de la constancia (BR-R17-10 y BR-RESULTADOS-08). Una sección sin carga los trae en `null`.
- La respuesta trae solo las claves del ejemplo. Ninguna parte trae `subida_por`, `nombre_archivo`, `sha256`, `trato_sin_evidencia` ni `pct_logro_segun_regla`, ni un correo, un código o un nombre de estudiante (BR-RESULTADOS-09). Lleva `Cache-Control: no-store`, como toda `/api`.

Errores 401 con «La sesión venció. Ingrese otra vez.» (propuesta), sin cookie, con la sesión vencida o con el usuario dado de baja, y 422 con «El periodo no tiene la forma AAAA-C.» (propuesta). Un periodo bien formado sin secciones del usuario responde 200 con `so` y `secciones` vacíos.

### 12.3 Lo que esta sección no cubre

1. **El consolidado de varias secciones y una cifra por SO**, que esperan a D-32 de la spec 004.
2. **El agregado del curso o de la carrera junto al resultado del profesor**, que espera a D-33.
3. **La descripción del instrumento de medición**, que espera a D-34 y a J-27.
4. **La paginación.** La ruta no pagina, y la spec 004 fija un techo de prueba de 150 secciones para el coordinador, con respuesta en menos de 1 s sin el arranque en frío de Neon (SC-005 de la spec 004).

## 13. Rutas de la spec 005, oportunidades de mejora y buenas prácticas por indicador (propuesta, cambio del 2026-11-21)

> **Cambio del 2026-11-21 (aprobado por Jefferson el 2026-11-21, «Sí, apruébalas»).** Jefferson aprueba en el chat el 2026-11-21 el alcance del cambio de la spec 005 del Back (`specs/005-oportunidades-de-mejora/`, Clarification «Session 2026-11-21»), y esta sección lo traslada al contrato. El profesor ya no declara un par de textos por carga. Registra una causa y una acción en cada indicador de desempeño (performance indicator, PI) con calificaciones. El sistema rotula ese registro como oportunidad de mejora (OM) o como buena práctica (BP) según el semáforo, como piden la secretaría académica de Ingeniería Ambiental y el equipo del proyecto en sus correos del 19 y el 20 de noviembre. Las rutas 13 a 16 conservan su número y su camino, y cambian sus campos. Ninguna de ellas existe todavía en el Back ni en `src/`, porque de la spec 005 solo está construida US-51, que no tiene ruta. **Estado 2026-11-18.** La spec 005 se aprueba con un texto por carga para cada recuadro, A y B, y la tabla resumen de la sección 2 y la sección 10 no cambian hasta su tarea T011.

### 13.1 Resumen

| # | Método | Ruta | Sesión | Éxito | Qué hace | Historia | Reglas | Corte |
|---|---|---|---|---|---|---|---|---|
| 13 | GET | `/api/cargas/{carga_id}/indicadores` | Sí | 200 | Devuelve, por PI de una carga publicada, los conteos por nivel, el logro, la meta, el semáforo, el hallazgo y el tipo de registro | US-45 y US-46 | BR-MEJORA-NN (propuesta) y BR-ACCESO-08 | spec 005 |
| 14 | GET | `/api/cargas/{carga_id}/mejora` | Sí | 200 | Devuelve la declaración vigente y el borrador, con un elemento por PI, y quién puede editar | US-47, US-48 y US-54 | BR-MEJORA-NN (propuesta) y BR-ACCESO-07 | spec 005 |
| 15 | PUT | `/api/cargas/{carga_id}/mejora/borrador` | Sí | 200 | Guarda el borrador de la causa y la acción de cada PI, con una sola versión por carga | US-47, US-48 y US-53 | BR-MEJORA-NN (propuesta) y BR-ACCESO-08 | spec 005 |
| 16 | POST | `/api/cargas/{carga_id}/mejora/declaracion` | Sí | 201 | Declara una versión exacta del borrador, completa en cada PI con calificaciones, y esa declaración alimenta el R-17 | US-47 y US-49 a US-53 | BR-MEJORA-NN (propuesta) y BR-ACCESO-08 | spec 005 |

Los nombres de ruta, los campos y los textos de esta sección son propuestas hasta que Jefferson reapruebe la spec 005. Sus decisiones son J-29 a J-41 de Jefferson y D-35 a D-43 de la carrera. Las de la carrera que trae el cambio son D-39 (el semáforo fija el tipo de registro, uno por PI), D-40 (un PI sin dato no exige registro), D-41 (las OM y las BP van en los recuadros A y B del R-17, un párrafo por PI), D-42 (el responsable, el plazo y los estados Revisado y Aprobado quedan para el R-18) y D-43 (el nombre estándar de la actividad de Blackboard). Las de Jefferson son J-38 (cuatro tablas en V1_12), J-39 (tope de 800 caracteres por campo), J-40 (la declaración guarda la foto del logro, la meta y el semáforo) y J-41 (el orden de construcción).

Reglas comunes a las cuatro rutas.

- Cada ruta exige la sesión y responde con `Cache-Control: no-store`, como toda `/api`. Ninguna respuesta trae códigos, nombres ni correos de estudiantes (US-53).
- El alcance de la lectura sale de `puede_leer()`, así que el profesor lo recibe de sus secciones y el coordinador de cualquiera. La escritura (rutas 15 y 16) sale de una función propia, `puede_declarar()` de `app/permisos.py`, que admite solo al profesor asignado a la sección (J-33).
- Las rutas con cuerpo (15 y 16) responden en el orden 401, 403, 422 y 409. El Back lee el cuerpo a mano después de comprobar el alcance y exige JSON, de modo que un usuario sin permiso recibe 403 aunque su cuerpo no sea JSON (AD-23). Un cuerpo que no es JSON recibe 422 con «La petición no tiene la forma esperada.» (propuesta).
- Un PI se nombra en todas las rutas por su código, como `"5.2"`, el mismo de la ruta 12. Los PI de una carga son los de `abet.carga_columna`, y los indicadores van siempre por número de SO y número de PI.
- `tipo` y `tipo_registro` valen OPORTUNIDAD_MEJORA o BUENA_PRACTICA, y nulo en un PI SIN_DATO. El Front los muestra y nunca los calcula. En la ruta 15 copia en `tipo` el `tipo_registro` de la ruta 13, y el Back rechaza un tipo distinto del que fija el semáforo (D-39).
- El cuerpo no lleva responsable, plazo ni estado, que quedan para el R-18 y los coordinadores de curso y de área (D-42). Las rutas 15 y 16 rechazan con 422 cualquier clave que esta sección no nombre.
- Una carga que no existe recibe el mismo 403 que una ajena, como en la sección 9. El 403 dice «La sección no está a su cargo.». El 401 dice «La sesión venció. Ingrese otra vez.» (propuesta), igual que en las demás rutas.
- Las cuatro rutas entran en la prueba que recorre las rutas registradas con su lista cerrada de rutas públicas (BR-ACCESO-10, propuesta).

### 13.2 `GET /api/cargas/{carga_id}/indicadores`: cifras, semáforo, hallazgo y tipo de registro de una carga (propuesta, cambio del 2026-11-21)

Sin cuerpo. Alcance de `puede_leer()`, una sola instantánea de `abet.v_r17_por_pi` y `Cache-Control: no-store`. La única pantalla que la consume es P4, solo para una carga PUBLICADA, y J-41 la pone primera en el orden de construcción, junto con P4 por indicador.

```jsonc
// Respuesta 200 recortada para docente.varias@example.invalid, con la 412 de 450002 publicada y el conjunto
// R-2026-BORRADOR (propuesta, cambio del 2026-11-21). El carga_id es de ejemplo y sale siempre de la API.
// El instrumento de 5.2 y 5.3 se abrevia con «…».
{
  "carga_id": 9,
  "estado": "PUBLICADA",
  "provisional": true,
  "conjunto_reglas": "R-2026-BORRADOR",
  "conjunto_reglas_estado": "BORRADOR",
  "parametros_pendientes": ["CONVERSION_NIVEL_0_1", "CORTE_ROJO", "TRATO_SIN_EVIDENCIA"],
  "meta_pct": 80.0,
  "corte_rojo_pct": null,
  "indicadores": [
    {
      "so": 5, "pi": "5.1", "instrumento": "Trabajo Integrador", "nivel_esperado": 3,
      "estudiantes_por_nivel": [1, 1, 5, 4], "logrados": 9, "calificados": 11, "sin_evidencia": 0, "total": 11,
      "pct_sobre_calificados": 81.8, "pct_sobre_total": 81.8, "meta_pct": 80.0, "en_meta": true, "semaforo": "VERDE",
      "hallazgo": "5.1: 81,8 % en Satisfactorio o más, meta 80,0 %", "tipo_registro": "BUENA_PRACTICA"
    },
    {
      "so": 5, "pi": "5.2", "instrumento": "…", "nivel_esperado": 3,
      "estudiantes_por_nivel": [2, 3, 4, 2], "logrados": 6, "calificados": 11, "sin_evidencia": 0, "total": 11,
      "pct_sobre_calificados": 54.5, "pct_sobre_total": 54.5, "meta_pct": 80.0, "en_meta": false, "semaforo": "ROJO",
      "hallazgo": "5.2: 54,5 % en Satisfactorio o más, meta 80,0 %", "tipo_registro": "OPORTUNIDAD_MEJORA"
    },
    {
      "so": 5, "pi": "5.3", "instrumento": "…", "nivel_esperado": 3,
      "estudiantes_por_nivel": [0, 1, 4, 6], "logrados": 10, "calificados": 11, "sin_evidencia": 0, "total": 11,
      "pct_sobre_calificados": 90.9, "pct_sobre_total": 90.9, "meta_pct": 80.0, "en_meta": true, "semaforo": "VERDE",
      "hallazgo": "5.3: 90,9 % en Satisfactorio o más, meta 80,0 %", "tipo_registro": "BUENA_PRACTICA"
    }
  ]
}
```

Con la 410 de 450002 y el export correcto, la misma ruta trae los tres PI en ROJO, con 63,6 %, 63,6 % y 72,7 %, y los tres con `tipo_registro` OPORTUNIDAD_MEJORA. El hallazgo de 5.2 es entonces «5.2: 63,6 % en Satisfactorio o más, meta 80,0 %» (propuesta).

Reglas y por qué existen.

- Las claves de cada indicador son las de la ruta 12 (sección 12.2) más `semaforo`, `hallazgo` y `tipo_registro`, y las cifras son las del bloque II y de la tabla K28:Q31 del R-17 de la misma carga. El logro es `round(100 × E, 1)` de su fila, la meta es `round(100 × G, 1)` y el porcentaje sobre el total es `round(100 × Q, 1)`. La ruta lee una sola instantánea.
- `semaforo` lo decide una función pura del Back, junto a la función de la meta de la spec 004 (J-29). Vale SIN_DATO si falta el logro o la meta, VERDE si `en_meta` es verdadero, AMBAR si `corte_rojo_pct` está definido y el logro es mayor o igual que el corte y menor que la meta, y ROJO en los demás casos. Así VERDE coincide con «En la meta» de P6 y ROJO o AMBAR con «El indicador aún no alcanza …» de la hoja del R-17.
- `tipo_registro` lo decide `tipo_de_registro()`, otra función pura de `abet_carga/resultados.py`, junto a la del semáforo (D-39). VERDE da BUENA_PRACTICA, AMBAR y ROJO dan OPORTUNIDAD_MEJORA y SIN_DATO da nulo, porque un PI sin dato no exige registro (D-40). Un PI que alcanza o supera la meta también lleva su análisis, como pide la secretaría académica de Ingeniería Ambiental con la frase «incluso cuando se supera el valor de referencia, deberíamos hacer el análisis de causas hasta llegar a la BP», que propone cerrar D-36.
- `hallazgo` es una frase automática del Back, armada con el logro sobre calificados y la meta de la misma fila, con coma decimal y un decimal, como «5.2: 63,6 % en Satisfactorio o más, meta 80,0 %» (propuesta). Un PI SIN_DATO sin calificaciones trae un hallazgo sin cifras, «5.3: sin calificaciones en esta carga.» (propuesta), y un conjunto sin META_LOGRO o sin NIVEL_ESPERADO definido trae «5.1: el conjunto de reglas no define la meta o el nivel esperado.» (propuesta). El Front copia el hallazgo sin cambios.
- `corte_rojo_pct` es nulo mientras CORTE_ROJO siga PENDIENTE en R-2026-BORRADOR, y entonces el piloto muestra VERDE, ROJO o SIN_DATO. Con R-PRUEBA-SEMAFORO, un conjunto de prueba con CORTE_ROJO 0,75, la misma respuesta trae `corte_rojo_pct` igual a 75.0 y el ámbar aparece (D-35), con OPORTUNIDAD_MEJORA como tipo.
- Un PI sin ninguna calificación trae `pct_sobre_calificados` nulo, `pct_sobre_total` igual a 0.0, SIN_DATO y `tipo_registro` nulo, nunca ROJO. Con NIVEL_ESPERADO o META_LOGRO sin DEFINIR, cada indicador trae SIN_DATO y la ruta responde 200 y no 500.
- La respuesta no trae `subida_por`, `nombre_archivo`, `sha256` ni ningún código, nombre o correo de estudiante.

Errores 401, 403 («La sección no está a su cargo.»), también para una carga que no existe, y 409 con «La carga no está publicada y no tiene semáforo.» (propuesta) para una carga RECHAZADA o REEMPLAZADA. La ruta no tiene cuerpo ni parámetros, así que no responde 422.

### 13.3 `GET /api/cargas/{carga_id}/mejora`: declaración y borrador por indicador (propuesta, cambio del 2026-11-21)

Sin cuerpo. Alcance de `puede_leer()`, con `puede_editar` verdadero solo para el profesor asignado a la sección. P4 la pide al abrirse, para llenar la sección «Análisis por indicador» y para decidir si ofrece el R-17.

```jsonc
// Respuesta 200 para docente.varias@example.invalid con la 412 de 450002 declarada y sin cambios posteriores
// (propuesta, cambio del 2026-11-21). Los textos son inventados y las fechas son de ejemplo.
{
  "declaracion": {
    "declarada_en": "2026-11-21T15:10:00-05:00",
    "indicadores": [
      {
        "pi": "5.1", "tipo": "BUENA_PRACTICA", "estado": "PROPUESTA",
        "causa": "Los equipos revisan un caso resuelto antes de la entrega.",
        "accion": "Mantener el caso resuelto y compartirlo con las otras secciones del curso."
      },
      {
        "pi": "5.2", "tipo": "OPORTUNIDAD_MEJORA", "estado": "PROPUESTA",
        "causa": "La entrega coincide con la semana de parciales.",
        "accion": "Mover la entrega a la semana 10 y revisar el avance en clase."
      },
      {
        "pi": "5.3", "tipo": "BUENA_PRACTICA", "estado": "PROPUESTA",
        "causa": "La rúbrica se explica con ejemplos en la semana 8.",
        "accion": "Repetir la explicación de la rúbrica con ejemplos en el ciclo siguiente."
      }
    ]
  },
  "borrador": {
    "version": 3,
    "actualizado_en": "2026-11-21T15:09:00-05:00",
    "indicadores": [
      { "pi": "5.1", "tipo": "BUENA_PRACTICA", "causa": "Los equipos revisan un caso resuelto antes de la entrega.", "accion": "Mantener el caso resuelto y compartirlo con las otras secciones del curso." },
      { "pi": "5.2", "tipo": "OPORTUNIDAD_MEJORA", "causa": "La entrega coincide con la semana de parciales.", "accion": "Mover la entrega a la semana 10 y revisar el avance en clase." },
      { "pi": "5.3", "tipo": "BUENA_PRACTICA", "causa": "La rúbrica se explica con ejemplos en la semana 8.", "accion": "Repetir la explicación de la rúbrica con ejemplos en el ciclo siguiente." }
    ]
  },
  "borrador_pendiente": false,
  "heredado_de": null,
  "puede_editar": true
}
```

Reglas y por qué existen.

- Una carga sin texto responde 200 con `declaracion` nulo, `borrador` nulo y `puede_editar` verdadero para su profesor. P4 arma entonces, con la respuesta de la ruta 13, un bloque vacío por cada PI que lleva registro y un bloque con solo el hallazgo por cada PI SIN_DATO.
- `borrador.indicadores` trae un elemento por cada PI que lleva registro, con `causa` o `accion` nulos si el profesor todavía no los escribe, y su `tipo` es el `tipo_registro` vigente de la ruta 13. Un PI SIN_DATO no lleva registro (D-40), así que no tiene elemento en el borrador.
- La declaración vigente de una carga es la última fila de `abet.mejora_declaracion`, que la aplicación solo inserta, con sus filas de `abet.mejora_declaracion_pi`, una por PI con calificaciones (J-30 y J-38). `declaracion.indicadores` trae el `tipo` guardado al declarar, que no cambia aunque cambie después la meta del conjunto de reglas (J-40). Un PI SIN_DATO no tiene fila ni elemento.
- `estado` vale PROPUESTA en cada indicador declarado. La ruta lo deriva de que exista la declaración vigente y no lo guarda, y el borrador no lo trae. Los estados Revisado y Aprobado, con su responsable y su plazo, quedan para el R-18 y los coordinadores de curso y de área (D-42).
- `borrador_pendiente` es verdadero si existe un borrador posterior a esa declaración. Mientras tanto la declaración anterior sigue vigente y el R-17 sigue saliendo con ella (D-37).
- El coordinador lee la declaración y nunca recibe el texto del borrador. Su respuesta trae `borrador` nulo y `puede_editar` falso, también si el profesor solo guardó un borrador.
- La herencia de US-54 ocurre al leer, sin escribir, y va por PI. Si la carga nueva no tiene borrador ni declaración, `borrador` trae la causa y la acción de la declaración vigente de la carga que reemplaza o, si esa carga no tiene declaración, las de su borrador. Solo las trae para los PI que la carga nueva también reconoce, con `version` igual a 0 y `heredado_de` igual al `carga_id` de origen. El `tipo` de cada PI sale del semáforo de la carga nueva. Sin texto anterior, `borrador` queda nulo y `heredado_de` nulo. El texto se guarda en la carga nueva con el primer PUT de la ruta 15, y el coordinador no ve el texto heredado.
- Una carga RECHAZADA o REEMPLAZADA se puede leer. Su escritura no se admite (rutas 15 y 16).

Errores 401 y 403 («La sección no está a su cargo.»), también para una carga que no existe.

### 13.4 `PUT /api/cargas/{carga_id}/mejora/borrador`: guardar el borrador por indicador (propuesta, cambio del 2026-11-21)

Cuerpo JSON con `version`, la que la persona leyó, e `indicadores`, un arreglo con un elemento por PI que lleva `pi`, `tipo`, `causa` y `accion`. `causa` y `accion` son opcionales para admitir un borrador parcial. `tipo` copia el `tipo_registro` de la ruta 13, porque lo fija el sistema con el semáforo, y el Back comprueba que coincida. Escribe solo el profesor asignado, por `puede_declarar()`.

```jsonc
// PUT con solo la causa de 5.2 y version 0 (propuesta, cambio del 2026-11-21).
{
  "version": 0,
  "indicadores": [
    { "pi": "5.2", "tipo": "OPORTUNIDAD_MEJORA", "causa": "La entrega coincide con la semana de parciales." }
  ]
}
// Respuesta 200. La fecha es de ejemplo.
{ "version": 1, "actualizado_en": "2026-11-21T15:10:00-05:00" }
```

Reglas y por qué existen.

- El borrador tiene una sola versión por carga, que cubre todos sus PI (US-48 sigue igual por carga). Un PUT con la versión guardada reemplaza el borrador entero y suma 1 a `version`. Un PI que no viaja en el arreglo, o un campo que no viaja, queda nulo, así que P4 envía siempre todos los PI que llevan registro. Con solo la causa de 5.2, un GET posterior devuelve esa causa y los demás campos nulos. Un arreglo vacío es válido, y P4 lo envía antes de declarar una carga cuyos PI son todos SIN_DATO, porque la ruta 16 no acepta la versión 0 sin borrador.
- Un PUT con una versión distinta de la guardada no cambia nada y responde 409 con «Otra pestaña guardó un texto más reciente.» (propuesta), junto con el borrador guardado y su versión, para que P4 ofrezca elegir cuál conservar (AD-19).
- Cada `pi` debe ser un PI de la carga, que la base exige con la clave foránea de `abet.mejora_borrador_pi` hacia `abet.carga_columna`. Un PI ajeno, como 2.1 en la 410 de 450002, responde 422 «El indicador 2.1 no pertenece a esta carga.» (propuesta). Un PI repetido en el arreglo responde 422 «Cada indicador va una sola vez en el cuerpo.» (propuesta).
- Un PI SIN_DATO no lleva registro (D-40). Un elemento de ese PI en el arreglo responde 422 «El indicador 5.3 no lleva registro porque su semáforo no tiene dato.» (propuesta).
- El `tipo` de cada elemento debe ser el `tipo_registro` que la ruta 13 devuelve para ese PI. Un tipo distinto, como BUENA_PRACTICA en el 5.2 ROJO de la 412 de 450002, responde 422 «El tipo de registro de cada indicador lo fija su semáforo.» (propuesta), y la base lo impide además en la declaración con `ck_mejora_declaracion_pi_coherencia`.
- El Back normaliza cada campo a la forma NFC de Unicode, cambia `\r\n` por `\n`, rechaza los caracteres de control salvo `\n` y `\t` y cuenta puntos de código, hasta 800 por campo (AD-10 y J-39). El tope baja de 2000 a 800 para que el análisis de todos los PI quepa en los recuadros A y B del R-17. El Front cuenta igual y no usa `maxLength`.
- La validación corre después del 403 y busca códigos de estudiante y correos en cada campo de cada PI, con el mismo patrón ASCII de la ruta 16 y de los CHECK de las tablas por PI. Ni la respuesta ni el registro de la aplicación repiten el texto (AD-11). La violación de un CHECK sale como 422 y nunca como 500.
- Un cuerpo con una clave que esta sección no nombra, como `responsable`, `plazo` o `estado`, en la raíz o dentro de un indicador, responde 422 «El cuerpo trae claves que esta ruta no admite.» (propuesta).
- Un borrador con 422 no se guarda, tampoco en parte.

```jsonc
// 409 por versión desactualizada (propuesta, cambio del 2026-11-21). El borrador guardado viaja con la misma
// forma que en la ruta 14, para que P4 lo muestre junto al texto de la pantalla. La fecha es de ejemplo.
{
  "detail": "Otra pestaña guardó un texto más reciente.",
  "borrador": {
    "version": 3,
    "actualizado_en": "2026-11-21T15:12:00-05:00",
    "indicadores": [
      { "pi": "5.1", "tipo": "BUENA_PRACTICA", "causa": null, "accion": null },
      { "pi": "5.2", "tipo": "OPORTUNIDAD_MEJORA", "causa": "La entrega coincide con la semana de parciales.", "accion": null },
      { "pi": "5.3", "tipo": "BUENA_PRACTICA", "causa": null, "accion": null }
    ]
  }
}
```

Errores en este orden.

| Código | Cuándo | `detail` |
|---|---|---|
| 401 | Sin sesión o con la sesión vencida | «La sesión venció. Ingrese otra vez.» (propuesta) |
| 403 | Coordinador, profesor de otra sección o carga que no existe, aunque el cuerpo no sea JSON | «La sección no está a su cargo.» |
| 422 | Cuerpo que no es JSON | «La petición no tiene la forma esperada.» (propuesta) |
| 422 | Una clave fuera del contrato, como `responsable`, `plazo` o `estado` | «El cuerpo trae claves que esta ruta no admite.» (propuesta) |
| 422 | Un PI repetido en el arreglo | «Cada indicador va una sola vez en el cuerpo.» (propuesta) |
| 422 | Un PI que no es de la carga | «El indicador 2.1 no pertenece a esta carga.» (propuesta) |
| 422 | Un elemento de un PI SIN_DATO | «El indicador 5.3 no lleva registro porque su semáforo no tiene dato.» (propuesta) |
| 422 | Un `tipo` distinto del `tipo_registro` de la ruta 13 | «El tipo de registro de cada indicador lo fija su semáforo.» (propuesta) |
| 422 | Un campo de más de 800 puntos de código | «Cada campo admite hasta 800 caracteres.» (propuesta) |
| 422 | Un carácter de control, como U+0007 | «El texto trae caracteres que no se pueden guardar.» (propuesta) |
| 422 | Un código de estudiante de 8 dígitos o un correo | «La declaración no puede llevar códigos ni correos. Describa las causas y las acciones sin datos de estudiantes.» (propuesta) |
| 409 | Carga RECHAZADA o REEMPLAZADA, con `reemplazada_por` en la REEMPLAZADA (AD-27) | «La carga no está publicada y no admite causas ni acciones.» (propuesta) |
| 409 | `version` distinta de la guardada, con `borrador` | «Otra pestaña guardó un texto más reciente.» (propuesta) |

El 409 de la carga que no está PUBLICADA manda sobre el de la versión. Un número de 9 dígitos o una fecha como 21/11/2026 se aceptan. Un nombre de estudiante escrito en el texto no se detecta, y por eso P4 lo advierte con una nota (J-36).

### 13.5 `POST /api/cargas/{carga_id}/mejora/declaracion`: declarar una versión completa del borrador (propuesta, cambio del 2026-11-21)

Cuerpo JSON `{ "version": 3 }`, que declara esa versión exacta del borrador con todos sus PI. Escribe solo el profesor asignado, por `puede_declarar()`. La declaración no se edita, y una corrección es una declaración nueva que reemplaza a la anterior en el R-17 siguiente (D-37).

```jsonc
// Respuesta 201 (propuesta, cambio del 2026-11-21), con la misma forma de «declaracion» de la ruta 14.
// Los textos se recortan aquí con «…» y la fecha es de ejemplo.
{
  "declarada_en": "2026-11-21T15:10:00-05:00",
  "indicadores": [
    { "pi": "5.1", "tipo": "BUENA_PRACTICA", "estado": "PROPUESTA", "causa": "…", "accion": "…" },
    { "pi": "5.2", "tipo": "OPORTUNIDAD_MEJORA", "estado": "PROPUESTA", "causa": "…", "accion": "…" },
    { "pi": "5.3", "tipo": "BUENA_PRACTICA", "estado": "PROPUESTA", "causa": "…", "accion": "…" }
  ]
}
```

Reglas y por qué existen.

- La declaración exige causa y acción, sin vacío ni espacios solos, en cada PI con calificaciones de la carga, y un PI SIN_DATO no las exige (D-40). Con un PI incompleto la ruta responde 422 «Complete la causa y la acción de cada indicador.» (propuesta) y no crea ninguna fila. La completitud se comprueba sobre el borrador guardado con esa versión.
- La declaración inserta, en una sola transacción, una fila en `abet.mejora_declaracion` y una fila por PI con calificaciones en `abet.mejora_declaracion_pi`, con su tipo, su causa, su acción y la foto de su logro, su meta y su semáforo, leídos de la misma instantánea de `abet.v_r17_por_pi` (J-38 y J-40). Una restricción de la base exige que el tipo y el semáforo de la foto coincidan. Las filas anteriores quedan guardadas, y un GET posterior de la ruta 14 devuelve la declaración nueva con `borrador_pendiente` falso.
- La ruta aplica a cada campo el mismo tope de 800 puntos de código y el mismo control de caracteres y de códigos que la ruta 15, y además comprueba que los recuadros A y B compuestos quepan en el alto de fila que calcula `r17.py`, con la misma función que escribe el R-17. Si no caben, responde 422 «El análisis no cabe en el R-17. Acorte la causa o la acción de algún indicador.» (propuesta).
- Un cuerpo con otra clave que `version`, como `responsable`, `plazo` o `estado`, responde 422 «El cuerpo trae claves que esta ruta no admite.» (propuesta), el mismo texto de la ruta 15.
- Si un PI con calificaciones queda SIN_DATO porque el conjunto de reglas no define META_LOGRO o NIVEL_ESPERADO, la ruta responde 409 «El conjunto de reglas no define la meta o el nivel esperado. La declaración espera a la Coordinación.» (propuesta) y no crea ninguna fila. Ese 409 manda sobre el 422 de la declaración incompleta, porque ningún texto del profesor lo resuelve.
- Una carga cuyos PI son todos SIN_DATO por falta de calificaciones se declara con un borrador guardado con el arreglo vacío (sección 13.4), y la declaración no tiene filas por PI.
- Declarar habilita el R-17 de la carga (ruta 7, sección 13.6), también para el coordinador.

Errores en este orden.

| Código | Cuándo | `detail` |
|---|---|---|
| 401 | Sin sesión o con la sesión vencida | «La sesión venció. Ingrese otra vez.» (propuesta) |
| 403 | Coordinador, profesor de otra sección o carga que no existe, aunque el cuerpo no sea JSON | «La sección no está a su cargo.» |
| 422 | Cuerpo que no es JSON | «La petición no tiene la forma esperada.» (propuesta) |
| 422 | Una clave distinta de `version`, como `responsable`, `plazo` o `estado` | «El cuerpo trae claves que esta ruta no admite.» (propuesta) |
| 422 | Un PI con calificaciones sin causa o sin acción, o `version` 0 sin ningún borrador guardado | «Complete la causa y la acción de cada indicador.» (propuesta) |
| 422 | Los recuadros A o B compuestos no caben en el alto de fila del R-17 | «El análisis no cabe en el R-17. Acorte la causa o la acción de algún indicador.» (propuesta) |
| 422 | Los otros casos de la ruta 15 (largo, control, códigos y correos) | Los mismos textos de la ruta 15 |
| 409 | Carga RECHAZADA o REEMPLAZADA, con `reemplazada_por` en la REEMPLAZADA (AD-27) | «La carga no está publicada y no admite causas ni acciones.» (propuesta) |
| 409 | Un PI con calificaciones queda SIN_DATO porque el conjunto de reglas no define META_LOGRO o NIVEL_ESPERADO | «El conjunto de reglas no define la meta o el nivel esperado. La declaración espera a la Coordinación.» (propuesta) |
| 409 | `version` distinta de la del borrador guardado, con `borrador` como en la ruta 15 | «El borrador cambió después de este guardado. Guarde otra vez antes de declarar.» (propuesta) |

El 409 de la carga que no está PUBLICADA manda sobre los demás 409, y el de la regla sin definir manda sobre el 422 «Complete la causa y la acción de cada indicador.» (propuesta). P4 muestra ese 409 con su `detail` junto al botón «Guardar declaración» y conserva el texto de los bloques (`docs/01-arquitectura/frontend.md`, sección 10.2). Con una declaración incompleta no se crea ninguna fila. P4 envía siempre el guardado pendiente antes de declarar, así que el 409 por versión aparece solo cuando otra pestaña guardó entre los dos pasos.

### 13.6 El cambio de la ruta 7 con la spec 005 (propuesta, cambio del 2026-11-21)

`GET /api/cargas/{carga_id}/r17.xlsx` suma un 409 para una carga PUBLICADA sin declaración vigente, con el texto «Complete la causa y la acción de cada indicador en la página de la carga antes de descargar el R-17.» (propuesta). Como la ruta 16 acepta solo una declaración completa, la declaración vigente cubre siempre cada PI con calificaciones (US-49). Ese 409 vale también para el coordinador (J-33), que no escribe la declaración, y si el profesor no declara la salida es reasignar la sección en `acceso.docente_seccion`.

- El R-17 compone el recuadro A (B29:I31) con un párrafo de causa por PI y el recuadro B (B34:I36) con un párrafo de acción por PI, en el orden de los PI y con un prefijo sin cifras, como «5.1 · Buena práctica. …» y «5.2 · Oportunidad de mejora. …» (propuestas). Un PI SIN_DATO escribe «5.3 · Sin calificaciones en esta carga.» (propuesta) en los dos recuadros (D-41, provisional).
- La plantilla oficial no cambia, ni los enunciados de B28 y B33, que hablan de «no alcanzar el indicador» y cuyo ajuste es D-08, de la carrera. Una hoja aparte para las OM y las BP queda para después (D-41).
- El 409 de una carga que no está PUBLICADA manda sobre el de la declaración, así que una carga RECHAZADA responde «La carga no está publicada y no tiene R-17.» aunque no tenga declaración.
- Con solo un borrador, la ruta sigue en 409. Con la declaración responde 200 con el archivo `R017_450002_412_2026-2_PROVISIONAL.xlsx`.
- Toda carga publicada antes de V1_12, como la 410 y la 411 de la vista previa y de Production, queda en 409 hasta declarar, sin excepción por fecha (J-37). Por eso el Front se despliega antes que el Back.
- La carga nueva de un reemplazo responde 409 hasta que el profesor declare, aunque traiga el texto anterior como borrador.
- El comando `python -m abet_carga r17` de una carga sin declaración termina con el mismo mensaje y sin escribir ningún archivo.

El Front no ofrece el enlace a la ruta 7 sin declaración, porque P4 es el único lugar que lo muestra y lo deshabilita antes (J-32), y así ningún enlace abre un 409 en JSON.

### 13.7 Lo que esta sección no cubre

1. **El R-18, los roles de coordinador de curso y de área, los estados Revisado y Aprobado y el responsable y el plazo de cada acción** (D-42), que esperan la plantilla del R-18 y la definición del área. La ruta 14 deriva solo PROPUESTA.
2. **La ficha completa del R-17 en pantalla** (C-P04), la rúbrica de cada estadio en pantalla (C-P05) y el nombre del docente en el R-17 (D-12 de la spec 001).
3. **La muestra para el archivo ABET** (C-B04) y la observación del evaluador por estudiante, que no entra a la base.
4. **El aviso de una columna ABET mal nombrada en el export** (C-C04). Hasta entonces el lector acepta una actividad por PI con la forma «ABET SO4.1», y la carrera fija el nombre estándar con D-43 antes de capacitar a los profesores en la semana 14.
5. **Quién declaró, en la hoja «Constancia» del R-17 y en la constancia en JSON** (C-12). La base guarda `declarada_por` y `declarada_en`, pero ninguna respuesta muestra `declarada_por`.
6. **La marca «Declaración pendiente»** en P2 y en P5 (C-14, parte b), y la descripción del SO en B15 (C-08).
7. **Una OM además de la BP en un PI VERDE**, que D-39 deja abierta. Mientras no se decida, cada PI lleva un solo registro con el tipo que fija el semáforo.
8. **El resto de N6** (criterios con más dificultades, lista de estudiantes que necesitan apoyo y comparación con el promedio del curso), que espera a D-33.
9. **La edición de la descripción del instrumento desde una pantalla** (D-34) y la escritura de la declaración por el coordinador.
10. **Los cambios de la tabla de la sección 2 y de la sección 10**, que se ajustan al reaprobar la spec (tarea T011).

## 14. Ruta de la spec 007, avance del registro para la coordinación (propuesta)

> **Aprobada por Jefferson el 2026-11-22 («Sí, apruébala»).** Esta sección traslada la ruta 17 de la spec 007 del Back (`specs/007-experiencia-por-cuenta/`, US-64 a US-66, J-47 y J-48) y no rige hasta su aprobación y su fase de contrato (T011 y T012). Los nombres de la ruta, de los campos y los textos son propuestas. La etapa A de la spec 007 no agrega rutas ni cambia las rutas 4, 6, 8 y 9, que P2, P3 y P4 leen como hoy.

### 14.1 Resumen

| # | Método | Ruta | Sesión | Éxito | Qué hace | Historia | Reglas | Corte |
|---|---|---|---|---|---|---|---|---|
| 17 | GET | `/api/avance?periodo=2026-2` | Sí | 200 | Devuelve a la coordinación la etapa de cada sección de la carrera en el periodo, el conteo por etapa y, con D-47, los correos de los profesores de las secciones que faltan | US-64 a US-66 (spec 007) | BR-AVANCE-NN (propuesta), BR-ACCESO-07 y BR-ACCESO-12 (propuesta) | spec 007, etapa B |

El número 17 y la pantalla P7 son los que AD-47 de la revisión de la spec 005 nombra para una idea fuera de alcance, la rúbrica de la sección, que recibe otros números cuando entre (J-47).

### 14.2 `GET /api/avance?periodo=2026-2`: etapa de cada sección de la carrera (propuesta)

Solo un usuario activo con rol COORDINADOR la lee, por `puede_ver_avance()` de `app/permisos.py`, y su alcance sale de `secciones_visibles()`, el mismo de la ruta 4 para el coordinador. Sin `periodo`, la API usa `PERIODO_VIGENTE`.

```jsonc
// Respuesta 200 para coordinacion@example.invalid, con datos inventados
{
  "periodo": "2026-2",
  "conteo": { "secciones": 5, "PUBLICADA": 1, "CON_RECHAZO": 1, "SIN_CARGA": 1, "SIN_PROFESOR": 1, "SIN_PLAN": 1 },
  "secciones": [
    { "seccion_id": 1, "asignatura": { "codigo": "450002", "nombre": "Principios de Ingeniería Sostenible" },
      "numero": "410", "etapa": "PUBLICADA", "carga_id": 7, "profesores": [] },
    { "seccion_id": 2, "asignatura": { "codigo": "450002", "nombre": "Principios de Ingeniería Sostenible" },
      "numero": "411", "etapa": "CON_RECHAZO", "carga_id": null, "profesores": ["docente411@example.invalid"] },
    { "seccion_id": 3, "asignatura": { "codigo": "450010", "nombre": "Gestión Sostenible de Residuos" },
      "numero": "412", "etapa": "SIN_CARGA", "carga_id": null, "profesores": ["docente410@example.invalid"] },
    { "seccion_id": 4, "asignatura": { "codigo": "450010", "nombre": "Gestión Sostenible de Residuos" },
      "numero": "413", "etapa": "SIN_PROFESOR", "carga_id": null, "profesores": [] },
    { "seccion_id": 5, "asignatura": { "codigo": "450020", "nombre": "Evaluación del Impacto Ambiental" },
      "numero": "414", "etapa": "SIN_PLAN", "carga_id": null, "profesores": [] }
  ]
}
```

Reglas y por qué existen.

- La etapa la decide el Back en cada lectura y no se guarda en ninguna tabla (J-48, valor provisional). Una sección es SIN_PLAN si `abet.plan_medicion` no tiene filas de su asignatura en el periodo, la misma condición de `tiene_plan` de la ruta 4. Si no, es PUBLICADA con una carga PUBLICADA, aunque ya no tenga un profesor activo. Si no, es SIN_PROFESOR si ningún usuario activo con rol PROFESOR la tiene en `acceso.docente_seccion`, la condición de `secciones_sin_docente.sql` de la spec 006. Si no, es CON_RECHAZO con al menos una carga RECHAZADA, y SIN_CARGA en otro caso, también con una carga EN_CURSO. El Front muestra la etapa y nunca la calcula.
- `carga_id` es el de la carga PUBLICADA de la sección, y `null` sin ella. Con la alternativa de J-48, que pone SIN_PROFESOR antes de PUBLICADA, también lo trae una sección SIN_PROFESOR. P7 abre con él P4, el único lugar del R-17 (J-32 de la spec 005).
- `profesores` trae, en orden alfabético, los correos de los usuarios activos con rol PROFESOR de `acceso.docente_seccion` solo en las secciones CON_RECHAZO y SIN_CARGA, y `[]` en las demás. Depende de D-47, y si la Coordinación responde que no, el campo no existe.
- La respuesta no trae porcentajes, niveles, cifras del R-17, códigos ni nombres de estudiantes, nombres de profesores ni datos de `acceso.credencial`.
- Las secciones van por código de asignatura y número, el orden de `secciones_visibles()`, sin un orden por resultado (J-28 de la spec 004).
- La ruta responde con `Cache-Control: no-store`, como toda `/api`, y entra en la prueba que recorre las rutas registradas (BR-ACCESO-10).
- Los campos que la spec 007 deja para después, el bloque de reglas pendientes (C-C04) y la división de PUBLICADA en POR_DECLARAR y DECLARADA (C-C06), llegan como campos o valores nuevos que no cambian los de esta sección.

Errores, en el orden 401, 403 y 422 y todos sin rastro en la base.

- 401 sin sesión, con el texto de las demás rutas.
- 403 con «Esta página es de la Coordinación.» (propuesta) para un usuario con rol PROFESOR, antes de revisar el periodo.
- 422 con «El periodo no tiene la forma AAAA-C.» (propuesta) para un periodo con otra forma, como en la ruta 4.

### 14.3 Lo que esta sección no cubre

1. **Los cambios de la sección 10**, que suman el camino `/api/avance` en la fase de contrato de la spec 007 (T012). La tabla de la sección 2 trae la ruta 17 marcada (propuesta) desde la spec 008.
2. **El envío de correos desde la aplicación.** La coordinación copia la lista en P7 y escribe desde su propio correo.
3. **El campo aditivo `ultima_rechazada_id` de la ruta 4** (J-45), que reemplaza la combinación de las rutas 4 y 8 en P2 del profesor cuando la ruta 17 esté construida.

## 15. Rutas de la spec 008, ciclo de Química General en Ingeniería Industrial

> **Definitiva desde el 2026-11-23 (T011 de la spec 008, aprobada por Jefferson en el chat el mismo día, «Sí, apruébala»).** Esta sección traslada las rutas nuevas o cambiadas de la spec 008 del Back (`specs/008-ciclo-quimica-industrial/`, US-71, US-73, US-79 y US-80, con J-49 a J-59) y fija los nombres de las rutas y de los campos antes de su código. Las reglas BR-ACCESO-13, BR-PERIODO-05 y BR-R17-13 y los cambios fechados de BR-ACCESO-07, BR-ACCESO-08 y BR-CARGA-20 entran en las specs vivas del Back con T010. Siguen como propuestas los textos de pantalla que la spec marca así, como «Secciones del curso», y el campo condicional `agregados` de la sección 15.6, que depende de D-32 (J-54). Todas las rutas exigen la sesión, responden con `Cache-Control: no-store`, como toda `/api`, entran en la prueba que recorre las rutas registradas (BR-ACCESO-10) y siguen la forma de error `{ "detail": "mensaje" }`. Ninguna respuesta trae nombres de personas, códigos de estudiante, datos de `acceso.credencial` ni el valor de una celda. Los ejemplos usan solo datos inventados.

### 15.1 Resumen

| # | Método | Ruta | Sesión | Éxito | Qué hace | Historia | Reglas | Cambio |
|---|---|---|---|---|---|---|---|---|
| 2 | GET | `/api/sesion` | Sí | 200 | Suma el campo aditivo `alcance` al usuario actual | US-71 (spec 008) | BR-ACCESO-06 y BR-ACCESO-13 | aditivo |
| 4 | GET | `/api/secciones?periodo=2026-1` | Sí | 200 | Sin cambio de forma. El alcance de la coordinación sale de `acceso.coordinacion_alcance` | US-70 y US-71 (spec 008) | BR-ACCESO-07 con un cambio fechado y BR-ACCESO-13 | de alcance |
| 8 | GET | `/api/cargas?periodo=2026-1` | Sí | 200 | Suma el parámetro aditivo `periodo` cuando no lleva `seccion_id` | US-73 (spec 008) | BR-CARGA-20 con un cambio fechado | aditivo |
| 12 | GET | `/api/resultados?periodo=2026-1` | Sí | 200 | Suma, solo si D-32 se responde (J-54), el campo `agregados` para el COORDINADOR | US-80 (spec 008) | BR-RESULTADOS-03, 05, 06 y 09 con un cambio fechado | aditivo y condicional |
| 17 | GET | `/api/avance?periodo=2026-1` | Sí | 200 | La ruta de la sección 14, con el alcance de la coordinación del curso | US-79 (spec 008) | Las reglas BR-AVANCE de la spec 007 y BR-ACCESO-13 | de alcance |
| 18 | GET | `/api/periodos` | Sí | 200 | Devuelve el periodo vigente y los periodos con secciones al alcance del usuario | US-73 (spec 008) | BR-PERIODO-05 | nueva |
| 19 | GET | reservada | Sí | 200 | Reservada para el archivo con los R-17 publicados del curso, fuera de alcance (J-55) | ninguna | ninguna | reservada |

Las rutas 5, 6, 7 y 9 no cambian de forma. La 5 publica una carga de 5643 con la carrera y el conjunto de reglas de Industrial y responde el 500 de ERROR_INTERNO, «Ocurrió un error interno. Intente de nuevo.», si falta ese conjunto (US-68). La 7 escribe en B6 «Carrera de» más el nombre de la carrera de la carga (BR-R17-13). La 9 deja reemplazar a la coordinación del curso en su curso con el valor provisional de D-52.

### 15.2 `GET /api/periodos`: periodos al alcance del usuario (BR-PERIODO-05)

Sin parámetros. Responde los periodos en que el usuario tiene al menos una sección al alcance de `secciones_visibles()`, del más reciente al más antiguo, y el periodo de `PERIODO_VIGENTE` aparte.

```jsonc
// Respuesta 200 para docente701@example.invalid, con datos inventados
{ "vigente": "2026-2", "periodos": ["2026-1"] }

// Respuesta 200 para un profesor con secciones en los dos periodos
{ "vigente": "2026-2", "periodos": ["2026-2", "2026-1"] }

// Respuesta 200 para un usuario sin secciones
{ "vigente": "2026-2", "periodos": [] }
```

Reglas y por qué existen.

- Las claves son cerradas, `vigente` (texto AAAA-C) y `periodos` (lista de textos AAAA-C sin repetidos). La ruta no dice cuántas secciones hay en cada periodo ni de qué asignatura.
- El Front abre en `vigente` si está en `periodos`, y si no, en el primero de `periodos`. Muestra el selector «Periodo» solo con dos periodos o más, «Periodo 2026-1» sin selector con uno solo y nada con la lista vacía, y guarda el elegido en el estado de `App.tsx`, sin `localStorage` ni `sessionStorage`.
- Una respuesta 200 sin `vigente` de texto o sin `periodos` como lista de textos cuenta como falla.
- Si la ruta falla, el Front sigue como hoy, sin periodo en las rutas 4, 8, 12 y 17, y sin mostrar un error.

Errores.

- 401 sin sesión, con «La sesión venció. Ingrese otra vez.».

### 15.3 `GET /api/sesion`: el campo aditivo `alcance` (BR-ACCESO-13)

```jsonc
// Respuesta 200 para la coordinación del curso, con datos inventados
{ "correo": "coordinador.quimica@example.invalid", "rol": "COORDINADOR",
  "alcance": { "tipo": "CURSO", "carreras": [], "asignaturas": ["5643"] } }

// Respuesta 200 para la coordinación de la carrera
{ "correo": "coordinacion@example.invalid", "rol": "COORDINADOR",
  "alcance": { "tipo": "CARRERA", "carreras": ["AMB"], "asignaturas": [] } }

// Respuesta 200 para un profesor
{ "correo": "docente701@example.invalid", "rol": "PROFESOR",
  "alcance": { "tipo": "SECCIONES", "carreras": [], "asignaturas": [] } }
```

Reglas y por qué existen.

- `rol` sigue siendo PROFESOR o COORDINADOR, porque `ck_usuario_autorizado_rol` no cambia. `alcance.tipo` es SECCIONES para el PROFESOR, CARRERA para una cuenta COORDINADOR con al menos una fila de carrera en `acceso.coordinacion_alcance` y CURSO para una cuenta COORDINADOR con solo filas de asignatura. `carreras` trae los códigos de carrera y `asignaturas` los códigos de asignatura de esas filas, sin repetidos.
- El Front elige sus rótulos por `alcance.tipo`, como «Secciones del curso» y «Avance del registro del curso» (propuestas), y un Front anterior que no lee el campo sigue funcionando con los rótulos de la carrera.
- Una cuenta COORDINADOR sin filas de alcance recibe el tipo CARRERA con las dos listas vacías y no ve ninguna sección.
- El campo no trae el periodo de las filas de asignatura, que la ruta 18 resume.

### 15.4 El parámetro `periodo` de la ruta 8 (cambio fechado de BR-CARGA-20)

`GET /api/cargas?periodo=2026-1` sin `seccion_id` lista las cargas al alcance del usuario en ese periodo, con la misma forma de la sección 7. Sin `periodo`, la ruta usa `PERIODO_VIGENTE`, como hoy. Con `seccion_id`, el periodo no se usa, porque la sección ya lo fija.

Errores, en el orden 401 y 422.

- 401 sin sesión.
- 422 con «El periodo no tiene la forma AAAA-C.» para un periodo con otra forma, como `2026-3`, `2026` o `26-1`, la misma validación de la ruta 4.
- Un periodo bien formado sin secciones del usuario responde 200 con una lista vacía, no 403.

### 15.5 La ruta 17 con el alcance de la coordinación del curso

La ruta 17 de la sección 14 conserva su forma, sus reglas y su orden de errores. Su alcance sale de `secciones_visibles()` con la tabla de alcance, así que la coordinación del curso recibe solo las secciones de su asignatura en el periodo de su fila, y la coordinación de una carrera, solo las de su carrera. El campo `profesores` espera a D-47 en Ambiental y a D-51 en Industrial.

```jsonc
// Respuesta 200 para coordinador.quimica@example.invalid, con datos inventados
{
  "periodo": "2026-1",
  "conteo": { "secciones": 4, "PUBLICADA": 1, "CON_RECHAZO": 1, "SIN_CARGA": 1, "SIN_PROFESOR": 1, "SIN_PLAN": 0 },
  "secciones": [
    { "seccion_id": 21, "asignatura": { "codigo": "5643", "nombre": "Química General" },
      "numero": "701", "etapa": "PUBLICADA", "carga_id": 31 },
    { "seccion_id": 22, "asignatura": { "codigo": "5643", "nombre": "Química General" },
      "numero": "702", "etapa": "CON_RECHAZO", "carga_id": null },
    { "seccion_id": 23, "asignatura": { "codigo": "5643", "nombre": "Química General" },
      "numero": "703", "etapa": "SIN_CARGA", "carga_id": null },
    { "seccion_id": 24, "asignatura": { "codigo": "5643", "nombre": "Química General" },
      "numero": "704", "etapa": "SIN_PROFESOR", "carga_id": null }
  ]
}
```

### 15.6 El campo condicional `agregados` de la ruta 12 (propuesta, J-54)

Solo existe si D-32 se responde con la suma de estudiantes por PI y curso, y solo para el rol COORDINADOR. Las cifras salen de `abet.v_r17_por_pi` de las cargas PUBLICADA del alcance, con `calificados` igual a `n_total` menos `n_sin_evidencia`, y con la meta y el nivel esperado del conjunto de reglas de la carrera.

```jsonc
// Fragmento de la respuesta 200 para coordinador.quimica@example.invalid, con datos inventados
"agregados": [
  { "asignatura": "5643", "pi": "6.1", "logrados": 23, "calificados": 33,
    "pct_sobre_calificados": 69.7, "meta_pct": 80.0, "en_meta": false,
    "secciones": 4, "secciones_publicadas": 3 }
]
```

Reglas y por qué existen.

- El agregado suma estudiantes y no promedia porcentajes, así que tres secciones de 70,0, 90,0 y 53,8 dan 69,7 y no 71,3.
- Un curso sin cargas publicadas trae `calificados` 0 y `pct_sobre_calificados` y `en_meta` en `null`, nunca 0.
- La respuesta de un PROFESOR no trae el campo, como fija D-33 de la spec 004.

### 15.7 Lo que esta sección no cubre

1. **La ruta 19**, reservada para el archivo con los R-17 publicados del curso, que vuelve si D-53 pide la entrega por la coordinación (J-55).
2. **El campo `profesores` de la ruta 17 en Industrial**, que espera a D-51.
3. **El código de las rutas 17 y 18 y del campo `alcance`**, que construyen T030, T031, T033 y T038 del Back. Hasta entonces el Front sigue como hoy, porque la falla de la ruta 18 lo deja sin periodo y la sesión sin `alcance` lo deja con los rótulos de su rol.
4. **Las rutas 13 a 16 de la spec 005**, que no entran antes de la capacitación (J-57).
