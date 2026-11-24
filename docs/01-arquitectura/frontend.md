# Frontend

> **Estado 2026-11-23.** La spec 008 suma el periodo elegido en la cabecera y los rótulos de la coordinación del curso (sección 12), construidos con pruebas primero en la rama `feat/008-ciclo-quimica-industrial` (T042 y T043 del Back), a la espera del código de las rutas 2, 8 y 18 en el Back. **Cambio del 2026-11-21 (aprobado por Jefferson el 2026-11-21, «Sí, apruébalas»).** La sección 10 cambia P4 de la spec 005 del Back, que reemplaza el formulario único «Análisis del resultado» por la sección «Análisis por indicador», con un bloque por PI rotulado como oportunidad de mejora o buena práctica según el semáforo. **Estado 2026-11-18.** La spec 004 suma P6 «Mis logros por SO» (sección 9), con su enlace en la cabecera y en P4, y su prueba de humo pasa en local contra el Back de `feat/004-reportes-docente`, a la espera de su corrida contra la vista previa de `develop` (T071 del Back). **Estado 2026-11-17.** El corte 1 del MVP está construido en `src/` (tareas T040 a T045 del plan, fase 4) con las pantallas P1 a P4. La tarea T085 del corte 2 suma P5, el modo reemplazo de P3 y la confirmación de la sección (US-18, US-19 y US-21), sobre la sección 7 del contrato, y la prueba de humo del reemplazo pasa en local contra el Back del corte 2 desde el 2026-11-18, a la espera de su corrida contra la vista previa de `develop`. El código de acceso por correo de P1 (US-20) sigue pendiente. Este documento describe lo construido. Si el código y el contrato discrepan, manda el contrato (`03-api/contrato.md`), y este documento se corrige en el mismo PR.

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
  servicios/formato.ts     hora de Lima, rótulo de la sección, conteo de filas de P4 y P5 y cifras de P6
  servicios/rotulos.ts     rótulos que cambian con el rol (spec 007, US-63)
  servicios/ayudas.ts      «Antes de subir» de P3 y «Qué corregir» de P4 (spec 007, J-43 y J-44)
  servicios/secciones_del_profesor.ts   rutas 4 y 8 para P2 del profesor (spec 007, J-45)
  pantallas/
    Ingreso.tsx            P1 (con AvisoSesion.tsx para el aviso de sesión vencida)
    MisSecciones.tsx       P2
    SubirExport.tsx        P3
    ResultadoCarga.tsx     P4
    Cargas.tsx             P5 (corte 2)
    MisLogros.tsx          P6 (spec 004)
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

Ningún componente llama a `fetch` directamente. `api.ts` expone una función por ruta del contrato (`iniciarSesion`, `sesionActual`, `cerrarSesion`, `listarSecciones`, `subirExport`, `obtenerCarga`, `listarCargas`, `obtenerResultados` y `urlR17`) y convierte cada error en un `ErrorApi` con el código HTTP y el `detail` de la API. Un `detail` que no sea texto, como la lista que FastAPI responde por omisión, se reemplaza por «La petición no tiene la forma esperada.». Desde el corte 2, `ErrorApi` trae además `requiereConfirmacion`, verdadero solo si el cuerpo trae `requiere_confirmacion` igual a `true`, y `cargaPublicada`, el número de `carga_publicada` o `null` (contrato, sección 3.1). Así P3 ofrece el paso siguiente sin leer el texto del `detail`. Los tipos de esas respuestas viven en `servicios/tipos.ts`, donde `Constancia` suma `reemplaza_carga_id` y `reemplazada_por` y `CargaResumida` describe cada elemento de `GET /api/cargas`.

`subirExport(seccionId, archivo, opciones)` distingue el 200 (el mismo archivo ya está publicado en la sección) del 201 con el campo `yaCargada`. Con `opciones.reemplaza` agrega `?reemplaza={carga_id}` a la ruta, y con `opciones.confirmarSeccion` agrega al multipart el campo `confirmar_seccion` con el texto `true`. El campo `aviso` del 200 de un reemplazo sale de la constancia y llega aparte, en `aviso`, que vale `null` en las demás respuestas. `listarCargas(seccionId)` pide `GET /api/cargas`, o `GET /api/cargas?seccion_id={seccion_id}` cuando recibe la sección, y devuelve la lista en el orden de la API.

- La sesión viaja en la cookie `abet_sesion`, que el navegador manda solo porque el Front y la API comparten origen (ADR-004). `api.ts` nunca lee ni guarda un token, y nada de la sesión va a `localStorage`.
- Todas las rutas son relativas (`/api/...`). En Vercel, el `vercel.json` del Front las reescribe hacia el Back, y en local las reenvía `server.proxy` de Vite hacia la API en la Mac.
- La descarga del R-17 es un enlace normal a `/api/cargas/{carga_id}/r17.xlsx`, para que el navegador use el nombre de archivo que fija la API.
- Una respuesta que no es JSON se convierte en un mensaje fijo y nunca muestra el cuerpo crudo, con los tres casos de la sección 8 del contrato. El 413 de Vercel dice «El archivo supera el máximo de 1 MB.», un 401 o 403 con página HTML dice «El entorno de pruebas no está disponible.», y cualquier otra respuesta sin JSON, como un 502 o un 504, o una red caída, dice «El servicio no respondió. Intente de nuevo.».
- Las horas ISO 8601 de la API se muestran en hora de Lima con la forma `28/10/2026 10:15` (`servicios/formato.ts`).
- `scripts/preflight.sh` falla si un archivo de `src/` usa el almacenamiento del navegador, nombra una URL absoluta, llama a `fetch` fuera de `api.ts` o escribe una ruta literal que no empiece con `/api` (regla 7, probada en `scripts/probar_preflight.sh`).

## 3. `App.tsx` y el estado

`App.tsx` pide `GET /api/sesion` al arrancar. Sin sesión muestra P1, y con sesión muestra P2. La vista visible es una de cinco, P2 (`secciones`), P3 (`subir`, con la sección y, en el modo reemplazo, el `reemplaza` que llega de P5), P4 (`resultado`), P5 (`cargas`) y, desde la spec 004, P6 (`logros`). El resto del estado vive en la pantalla que lo usa, sin un almacén global, porque el MVP tiene cinco pantallas y un solo flujo. Un 401 de cualquier ruta con sesión, distinta de `/api/sesion`, devuelve a P1 con el `detail` de la API, «La sesión venció. Ingrese otra vez.» (propuesta), que `api.ts` entrega a `App.tsx` por `alSesionVencida`. La cabecera de `App.tsx` muestra, con sesión, el nav «Menú principal» (spec 007, US-63, sección 11.5) con los botones «Mis secciones» («Secciones de la carrera» para el coordinador) y «Cargas» (propuesta), que abren P2 y P5, y el enlace a P6, «Ver mis logros por SO» para el profesor y «Ver los logros por SO de la carrera» para el coordinador (propuestas), con `aria-current="page"` en el botón de la pantalla a la vista. Fuera del nav van el correo del usuario y el botón «Salir» (propuesta), que llama a `DELETE /api/sesion` y vuelve a P1 aunque esa llamada falle. «Reemplazar carga» de P5 abre P3 en modo reemplazo con la sección y la carga de esa fila, y «Ver constancia» abre P4 con la carga.

## 4. Las pantallas

| Pantalla | Archivo | Historias | Rutas que consume ([contrato](../03-api/contrato.md)) | Corte |
|---|---|---|---|---|
| P1 Ingreso | `pantallas/Ingreso.tsx` | US-05 (y US-20 en el corte 2) | `POST /api/sesion` (sección 4) | 1 |
| P2 Mis secciones | `pantallas/MisSecciones.tsx` | US-06, y US-59 y US-63 de la spec 007 | `GET /api/secciones` (sección 5) y, solo para el profesor, `GET /api/cargas` (sección 7) | 1 y spec 007 |
| P3 Subir export | `pantallas/SubirExport.tsx` | US-07, US-08, US-09, US-11, US-12, US-13, US-18 y US-21 | `POST /api/secciones/{seccion_id}/cargas` (sección 6), con `?reemplaza={carga_id}` y `confirmar_seccion` (sección 7) | 1 y 2 |
| P4 Resultado de la carga | `pantallas/ResultadoCarga.tsx` | US-07, US-10, US-12, US-13, US-14, US-15, US-16 y US-18 | `GET /api/cargas/{carga_id}` y `GET /api/cargas/{carga_id}/r17.xlsx` (sección 6) | 1 y 2 |
| P5 Cargas | `pantallas/Cargas.tsx` | US-18, US-19 | `GET /api/secciones` (sección 5), `GET /api/cargas` (sección 7) y `GET /api/cargas/{carga_id}/r17.xlsx` (sección 6) | 2 |
| P6 Mis logros por SO | `pantallas/MisLogros.tsx` | US-37 a US-44 de la spec 004 | `GET /api/resultados` (sección 12) y `GET /api/cargas/{carga_id}/r17.xlsx` (sección 6) | spec 004 |
| P7 Avance del registro | `pantallas/Avance.tsx` | US-65 de la spec 007 y US-79 de la spec 008 | `GET /api/avance` (secciones 14.2 y 15.5) | spec 008 (T046) |

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

Muestra el estado de la carga y sus conteos con la forma «11 filas leídas, 10 aceptadas y 1 rechazada», o «11 filas leídas, 11 aceptadas y 0 rechazadas» (propuesta) cuando no hay rechazos. Si hay rechazos, la tabla de rechazos dice la fila, el PI, el motivo en palabras y su efecto, como «Fila 3, PI 5.2, nivel fuera de la escala 1 a 4. La fila completa queda fuera, también de 5.1 y 5.3.». Los avisos van aparte, en su propio apartado «Avisos» y con su propio componente (`AvisosCarga.tsx`), cada uno con el texto exacto del campo `mensaje` de la API, como «PI 5.3. La columna declara 20 puntos y sus notas están entre 1 y 4. Se cargó igual.», sin repetir el PI. En la tabla de rechazos, un rechazo de toda la carga muestra «Archivo completo» en la columna de la fila, y un PI ausente muestra «No aplica». Si la carga queda RECHAZADA por estructura, por sección o por periodo, o porque ninguna fila trae un nivel (SIN_CALIFICACIONES, «El archivo no trae ningún nivel en las columnas de los PI del plan. La carga no se publicó.»), muestra el motivo, como «El archivo corresponde a la sección 411 y usted eligió la 410. No se publicó.». Cuando ninguna fila se acepta, la carga también queda RECHAZADA, y la pantalla muestra el `mensaje` de la respuesta, «Ninguna fila se pudo aceptar. La carga no se publicó.» (propuesta), junto con la tabla de rechazos. La constancia muestra el nombre del archivo sin ruta, la hoja (o «Sin hoja (export de texto)» cuando la API la manda nula, como en un `.csv` o un `.xls`, spec 003 US-34), la huella SHA-256, el conjunto de reglas con la marca PROVISIONAL, el correo de quien sube el archivo y las horas de inicio y fin. Desde el corte 2 suma la fila «Reemplaza a la carga» (propuesta) cuando `reemplaza_carga_id` no es nulo y la fila «Reemplazada por la carga» (propuesta) cuando `reemplazada_por` no es nulo. La pantalla pide la constancia a `GET /api/cargas/{carga_id}` solo cuando llega desde P2 o P5, porque desde P3 ya trae la del 201. El botón «Descargar R-17» (propuesta) aparece activo solo si la carga está PUBLICADA, y si no lo está la pantalla dice «Esta carga no tiene R-17.» (propuesta, US-62 de la spec 007, que reemplaza a «No hay una carga publicada para esta sección», falso tras un reemplazo rechazado). Una carga REEMPLAZADA con sucesora dice en su lugar «La carga 11 la reemplaza, así que esta carga no tiene R-17.» (propuesta), con el número de `reemplazada_por`.

No muestra el valor leído de ninguna celda, nombres de estudiantes, Last Access, Availability, columnas de actividades ni los porcentajes del R-17, que viven solo en el archivo descargado.

La spec 005, aprobada el 2026-11-18 y con un cambio aprobado el 2026-11-21, cambia esta pantalla. P4 muestra los niveles, los porcentajes, el semáforo y el hallazgo de cada PI de una carga publicada, la sección «Análisis por indicador» (propuesta), con la causa y la acción de cada PI rotuladas como oportunidad de mejora o buena práctica, y el único enlace «Descargar R-17», que ofrece solo con la declaración completa (sección 10). La regla de arriba sigue vigente hasta que llegue el código de esa spec.

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

## 9. Spec 004, logros por SO

> **Estado 2026-11-18.** Forma definitiva de P6 de la spec 004 del Back (`specs/004-reportes-docente/`), que Jefferson aprueba en el chat el 2026-11-18 con J-21 a J-28, escrita antes de su código en la rama `feat/004-reportes-docente` (T011). La sección 8 queda para la spec 002 de Capstone, que espera su aprobación en la rama `docs/002-capstone`. P6 existe en `src/` desde el 2026-11-18, con sus pruebas, y las secciones 1 a 4 la nombran junto a las demás pantallas.

### 9.1 Qué cambia en `src/`

```
src/
  pantallas/
    MisLogros.tsx          P6 Mis logros por SO (nuevo)
    ResultadoCarga.tsx     P4, + enlace a P6 en una carga PUBLICADA
  servicios/
    api.ts                 + obtenerResultados(periodo) para GET /api/resultados (contrato, sección 12)
    tipos.ts               + Resultados, SeccionConLogros, Indicador y SoDelPlan
    formato.ts             + porcentaje(), meta() y fraccion(), con coma decimal
  App.tsx                  + vista logros y su enlace en la cabecera
tests/
  pantallas/MisLogros.test.tsx   pruebas de P6 (nuevo)
```

El enlace a P6 va una sola vez en la barra de navegación de la cabecera de `App.tsx`, la que trae el corte 2 de la spec 001 con «Mis secciones» y «Cargas». Dice «Ver mis logros por SO» para el profesor y «Ver los logros por SO de la carrera» para el coordinador (propuestas), un texto que no se parece a «Ver resultado», que abre P4. P2 no cambia, y P4 de una carga PUBLICADA ofrece el mismo enlace.

### 9.2 P6 Mis logros por SO

| Pantalla | Archivo | Historias que la justifican | Rutas que consume | Spec |
|---|---|---|---|---|
| P6 Mis logros por SO | `pantallas/MisLogros.tsx` | US-37 a US-44 de la spec 004 | `GET /api/resultados` (sección 12 del contrato) y el enlace a `GET /api/cargas/{carga_id}/r17.xlsx` (sección 6) | 004 |

El título es «Mis logros por SO» para el profesor y «Logros por SO de la carrera» para el coordinador (propuestas). Debajo del rótulo del piloto, P6 muestra primero sus secciones y después un grupo por cada resultado del estudiante (student outcome, SO) de la respuesta.

Las secciones van agrupadas por asignatura, cada asignatura con su código y su nombre y cada sección en el orden de su número, el que trae la API, y nunca por su porcentaje. Cada sección dice «Publicada» o «Sin carga publicada» (propuestas). Una sección sin carga muestra los indicadores de desempeño (performance indicators, PI) de su plan, y una sección sin plan muestra «La carrera aún no registra el plan de medición de esta sección», el texto de P2. Una sección PUBLICADA ofrece «Descargar R-17 de la sección 412 de 450002» (propuesta), que apunta a la ruta del R-17 de su carga.

Cada sección con carga lleva su marca provisional cuando `provisional` es verdadero, con el texto que corresponde a `conjunto_reglas_estado`, como `_franja` del R-17. Con un conjunto en borrador dice «Resultados provisionales. Las reglas de la carrera (conjunto R-2026-BORRADOR) aún no están aprobadas. No usar como evidencia oficial.» (propuesta). Con un conjunto aprobado que no define todos sus parámetros dice «Resultados provisionales. El conjunto de reglas R-PRUEBA-INCOMPLETO está aprobado, pero no define todos los parámetros que usan estos resultados. No usar como evidencia oficial.» (propuesta), y sin marca cuando `provisional` es falso.

Cada grupo de SO lleva el título «SO 5» y la descripción del SO que trae la API, y dentro de él hay una fila por indicador, en el orden de la respuesta. Cada fila escribe su PI, su sección, su porcentaje, su fracción y su estado, como «5.1 · Sección 412 de 450002 · 81,8 % (9 de 11) · En la meta» o «Debajo de la meta» (propuestas), y debajo el instrumento cuando el plan lo define. Un grupo sin ningún indicador dice «Ninguna sección con carga publicada mide este SO.» (propuesta).

La barra de cada fila tiene el ancho del porcentaje en `style`, lleva `aria-hidden` y marca la meta con una línea y con el texto «Meta 80 %» (propuesta), de modo que ningún estado depende solo del color (criterio 1.4.1 de WCAG). El tramo lleno y la línea de la meta contrastan al menos 3 a 1 con el fondo de la barra (criterio 1.4.11). La barra apilada de los niveles lleva también `aria-hidden`, con el conteo de cada tramo dentro de él, y su texto completo va al lado, como «Nivel 1: 1, Nivel 2: 2, Nivel 3: 5, Nivel 4: 3» (propuesta). P6 no usa biblioteca de gráficos (ADR-008 y J-24).

Lo que no se mide se escribe y no se dibuja. Un PI sin calificaciones dice «Sin calificaciones (11 sin evidencia)» (propuesta), sin barra y sin ningún «0 %». Un PI con estudiantes sin evidencia escribe sus dos porcentajes, como «60,0 % de los calificados (6 de 10) y 54,5 % del total (6 de 11), 1 sin evidencia» (propuesta). Un conjunto sin nivel esperado o sin meta dice «Sin nivel esperado definido» o «Sin meta definida» (propuestas), también sin barra.

Mientras la API responde, P6 dice «Cargando sus logros…». Sin respuesta del servicio dice «El servicio no respondió. Intente de nuevo.», y con la lista vacía dice «No tiene secciones asignadas en este periodo.», todos propuestas. Un 401 vuelve a P1, como en las demás pantallas. P6 vuelve a P2 con «Volver» (propuesta).

El coordinador ve las secciones de toda la carrera con la misma pantalla, agrupadas por asignatura y en el orden de su número, para que P6 no arme un ranking de docentes (H05 y J-28).

P6 no muestra códigos ni nombres de estudiantes, correos ni nombres de profesores, el botón «Subir export», que sigue solo en P2, un consolidado de varias secciones ni una cifra por SO (D-32), el agregado del curso o de la carrera (D-33), periodos anteriores, la descripción del instrumento (D-34) ni un filtro. P6 no escribe en `localStorage` ni en `sessionStorage`, y no compara cifras ni decide la meta, que trae la API en `en_meta`. P2 y P4 siguen sin mostrar porcentajes, como dicen sus secciones.

La spec 005, aprobada el 2026-11-18, cambia dos líneas de esta pantalla. El enlace «Descargar R-17 de la sección 412 de 450002» pasa a «Ver la carga de la sección N de A» (propuesta), que abre P4 para que ningún enlace abra un 409 en JSON, y P4 deja de seguir sin porcentajes (sección 10). El texto vigente de esta sección rige hasta la aprobación de la spec 005.

### 9.3 Pruebas

Vitest con Testing Library prueba en `tests/pantallas/MisLogros.test.tsx` cada escenario `@delegado_a_vitest` de `specs/004-reportes-docente/aceptacion/` del Back, con respuestas del contrato dentro de las pruebas, y `tests/App.test.tsx` prueba los enlaces de la cabecera y de P4. Las pruebas buscan cada fila por su rol y su texto, comprueban `aria-hidden` en las barras, la ausencia de «Subir export» y de cualquier «0 %» en un PI sin calificaciones y que el almacenamiento del navegador queda vacío. La prueba de humo con Playwright (T043 de la spec 004) abre P6 en la vista previa de `develop` después de la subida de la 410, compara sus cifras con el R-17 de esa carga y comprueba que `docente411@example.invalid` no ve la 410.

### 9.4 Lo que todavía NO está

1. **La prueba de humo de P6 contra la vista previa de `develop`** (T071 del Back), que espera la fusión de los dos PR de `feat/004-reportes-docente`, porque la vista previa del Front reescribe `/api` hacia la de `develop` del Back.
2. **Las decisiones de la carrera** D-32, D-33 y D-34, que fijan el consolidado, el agregado del curso y la descripción del instrumento.
3. **Una revisión automática de accesibilidad**, como axe, que sigue fuera, como dice la sección 7.

## 10. Spec 005, oportunidades de mejora y buenas prácticas por indicador (propuesta, cambio del 2026-11-21)

> **Cambio del 2026-11-21 (aprobado por Jefferson el 2026-11-21, «Sí, apruébalas»).** Jefferson aprueba en el chat el 2026-11-21 el alcance del cambio de la spec 005 del Back (`specs/005-oportunidades-de-mejora/`, Clarification «Session 2026-11-21»). P4 deja el formulario único «Análisis del resultado», con un par de textos por carga, y suma la sección «Análisis por indicador» (propuesta), con un bloque por indicador de desempeño (performance indicator, PI). En cada bloque el profesor escribe una causa y una acción, y la pantalla las rotula como oportunidad de mejora (OM) o como buena práctica (BP) con el tipo que trae la API. Las historias siguen siendo US-45 a US-54, y sus decisiones son J-29 a J-41 y D-35 a D-43. Nada de esta sección existe todavía en `src/`. Las secciones 1 a 7 siguen describiendo lo construido, y la sección 9 sigue siendo la propuesta de la spec 004. Los textos de pantalla de esta sección son propuestas hasta que un `.feature` reaprobado los fije, salvo los que la spec 005 copia de la plantilla del R-17. **Estado 2026-11-18.** La spec 005 se aprueba con un formulario único por carga.

La spec 005 no agrega una pantalla. Cambia P4 para que el profesor vea cómo va su sección al terminar la carga, registre el análisis de cada PI y recién entonces descargue el R-17, y cambia `App.tsx` para que el botón atrás del navegador vuelva a la pantalla anterior de la aplicación. El orden de construcción es el de J-41, primero la ruta 13 y P4 por indicador, después V1_12 con las rutas 14 a 16, US-49 y US-50, y al final US-54.

### 10.1 Qué cambia en `src/`

```
src/
  pantallas/
    ResultadoCarga.tsx     P4, + semáforo, análisis por indicador con hallazgo, guardado automático y R-17 solo con declaración (propuesta)
    MisSecciones.tsx       P2, el «Descargar R-17» del coordinador pasa a un enlace a P4 (propuesta)
    Cargas.tsx             P5, el enlace «Descargar R-17» pasa a un enlace a P4 (propuesta)
    MisLogros.tsx          P6, el enlace al R-17 pasa a «Ver la carga de la sección N de A» (propuesta)
  servicios/
    api.ts                 + obtenerIndicadores, obtenerMejora, guardarBorrador y declarar (T040)
    tipos.ts               + los tipos de las rutas 13 a 16, con indicadores por PI
  App.tsx                  + navegación por el fragmento de la dirección (T044)
tests/
  preparar.ts              reinicia el fragmento de la dirección entre pruebas
```

- **P4** suma la sección «Cómo va su sección» (propuesta), con la tabla del semáforo, la sección «Análisis por indicador» (propuesta), con el hallazgo de cada PI al comienzo de su bloque, y el estado del R-17. Es el único lugar que ofrece «Descargar R-17» (J-32, propuesta), de modo que ningún enlace abre el 409 en JSON de la ruta 7 sin declaración.
- **`api.ts` y `tipos.ts`** suman una función por ruta nueva, la ruta 13 `GET /api/cargas/{carga_id}/indicadores`, la 14 `GET /api/cargas/{carga_id}/mejora`, la 15 `PUT /api/cargas/{carga_id}/mejora/borrador` y la 16 `POST /api/cargas/{carga_id}/mejora/declaracion` (contrato, sección 13). Los tipos de las rutas 14 a 16 llevan el arreglo `indicadores`, con `pi`, `tipo`, `causa` y `accion`. Los nombres de las funciones salen de la tarea T040 de la spec 005 y siguen la regla de la sección 2, una función por ruta y ningún `fetch` fuera de `api.ts`.
- **P2 y P5** dejan de ofrecer «Descargar R-17», porque solo P4 sabe si la declaración existe. P2 conserva «Ver resultado» y P5 «Ver constancia», que ya abren P4 de esa carga, así que ningún texto nuevo hace falta.
- **P6** cambia su enlace al R-17 (FR-015 de la spec 004) por «Ver la carga de la sección N de A» (propuesta), con el número de la sección y el código de la asignatura.
- **`App.tsx`** guarda cada pantalla en el fragmento de la dirección y la recupera con el evento `popstate` (sección 10.3). No cambia `vercel.json`, porque la regla 7 de `scripts/preflight.sh` rechaza una ruta literal fuera de `/api`.

### 10.2 P4 con el semáforo y el análisis por indicador

Justifican los cambios de P4 las historias US-46 (el semáforo), US-47 (el registro por PI, con el hallazgo de cada PI), US-48 (el borrador se guarda solo), US-49 (el R-17 solo con la declaración completa), US-53 (sin datos de estudiantes) y US-54 (el texto anterior llega como borrador) de la spec 005. Las rutas nuevas son la 13, la 14, la 15 y la 16, y P4 sigue consumiendo `GET /api/cargas/{carga_id}` y la descarga de la ruta 7.

**Orden de los bloques**, de arriba abajo, en una carga PUBLICADA.

1. La constancia, los conteos, los rechazos y los avisos de hoy, sin cambios.
2. «Cómo va su sección» (propuesta), con la franja provisional, la tabla del semáforo y su leyenda. Solo aparece en una carga PUBLICADA.
3. «Análisis por indicador» (propuesta), con la nota de datos de estudiantes, un bloque por PI en el orden de la tabla, que empieza con su hallazgo, el estado del guardado y el botón «Guardar declaración» (propuesta).
4. Tras declarar, la causa y la acción declaradas de cada PI, con su tipo, la marca «Propuesta» y «Declarado el 21/11/2026 15:10» (propuestas), y los bloques siguen disponibles para corregir.
5. El estado del R-17, que es el botón «Descargar R-17» deshabilitado o su enlace.

El orden de los bloques 4 y 5 no lo fija la spec 005 y queda como propuesta.

**El semáforo.** P4 pide la ruta 13 solo para una carga PUBLICADA, y no la pide para una RECHAZADA o REEMPLAZADA ni muestra la sección. La tabla tiene las columnas «PI», «Nivel 1» a «Nivel 4», «Logran / calificados» y «% sobre el total», que son las del R-17, y además «Logro», «Meta» y «Estado» (propuesta). La tabla no trae el hallazgo ni el tipo, que encabezan el bloque de cada PI en «Análisis por indicador» (US-46). Con la respuesta de la 412 de 450002 de ejemplo (contrato, sección 13.2) muestra tres filas, con «9 de 11», «81,8 %» y «En la meta» en 5.1, «6 de 11», «54,5 %» y «Debajo de la meta» en 5.2, y «10 de 11», «90,9 %» y «En la meta» en 5.3. Con la 410 de 450002 muestra «7 de 11», «63,6 %» y «Debajo de la meta» en 5.1 y 5.2, y «8 de 11», «72,7 %» y «Debajo de la meta» en 5.3.

| `semaforo` | Texto del estado (propuesta) |
|---|---|
| VERDE | «En la meta» |
| AMBAR | «Cerca de la meta» |
| ROJO | «Debajo de la meta» |
| SIN_DATO | «Sin calificaciones (N sin evidencia)», «Sin meta definida» o «Sin nivel esperado definido» |

Cada estado lleva una luz de color con `aria-hidden` y su texto, de modo que ninguno depende solo del color. Un PI SIN_DATO dice, por ejemplo, «Sin calificaciones (11 sin evidencia)» y nunca «0 %» ni una luz roja. El Front no compara cifras ni decide el tipo de registro, porque la ruta 13 trae `semaforo` y `tipo_registro` ya decididos (J-29 y D-39).

La leyenda sale de la respuesta. Con `corte_rojo_pct` nulo dice «Verde, el logro alcanza la meta de 80 %. Rojo, todavía no la alcanza.» (propuesta), y con 75.0 dice «Verde, desde la meta de 80 %. Ámbar, desde 75 % hasta debajo de la meta. Rojo, debajo de 75 %.» (propuesta). Mientras CORTE_ROJO siga PENDIENTE en R-2026-BORRADOR, el piloto no muestra ámbar (D-35). Con `provisional` verdadero, P4 muestra sobre la tabla la franja de la constancia y del R-17 con el texto de su conjunto de reglas, y con `provisional` falso no muestra nada.

**El análisis por indicador.** Reemplaza al formulario único «Análisis del resultado» y va debajo de «Cómo va su sección». Sobre los bloques va la nota «No escriba nombres, códigos ni correos de estudiantes.» (propuesta). Cada bloque empieza con el PI, el rótulo de su tipo y el hallazgo de la ruta 13, como «5.2 · Oportunidad de mejora» (propuesta) seguido de «5.2: 54,5 % en Satisfactorio o más, meta 80,0 %» (propuesta), y lleva dos campos con los rótulos de su tipo.

| `tipo_registro` | Rótulo del bloque (propuesta) | Campo de la causa (propuesta) | Campo de la acción (propuesta) |
|---|---|---|---|
| OPORTUNIDAD_MEJORA (ROJO o AMBAR) | «Oportunidad de mejora» | «Causa probable» | «Acción de mejora» |
| BUENA_PRACTICA (VERDE) | «Buena práctica» | «Causa del logro» | «Buena práctica que conviene mantener o compartir» |
| Nulo (SIN_DATO) | Sin rótulo. El bloque muestra solo su hallazgo, «5.3: sin calificaciones en esta carga.» (propuesta) | Sin campo | Sin campo |

Con la 412 de 450002, P4 muestra tres bloques, «5.1 · Buena práctica», «5.2 · Oportunidad de mejora» y «5.3 · Buena práctica» (propuestas). Un PI que alcanza o supera la meta también pide su análisis, porque la carrera quiere llegar a la BP aun por encima del valor de referencia (D-36). Un PI SIN_DATO no pide registro (D-40), y su bloque trae solo el hallazgo, sin campos.

P4 ya no muestra sobre cada campo los enunciados de B28 y B33 de la plantilla, que hablan de «no alcanzar el indicador» y no sirven para una BP. El R-17 los conserva sin cambios (D-08), y las causas van a su recuadro A y las acciones al B, un párrafo por PI (D-41). P4 no muestra campos de responsable, plazo ni estado, que quedan para el R-18 y los coordinadores de curso y de área (D-42).

Cada campo admite hasta 800 puntos de código (J-39), y el Front los cuenta con la misma regla del Back, sin usar `maxLength`. El botón «Guardar declaración» queda deshabilitado mientras falte la causa o la acción de algún PI con `tipo_registro` no nulo. El Front comprueba solo que los campos no estén vacíos, y el tope de los recuadros A y B del R-17 lo comprueba la ruta 16, cuyo 422 P4 muestra con su `detail`. El 409 de la ruta 16 por una regla sin definir, «El conjunto de reglas no define la meta o el nivel esperado. La declaración espera a la Coordinación.» (propuesta), P4 lo muestra también con su `detail` junto al botón, conserva el texto de los bloques y no reintenta. Una carga cuyos PI son todos SIN_DATO no tiene bloques con campos, así que P4 guarda el borrador con el arreglo `indicadores` vacío antes de declarar (contrato, sección 13.4). La declaración vigente es la última, y los bloques siguen disponibles para corregirla con una declaración nueva (D-37).

**Estados del guardado.** El borrador se guarda en la base, con una sola versión por carga para todos sus PI, y nunca en `localStorage` ni en `sessionStorage` (J-30). Cada PUT lleva todos los PI que llevan registro, también los que siguen vacíos, porque la ruta 15 reemplaza el borrador entero. Un PI SIN_DATO no viaja, porque la ruta 15 lo rechaza con 422, y cada elemento lleva en `tipo` el `tipo_registro` de la ruta 13.

| Momento | Qué hace P4 |
|---|---|
| 2,5 s después de la última tecla en cualquier campo, con un máximo de 15 s si se escribe sin pausa, al salir de un campo y en `pagehide` con `keepalive` | Envía un solo PUT a la vez, con la `version` leída y todos los PI que llevan registro |
| Mientras responde | Dice «Guardando…» (propuesta) |
| Respuesta 200 | Dice «Borrador guardado a las 15:10» (propuesta) |
| Falla de red o 500 | Dice «No se pudo guardar el borrador. Su texto sigue en pantalla.» (propuesta) y conserva lo escrito |
| 409 por versión | Muestra «Otra pestaña guardó un texto más reciente.» (propuesta) y ofrece elegir cuál borrador conservar, el de la pantalla o el guardado, con todos sus PI |
| 422 durante el guardado | Deja el texto en pantalla con el mensaje de la API y no reintenta en bucle |
| 401 durante el guardado | No desmonta P4. El ingreso la tapa con el texto en memoria, y si vuelve a ingresar el mismo usuario, reintenta con la misma versión (decisión de arquitectura AD-22). Con otro usuario, o después de «Salir», descarta el texto |
| Carga REEMPLAZADA con 409 | Conserva el texto y ofrece «Llevar el texto a la carga N» (propuesta), con el número de `reemplazada_por` |

**El R-17 solo con declaración.** Sin declaración, P4 muestra «Descargar R-17» deshabilitado con «El R-17 se habilita cuando registre y declare la causa y la acción de cada indicador.» (propuesta) para el profesor, y «El R-17 se habilita cuando el profesor de la sección declare el análisis por indicador.» (propuesta) para el coordinador. Con la declaración ofrece el enlace de siempre a la ruta 7, que escribe el análisis de cada PI en los recuadros A y B (contrato, sección 13.6). Una carga REEMPLAZADA mantiene su texto de hoy, «La carga 11 la reemplaza, así que esta carga no tiene R-17.» (propuesta).

**Borrador heredado.** Una carga nueva de un reemplazo trae, en la ruta 14, la causa y la acción de la carga anterior como borrador, con `heredado_de`, solo en los PI que la carga nueva también reconoce. P4 las muestra en sus bloques, con el rótulo del tipo que fija el semáforo de la carga nueva, para revisarlas con las cifras nuevas. El texto se guarda en la carga nueva con el primer PUT, y el R-17 de esa carga sigue en 409 hasta declarar.

**El coordinador** lee la declaración sin editarla. Su P4 muestra, por PI, el rótulo del tipo, la causa, la acción y la marca «Propuesta» (propuesta), sin campos ni botón, y con solo un borrador del profesor dice «El profesor todavía no declara el análisis por indicador.» (propuesta), sin ningún texto, porque la ruta 14 no le entrega el borrador.

**Respaldo ante un Back anterior.** Si la ruta 13 responde 404, porque el Back todavía no incluye la spec 005, P4 se comporta como hoy, sin semáforo ni análisis y con el enlace «Descargar R-17» (decisión de arquitectura AD-28, propuesta). Por eso el Front se despliega antes que el Back (J-37).

No muestra nombres, códigos ni correos de estudiantes, el texto del borrador al coordinador, un semáforo para una carga RECHAZADA o REEMPLAZADA, una cifra o un tipo que el Front haya calculado, campos de responsable, plazo ni estado, ni quién declaró (C-12).

### 10.3 Navegación con el botón atrás

La spec 005 (US-52, J-34) agrega la navegación por el fragmento de la dirección, sin tocar `vercel.json`. `App.tsx` llama a `history.pushState` al cambiar de pantalla y recupera la pantalla con `popstate`. El cambio del 2026-11-21 no toca esta parte.

| Fragmento (propuesta) | Pantalla |
|---|---|
| `#/secciones` | P2 |
| `#/cargas` | P5 |
| `#/secciones/{seccion_id}/subir` | P3 |
| `#/secciones/{seccion_id}/subir?reemplaza={carga_id}` | P3 en modo reemplazo |
| `#/cargas/{carga_id}` | P4 |
| `#/logros` | P6 |

- **`history.state`** lleva solo la ruta y una marca del ingreso, nunca la constancia ni el borrador. Cada pantalla vuelve a pedir sus datos.
- **Reemplazo tras la subida.** Después de una subida que termina en P4, `replaceState` reemplaza la entrada de P3 solo si la pantalla visible sigue siendo esa subida, de modo que atrás lleve a P2 sin repetir el POST. Una carga RECHAZADA ofrece «Subir otro archivo» (propuesta).
- **«Salir».** Después de «Salir», `replaceState` lleva a `#/`, y sin usuario `App.tsx` muestra P1 con cualquier fragmento. Atrás desde ahí no muestra ninguna sección.
- **Entradas inválidas.** Una entrada de otro ingreso o un fragmento desconocido llevan a P2. P3 recargada cae a P2, porque necesita la sección. Recargar en P4 conserva la pantalla por el fragmento, sin prueba propia.
- **Fragmento ajeno.** Un fragmento a una carga ajena, como `#/cargas/999`, muestra el 403 de P4, «La sección no está a su cargo.».

### 10.4 Pruebas

Vitest con Testing Library prueba cada escenario `@delegado_a_vitest` de `specs/005-oportunidades-de-mejora/aceptacion/` del Back, con las respuestas del contrato escritas solo dentro de las pruebas, y las historias que cubre son US-46, US-47, US-48, US-49, US-52, US-53 y US-54.

- **Semáforo (`semaforo.feature`).** Las tres filas de la 410 y de la 412 de 450002, la leyenda con y sin `corte_rojo_pct`, la franja provisional, el PI SIN_DATO sin «0 %», la carga RECHAZADA o REEMPLAZADA sin petición a la ruta 13 y el 404 de un Back anterior.
- **Análisis por indicador (`declaracion.feature`).** Los tres bloques de la 412 de 450002 con sus rótulos de OM y de BP y el hallazgo copiado sin cambios, el bloque de un PI SIN_DATO con solo su hallazgo y la ausencia de campos de responsable, plazo y estado. También el botón deshabilitado mientras falte un campo de un PI con calificaciones, la marca «Propuesta» y «Declarado el …» y el borrador que vuelve al abrir P4. Además, el guardado a los 2,5 s y al salir de un campo con todos los PI en el cuerpo, la falla con 500, el 401 que conserva el texto, el 422 sin bucle y el 422 de los recuadros que no caben. Por último, el coordinador sin campos, los enlaces de P2 y P5 hacia P4, la herencia por PI y «Llevar el texto a la carga N».
- **Navegación (`navegacion.feature`).** Los cinco recorridos de US-52 con atrás y adelante, sin salir de la aplicación ni pedir otra vez la sesión.
- **Almacenamiento.** Después de escribir en P4, `localStorage` y `sessionStorage` quedan con 0 entradas, y `tests/preparar.ts` reinicia el fragmento entre pruebas.
- **Prueba de humo.** `e2e/humo.spec.ts` suma, en T046, el semáforo, el análisis por indicador y la descarga con los recuadros A y B en la vista previa de `develop` (SC-007 de la spec 005). Sube la 410, ve tres PI en rojo, registra la causa y la acción de cada uno, declara y descarga un R-17 con un párrafo por PI en A y en B.

### 10.5 Lo que todavía NO está

1. **Las decisiones de la carrera** D-35 (valor de CORTE_ROJO), D-36 (que el cambio propone cerrar con la BP de cada PI en la meta) y D-37 (si el profesor corrige tras descargar). Siguen abiertas también D-39 (si un PI VERDE lleva además una OM), D-41 (si las OM y las BP pasan a una hoja aparte del R-17) y D-43 (el nombre estándar de la actividad de Blackboard, urgente antes de capacitar a los profesores en la semana 14).
2. **Todo el código de esta sección**, que llega con la fase 4 de la spec 005, en el orden de J-41.
3. **El R-18, los coordinadores de curso y de área, los estados Revisado y Aprobado y el responsable y el plazo de cada acción** (D-42), fuera de la spec 005.
4. **La ficha completa del R-17 en pantalla** (C-P04), la rúbrica de cada estadio en pantalla (C-P05), el nombre del docente en el R-17 (D-12 de la spec 001), la muestra para el archivo ABET (C-B04), la observación del evaluador por estudiante y el aviso de una columna ABET mal nombrada (C-C04).
5. **La marca «Declaración pendiente»** en P2 y P5 (C-14, parte b), y quién declaró (C-12).
6. **La detección de nombres de estudiantes** escritos en el texto, que la spec cubre con un aviso y no por construcción (J-36).
7. **La edición de la descripción del instrumento desde una pantalla** (D-34), que llega al R-17 desde la base y no pasa por el Front.

La spec 006 del Back (`specs/006-programacion-docente/`, propuesta del 2026-11-21) carga la programación docente post-matrícula del ciclo con un guion que corre desde el Windows de Jefferson, sin ruta ni pantalla nuevas. El Front no cambia con ella. Su efecto se ve en P2, donde cada profesor real encuentra su sección antes de la capacitación de la semana 14.

## 11. Spec 007, lo importante para cada cuenta y en cada momento

> **Aprobada por Jefferson el 2026-11-22 («Sí, apruébala»).** Esta sección traslada la spec 007 del Back (`specs/007-experiencia-por-cuenta/`, EP-07, US-59 a US-66). Estado al 2026-11-22. La etapa A (US-59 a US-63, tareas T040 a T044) está construida en `src/` con sus pruebas, y sus textos quedan aquí como definitivos, con la marca «(propuesta)» hasta la revisión de la spec. La etapa B (US-64 a US-66) sigue sin código. Con la etapa A, la sección 4 cambia «No hay una carga publicada para esta sección» por «Esta carga no tiene R-17.», y la sección 3 suma el menú con `aria-current`. En la etapa B, la sección 3 cambia además «con sesión muestra P2» por la página de llegada de cada rol (J-46).

La spec responde al pedido de Jefferson del 2026-11-22 de mostrar lo importante para cada cuenta y en cada momento del registro, con la capacitación en la semana 14 y el registro en la semana 15 o, a más tardar, en la 16. La etapa A cambia solo el código del Front, sin rutas ni contrato nuevos, y se construye justo después de la spec 006 y antes del núcleo de la spec 005. Su mínimo antes del registro del 30-11-2026 son US-60, US-59 y US-61, y US-62 y US-63 entran como extras. La etapa B agrega la ruta 17 `GET /api/avance` (contrato, sección 14) y la pantalla P7 «Avance del registro», solo para la coordinación, en la semana 16, si cabe. Ninguna de las dos toca las secciones «Cómo va su sección» ni «Análisis por indicador» que la sección 10 agrega a P4, y la etapa A no agrega reglas `BR-` (FR-014 de la spec 007).

### 11.1 Qué cambia en `src/`

- `servicios/secciones_del_profesor.ts` es nuevo. Su función `seccionesDelProfesor()` pide la ruta 4 y, solo si trae alguna sección, una sola vez la ruta 8 sin `seccion_id` (J-45). Devuelve las secciones y, por `seccion_id`, la primera carga RECHAZADA de la sección en el orden de la ruta 8, que es la más reciente. Una falla de la ruta 8 deja el mapa vacío y no llega a la pantalla.
- `servicios/ayudas.ts` es nuevo y guarda los textos que el Front arma sin pedir nada a la API. `nombreDeColumna(pi)` da «ABET SO5.1» con el valor provisional de D-43 de la spec 005, `lineasAntesDeSubir(pi)` arma las líneas de P3 (J-44) y `QUE_CORREGIR` es la tabla por motivo RECHAZA_CARGA de J-43, que `queCorregir(constancia, rol)` consulta. Si la carrera cierra D-43 con otro nombre, cambia solo `nombreDeColumna`.
- `servicios/rotulos.ts` es nuevo y reúne los rótulos que cambian con el rol, que son el botón y el título de P2, el enlace a P6, la lista vacía de P2, P5 y P6 y la espera de P6. `rotuloDeLogros()` sale de `App.tsx` y vive ahí.
- `App.tsx` pone los tres botones del menú en un nav con aria-label «Menú principal» (propuesta) y marca con `aria-current="page"` el de la pantalla a la vista, y pasa a P4 el rol de la sesión en la prop `rol`.
- `pantallas/MisSecciones.tsx`, `SubirExport.tsx`, `ResultadoCarga.tsx`, `Cargas.tsx` y `MisLogros.tsx` cambian como dicen las secciones 11.2 a 11.5.
- En la etapa B, `api.ts` y `tipos.ts` suman la ruta 17, `pantallas/Avance.tsx` es P7 y `App.tsx` suma la vista «avance», con el fragmento `#/avance` (propuesta), el botón «Avance del registro» del coordinador y `pantallaDeLlegada(usuario)`, que lleva al coordinador a P7 y al profesor a P2 (J-46). US-52 de la spec 005 la reutiliza para el fragmento vacío o desconocido, y la tabla de la sección 10.3 recibe `#/avance` cuando entre US-52.

### 11.2 P2 Mis secciones del profesor (US-59)

Cada fila conserva su texto de hoy, porque lo citan los `.feature` de la spec 001, y suma debajo del estado, en un párrafo propio, la línea de lo que falta. La línea sale de la ruta 4 y de la carga rechazada que encuentra la ruta 8, con esta precedencia.

| Sección | Línea de lo que falta (propuesta) |
| --- | --- |
| Sin plan de medición, tenga o no cargas rechazadas | «Por ahora no hay nada que hacer. La Coordinación de la carrera registra el plan de medición.» |
| PUBLICADA, aunque la ruta 8 traiga una RECHAZADA más reciente | «Revise el resultado de la carga para completar lo que falte y descargar el R-17.» |
| SIN_CARGA con una carga RECHAZADA suya en la ruta 8 | «La última carga se rechazó y no se publicó. Falta subir un export corregido.» |
| SIN_CARGA sin cargas RECHAZADA, también con una EN_CURSO | «Falta subir el export de Blackboard de esta sección.» |

El botón «Subir export» anuncia la línea con `aria-describedby`, y desactivado, en la sección sin plan, anuncia en su lugar «La carrera aún no registra el plan de medición de esta sección». Solo la sección con plan, en SIN_CARGA y con una carga RECHAZADA ofrece además «Ver por qué se rechazó» (propuesta), que abre P4 de la primera RECHAZADA de esa sección en el orden de la ruta 8, y conserva «Subir export» activo. Si la ruta 8 falla, P2 muestra las mismas secciones y botones que con la ruta 8 vacía, sin mensaje de error (SC-003 de la spec 007). La lista vacía conserva «No tiene secciones asignadas en este periodo.» y suma debajo «Si dicta una sección con medición ABET en este periodo, escriba a la Coordinación de la carrera.» (propuesta, D-46), sin pedir la ruta 8. El coordinador no recibe ninguna de estas líneas y P2 nunca le pide la ruta 8.

### 11.3 P3 Subir export (US-60 y US-62)

Antes del campo de archivo, P3 muestra el apartado «Antes de subir» (propuesta), un `section` con su título h2 y cuatro líneas en este orden, también en el modo reemplazo.

1. «En Blackboard, una columna por PI, con el nombre ABET SO5.1, ABET SO5.2 y ABET SO5.3.», con los PI de `Seccion.pi` unidos con comas y «y», como «ABET SO5.1» con un PI o «ABET SO6.1 y ABET SO6.10» con dos. El PI 6.10 conserva su número completo, porque el lector lee «6.10 [» como el PI 6.10.
2. «En cada columna, un nivel entero de 1 a 4 por estudiante. El puntaje máximo de la columna es 4, y otro puntaje máximo solo deja un aviso.»
3. «Conserve la columna Username y no cambie el nombre de las columnas.»
4. «Suba el export completo del Centro de calificaciones sin cambiarle el nombre, porque la hoja o el nombre que le pone Blackboard indican la sección.»

Las cuatro son propuestas que siguen el valor provisional de D-43, D-06 y D-04. El apartado sale solo de la prop `seccion`, no cambia al elegir un archivo y no hace ninguna petición antes de «Subir». Si `Seccion.pi` llega vacío, P3 omite la primera línea y conserva las otras tres. En el modo reemplazo, P3 conserva «Reemplaza a la carga 7, la publicada de esta sección.» y suma en un párrafo propio «Si la carga nueva queda rechazada, la carga 7 sigue publicada.» (propuesta), con el número de la carga que reemplaza.

### 11.4 P4 Resultado de la carga (US-61 y US-62)

En una carga RECHAZADA, P4 conserva el mensaje de la API sin reescribirlo y suma debajo, en un párrafo propio, «Qué corregir.» seguido del consejo de su primer rechazo RECHAZA_CARGA. La tabla de J-43 da estos consejos (propuestas), con los datos de la constancia.

| Motivo | Consejo |
| --- | --- |
| PI_DEL_PLAN_AUSENTE | «Revise en Blackboard que cada PI del plan de esta sección tenga su columna, y cree o renombre la del PI 5.2 como ABET SO5.2. Después exporte otra vez y suba el archivo nuevo.» |
| PI_REPETIDO | «Deje en Blackboard una sola columna del PI 5.1, exporte otra vez y suba el archivo nuevo.» |
| COLUMNA_CODIGO_AUSENTE | «Exporte otra vez el Centro de calificaciones completo, que trae la columna Username, y suba ese archivo.» |
| ARCHIVO_SIN_FILAS | «Exporte otra vez el Centro de calificaciones de la sección con sus estudiantes y suba ese archivo.» |
| SIN_CALIFICACIONES | «Registre en Blackboard el nivel de cada estudiante en las columnas de los PI del plan, exporte otra vez y suba el archivo nuevo.» |
| SECCION_NO_COINCIDE, profesor | «Exporte el Centro de calificaciones de 450002, sección 410, o suba este archivo en la sección que le corresponde.» |
| SECCION_NO_COINCIDE, coordinador | «El archivo no es de 450002, sección 410. Pida al profesor de esa sección que exporte su Centro de calificaciones y lo suba otra vez.» |
| PERIODO_NO_COINCIDE | «Exporte el Centro de calificaciones del curso de 2026-2 y suba ese archivo.» |

El PI sale del campo `pi` del rechazo, y la asignatura, la sección y el periodo salen de `seccion` de la constancia, así que el consejo de SECCION_NO_COINCIDE nombra la sección elegida sin remitir a ninguna pantalla. El coordinador lee el mismo consejo que el profesor salvo en SECCION_NO_COINCIDE, porque `permisos.puede_subir()` no le deja una carga nueva. Una carga RECHAZADA sin ningún RECHAZA_CARGA, con filas leídas y ninguna aceptada, recibe «Qué corregir. Corrija el archivo en cada fila de la tabla de rechazos y suba el archivo nuevo. Si recibió el export de la Oficina de Calidad, pídale uno corregido.» (propuesta, cambio del 2026-11-23 de la spec 008, que retira «Corrija en Blackboard»). Un motivo que la tabla no conoce, o un PI_DEL_PLAN_AUSENTE o PI_REPETIDO con `pi` nulo, no muestra consejo, y una carga EN_CURSO o REEMPLAZADA nunca lo muestra. Desde la spec 008 una carga PUBLICADA con rechazos de fila recibe su consejo (sección 12.3). La línea de conteos, como «0 filas leídas, 0 aceptadas y 0 rechazadas», y la constancia completa no cambian.

El párrafo final de una carga que no está PUBLICADA ni REEMPLAZADA con sucesora conocida pasa de «No hay una carga publicada para esta sección», falso tras un reemplazo rechazado, a «Esta carga no tiene R-17.» (propuesta), sin «Descargar R-17». La carga REEMPLAZADA con `reemplazada_por` conserva «La carga 11 la reemplaza, así que esta carga no tiene R-17.». P4 no pide la ruta 4, así que no nombra la carga que sigue publicada.

### 11.5 Rótulos por cuenta (US-63)

| Lugar | PROFESOR | COORDINADOR |
| --- | --- | --- |
| Botón de P2 y título de P2 | «Mis secciones» (sin cambios) | «Secciones de la carrera» (propuesta) |
| Enlace a P6 | «Ver mis logros por SO» (sin cambios) | «Ver los logros por SO de la carrera» (sin cambios) |
| Lista vacía de P2, P5 y P6 (y de P7 en la etapa B) | «No tiene secciones asignadas en este periodo.» (sin cambios) | «La carrera no tiene secciones en este periodo.» (propuesta) |
| Espera de P6 | «Cargando sus logros…» (sin cambios) | «Cargando los logros de la carrera…» (propuesta) |
| Página de llegada (etapa B) | P2 «Mis secciones» | P7 «Avance del registro» |

El nav «Menú principal» contiene, en este orden, el botón de P2, «Cargas» y el enlace a P6, y deja fuera el correo y «Salir». Solo el botón de la pantalla a la vista lleva `aria-current="page"`, y los demás no llevan el atributo. P3 y P4 no marcan ningún botón, porque ninguno nombra la pantalla a la vista. El botón marcado se distingue también por su borde oscuro, su fondo `slate-200`, distinto del `slate-100` del puntero encima, y su letra seminegrita. Los botones «Volver a mis secciones» de P3 y P4 y «Volver» de P6 no cambian su texto ni su destino P2, también para el coordinador, porque los buscan las pruebas de Vitest. Ese texto y el regreso del coordinador a P7 quedan como deuda en «Fuera de alcance» de la spec.

### 11.6 P7 Avance del registro (US-65 y US-66, etapa B)

P7 es solo del coordinador y lee la ruta 17. Dice con `role="status"` un resumen como «1 de 5 secciones con carga publicada.», la línea «1 sección sin plan de medición, en la que su profesor no puede subir el export.» cuando la hay, y una fila por sección bajo su asignatura, en el orden de la API (J-28 de la spec 004), con la etapa en texto además de cualquier color, como «411 · La última carga se rechazó» o «413 · Sin profesor asignado». La etapa la decide el Back (J-48), y P7 no la deriva. Con el valor provisional de J-48, una sección publicada cuyo profesor se da de baja sigue en «Publicada» y cuenta en el resumen. La casilla «Mostrar solo las secciones que faltan» deja las secciones que no están en PUBLICADA sin cambiar el resumen. Una sección con `carga_id` ofrece «Ver la carga», que abre P4, el único lugar del R-17 (J-32 de la spec 005).

Con D-47 a favor, cada fila CON_RECHAZO o SIN_CARGA muestra el correo de sus profesores activos, y «Copiar los correos de los profesores que faltan» copia la lista única, en orden alfabético y separada por «; », con «Se copiaron N correos.». Si el navegador rechaza el portapapeles, P7 muestra la lista en un cuadro de texto de solo lectura y seleccionado. Esta regla es propia de P7 y no cambia la de P6 (sección 9.2), que no muestra correos de profesores. P7 no envía correos y no escribe en el almacenamiento del navegador.

### 11.7 Pruebas

Cada escenario `@delegado_a_vitest` de la etapa A, en los cuatro `.feature` de `specs/007-experiencia-por-cuenta/aceptacion/` del Back, tiene su prueba de Vitest con el mismo texto literal. `tests/pantallas/MisSecciones.test.tsx` cubre los cuatro Ejemplos de la línea de lo que falta y los casos borde de la carga EN_CURSO, la sección sin plan con rechazos, la publicada con un rechazo posterior y el rechazo de otra sección. Cubre también el `aria-describedby`, «Ver por qué se rechazó» con las cargas 9 y 8, la ruta 8 en 500, la lista vacía y la coordinación sin ruta 8. `tests/pantallas/SubirExport.test.tsx` cubre las cuatro líneas en orden antes del campo, con y sin reemplazo, la primera línea con 5.1 y con 6.1 y 6.10, el archivo elegido sin peticiones y el párrafo del reemplazo. `tests/pantallas/ResultadoCarga.test.tsx` recorre los ocho Ejemplos de «Qué corregir», la carga sin filas aceptadas, el motivo desconocido, el PI nulo, la carga publicada y los tres estados sin R-17 de la carga 12. Su primera prueba extrae de la sección 6 de `docs/03-api/contrato.md` los siete motivos RECHAZA_CARGA y exige un consejo de `QUE_CORREGIR` para cada uno, así que un motivo nuevo del contrato rompe la prueba hasta tener su texto (FR-005). `tests/App.test.tsx` prueba la cabecera de cada rol, el menú con `aria-current` en P2, P3, P4, P5 y P6, el reemplazo rechazado de la carga 7 y el apartado de P3 desde P2. `tests/pantallas/Cargas.test.tsx` y `tests/pantallas/MisLogros.test.tsx` prueban la lista vacía y la espera de cada rol, y `tests/servicios/ayudas.test.ts` prueba la unión con «y», la sección sin PI y la carga que no recibe consejo.

Las pruebas que ya existían y cambian son las que nombran FR-006 y SC-002 de la spec 007, más las que suman una comprobación de la etapa A sin cambiar lo que ya probaban. La prueba «P4 de una carga que no está publicada no ofrece el enlace a P6» de `App.test.tsx` cambia además sus datos y su camino, porque su dato anterior, una sección PUBLICADA con la carga 8 RECHAZADA como su `carga_id`, no puede ocurrir. Ese cambio va más allá de lo que fija SC-002 y queda como desviación consciente para la auditoría de T060.

| Archivo | Prueba | Cambio |
| --- | --- | --- |
| `ResultadoCarga.test.tsx` | «una carga RECHAZADA por estructura muestra el motivo y no ofrece el R-17» | Espera «Esta carga no tiene R-17.» en lugar de «No hay una carga publicada para esta sección» (FR-006) |
| `ResultadoCarga.test.tsx` | «una carga REEMPLAZADA nombra a su sucesora como la publicada y no ofrece el R-17» | Comprueba la ausencia de «Esta carga no tiene R-17.» (FR-006) |
| `ResultadoCarga.test.tsx` | «una carga REEMPLAZADA sin sucesora conocida conserva el texto de la carga no publicada» | Pasa a «una carga %s con filas aceptadas y sin sucesora dice que esta carga no tiene R-17», con EN_CURSO y REEMPLAZADA (FR-006) |
| `ResultadoCarga.test.tsx` | «sin constancia inicial la pide a la API por el identificador» y «si la API niega la carga muestra su detail y ningún dato» | Montan P4 con la prop `rol` |
| `ResultadoCarga.test.tsx` | «con el rechazo de la fila 3 muestra estado, conteos, tabla de rechazos y descarga del R-17» y «sin filas aceptadas muestra el mensaje de la API junto con la tabla de rechazos» | Suman la ausencia y la presencia de «Qué corregir» |
| `App.test.tsx` | «P4 de una carga que no está publicada no ofrece el enlace a P6» | Llega a P4 por «Ver por qué se rechazó» y espera «Esta carga no tiene R-17.» (FR-006) |
| `App.test.tsx` | «el coordinador abre P6 con «Ver los logros por SO de la carrera»» | Espera el título «Secciones de la carrera» y el menú con `aria-current` (SC-002) |
| `App.test.tsx` | ««Subir export» de P2 abre P3 sin modo reemplazo» | Suma la primera línea de «Antes de subir» |
| `MisSecciones.test.tsx` | «el coordinador no ve Subir export y sí el resultado y la descarga del R-17 publicada» y «sin secciones muestra un texto y no una lista vacía» | Suman las líneas de US-59 y la ausencia de la ruta 8 |
| `SubirExport.test.tsx` | «en modo reemplazo dice qué carga reemplaza y envía reemplaza desde la primera subida» y «fuera del modo reemplazo no nombra ninguna carga a reemplazar ni manda reemplaza» | Suman el párrafo «Si la carga nueva queda rechazada, la carga 7 sigue publicada.» y su ausencia |

En la etapa B cambian además las pruebas de `App.test.tsx` que esperan el título «Mis secciones» después del ingreso del coordinador (J-46). La prueba de humo con Playwright suma en la etapa A la línea de P2 y el apartado de P3 del profesor (T052), y en la etapa B la llegada del coordinador a P7, con `ingresar()` de `e2e/comun.ts` que espera la página de llegada de cada rol.

### 11.8 Lo que todavía NO está

1. **El código de la etapa B** (US-64 a US-66), en la semana 16, si cabe (FR-016 de la spec 007), y la prueba de humo de la etapa A (T052).
2. **Las decisiones** D-46 (a quién remite P2 al profesor sin secciones), D-47 (los correos en P7) y D-43 de la spec 005 (el nombre de la actividad de Blackboard), que hoy siguen su valor provisional.
3. **Lo que la spec deja para después**, que es el bloque de reglas pendientes en P7 (C-C04), la carga publicada sin declarar (C-C06), el texto y el botón de reemplazo en P4 de una carga publicada (C-P04), el pliegue de la constancia y las explicaciones de cada estado (C-T05), el reintento y el mensaje sin conexión (C-T03), P6 sin cargas (C-P06), el filtro de P6 de la carrera (C-C05) y la tabla desplazable, la prueba a 375 px y axe-core (C-T06), que mantiene abierto el punto 3 de la sección 7.

## 12. Spec 008, ciclo de Química General en Industrial

> **Definitiva desde el 2026-11-23 (T011 de la spec 008, aprobada por Jefferson en el chat el mismo día, «Sí, apruébala»).** Esta sección traslada al Front la spec 008 del Back (`specs/008-ciclo-quimica-industrial/`, EP-08, US-71, US-73, US-77, US-79, US-81 y US-82) y lee las rutas de la sección 15 de `docs/03-api/contrato.md`. Las secciones 12.1 y 12.2 describen lo construido con T042 y T043 (commit b2369c4), la sección 12.4 lo construido con T040, T041 y T045 y lo que falta de T048, la sección 12.3 lo construido con T044 y la sección 12.6 lo construido con T046. Los textos marcados (propuesta) en la spec siguen como propuestas. Estado al 2026-11-23.

### 12.1 El periodo en el estado de `App.tsx` (US-73)

`App.tsx` pide la ruta 18 `GET /api/periodos` una vez por sesión, después del arranque o del ingreso y antes de P2, y guarda en su estado el correo de la sesión, los periodos y el elegido, sin `localStorage` ni `sessionStorage`. Abre en `vigente` si está en `periodos` y, si no, en el primero de la lista, que es el más reciente. Mientras la ruta 18 responde, la pantalla dice «Cargando». La cabecera muestra «Periodo 2026-1» con un solo periodo, el selector «Periodo» con dos o más y nada con la lista vacía. Cambiar el periodo monta de nuevo P2, P5, P6 y P7, que piden sus rutas con el periodo elegido, y el periodo se conserva al pasar por P3 y P4. `api.ts` pasa el periodo a las rutas 4, 8 y 12 (`listarSecciones()`, `listarCargas()` sin `seccion_id` y `obtenerResultados()`), `secciones_del_profesor.ts` lo pasa a la ruta 4 y a la ruta 8 de la marca de la última carga rechazada, y P7 lo pasa a la ruta 17 (`obtenerAvance()`, T046). Si la ruta 18 falla o responde sin la forma del contrato, el Front sigue como antes, sin periodo y sin mostrar un error. Salir o un 401 borran el estado del periodo.

En P2, el profesor sin secciones en el periodo elegido lee «No tiene secciones asignadas en este periodo.» y, cuando la cabecera ofrece el selector, debajo «Elija otro periodo en la cabecera si dictó una sección con medición ABET en otro ciclo.» (propuesta), antes del texto de la sección 11.2.

### 12.2 Rótulos por alcance (US-71 y US-79)

`servicios/rotulos.ts` elige los rótulos por `alcance.tipo` de la ruta 2, que `tipos.ts` describe con los tipos `TipoAlcance` y `Alcance` y el campo opcional `alcance` de `Usuario`, sin cambiar el tipo `Rol`. Una cuenta COORDINADOR con el tipo CURSO recibe los rótulos del curso, y una con el tipo CARRERA o sin el campo, porque la sesión viene de un Back anterior, conserva los de la carrera de la sección 11.5. El PROFESOR conserva los suyos.

| Lugar | Alcance CURSO (propuesta) |
| --- | --- |
| Botón de P2 y título de P2 | «Secciones del curso» |
| Enlace a P6 | «Ver los logros por SO del curso» |
| Título de P6 | «Logros por SO del curso» |
| Espera de P6 | «Cargando los logros del curso…» |
| Lista vacía de P2, P5, P6 y P7 | «El curso no tiene secciones en este periodo.» |
| Botón de P7, título de P7 y página de llegada | «Avance del registro del curso» |

La coordinación del curso no ve «Subir export» en ninguna sección, porque `permisos.puede_subir()` no le deja una carga nueva, y P4 le da el mismo consejo de la coordinación de la carrera para SECCION_NO_COINCIDE, que remite al profesor de la sección.

### 12.3 «Qué corregir» en una carga con filas rechazadas (US-77)

Construido con T044. La tabla de J-43 de `src/servicios/ayudas.ts` tiene tres partes. `QUE_CORREGIR` conserva un consejo por motivo RECHAZA_CARGA (spec 007), `QUE_CORREGIR_FILA` suma uno por cada motivo RECHAZA_FILA de la sección 6 del contrato (NIVEL_FUERA_DE_ESCALA, NIVEL_NO_NUMERICO, CODIGO_VACIO, CODIGO_DUPLICADO y CODIGO_INVALIDO) y `QUE_CORREGIR_AVISO` suma el del aviso PUNTAJE_MAXIMO_DISTINTO, «La columna del PI 6.1 no declara un puntaje máximo de 4. Revise que cada celda sea el nivel de 1 a 4 y no la nota del instrumento.» (propuesta), que necesita el PI del aviso. Ningún consejo nuevo nombra Blackboard.

- **`queCorregir()`.** Una carga PUBLICADA recibe el consejo de cada motivo RECHAZA_FILA que trae, en el orden de su primera aparición, sin repetir y sin los motivos que la tabla no conoce. Sin ninguno conocido no hay «Qué corregir.». Una carga RECHAZADA sigue como en la spec 007, y una EN_CURSO o REEMPLAZADA no recibe consejo.
- **`consejosDeAvisos()`.** El consejo de cada aviso de una carga PUBLICADA o RECHAZADA va arriba de P4, antes del estado de la carga y de la constancia, en un `Mensaje` de tipo aviso con role="status". La lista «Avisos» conserva el `mensaje` de la API sin cambios. Un aviso con `pi` nulo o de otro motivo no trae consejo.
- **Texto neutro.** `CORREGIR_SIN_FILAS_ACEPTADAS` pasa a «Corrija el archivo en cada fila de la tabla de rechazos y suba el archivo nuevo. Si recibió el export de la Oficina de Calidad, pídale uno corregido.» (propuesta), con el cambio fechado de `que_corregir.feature` de la spec 007 (FR-012 y FR-019 de la spec 008).
- **Reemplazo (J-53).** Una carga PUBLICADA con un consejo de fila o de aviso muestra debajo «Para cambiar esta carga, use «Reemplazar carga» en Cargas.» (propuesta). P4 no gana un botón de reemplazo.

El escenario «Una carga publicada no muestra «Qué corregir»» de la spec 007, que usa una carga con 1 fila rechazada, contradice FR-012, y su prueba de Vitest pasa a una carga sin rechazos ni avisos (cambio del 2026-11-23).

### 12.4 Sistema visual (US-81 y US-82)

Construido con T040 y T041.

- **Tokens.** Los colores (papel, superficie, tinta, azul institucional, ocre del paso actual y los pares de cada estado), las fuentes del sistema (`--font-sans` y `--font-titulo`, J-59), la escala de títulos, el espaciado de la tarjeta y el radio son valores literales del bloque `@theme` de `src/index.css` (FR-017). La misma hoja apaga animaciones y transiciones con `prefers-reduced-motion`. El sistema no suma dependencias ni recursos de otro dominio y conserva los rótulos que citan los `.feature` de las specs 001 a 007.
- **Contraste.** `src/servicios/contraste.ts` calcula la razón de contraste de WCAG 2.2 (pautas de accesibilidad para el contenido web) y lee los tokens del bloque `@theme`. `src/componentes/estilos.ts` declara `paresDeTexto`, con al menos 4,5 a 1, y `paresDeComponente`, con al menos 3 a 1. La prueba de contraste también recorre las clases de `src` y falla si un texto y un fondo escritos juntos no están en `paresDeTexto` o si aparece un color de la paleta de Tailwind fuera de los tokens.
- **Componentes.** `Mensaje.tsx` marca cada estado con `data-componente`, y `Espera.tsx` muestra la espera con role="status" y un indicador que late solo con `motion-safe`. P2, P4, P5, P6 y App los usan.
- **Camino de P2.** Cada sección es una tarjeta con el nombre en serif y el grupo «Camino de la sección», con los pasos «1. Subir el export» y «2. Revisar el resultado y descargar el R-17» (propuesta) y las marcas escritas «Ahora», «Hecho», «Corregir» y «Pendiente». El paso actual lleva `aria-current="step"` y su texto para el lector de pantalla, y el botón principal es el del paso actual.
- **Tabla de rechazos.** `TablaRechazos.tsx` pone la tabla en una región con role="region", el nombre «Tabla de filas rechazadas» y tabindex 0, que se desplaza de lado dentro de sí misma.
- **Pruebas en Vitest.** `vite.config.ts` deja que Vitest lea con `?raw` el texto de `src/index.css` y del CSS de `dist/assets` (`test.css.include`) y apaga la caché de módulos de Vitest en disco (`fsModuleCache: false`), que guardaba el resultado de `import.meta.glob` y podía dejar la revisión de `dist/` sobre una construcción vieja.

Construido con T045.

- **Tokens en Ingreso y P3 a P6.** Ingreso, P3, P4, P5 y P6 usan solo los tokens de `@theme`, así que la prueba de contraste exige ahora que ninguna clase de `src` use un color de la paleta de Tailwind, y la lista `SIN_TOKEN_HASTA_T045` deja de existir. Cada pantalla pone sus bloques en la tarjeta blanca de P2 y sus títulos en serif. Ingreso lleva un filete institucional arriba del formulario y el botón «Ingresar» a todo el ancho, y P3 pone «Antes de subir» en una tarjeta con filete institucional y el archivo en un recuadro punteado con el anillo de foco. P4 muestra el estado de la carga en una tarjeta con un filete del color de su estado, que acompaña a la palabra escrita y nunca la reemplaza, y la constancia en otra tarjeta que a 375 px apila cada rótulo sobre su valor. P5 pone cada carga en una tarjeta, con el filete verde de la publicada, y P6 pone cada sección y cada fila en una tarjeta, con la franja provisional en los colores del aviso.
- **Barra del logro de P6 (US-78).** La barra vive dentro de un elemento con role="img" y un aria-label como «Logro 76,5 %, meta 80 %, debajo de la meta» (propuesta), y el dibujo de adentro conserva `aria-hidden`, como pide US-41 de la spec 004. Los colores de la barra siguen en `COLORES` de `MisLogros.tsx`, en hexadecimal, porque las pruebas de la spec 004 fijan sus valores.

- **Uso a 375 px y con teclado (T048).** Ingreso y P2 a P7 no se desplazan de lado a 375 ni a 1100 px, y cada control visible mide al menos 24 por 24 px (FR-029), también el «Elegir archivo» de P3 que el lector de pantalla no oye. La casilla «Mostrar solo las secciones que faltan» de P7 pasa de 16 a 24 px (`size-6`), porque medía 16 por 16. La tabla de rechazos de P4 se desplaza dentro de su región, que el teclado alcanza y mueve con las flechas, y la página no. En P3 el foco recorre «Salir», el menú, el selector «Periodo», el archivo, «Subir» y «Volver a mis secciones», cada uno con el anillo del token `foco`, y «Antes de subir» se lee entre el periodo y el archivo sin tomar el foco, porque no es un control. El menú principal se usa con Tab y Enter y marca la pantalla nueva con `aria-current="page"`.

### 12.5 Pruebas

`tests/spec008/periodo_elegido.test.tsx` cubre los escenarios `@delegado_a_vitest` de US-73 y `tests/spec008/alcance_coordinacion.test.tsx` los tres de US-71, con un `it` por escenario y su título exacto, que anotan los pasos de pytest-bdd del Back. Desde T046, el `it` del escenario «La coordinación del curso trabaja 2026-1 en P2, P5, P6 y P7» recorre P7, P2, P5 y P6 y exige la ruta 17 con periodo=2026-1, sin el `it.todo` que dejó T042. `tests/servicios/api.test.ts` cubre `listarPeriodos()` y el periodo de `listarCargas()`. `tests/spec008/carga_quimica.test.tsx` cubre los seis escenarios `@delegado_a_vitest` de US-77, con un `it` por ejemplo del esquema de los motivos de fila, y la prueba del motivo desconocido recorre los motivos RECHAZA_FILA de la sección 6 del contrato y exige un consejo para cada uno.

`tests/spec008/sistema_visual.test.tsx` cubre los escenarios `@delegado_a_vitest` de US-81, con la fila «P7 esperando» del esquema de estados desde T046, que abre P7 con la cuenta de la coordinación del curso porque la ruta 17 responde 403 al profesor, y una parte de Vitest del escenario `@playwright` de la tabla de rechazos de US-82, la región con su nombre y tabindex 0. Desde T045, la prueba de contraste exige que ninguna clase de `src` use un color de la paleta de Tailwind. La prueba de recursos de terceros revisa también `dist/`, así que exige una construcción previa. La CI corre `npm run build` antes de `npm test`, y en local se construye antes de correrla. Los escenarios `@playwright` de US-82 viven en `e2e/visual.spec.ts` desde T048, con la API simulada de `e2e/api_simulada.ts`, que responde cada `/api` con `page.route` y las respuestas de `tests/respuestas.ts` y anota la ruta que no simula para que la prueba falle. Corren con `npx playwright test e2e/visual.spec.ts`, sin API local ni contraseñas, porque `playwright.config.ts` levanta su propio Vite en el puerto 5199 (`PUERTO_VISUAL`) y lo apaga al terminar, salvo contra una vista previa de Vercel. Cada prueba mira primero a 375 px y después a 1100 px.

`tests/spec008/r17_industrial.test.tsx` cubre los dos escenarios `@delegado_a_vitest` de US-78, la fila de P6 de la 701 con «Debajo de la meta» y la de la 702 con «En la meta», y exige en las dos que la barra del logro tenga un aria-label con el porcentaje, «meta 80 %» y el resultado en palabras.

`tests/spec008/avance_del_curso.test.tsx` cubre los tres escenarios `@delegado_a_vitest` de US-79 y `tests/pantallas/Avance.test.tsx` los de US-65 de la spec 007 (su T045) y la fila de P7 del esquema «El menú marca la pantalla actual» de US-63, con un `it` por escenario o por fila de Ejemplos. «Atrás desde P4 abierta con «Ver la carga» vuelve a P7» queda como `it.todo`, porque espera a US-52 de la spec 005. El `it` de «Sin la etapa B, la coordinación del curso sigue el avance en P2» prueba P2 tal como ya la ve la coordinación del curso y pasa también sin el código de T046, como prueba de regresión.

`tests/spec008/guia_y_privacidad.test.ts` cubre los seis escenarios `@delegado_a_vitest` de US-87 (T049) sobre `docs/capacitacion/guia_quimica.md`, la guía de la capacitación por rol. `tests/spec008/cotejo_guia.ts` lee cada archivo de `src/` con `parseAst` de Vite, sin los comentarios, y acepta una cita entre comillas latinas de la guía solo si aparece en un literal, una plantilla o el contenido de un elemento JSX. Una variable vale cualquier texto si la parte fija pone al menos la mitad de las letras de la cita, y un mensaje de la API, que termina en punto o en signo de pregunta, puede venir también de un mensaje entre comillas latinas del contrato con otros números. Un botón o un título se buscan solo en `src/`. Los dos escenarios `@playwright` de US-87 corren en el humo de T053.

### 12.6 P7 Avance del registro (US-65 de la spec 007 y US-79)

Construido con T046, con la ruta 17 de la sección 15.5 del contrato todavía sin código en el Back (T038), así que las pruebas usan la API simulada.

- **Llegada.** `pantallaDeLlegada(usuario)` de `App.tsx` (J-46 de la spec 007) lleva al COORDINADOR, de la carrera o del curso, a P7 y al PROFESOR a P2, al abrir la aplicación con sesión y al ingresar, también después de un 401. El botón «Volver a mis secciones» de P3 y P4 y «Volver» de P6 siguen llevando a P2, la deuda que anota la spec 007 en «Fuera de alcance».
- **Menú.** El COORDINADOR ve primero el botón de P7, «Avance del registro» o «Avance del registro del curso» (`rotuloDeAvance()`, propuestas), con `aria-current="page"` cuando P7 está a la vista. El PROFESOR no lo ve.
- **Pantalla.** `pantallas/Avance.tsx` pide `GET /api/avance` con el periodo elegido. Muestra con role="status" el resumen «1 de 5 secciones con carga publicada.», con «sección» en singular para una sola, y, si el conteo trae secciones SIN_PLAN, «1 sección sin plan de medición, en la que su profesor no puede subir el export.» (propuestas). Las secciones van agrupadas por asignatura en el orden de la API, cada grupo en una región con el código y el nombre, y cada fila dice «701 · Publicada», «702 · La última carga se rechazó», «703 · Sin carga», «704 · Sin profesor asignado» o «Sin plan de medición» (propuestas), con una marca de color oculta al lector de pantalla. La cifra del resumen sale del `conteo` de la API, y P7 no calcula la etapa.
- **Filtro.** «Mostrar solo las secciones que faltan» (propuesta) deja las secciones cuya etapa no es PUBLICADA, en el mismo orden y sin cambiar el resumen, y vive solo en el estado de React. Si no falta ninguna, P7 dice «No falta ninguna sección.» (propuesta).
- **Carga.** Una fila con `carga_id` ofrece «Ver la carga» (propuesta), que abre P4 de esa carga, el único lugar del R-17.
- **Sin secciones y errores.** Sin secciones, P7 dice la lista vacía de su alcance («La carrera no tiene secciones en este periodo.» o «El curso no tiene secciones en este periodo.») sin resumen ni filtro. Un error de la ruta 17 se muestra con su `detail` y ninguna fila.
- **Lo que no muestra.** P7 no muestra porcentajes, niveles ni el campo `profesores`, cuyos correos esperan a D-47 en Ambiental y a D-51 en Industrial (US-66 de la spec 007). La navegación por fragmento `#/avance` espera a US-52 de la spec 005.

## Referencias

- [`03-api/contrato.md`](../03-api/contrato.md), las rutas que consume cada pantalla, con sus errores y sus mensajes literales. La sección 10 del contrato comprueba que esos mensajes coinciden con los de los escenarios.
- [`00-vision/adr/ADR-004-sesion-propia-mismo-origen.md`](../00-vision/adr/ADR-004-sesion-propia-mismo-origen.md), la sesión y el mismo origen.
- La spec del MVP en `specs/001-mvp-carga-r17/spec.md` del Back y sus escenarios en `specs/001-mvp-carga-r17/aceptacion/`.
