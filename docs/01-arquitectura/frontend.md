# Frontend

> **Estado 2026-11-17.** El corte 1 del MVP está construido en `src/` (tareas T040 a T045 del plan, fase 4) con las pantallas P1 a P4. La tarea T085 del corte 2 suma P5, el modo reemplazo de P3 y la confirmación de la sección (US-18, US-19 y US-21), sobre la sección 7 del contrato, y la prueba de humo del reemplazo pasa en local contra el Back del corte 2 desde el 2026-11-18, a la espera de su corrida contra la vista previa de `develop`. El código de acceso por correo de P1 (US-20) sigue pendiente. Este documento describe lo construido. Si el código y el contrato discrepan, manda el contrato (`03-api/contrato.md`), y este documento se corrige en el mismo PR.

El Front es React con Vite, TypeScript y Tailwind, la misma pila de IQBF-ULIMA_Front. No toca datos personales ni la base, así que su elección no cambia el riesgo del sistema. Su regla central viene de `AGENTS.md`, regla 3. Cada pantalla nombra las historias que la justifican, y lo que ninguna historia pide no se muestra.

Los textos entre comillas de esta página salen de los `.feature` de `specs/001-mvp-carga-r17/aceptacion/` del Back cuando un escenario los fija, y en ese caso se copian sin cambios y conservan la marca «(propuesta)» si el `.feature` la lleva. Los que ningún escenario fija son propuestas de la pantalla y llevan esa misma marca. El texto de los avisos de la carga dejó de ser propuesta el 2026-10-29, cuando Jefferson confirmó con una captura de la hoja «Constancia» del R-17 que «estos avisos deberían mostrarse cuando se ha subido el archivo en el frontend». Desde entonces P4 los muestra con el mismo texto del campo `mensaje` que manda la API, el mismo de esa hoja. Otra excepción es el rótulo del piloto, «Solo exports con códigos inventados (99000000 a 99999999)», que no lleva la marca porque lo fijan la constitución del Back (Principio II) y ADR-002, aunque ningún escenario lo nombre.

## 1. Estructura del proyecto

```
index.html, vite.config.ts, tsconfig.json, package.json y package-lock.json
src/
  main.tsx                 arranque de React
  index.css                importa Tailwind
  App.tsx                  sesión actual y pantalla visible
  servicios/api.ts         la única puerta HTTP
  servicios/tipos.ts       tipos de las respuestas del contrato
  servicios/formato.ts     hora de Lima, rótulo de la sección y conteo de filas de P4 y P5
  pantallas/
    Ingreso.tsx            P1 (con AvisoSesion.tsx para el aviso de sesión vencida)
    MisSecciones.tsx       P2
    SubirExport.tsx        P3
    ResultadoCarga.tsx     P4
    Cargas.tsx             P5 (corte 2)
  componentes/
    Mensaje.tsx            error, aviso o confirmación con el texto de la API
    TablaRechazos.tsx      fila, PI y el mensaje del rechazo
    AvisosCarga.tsx        avisos de la carga, aparte de los rechazos
    RotuloPiloto.tsx       «Solo exports con códigos inventados (99000000 a 99999999)»
    Titulo.tsx             h1 de cada pantalla, que recibe el foco al montarse
    estilos.ts             clases de Tailwind compartidas
tests/                     Vitest y Testing Library, con las respuestas del contrato
scripts/                   preflight.sh, probar_preflight.sh y e2e.sh
```

Los comandos de `package.json` son `npm run dev` (Vite con el proxy de `/api`), `npm run build` (TypeScript y Vite), `npm test` (Vitest) y `npm run e2e`, que corre la prueba de humo de la sección 6 con `scripts/e2e.sh` (exige la variable `ABET_CLAVES_ARCHIVO`).

## 2. `servicios/api.ts`, la única puerta

Ningún componente llama a `fetch` directamente. `api.ts` expone una función por ruta del contrato (`iniciarSesion`, `sesionActual`, `cerrarSesion`, `listarSecciones`, `subirExport`, `obtenerCarga`, `listarCargas` y `urlR17`) y convierte cada error en un `ErrorApi` con el código HTTP y el `detail` de la API. Un `detail` que no sea texto, como la lista que FastAPI responde por omisión, se reemplaza por «La petición no tiene la forma esperada.». Desde el corte 2, `ErrorApi` trae además `requiereConfirmacion`, verdadero solo si el cuerpo trae `requiere_confirmacion` igual a `true`, y `cargaPublicada`, el número de `carga_publicada` o `null` (contrato, sección 3.1). Así P3 ofrece el paso siguiente sin leer el texto del `detail`. Los tipos de esas respuestas viven en `servicios/tipos.ts`, donde `Constancia` suma `reemplaza_carga_id` y `reemplazada_por` y `CargaResumida` describe cada elemento de `GET /api/cargas`.

`subirExport(seccionId, archivo, opciones)` distingue el 200 (el mismo archivo ya está publicado en la sección) del 201 con el campo `yaCargada`. Con `opciones.reemplaza` agrega `?reemplaza={carga_id}` a la ruta, y con `opciones.confirmarSeccion` agrega al multipart el campo `confirmar_seccion` con el texto `true`. El campo `aviso` del 200 de un reemplazo sale de la constancia y llega aparte, en `aviso`, que vale `null` en las demás respuestas. `listarCargas(seccionId)` pide `GET /api/cargas`, o `GET /api/cargas?seccion_id={seccion_id}` cuando recibe la sección, y devuelve la lista en el orden de la API.

- La sesión viaja en la cookie `abet_sesion`, que el navegador manda solo porque el Front y la API comparten origen (ADR-004). `api.ts` nunca lee ni guarda un token, y nada de la sesión va a `localStorage`.
- Todas las rutas son relativas (`/api/...`). En Vercel, el `vercel.json` del Front las reescribe hacia el Back, y en local las reenvía `server.proxy` de Vite hacia la API en la Mac.
- La descarga del R-17 es un enlace normal a `/api/cargas/{carga_id}/r17.xlsx`, para que el navegador use el nombre de archivo que fija la API.
- Una respuesta que no es JSON se convierte en un mensaje fijo y nunca muestra el cuerpo crudo, con los tres casos de la sección 8 del contrato. El 413 de Vercel dice «El archivo supera el máximo de 1 MB.», un 401 o 403 con página HTML dice «El entorno de pruebas no está disponible.», y cualquier otra respuesta sin JSON, como un 502 o un 504, o una red caída, dice «El servicio no respondió. Intente de nuevo.».
- Las horas ISO 8601 de la API se muestran en hora de Lima con la forma `28/10/2026 10:15` (`servicios/formato.ts`).
- `scripts/preflight.sh` falla si un archivo de `src/` usa el almacenamiento del navegador, nombra una URL absoluta, llama a `fetch` fuera de `api.ts` o escribe una ruta literal que no empiece con `/api` (regla 7, probada en `scripts/probar_preflight.sh`).

## 3. `App.tsx` y el estado

`App.tsx` pide `GET /api/sesion` al arrancar. Sin sesión muestra P1, y con sesión muestra P2. La vista visible es una de cuatro, P2 (`secciones`), P3 (`subir`, con la sección y, en el modo reemplazo, el `reemplaza` que llega de P5), P4 (`resultado`) y P5 (`cargas`). El resto del estado vive en la pantalla que lo usa, sin un almacén global, porque el MVP tiene cinco pantallas y un solo flujo. Un 401 de cualquier ruta con sesión, distinta de `/api/sesion`, devuelve a P1 con el `detail` de la API, «La sesión venció. Ingrese otra vez.» (propuesta), que `api.ts` entrega a `App.tsx` por `alSesionVencida`. La cabecera de `App.tsx` muestra, con sesión, los botones «Mis secciones» y «Cargas» (propuesta), que abren P2 y P5, el correo del usuario y el botón «Salir» (propuesta), que llama a `DELETE /api/sesion` y vuelve a P1 aunque esa llamada falle. «Reemplazar carga» de P5 abre P3 en modo reemplazo con la sección y la carga de esa fila, y «Ver constancia» abre P4 con la carga.

## 4. Las pantallas

| Pantalla | Archivo | Historias | Rutas que consume ([contrato](../03-api/contrato.md)) | Corte |
|---|---|---|---|---|
| P1 Ingreso | `pantallas/Ingreso.tsx` | US-05 (y US-20 en el corte 2) | `POST /api/sesion` (sección 4) | 1 |
| P2 Mis secciones | `pantallas/MisSecciones.tsx` | US-06 | `GET /api/secciones` (sección 5) | 1 |
| P3 Subir export | `pantallas/SubirExport.tsx` | US-07, US-08, US-09, US-11, US-12, US-13, US-18 y US-21 | `POST /api/secciones/{seccion_id}/cargas` (sección 6), con `?reemplaza={carga_id}` y `confirmar_seccion` (sección 7) | 1 y 2 |
| P4 Resultado de la carga | `pantallas/ResultadoCarga.tsx` | US-07, US-10, US-12, US-13, US-14, US-15, US-16 y US-18 | `GET /api/cargas/{carga_id}` y `GET /api/cargas/{carga_id}/r17.xlsx` (sección 6) | 1 y 2 |
| P5 Cargas | `pantallas/Cargas.tsx` | US-18, US-19 | `GET /api/secciones` (sección 5), `GET /api/cargas` (sección 7) y `GET /api/cargas/{carga_id}/r17.xlsx` (sección 6) | 2 |

La sesión (`GET` y `DELETE /api/sesion`, sección 4 del contrato) la usan `App.tsx` y su botón «Salir». Las historias US-01 a US-04 (base, rol, periodo y usuarios) no tienen pantalla, porque en el MVP las ejecuta el administrador técnico con scripts. US-17 (despliegue) tampoco tiene pantalla propia, y su prueba de humo recorre P1, P2, P3 y P4 en el Front desplegado y, en el corte 2, el reemplazo desde P5.

### P1 Ingreso

Justifican la pantalla US-05 (iniciar sesión con contraseña asignada) y, en el corte 2, US-20 (código de acceso en el correo institucional).

Muestra el campo de correo, el campo de contraseña, el botón «Ingresar» (propuesta) y el rótulo del piloto. Mientras la API responde, el botón queda desactivado. La contraseña y el correo viven solo en el estado del formulario, y P1 no escribe nada en el almacenamiento del navegador. Ante un 401 muestra «Correo o contraseña incorrectos.», igual para un correo desconocido, un usuario inactivo y una contraseña errada. Ante el límite de intentos muestra el `detail` del 429, «Demasiados intentos. Espere 15 minutos.». En el corte 2 suma el pedido del código, que responde siempre «Si el correo está autorizado, recibirá un código en unos minutos.», y su verificación, con los mensajes «El código venció. Pida uno nuevo.», «El código ya se usó. Pida uno nuevo.» y «El código ya no es válido. Pida uno nuevo.».

No muestra registro de cuentas, recuperación de contraseña, inicio con Microsoft, recordar el usuario ni ninguna pista de si el correo está autorizado.

### P2 Mis secciones

Justifica la pantalla US-06 (ver solo las secciones propias del periodo). El profesor ve sus secciones y el coordinador ve todas las de la carrera.

Muestra una fila por sección del periodo vigente, con la forma «450002 Principios de Ingeniería Sostenible, sección 410, 2026-2» (propuesta), los PI del plan («PI del plan: 5.1, 5.2, 5.3», propuesta) y el estado de su carga («Sin carga» o «Publicada, 11 de 11 filas aceptadas»), que la pantalla arma con el campo `estado` y los conteos de la respuesta. Para el profesor, cada fila ofrece «Subir export», que abre P3, y, si la sección tiene una carga, el botón «Ver resultado» (propuesta), que abre su resultado en P4. Un usuario sin secciones asignadas ve «No tiene secciones asignadas en este periodo.» (propuesta). Una sección sin plan de medición muestra «La carrera aún no registra el plan de medición de esta sección» y deja «Subir export» desactivado.

En el corte 1 el coordinador no sube exports, así que su P2 no muestra «Subir export» y ofrece el botón «Ver resultado» y el enlace «Descargar R-17» (propuesta) de cada sección con carga. El profesor descarga el R-17 desde P4.

No muestra secciones de otros docentes al profesor, periodos anteriores, nombres ni cantidad de estudiantes, porcentajes del R-17, filtros, búsquedas ni opciones de administración.

### P3 Subir export

Justifican la pantalla US-07 (subir y cargar en una transacción), US-08 (códigos que no son inventados), US-09 (export ya cargado), US-11 (archivo ilegible), US-12 (estructura) y US-13 (otra sección o periodo), y en el corte 2 US-18 (reemplazo) y US-21 (confirmar la sección).

Muestra la sección elegida en P2, fija y sin selector, el campo de archivo, que acepta `.xlsx`, `.csv` y `.xls` de hasta 1 MB (`accept=".xlsx,.csv,.xls"`, etiqueta «Export de Blackboard (.xlsx, .csv o .xls, hasta 1 MB)», spec 003 US-33), el botón «Subir» (propuesta) y el rótulo «Solo exports con códigos inventados (99000000 a 99999999)». El campo de archivo trae un botón propio «Elegir archivo» (propuesta) y el nombre del archivo elegido o «Ningún archivo elegido» (propuesta), porque el control nativo pinta su botón en el idioma del navegador. Sin archivo elegido, el aviso es «Elija el archivo del export (.xlsx, .csv o .xls).» (propuesta) y no sale ninguna petición. P3 no revisa el tipo del archivo, porque el filtro del diálogo del navegador se puede saltar. Lo envía tal cual y muestra el `detail` de la API, que decide con el contenido (spec 003, US-33). Mientras la API responde, el botón queda desactivado para que no salgan dos subidas. Según la respuesta, la pantalla hace una de estas cosas.

| Respuesta | Qué hace P3 |
|---|---|
| 201 (carga PUBLICADA o RECHAZADA) | Pasa a P4 con la constancia |
| 200 (el mismo archivo ya está publicado en esta sección) | Muestra «Este archivo ya se cargó el <fecha y hora de Lima> y está publicado en la sección 410. No se cargó de nuevo.» (propuesta) con el botón «Ver resultado», que abre P4 de esa carga |
| 200 de un reemplazo (el mismo archivo de la carga publicada) | Muestra el `aviso` de la API, «Es el mismo archivo de la carga publicada. No se reemplazó.» (propuesta), con el botón «Ver resultado» |
| 409 con `carga_publicada`, fuera del modo reemplazo | Pregunta «La sección 410 ya tiene una carga publicada. ¿Desea reemplazarla?» con los botones «Sí, reemplazarla» y «No» (propuesta) |
| 422 con `requiere_confirmacion` | Muestra el `detail` tal cual, «El archivo no indica su sección. ¿Confirma que es de la sección 410 de 450002 en 2026-2?», con los botones «Sí, es de esta sección» y «No» (propuesta) |
| Cualquier otro 403, 409, 413 o 422 | Se queda en P3 con el `detail` de la API, por ejemplo «La sección no está a su cargo.», «El piloto solo admite códigos inventados, de 99000000 a 99999999. Revise la fila 4. No se guardó nada.», «Este archivo ya está publicado en otra sección. No se cargó.» o «La sección confirmada no es la sección elegida. No se guardó nada.» |
| 500 (la transacción se deshace) | Se queda en P3 con el `detail` de la API, «La carga no se completó y no se guardó ningún dato. Intente de nuevo.» |

Desde el corte 2 (US-21), un archivo que no declara su sección ni en la hoja ni en el nombre recibe el 422 con `requiere_confirmacion`, y la pregunta del `detail` reemplaza al 422 del corte 1, que detenía el archivo sin ofrecer la confirmación. «Sí, es de esta sección» vuelve a enviar el mismo archivo con `confirmar_seccion=true` y conserva el `reemplaza` si la subida lo lleva. «No» cierra la pregunta sin ninguna petición. Un 422 cuyo `requiere_confirmacion` no es `true` se muestra como cualquier otro error.

En el corte 2 (US-18), ante el 409 de una sección con carga publicada, P3 lee `carga_publicada` y pregunta «La sección 410 ya tiene una carga publicada. ¿Desea reemplazarla?», con el número de la sección elegida. «Sí, reemplazarla» reenvía el mismo archivo con `?reemplaza={carga_publicada}`, y «No» cierra la pregunta sin ninguna petición. Un 409 sin `carga_publicada`, o el 409 de un reemplazo, como «La carga que pide reemplazar no es la publicada de la sección 410. No se cargó el archivo.», se muestra como error y no vuelve a preguntar.

P3 entra además en modo reemplazo cuando llega desde «Reemplazar carga» de P5. En ese modo dice «Reemplaza a la carga 7, la publicada de esta sección.» (propuesta), con el número de la carga, y envía `reemplaza` desde la primera subida. Si el reemplazo falla porque el archivo no se abre, muestra el `detail` «No se pudo abrir el archivo. La carga publicada no cambió.». Elegir otro archivo cierra cualquier pregunta pendiente, para que ninguna confirmación se aplique a un archivo distinto del que la provocó.

No muestra una vista previa del contenido del archivo, nombres de estudiantes, el código que rechaza la guardia, la ruta local del archivo, un selector para cambiar a otra sección ni un campo para escribir el número de la sección confirmada, porque `confirmar_seccion` solo admite «true».

### P4 Resultado de la carga

Justifican la pantalla US-07 (la carga escrita), US-10 (filas inválidas y columnas dudosas), US-12 (rechazo por estructura), US-13 (rechazo por otra sección o periodo), US-14 (descartar nombres y valores leídos), US-15 (descargar el R-17), US-16 (constancia de la carga) y, en el corte 2, US-18 (la carga reemplazada sigue visible con su sucesora).

Muestra el estado de la carga y sus conteos con la forma «11 filas leídas, 10 aceptadas y 1 rechazada», o «11 filas leídas, 11 aceptadas y 0 rechazadas» (propuesta) cuando no hay rechazos. Si hay rechazos, la tabla de rechazos dice la fila, el PI, el motivo en palabras y su efecto, como «Fila 3, PI 5.2, nivel fuera de la escala 1 a 4. La fila completa queda fuera, también de 5.1 y 5.3.». Los avisos van aparte, en su propio apartado «Avisos» y con su propio componente (`AvisosCarga.tsx`), cada uno con el texto exacto del campo `mensaje` de la API, como «PI 5.3. La columna declara 20 puntos y sus notas están entre 1 y 4. Se cargó igual.», sin repetir el PI. En la tabla de rechazos, un rechazo de toda la carga muestra «Archivo completo» en la columna de la fila, y un PI ausente muestra «No aplica». Si la carga queda RECHAZADA por estructura, por sección o por periodo, o porque ninguna fila trae un nivel (SIN_CALIFICACIONES, «El archivo no trae ningún nivel en las columnas de los PI del plan. La carga no se publicó.»), muestra el motivo, como «El archivo corresponde a la sección 411 y usted eligió la 410. No se publicó.». Cuando ninguna fila se acepta, la carga también queda RECHAZADA, y la pantalla muestra el `mensaje` de la respuesta, «Ninguna fila se pudo aceptar. La carga no se publicó.» (propuesta), junto con la tabla de rechazos. La constancia muestra el nombre del archivo sin ruta, la hoja (o «Sin hoja (export de texto)» cuando la API la manda nula, como en un `.csv` o un `.xls`, spec 003 US-34), la huella SHA-256, el conjunto de reglas con la marca PROVISIONAL, el correo de quien sube el archivo y las horas de inicio y fin. Desde el corte 2 suma la fila «Reemplaza a la carga» (propuesta) cuando `reemplaza_carga_id` no es nulo y la fila «Reemplazada por la carga» (propuesta) cuando `reemplazada_por` no es nulo. La pantalla pide la constancia a `GET /api/cargas/{carga_id}` solo cuando llega desde P2 o P5, porque desde P3 ya trae la del 201. El botón «Descargar R-17» (propuesta) aparece activo solo si la carga está PUBLICADA, y si no lo está la pantalla dice «No hay una carga publicada para esta sección» (propuesta). Una carga REEMPLAZADA con sucesora dice en su lugar «La carga 11 la reemplaza, así que esta carga no tiene R-17.» (propuesta), con el número de `reemplazada_por`.

No muestra el valor leído de ninguna celda, nombres de estudiantes, Last Access, Availability, columnas de actividades ni los porcentajes del R-17, que viven solo en el archivo descargado.

### P5 Cargas (corte 2)

Justifican la pantalla US-18 (reemplazar la carga publicada de una sección) y US-19 (ver las cargas al alcance del usuario).

La pantalla pide en paralelo `GET /api/secciones` y `GET /api/cargas`, y muestra cada sección en el orden de la primera respuesta, con el título de P2, como «450002 Principios de Ingeniería Sostenible, sección 410, 2026-2». Bajo cada sección van sus cargas en el orden de la API, de la más reciente a la más antigua. Cada carga muestra «Carga 11», el estado (Publicada, Rechazada, Reemplazada o En curso), la fecha de inicio en hora de Lima, los conteos con la forma de P4, como «11 filas leídas, 10 aceptadas y 1 rechazada», el nombre del archivo, «Huella 3f2a9c1b7d4e», con los 12 caracteres de `sha256_corto`, y «Subida por docente410@example.invalid» cuando la API trae el correo. La función que arma los conteos vive en `servicios/formato.ts` y la usan P4 y P5.

La carga PUBLICADA lleva la marca «Vigente» (propuesta) o, si reemplaza a otra, «Vigente, reemplaza a la carga 10» (propuesta, la forma del escenario 3 de US-19), y la REEMPLAZADA con sucesora lleva «Reemplazada por la carga 11» (propuesta). Toda carga ofrece «Ver constancia» (propuesta), que abre P4. Solo la PUBLICADA ofrece el enlace «Descargar R-17» y el botón «Reemplazar carga», que abre P3 en modo reemplazo, para el profesor en su sección y para el coordinador en cualquiera, mientras D-11 no fije un plazo. Una sección sin cargas dice «Sin cargas» (propuesta), y un usuario sin secciones ve «No tiene secciones asignadas en este periodo.» (propuesta). Un error de cualquiera de las dos rutas se muestra con su `detail` y ninguna carga.

No muestra cargas fuera del alcance del usuario, el código de `motivo` de una carga RECHAZADA, que vive con su texto en la constancia, nombres de estudiantes, valores leídos ni rutas locales. Tampoco ofrece borrar o editar una carga, porque la base no admite DELETE para la aplicación y una carga solo cambia por reemplazo.

## 5. Piezas compartidas

- `Mensaje.tsx` muestra el texto que devuelve la API sin reescribirlo, para que la pantalla y las pruebas de aceptación digan lo mismo.
- `TablaRechazos.tsx` recibe la lista de rechazos de la constancia y no tiene columna para un valor leído. Sus columnas son Fila, PI y «Motivo y efecto», que trae el `mensaje` de la API.
- `AvisosCarga.tsx` recibe la lista de avisos de la constancia y muestra el `mensaje` de cada uno. No dibuja nada si la lista está vacía.
- `Titulo.tsx` es el h1 de cada pantalla y recibe el foco al montarse, para que el lector de pantalla anuncie el cambio. Los errores usan `role="alert"`, los avisos y confirmaciones `role="status"`, y todo campo tiene su etiqueta.
- `RotuloPiloto.tsx` muestra «Solo exports con códigos inventados (99000000 a 99999999)» en todas las pantallas mientras la guardia de datos inventados esté encendida, y es el mismo rótulo que P3 muestra junto al campo de archivo.

## 6. Pruebas

Vitest con Testing Library (`npm test`) cubre cada pantalla en lo que debe mostrar y en lo que no debe mostrar, con las respuestas del contrato escritas solo en `tests/respuestas.ts` y nunca en `src/`. Hay una prueba por pantalla y estado. P4 se prueba con el rechazo de la fila 3 y el aviso de 5.3 del export con error, con la carga sin rechazos, con las rechazadas por estructura, por otra sección y sin filas aceptadas, y con una respuesta que trae un valor leído y un nombre de más, que la pantalla no muestra. `tests/App.test.tsx` recorre P1 a P4 y comprueba que el navegador no guarda nada. En el corte 2, `tests/pantallas/SubirExport.test.tsx` prueba la pregunta del 409 y la confirmación de la sección, cada una con «Sí» y con «No», y en cada «No» comprueba que no sale otra petición. Prueba también el modo reemplazo que manda `reemplaza` desde la primera subida, el 200 con `aviso`, el 422 del archivo que no abre en el reemplazo y el cierre de la pregunta al cambiar de archivo. `tests/pantallas/Cargas.test.tsx` prueba P5 con las marcas, los botones de cada estado, la sección sin cargas, los errores y una respuesta con un nombre, un valor leído y una ruta inventados de más, que la pantalla no muestra. `tests/servicios/api.test.ts` prueba las rutas y el cuerpo de `subirExport`, los campos nuevos de `ErrorApi` y `listarCargas`, y `tests/App.test.tsx` prueba la cabecera y el paso de P5 a P3 y a P4. La CI corre `npm ci`, `npm test` y `npm run build` en el job `pruebas`. La prueba de humo (recorrido mínimo de punta a punta que confirma que el sistema desplegado responde) con Playwright para Node (ADR-006, `e2e/humo.spec.ts`) recorre P1, P2, P3 y P4 con el export que trae el 5 en la fila 3, y espera que P4 muestre «11 filas leídas, 10 aceptadas y 1 rechazada». Su último test, «docente410 reemplaza en P5 la carga con error por el export correcto», reemplaza esa carga desde P5 con `sintetico_20262_450002_410.xlsx`, espera «11 filas leídas, 11 aceptadas y 0 rechazadas», descarga el R-17 y vuelve a P5 para ver las marcas del reemplazo. Ese test compila y espera al Back del corte 2 para correr.

## 7. Lo que todavía NO está

1. **La prueba de humo en la CI.** `vercel.json` reescribe `/api/:path*` hacia el Back de cada entorno (T072), y la prueba de humo con Playwright para Node (`e2e/humo.spec.ts`) pasa contra la vista previa de `develop` el 2026-11-02 (T075), con `URL_FRONT`, `VERCEL_AUTOMATION_BYPASS_SECRET`, `ABET_CLAVES_ARCHIVO` y `DIR_RESULTADOS`. Todavía no corre en la CI, y en local exige una API recién arrancada con `bash ../back/scripts/api_local.sh --sin-https` y Vite en el puerto 5173, porque la carga de la sección 410 se hace una sola vez.
2. **Diseño visual.** No hay prototipo en Figma ni guía de estilo, y las pantallas parten de componentes simples de Tailwind.
3. **Pruebas de accesibilidad automáticas.** Las pantallas llevan etiquetas, roles, foco y textos en español, y las pruebas lo comprueban, pero ninguna herramienta como axe revisa el contraste ni el orden del foco, y conviene sumarla antes del primer profesor externo.
4. **Los textos marcados «(propuesta)».** Los avisos de la carga quedan fuera de esa lista desde la confirmación del 2026-10-29. Ninguna decisión de la spec los fija todavía, aunque algunos ya figuran en un `.feature`, y se confirman con la revisión de las specs vivas `acceso`, `periodo`, `carga-export` y `r17`.
5. **Lectura de Username en el navegador antes de enviar.** La crítica de arquitectura la propone y ninguna historia del MVP la pide, así que no está.

## 9. Spec 004, logros por SO (propuesta)

> **Estado 2026-11-17.** Propuesta de la spec 004 del Back (`specs/004-reportes-docente/`), en revisión, que pasa a definitiva con su tarea T011 después de la aprobación de Jefferson. La sección 8 queda para la spec 002 de Capstone, que espera su aprobación en la rama `docs/002-capstone`. Nada de esta sección existe todavía en `src/`, y las secciones 1 a 7 siguen describiendo lo construido.

### 9.1 Qué cambia en `src/`

```
src/
  pantallas/
    MisLogros.tsx          P6 Mis logros por SO (nuevo, propuesta)
    MisSecciones.tsx       P2, + enlace «Ver mis logros por SO» si la cabecera de App.tsx no lo trae
    ResultadoCarga.tsx     P4, + enlace «Ver mis logros por SO» en una carga PUBLICADA
  servicios/
    api.ts                 + obtenerResultados(periodo) para GET /api/resultados (contrato, sección 12)
    tipos.ts               + Resultados, SeccionConLogros e Indicador
  App.tsx                  + vista logros
tests/
  pantallas/MisLogros.test.tsx   pruebas de P6 (nuevo)
```

El enlace a P6 va una sola vez en la cabecera. Si la barra de navegación de `App.tsx` del corte 2 de la spec 001 ya existe al implementar, el enlace se suma a ella, y si no, va en la cabecera de P2. El texto «Ver mis logros por SO» (propuesta) no se parece a «Ver resultado», que abre P4.

### 9.2 P6 Mis logros por SO

| Pantalla | Archivo | Historias que la justifican | Rutas que consume | Spec |
|---|---|---|---|---|
| P6 Mis logros por SO | `pantallas/MisLogros.tsx` | US-37 a US-44 de la spec 004 | `GET /api/resultados` (sección 12 del contrato) y el enlace a `GET /api/cargas/{carga_id}/r17.xlsx` (sección 6) | 004 |

Muestra los logros del periodo vigente agrupados por resultado del estudiante (student outcome, SO), cada grupo con la descripción del SO que trae la API. Dentro de cada grupo hay una fila por indicador de desempeño (performance indicator, PI) y sección, con su texto completo, como «5.1 · Sección 412 de 450002 · 81,8 % (9 de 11) · En la meta» o «Debajo de la meta» (propuestas). La barra de cada fila tiene el ancho del porcentaje en `style`, lleva `aria-hidden` y marca la meta con una línea y con el texto «Meta 80 %» (propuesta), de modo que ningún estado depende solo del color. La barra apilada de los niveles escribe sus cuatro conteos, como «Nivel 1: 1, Nivel 2: 2, Nivel 3: 5, Nivel 4: 3» (propuesta). P6 no usa biblioteca de gráficos (ADR-008).

Cada sección con carga lleva su marca provisional, con el texto que corresponde a `conjunto_reglas_estado`, «Resultados provisionales. Las reglas de la carrera (conjunto R-2026-BORRADOR) aún no están aprobadas. No usar como evidencia oficial.» (propuesta) o el del conjunto aprobado que no define todos sus parámetros, y ofrece «Descargar R-17 de la sección 412 de 450002» (propuesta), que apunta a la ruta del R-17 de su carga.

Lo que no se mide se escribe y no se dibuja. Una sección sin carga dice «Sin carga publicada» (propuesta), y un PI sin calificaciones dice «Sin calificaciones (11 sin evidencia)» (propuesta) y nunca muestra 0 %. Un PI con estudiantes sin evidencia escribe sus dos porcentajes, como «60,0 % de los calificados (6 de 10) y 54,5 % del total (6 de 11), 1 sin evidencia» (propuesta). Mientras la API responde, P6 dice «Cargando sus logros…», sin respuesta del servicio dice «El servicio no respondió. Intente de nuevo.» y con la lista vacía dice «No tiene secciones asignadas en este periodo.», todos propuestas. Un 401 vuelve a P1, como en las demás pantallas.

El coordinador abre P6 con «Ver los logros por SO de la carrera» (propuesta) y ve las secciones de toda la carrera agrupadas por asignatura, cada una en el orden de su número y nunca por su porcentaje, para que P6 no arme un ranking de docentes (H05).

No muestra códigos ni nombres de estudiantes, correos ni nombres de profesores, el botón «Subir export», que sigue solo en P2, un consolidado de varias secciones ni una cifra por SO (D-32), el agregado del curso o de la carrera (D-33), periodos anteriores, la descripción del instrumento (D-34) ni un filtro. P6 no escribe en `localStorage` ni en `sessionStorage`. P2 y P4 siguen sin mostrar porcentajes, como dicen sus secciones.

### 9.3 Pruebas

Vitest con Testing Library prueba en `tests/pantallas/MisLogros.test.tsx` cada escenario `@delegado_a_vitest` de `specs/004-reportes-docente/aceptacion/` del Back, con las respuestas del contrato dentro de las pruebas. Busca cada fila por su rol y su texto, comprueba `aria-hidden` en la barra, la ausencia de «Subir export» y de cualquier «0 %» en un PI sin calificaciones, y que el almacenamiento del navegador queda vacío. La prueba de humo con Playwright (T043 de la spec 004) abre P6 en la vista previa de `develop` después de la subida de la 410, compara sus cifras con el R-17 de esa carga y comprueba que `docente411@example.invalid` no ve la 410.

### 9.4 Lo que todavía NO está

1. **La aprobación de la spec 004**, con J-21 a J-28.
2. **P6 y su código**, que llegan con la fase 4 de la spec 004.
3. **Las decisiones de la carrera** D-32, D-33 y D-34, que fijan el consolidado, el agregado del curso y la descripción del instrumento.
4. **Una revisión automática de accesibilidad**, como axe, que sigue fuera, como dice la sección 7.

## Referencias

- [`03-api/contrato.md`](../03-api/contrato.md), las rutas que consume cada pantalla, con sus errores y sus mensajes literales. La sección 10 del contrato comprueba que esos mensajes coinciden con los de los escenarios.
- [`00-vision/adr/ADR-004-sesion-propia-mismo-origen.md`](../00-vision/adr/ADR-004-sesion-propia-mismo-origen.md), la sesión y el mismo origen.
- La spec del MVP en `specs/001-mvp-carga-r17/spec.md` del Back y sus escenarios en `specs/001-mvp-carga-r17/aceptacion/`.
