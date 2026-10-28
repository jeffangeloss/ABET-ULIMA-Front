# Contrato de la API

> **Estado 2026-10-28.** La API todavía no existe. Este es el contrato que el Back implementa en la fase 3 del plan, escrito antes del código como exige [`docs/specs/api-contracts.md`](../specs/api-contracts.md). Cuando exista el código, cada endpoint cita su archivo y este documento dice, si discrepan, cuál de los dos está mal.

Este documento describe todas las rutas de ABET-ULIMA-Back con su cuerpo, su respuesta y sus errores. El índice corto vive en `docs/specs/api-contracts.md` y las reglas viven en las specs vivas del Back, con los prefijos BR-ACCESO (`acceso`), BR-PERIODO (`periodo`), BR-CARGA (`carga-export`) y BR-R17 (`r17`). Los mensajes literales y la forma de las respuestas salen de los escenarios de `specs/001-mvp-carga-r17/aceptacion/*.feature` del Back. Si un ejemplo de aquí y un escenario discrepan, gana el escenario, y lo que ningún escenario fija lleva la marca «(propuesta)». Todos los datos de los ejemplos son inventados.

## 1. Cómo está montada

La API es una aplicación FastAPI en Python 3.12 (ADR-003) con prefijo `/api`, desplegada como proyecto propio de Vercel en `gru1`. El navegador nunca la llama por su dominio. El `vercel.json` del Front reescribe `/api/:path*` hacia el Back (una reescritura de rutas, rewrite en Vercel), así que para el navegador la API vive en el mismo origen que las pantallas y la cookie de sesión es de primera parte (ADR-004). En local, el proxy de Vite hace lo mismo hacia la API en la Mac.

La API lee y escribe en Neon con el rol `abet_app` por la cadena con pooler (el agrupador de conexiones de Neon). Toda carga ocurre en una sola transacción (ADR-001).

## 2. Tabla resumen de rutas

| # | Método | Ruta | Sesión | Éxito | Qué hace | Historia | Corte |
|---|---|---|---|---|---|---|---|
| 1 | POST | `/api/sesion` | No | 200 | Valida correo y contraseña y fija la cookie `abet_sesion` | US-05 | 1 |
| 2 | GET | `/api/sesion` | Sí | 200 | Devuelve el usuario actual (correo y rol) | US-05 | 1 |
| 3 | DELETE | `/api/sesion` | Sí | 204 | Cierra la sesión y vence la cookie | US-05 | 1 |
| 4 | GET | `/api/secciones?periodo=2026-2` | Sí | 200 | Lista las secciones al alcance del usuario con el estado de su carga | US-06 | 1 |
| 5 | POST | `/api/secciones/{seccion_id}/cargas` | Sí | 201 o 200 | Sube el export, lo carga en una transacción y devuelve la constancia | US-07 a US-14, US-21 | 1 |
| 6 | GET | `/api/cargas/{carga_id}` | Sí | 200 | Devuelve la constancia de una carga | US-16, US-19 | 1 |
| 7 | GET | `/api/cargas/{carga_id}/r17.xlsx` | Sí | 200 | Entrega el R-17 con la hoja «Constancia», solo de cargas en estado PUBLICADA | US-15, US-16 | 1 |
| 8 | GET | `/api/cargas?seccion_id={seccion_id}` | Sí | 200 | Lista las cargas al alcance del usuario | US-19 | 2 |
| 9 | POST | `/api/secciones/{seccion_id}/cargas?reemplaza={carga_id}` | Sí | 201 | Reemplaza la carga publicada en una transacción | US-18 | 2 |
| 10 | POST | `/api/sesion/codigo` | No | 202 | Envía el código de acceso al correo, con la misma respuesta exista o no | US-20 | 2 |

## 3. Convenciones

### 3.1 Forma del error

Todo error de la API es JSON con un solo campo, en español y escrito para la persona que usa la pantalla. El Front lo muestra sin reescribirlo.

```jsonc
{ "detail": "La sección no está a su cargo." }
```

Ningún `detail` lleva el valor leído de una celda, un código de estudiante, un nombre ni la ruta local del archivo. Los mensajes de interfaz pueden ir en pretérito («No se guardó nada.»), porque son textos para la pantalla y los escenarios los comparan tal cual.

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
| 422 | El archivo no se puede cargar y no se guarda nada | Corrige el archivo y lo sube otra vez |
| 429 | Demasiados intentos de ingreso | Espera y vuelve a intentar |
| 500 | Error interno, con la transacción deshecha | Intenta de nuevo |

### 3.3 Identificadores

`seccion_id` y `carga_id` son los enteros de `abet.seccion` y `abet.carga` que devuelven las rutas 4 y 5. El Front nunca los arma a mano. La API comprueba en cada petición que el identificador esté al alcance del usuario, así que conocer un número ajeno solo produce 403.

### 3.4 Horas y cifras

Las horas viajan en ISO 8601 con el desfase de Lima (`2026-10-28T10:15:00-05:00`) y el Front las muestra en hora de Lima. Los porcentajes no viajan por la API, porque viven solo en el R-17.

## 4. Sesión

La sesión es una cookie `abet_sesion` con HttpOnly, Secure, SameSite=Lax, `Path=/` y 12 horas de vida (Max-Age 43200). Su valor es un token aleatorio cuyo hash vive en `acceso.sesion`, y en cada petición la API lee el rol y las secciones del usuario desde la base. El cuerpo de ninguna respuesta trae el token, y los registros de la API no guardan la contraseña ni el valor de la cookie.

#### `POST /api/sesion`: iniciar sesión con contraseña asignada (BR-ACCESO, por numerar)

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

- El mismo 401 con «Correo o contraseña incorrectos.» para un correo desconocido, un usuario sin contraseña, un usuario inactivo y una contraseña errada, sin cabecera Set-Cookie, para no revelar quién está autorizado.
- El correo se compara sin espacios ni mayúsculas, así que « Docente410@EXAMPLE.invalid » entra como `docente410@example.invalid`.
- La contraseña se compara contra el hash Argon2id de `acceso.credencial` y nunca aparece en un registro.
- Cinco intentos fallidos de un mismo correo en 15 minutos responden 429 con «Demasiados intentos. Espere 15 minutos.», aunque el sexto traiga la contraseña correcta, y no bloquean a otro correo (valor provisional).
- Un usuario marcado inactivo en `acceso.usuario_autorizado` pierde sus sesiones abiertas, que responden 401.

Errores 401, 422 (cuerpo mal formado) y 429.

#### `GET /api/sesion`: usuario actual

Sin cuerpo. Responde 200 con `{ "correo": "...", "rol": "PROFESOR" | "COORDINADOR" }`, o 401 con «La sesión venció. Ingrese otra vez.» (propuesta) si no hay sesión vigente.

#### `DELETE /api/sesion`: cerrar sesión

Sin cuerpo. Fija `expira_en` de la fila de `acceso.sesion` en la hora del cierre, sin borrarla, responde 204 y devuelve la cookie con Max-Age 0. Después, la cookie anterior recibe 401. Sin sesión también responde 204, para que cerrar sesión nunca falle (propuesta).

## 5. Secciones

#### `GET /api/secciones?periodo=2026-2`: secciones al alcance del usuario (BR-PERIODO y BR-ACCESO, por numerar)

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

- La regla de visibilidad («los de arriba pueden ver hacia abajo, pero no los de abajo hacia arriba») vive solo aquí y en `app/permisos.py`, y la usan las rutas 5 a 9.
- `estado` vale «PUBLICADA» cuando la sección tiene una carga en ese estado, con su `carga_id`, `filas_leidas` y `filas_aceptadas`, y vale «SIN_CARGA» en otro caso, con esos tres campos en `null`. Una sección cuyas cargas están todas RECHAZADA o REEMPLAZADA sale también «SIN_CARGA» (propuesta).
- `tiene_plan` es falso cuando `abet.plan_medicion` no tiene filas para esa asignatura y periodo. P2 muestra entonces «La carrera aún no registra el plan de medición de esta sección» y la ruta 5 rechaza la subida.
- La respuesta del profesor no trae ningún dato de secciones ajenas.

Errores 401 y 422 (periodo con formato distinto de `AAAA-N`, propuesta).

## 6. Cargas

#### `POST /api/secciones/{seccion_id}/cargas`: subir el export y cargarlo (BR-CARGA, por numerar)

Cuerpo multipart con el campo `archivo` (.xlsx de hasta 1 MB) y, en el corte 2, el campo opcional `confirmar_seccion` (US-21). La API guarda el nombre del archivo sin ruta en `abet.archivo_origen.nombre_archivo` y nunca guarda sus bytes. Ningún campo de la petición apaga la guardia de datos inventados.

En el corte 1 solo sube el profesor asignado a la sección en `acceso.docente_seccion`. El coordinador ve todas las secciones y descarga cualquier R-17, pero no sube, y recibe el mismo 403. En el corte 2 el coordinador puede reemplazar la carga de cualquier sección con la ruta 9.

El orden del trabajo es fijo. Primero comprueba la sesión y el alcance, después el tamaño y el tipo por los primeros bytes, revisa el zip, lee la columna Username y aplica la guardia de datos inventados. Luego calcula la huella SHA-256 de los bytes originales y busca esa huella, comprueba si la sección ya tiene otra carga publicada y si el archivo declara su sección, y solo entonces cuenta las filas, valida y escribe todo en una transacción. Los 409 y los 422 de este orden se responden antes de escribir.

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
  "provisional": true,
  "programa_version": "<versión de abet_carga>",
  "subida_por": "docente410@example.invalid",
  "iniciada_en": "2026-10-28T10:15:00-05:00",
  "terminada_en": "2026-10-28T10:15:02-05:00"
}
```

La constancia es plana. `nombre_archivo`, `hoja`, `sha256` y `filas_de_datos` van en el primer nivel, con los mismos nombres de las columnas de `abet.archivo_origen`. Ningún rechazo trae un campo `valor` ni `valor_leido`. `mensaje` resume el motivo de una carga RECHAZADA y es `null` en una PUBLICADA (propuesta). El texto de cada aviso es (propuesta).

Reglas y por qué existen.

- **Una sola transacción.** El archivo, la carga, sus columnas, filas, estudiantes y mediciones entran juntos o no entra nada, y ninguna carga queda EN_CURSO al terminar la petición. Ante un fallo responde 500 con «La carga no se completó y no se guardó ningún dato. Intente de nuevo.».
- **Guardia de datos inventados.** Con `GUARDIA_DATOS_INVENTADOS=1`, un solo Username fuera de 99000000 a 99999999, incluido uno mal formado como 9900001, responde 422 con «El piloto solo admite códigos inventados, de 99000000 a 99999999. Revise la fila 4. No se guardó nada.» (con la fila que corresponda), sin el código en el cuerpo y sin rastro en la base. La respalda `ck_estudiante_codigo_inventado` en Neon (ADR-002).
- **Archivo ya cargado en esta sección.** Si la huella ya tiene una carga PUBLICADA en esta misma sección, responde 200 con la constancia existente, aunque el archivo llegue con otro nombre, y no escribe nada. `archivo_origen.nombre_archivo` conserva el primer nombre. La respalda `uq_archivo_origen_sha256`.
- **Archivo publicado en otra sección.** Si la huella ya tiene una carga PUBLICADA en otra sección, responde 409 con «Este archivo ya está publicado en otra sección. No se cargó.», antes de escribir y sin ningún dato de esa sección, porque el índice único parcial `uq_carga_archivo_util` lo impediría.
- **Archivo con cargas que no quedaron publicadas.** Si la huella solo tiene cargas RECHAZADA o REEMPLAZADA, la carga nueva reutiliza ese `archivo_id`, lo que `uq_carga_archivo_util` permite porque solo limita las PUBLICADA.
- **Sección con otra carga publicada.** Si la sección ya tiene una carga PUBLICADA de otro archivo, responde 409 con «La sección 410 ya tiene una carga publicada. No se cargó el archivo.» y no escribe nada. En el corte 2 la pantalla ofrece el reemplazo (ruta 9). La respalda el índice único parcial `uq_carga_publicada_por_seccion`.
- **Filas inválidas.** Un nivel -1, 0 o 5 rechaza la fila completa con NIVEL_FUERA_DE_ESCALA (valor provisional de D-06), y un valor como «3,5», «Needs Grading», «-» o «NP» la rechaza con NIVEL_NO_NUMERICO (valor provisional de D-03), con efecto RECHAZA_FILA (valor provisional de D-01). El estudiante de esa fila sale de todos los PI de la carga. Una celda de PI vacía no rechaza la fila y se carga como SIN_EVIDENCIA. Un Username vacío rechaza su fila con CODIGO_VACIO, y uno repetido rechaza la segunda aparición con CODIGO_DUPLICADO. La respalda `ck_medicion_nivel`.
- **Columnas dudosas.** Un Total Pts distinto de 4 deja un aviso PUNTAJE_MAXIMO_DISTINTO y la carga sigue (valor provisional de D-04). Una columna de un PI que no está en el plan se ignora con el aviso COLUMNA_PI_FUERA_DEL_PLAN.
- **Rechazo por estructura.** La carga queda RECHAZADA con efecto RECHAZA_CARGA, `filas_leidas` 0 y 201 con esa constancia en cuatro casos. Son el archivo sin filas de datos (ARCHIVO_SIN_FILAS, «El archivo no trae filas de estudiantes.»), la falta de la columna de un PI del plan (PI_DEL_PLAN_AUSENTE, «Falta la columna del PI 5.2 que el plan de medición pide para esta sección.»), la falta de Username y Student ID (COLUMNA_CODIGO_AUSENTE, «El archivo no tiene la columna Username ni Student ID.») y un PI repetido (PI_REPETIDO, «El PI 5.1 aparece en dos columnas del archivo.»).
- **Otra sección o periodo.** El sistema coteja la sección elegida con el nombre de la hoja y, si la hoja no la declara, con el nombre del archivo. Si declaran otra sección o curso (SECCION_NO_COINCIDE) u otro periodo (PERIODO_NO_COINCIDE), la carga queda RECHAZADA y su mensaje dice, por ejemplo, «El archivo corresponde a la sección 411 y usted eligió la 410. No se publicó.».
- **Archivo que no declara su sección.** En el corte 1 (D-02), si ni la hoja ni el nombre del archivo declaran la sección, responde 422 sin rastro con «El archivo no indica su sección. Sube el export de Blackboard sin cambiar el nombre de su hoja.». En el corte 2 (US-21) responde primero 422 con «El archivo no indica su sección. ¿Confirma que es de la sección 410 de 450002 en 2026-2?» y `"requiere_confirmacion": true`. Con `confirmar_seccion=true` la carga sigue en la sección elegida y registra en `abet.rechazo_fila` un AVISO con el motivo SECCION_SIN_DECLARAR, que V1_09 agrega junto con COLUMNA_CODIGO_AUSENTE, PI_REPETIDO y PERIODO_NO_COINCIDE, y la constancia lo trae entre sus avisos. El campo solo admite «true», así que un número de sección responde 422 con «La sección confirmada no es la sección elegida. No se guardó nada.». La confirmación no pasa por encima de una sección declarada distinta, que sigue en SECCION_NO_COINCIDE. El 422 a la espera de la confirmación y el campo `requiere_confirmacion` son (propuesta).
- **Todas las filas rechazadas.** La carga queda RECHAZADA con «Ninguna fila se pudo aceptar. La carga no se publicó.» (propuesta), porque `ck_carga_publicable` impide publicar sin filas aceptadas.
- **Conciliación.** Una carga publicada lee tantas filas como trae el archivo, y aceptadas más rechazadas suman las leídas. Lo respaldan `ck_carga_conciliada` y `ck_carga_filas`.
- **Descarte de datos personales.** La base guarda solo el código de 8 dígitos y las celdas de los PI del plan. Nombres, último acceso, disponibilidad, actividades y valores leídos se descartan, y Q04 lo vigila.
- **Quién sube.** `abet.carga.subida_por` guarda el usuario de la sesión, y la constancia muestra su correo (valor provisional de D-12).

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
| 422 | «El archivo supera el máximo de 1 MB.» |
| 422 | «El piloto solo admite códigos inventados, de 99000000 a 99999999. Revise la fila 4. No se guardó nada.» |
| 422 | «El archivo no indica su sección. Sube el export de Blackboard sin cambiar el nombre de su hoja.» (corte 1) |
| 422 | «El archivo no indica su sección. ¿Confirma que es de la sección 410 de 450002 en 2026-2?» (corte 2, con `requiere_confirmacion`) |
| 422 | «La sección confirmada no es la sección elegida. No se guardó nada.» (corte 2) |
| 422 | «La carrera aún no registra el plan de medición de esta sección.» (propuesta) |
| 500 | «La carga no se completó y no se guardó ningún dato. Intente de nuevo.» |

#### `GET /api/cargas/{carga_id}`: constancia de una carga (BR-CARGA, por numerar)

Sin cuerpo. Responde 200 con la misma forma de la respuesta 201 de la ruta 5, también para una carga RECHAZADA, cuya constancia sale de `abet.carga`, `abet.archivo_origen` y `abet.rechazo_fila`. El coordinador la recibe de cualquier sección. Errores 401, 403 («La sección no está a su cargo.») y 404 («La carga no existe.», propuesta).

#### `GET /api/cargas/{carga_id}/r17.xlsx`: descargar el R-17 (BR-R17, por numerar)

Sin cuerpo. Responde 200 con el libro y estas cabeceras.

```
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="R017_450002_410_2026-2_PROVISIONAL.xlsx"
Cache-Control: no-store
```

Reglas y por qué existen.

- Los números salen de `v_r17_por_pi` y la tabla de estudiantes de `v_tabla_maestra_pi` (ADR-005). Con el export que trae el 5 en la fila 3, el bloque II muestra 60,0 % (6 de 10), 60,0 % (6 de 10) y 70,0 % (7 de 10), y la tabla tiene 30 filas sin el código 99000002. El denominador de calificados es `n_total - n_sin_evidencia`, que calcula `r17.py`, porque la vista no lo expone.
- Solo una carga PUBLICADA produce R-17, porque la vista no ve las demás.
- El libro lleva la franja PROVISIONAL y el sufijo `_PROVISIONAL` si y solo si `v_r17_por_pi.provisional` es verdadero, es decir, mientras el conjunto de reglas de la carga no esté APROBADO o no tenga DEFINIDOS NIVEL_ESPERADO, META_LOGRO y TRATO_SIN_EVIDENCIA. La hoja «Constancia» va al final.
- Ni el nombre del archivo ni sus propiedades llevan nombres de personas. El autor y el último autor del libro están vacíos o dicen «ABET_SIS_MED».
- El profesor descarga el R-17 de sus secciones y el coordinador el de cualquier sección.

Errores 401, 403 («La sección no está a su cargo.»), 404, 409 («La carga no está publicada y no tiene R-17.») y 422 («La sección supera las filas de la plantilla del R-17.», propuesta, para una sección de más de 47 estudiantes con 3 PI).

## 7. Rutas del corte 2

#### `GET /api/cargas?seccion_id={seccion_id}`: cargas al alcance del usuario (US-19)

Responde 200 con una lista de constancias resumidas, de la más reciente a la más antigua. Cada una trae `carga_id`, la sección, `estado`, `filas_leidas`, `filas_aceptadas`, `filas_rechazadas`, `nombre_archivo`, los primeros 12 caracteres de la huella, el correo de `subida_por`, `iniciada_en` y `terminada_en` con el desfase «-05:00», el motivo de una carga RECHAZADA y la carga a la que reemplaza, si la hay. Sin `seccion_id`, lista todas las cargas al alcance del usuario del periodo vigente (propuesta). Un `seccion_id` ajeno responde 403 con «La sección no está a su cargo.».

La constancia de una carga REEMPLAZADA sigue disponible en la ruta 6 y dice qué carga la reemplaza, pero su R-17 responde 409.

#### `POST /api/secciones/{seccion_id}/cargas?reemplaza={carga_id}`: reemplazar la carga publicada (US-18)

El mismo cuerpo y las mismas reglas de la ruta 5. En una sola transacción, la carga nueva entra EN_CURSO, la anterior pasa a REEMPLAZADA y la nueva pasa a PUBLICADA con `reemplaza_carga_id` igual a la anterior. Si la carga nueva queda RECHAZADA, su `reemplaza_carga_id` queda nulo desde el INSERT y la anterior sigue PUBLICADA, porque `uq_carga_reemplaza` bloquearía el siguiente reemplazo válido. Volver a un export anterior reutiliza su `archivo_id`.

El profesor reemplaza en su sección y el coordinador en cualquiera, con el plazo que fije D-11. El reemplazo de una carga que ya no es la publicada de la sección responde 409 (propuesta), y el de una sección ajena responde 403. Si el archivo nuevo no se abre, responde 422 con «No se pudo abrir el archivo. La carga publicada no cambió.» y nada cambia.

#### `POST /api/sesion/codigo`: pedir el código de acceso (US-20)

Cuerpo `{ "correo": "..." }`. Responde 202 con `{ "detail": "Si el correo está autorizado, recibirá un código en unos minutos." }` exista o no el correo, esté activo o no, y aunque no tenga forma de correo. Más de 3 pedidos de un mismo correo en 15 minutos reciben la misma respuesta y no envían otro mensaje. El código tiene 6 dígitos, vale 10 minutos, se usa una vez y admite 5 intentos, y la base guarda solo su hash en `acceso.codigo_acceso` (valores provisionales).

El código se verifica en `POST /api/sesion` con el correo y el código (propuesta). Un código que ya no sirve responde 401 con «El código venció. Pida uno nuevo.», «El código ya se usó. Pida uno nuevo.» o «El código ya no es válido. Pida uno nuevo.».

## 8. Errores que no son JSON

| Origen | Cuándo | Qué hace el Front |
|---|---|---|
| Vercel, 413 | Cuerpo de más de 4,5 MB, antes de llegar a FastAPI | Muestra «El archivo supera el máximo de 1 MB.» |
| Vercel, 502 o 504 | La función no responde a tiempo | Muestra «El servicio no respondió. Intente de nuevo.» (propuesta) |
| Protección de despliegues | Página HTML de inicio de sesión de Vercel en Preview | Muestra «El entorno de pruebas no está disponible.» (propuesta) |

## 9. Lo que el contrato no cubre todavía

1. **La numeración de las reglas.** Los prefijos BR-ACCESO, BR-PERIODO, BR-CARGA y BR-R17 son los de las specs vivas del Back, y sus números llegan con esas specs en la fase de contrato.
2. **Los textos marcados «(propuesta)».** Ningún escenario los fija todavía, y se confirman en las specs vivas.
3. **Las respuestas de los códigos 403 y 404 para un recurso ajeno.** La propuesta es 403 para un recurso que existe fuera del alcance, y conviene revisar si eso revela su existencia.
4. **Una ruta de salud** (`/api/salud`) para la prueba de humo y el monitoreo, que ninguna historia pide.
5. **Los nombres de los esquemas Pydantic**, que se fijan con el código.
6. **El plazo del reemplazo (D-11).** Quién reemplaza está decidido para el corte 2, y hasta cuándo sigue abierto.

## 10. Cómo verificar este documento

Cuando exista el Back, cada ruta de la tabla 2 debe aparecer en el esquema OpenAPI que publica FastAPI.

```bash
# Esperado: 5 caminos en el corte 1 (las 7 rutas, porque /api/sesion reúne tres métodos)
# y 7 caminos al cerrar el corte 2, sin caminos que este documento no describa.
curl -s "$URL_FRONT/api/openapi.json" | python -c "import json,sys; print('\n'.join(sorted(json.load(sys.stdin)['paths'])))"
```

```bash
# Los mensajes literales de este contrato coinciden con los escenarios (carpeta que contiene los dos repositorios).
# Esperado: cada mensaje sin «(propuesta)» aparece en algún .feature del Back.
grep -rn "La sección no está a su cargo." ABET-ULIMA-Back/specs/001-mvp-carga-r17/aceptacion/
```
