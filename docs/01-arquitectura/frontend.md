# Frontend

> **Estado 2026-10-29.** El corte 1 del MVP está construido en `src/` (tareas T040 a T045 del plan, fase 4) con las pantallas P1 a P4, y P5, el modo reemplazo y la confirmación de sección del corte 2 todavía no existen. Este documento describe lo construido. Si el código y el contrato discrepan, manda el contrato (`03-api/contrato.md`), y este documento se corrige en el mismo PR.

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
  servicios/formato.ts     hora de Lima y rótulo de la sección
  pantallas/
    Ingreso.tsx            P1 (con AvisoSesion.tsx para el aviso de sesión vencida)
    MisSecciones.tsx       P2
    SubirExport.tsx        P3
    ResultadoCarga.tsx     P4
    Cargas.tsx             P5 (corte 2, todavía no existe)
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

Ningún componente llama a `fetch` directamente. `api.ts` expone una función por ruta del contrato (`iniciarSesion`, `sesionActual`, `cerrarSesion`, `listarSecciones`, `subirExport`, `obtenerCarga` y `urlR17`) y convierte cada error en un `ErrorApi` con el código HTTP y el `detail` de la API. Un `detail` que no sea texto, como la lista que FastAPI responde por omisión, se reemplaza por «La petición no tiene la forma esperada.». `subirExport` distingue el 200 (el mismo archivo ya está publicado en la sección) del 201 con el campo `yaCargada`. Los tipos de esas respuestas viven en `servicios/tipos.ts`.

- La sesión viaja en la cookie `abet_sesion`, que el navegador manda solo porque el Front y la API comparten origen (ADR-004). `api.ts` nunca lee ni guarda un token, y nada de la sesión va a `localStorage`.
- Todas las rutas son relativas (`/api/...`). En Vercel, el `vercel.json` del Front las reescribe hacia el Back, y en local las reenvía `server.proxy` de Vite hacia la API en la Mac.
- La descarga del R-17 es un enlace normal a `/api/cargas/{carga_id}/r17.xlsx`, para que el navegador use el nombre de archivo que fija la API.
- Una respuesta que no es JSON se convierte en un mensaje fijo y nunca muestra el cuerpo crudo, con los tres casos de la sección 8 del contrato. El 413 de Vercel dice «El archivo supera el máximo de 1 MB.», un 401 o 403 con página HTML dice «El entorno de pruebas no está disponible.», y cualquier otra respuesta sin JSON, como un 502 o un 504, o una red caída, dice «El servicio no respondió. Intente de nuevo.».
- Las horas ISO 8601 de la API se muestran en hora de Lima con la forma `28/10/2026 10:15` (`servicios/formato.ts`).
- `scripts/preflight.sh` falla si un archivo de `src/` usa el almacenamiento del navegador, nombra una URL absoluta, llama a `fetch` fuera de `api.ts` o escribe una ruta literal que no empiece con `/api` (regla 7, probada en `scripts/probar_preflight.sh`).

## 3. `App.tsx` y el estado

`App.tsx` pide `GET /api/sesion` al arrancar. Sin sesión muestra P1, y con sesión muestra P2. El resto del estado vive en la pantalla que lo usa, sin un almacén global, porque el MVP tiene cinco pantallas y un solo flujo. Un 401 de cualquier ruta con sesión, distinta de `/api/sesion`, devuelve a P1 con el `detail` de la API, «La sesión venció. Ingrese otra vez.» (propuesta), que `api.ts` entrega a `App.tsx` por `alSesionVencida`. La cabecera de `App.tsx` muestra el correo del usuario y el botón «Salir» (propuesta), que llama a `DELETE /api/sesion` y vuelve a P1 aunque esa llamada falle.

## 4. Las pantallas

| Pantalla | Archivo | Historias | Rutas que consume ([contrato](../03-api/contrato.md)) | Corte |
|---|---|---|---|---|
| P1 Ingreso | `pantallas/Ingreso.tsx` | US-05 (y US-20 en el corte 2) | `POST /api/sesion` (sección 4) | 1 |
| P2 Mis secciones | `pantallas/MisSecciones.tsx` | US-06 | `GET /api/secciones` (sección 5) | 1 |
| P3 Subir export | `pantallas/SubirExport.tsx` | US-07, US-08, US-09, US-11, US-12, US-13 (y US-18 y US-21 en el corte 2) | `POST /api/secciones/{seccion_id}/cargas` (sección 6) | 1 |
| P4 Resultado de la carga | `pantallas/ResultadoCarga.tsx` | US-07, US-10, US-12, US-13, US-14, US-15, US-16 | `GET /api/cargas/{carga_id}` y `GET /api/cargas/{carga_id}/r17.xlsx` (sección 6) | 1 |
| P5 Cargas | `pantallas/Cargas.tsx` | US-18, US-19 | `GET /api/cargas` (sección 7) | 2 |

La sesión (`GET` y `DELETE /api/sesion`, sección 4 del contrato) la usan `App.tsx` y su botón «Salir». Las historias US-01 a US-04 (base, rol, periodo y usuarios) no tienen pantalla, porque en el MVP las ejecuta el administrador técnico con scripts. US-17 (despliegue) tampoco tiene pantalla propia, y su prueba de humo recorre P1, P2, P3 y P4 en el Front desplegado.

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

Muestra la sección elegida en P2, fija y sin selector, el campo de archivo que acepta .xlsx de hasta 1 MB, el botón «Subir» (propuesta) y el rótulo «Solo exports con códigos inventados (99000000 a 99999999)». El campo de archivo trae un botón propio «Elegir archivo» (propuesta) y el nombre del archivo elegido o «Ningún archivo elegido» (propuesta), porque el control nativo pinta su botón en el idioma del navegador. Mientras la API responde, el botón queda desactivado para que no salgan dos subidas. Según la respuesta, la pantalla hace una de cuatro cosas.

| Respuesta | Qué hace P3 |
|---|---|
| 201 (carga PUBLICADA o RECHAZADA) | Pasa a P4 con la constancia |
| 200 (el mismo archivo ya está publicado en esta sección) | Muestra «Este archivo ya se cargó el <fecha y hora de Lima> y está publicado en la sección 410. No se cargó de nuevo.» (propuesta) con el enlace a P4 de esa carga |
| 403, 409, 413 o 422 | Se queda en P3 con el `detail` de la API, por ejemplo «La sección no está a su cargo.», «El piloto solo admite códigos inventados, de 99000000 a 99999999. Revise la fila 4. No se guardó nada.» o «Este archivo ya está publicado en otra sección. No se cargó.» |
| 500 (la transacción se deshace) | Se queda en P3 con el `detail` de la API, «La carga no se completó y no se guardó ningún dato. Intente de nuevo.» |

En el corte 1, un archivo que no declara su sección ni en la hoja ni en el nombre recibe 422 y P3 muestra su `detail`, «El archivo no indica su sección. Sube el export de Blackboard sin cambiar el nombre de su hoja.». En el corte 2 (US-21), ante el 422 «El archivo no indica su sección. ¿Confirma que es de la sección 410 de 450002 en 2026-2?», P3 pide la confirmación y vuelve a enviar el archivo con `confirmar_seccion=true`.

En el corte 2 (US-18), ante el 409 de una sección con carga publicada, P3 pregunta «La sección 410 ya tiene una carga publicada. ¿Desea reemplazarla?» y, si la respuesta es sí, envía el archivo en modo reemplazo. Si el reemplazo falla porque el archivo no se abre, muestra «No se pudo abrir el archivo. La carga publicada no cambió.».

No muestra una vista previa del contenido del archivo, nombres de estudiantes, el código que rechaza la guardia, la ruta local del archivo ni un selector para cambiar a otra sección.

### P4 Resultado de la carga

Justifican la pantalla US-07 (la carga escrita), US-10 (filas inválidas y columnas dudosas), US-12 (rechazo por estructura), US-13 (rechazo por otra sección o periodo), US-14 (descartar nombres y valores leídos), US-15 (descargar el R-17) y US-16 (constancia de la carga).

Muestra el estado de la carga y sus conteos con la forma «11 filas leídas, 10 aceptadas y 1 rechazada», o «11 filas leídas, 11 aceptadas y 0 rechazadas» (propuesta) cuando no hay rechazos. Si hay rechazos, la tabla de rechazos dice la fila, el PI, el motivo en palabras y su efecto, como «Fila 3, PI 5.2, nivel fuera de la escala 1 a 4. La fila completa queda fuera, también de 5.1 y 5.3.». Los avisos van aparte, en su propio apartado «Avisos» y con su propio componente (`AvisosCarga.tsx`), cada uno con el texto exacto del campo `mensaje` de la API, como «PI 5.3. La columna declara 20 puntos y sus notas están entre 1 y 4. Se cargó igual.», sin repetir el PI. En la tabla de rechazos, un rechazo de toda la carga muestra «Archivo completo» en la columna de la fila, y un PI ausente muestra «No aplica». Si la carga queda RECHAZADA por estructura, por sección o por periodo, muestra el motivo, como «El archivo corresponde a la sección 411 y usted eligió la 410. No se publicó.». Cuando ninguna fila se acepta, la carga también queda RECHAZADA, y la pantalla muestra el `mensaje` de la respuesta, «Ninguna fila se pudo aceptar. La carga no se publicó.» (propuesta), junto con la tabla de rechazos. La constancia muestra el nombre del archivo sin ruta, la hoja, la huella SHA-256, el conjunto de reglas con la marca PROVISIONAL, el correo de quien sube el archivo y las horas de inicio y fin. La pantalla pide la constancia a `GET /api/cargas/{carga_id}` solo cuando llega desde P2, porque desde P3 ya trae la del 201. El botón «Descargar R-17» (propuesta) aparece activo solo si la carga está PUBLICADA, y si no lo está la pantalla dice «No hay una carga publicada para esta sección» (propuesta).

No muestra el valor leído de ninguna celda, nombres de estudiantes, Last Access, Availability, columnas de actividades ni los porcentajes del R-17, que viven solo en el archivo descargado.

### P5 Cargas (corte 2)

Justifican la pantalla US-18 (reemplazar la carga publicada de una sección) y US-19 (ver las cargas al alcance del usuario).

Muestra las cargas de las secciones al alcance del usuario, de la más reciente a la más antigua, con la sección, la fecha, el estado, los conteos de filas, el nombre del archivo, los primeros 12 caracteres de la huella, el correo de quien la sube, el enlace a su constancia en P4 y la descarga del R-17 de la publicada. «Reemplazar carga» (propuesta) abre P3 en modo reemplazo, para el profesor en su sección y para el coordinador en cualquiera, con la regla de plazo que fije D-11.

No muestra cargas fuera del alcance del usuario, ni opciones para borrar o editar una carga, porque la base no admite DELETE para la aplicación y una carga solo cambia por reemplazo.

## 5. Piezas compartidas

- `Mensaje.tsx` muestra el texto que devuelve la API sin reescribirlo, para que la pantalla y las pruebas de aceptación digan lo mismo.
- `TablaRechazos.tsx` recibe la lista de rechazos de la constancia y no tiene columna para un valor leído. Sus columnas son Fila, PI y «Motivo y efecto», que trae el `mensaje` de la API.
- `AvisosCarga.tsx` recibe la lista de avisos de la constancia y muestra el `mensaje` de cada uno. No dibuja nada si la lista está vacía.
- `Titulo.tsx` es el h1 de cada pantalla y recibe el foco al montarse, para que el lector de pantalla anuncie el cambio. Los errores usan `role="alert"`, los avisos y confirmaciones `role="status"`, y todo campo tiene su etiqueta.
- `RotuloPiloto.tsx` muestra «Solo exports con códigos inventados (99000000 a 99999999)» en todas las pantallas mientras la guardia de datos inventados esté encendida, y es el mismo rótulo que P3 muestra junto al campo de archivo.

## 6. Pruebas

Vitest con Testing Library (`npm test`) cubre cada pantalla en lo que debe mostrar y en lo que no debe mostrar, con las respuestas del contrato escritas solo en `tests/respuestas.ts` y nunca en `src/`. Hay una prueba por pantalla y estado. P4 se prueba con el rechazo de la fila 3 y el aviso de 5.3 del export con error, con la carga sin rechazos, con las rechazadas por estructura, por otra sección y sin filas aceptadas, y con una respuesta que trae un valor leído y un nombre de más, que la pantalla no muestra. `tests/App.test.tsx` recorre P1 a P4 y comprueba que el navegador no guarda nada. La CI corre `npm ci`, `npm test` y `npm run build` en el job `pruebas`. La prueba de humo (recorrido mínimo de punta a punta que confirma que el sistema desplegado responde) con Playwright para Node (ADR-006, `e2e/humo.spec.ts`) recorre P1, P2, P3 y P4 con el export que trae el 5 en la fila 3, y espera que P4 muestre «11 filas leídas, 10 aceptadas y 1 rechazada».

## 7. Lo que todavía NO está

1. **Despliegue.** No existe `vercel.json`, así que la reescritura de `/api/:path*` hacia el Back solo funciona en local con el proxy de Vite. La prueba de humo con Playwright para Node existe (`e2e/humo.spec.ts`), pero no corre en la CI y exige una API recién arrancada con `bash ../back/scripts/api_local.sh --sin-https`, Vite en el puerto 5173 y la variable `ABET_CLAVES_ARCHIVO`, porque la carga de la sección 410 se hace una sola vez. Su corrida contra Preview llega con el despliegue.
2. **Diseño visual.** No hay prototipo en Figma ni guía de estilo, y las pantallas parten de componentes simples de Tailwind.
3. **P5, el modo reemplazo de P3 y US-21.** Pertenecen al corte 2.
4. **Pruebas de accesibilidad automáticas.** Las pantallas llevan etiquetas, roles, foco y textos en español, y las pruebas lo comprueban, pero ninguna herramienta como axe revisa el contraste ni el orden del foco, y conviene sumarla antes del primer profesor externo.
5. **Los textos marcados «(propuesta)».** Los avisos de la carga quedan fuera de esa lista desde la confirmación del 2026-10-29. Ninguna decisión de la spec los fija todavía, aunque algunos ya figuran en un `.feature`, y se confirman con la revisión de las specs vivas `acceso`, `periodo`, `carga-export` y `r17`.
6. **Lectura de Username en el navegador antes de enviar.** La crítica de arquitectura la propone y ninguna historia del MVP la pide, así que no está.

## 8. Spec 002, proyectos de Capstone (propuesta)

> **Estado 2026-10-29.** La spec 002 (`specs/002-capstone/` del Back, rama `docs/002-capstone`) espera la aprobación de Jefferson, y su código espera el corte 1 de la spec 001. Todo lo de esta sección es propuesta hasta esa aprobación y no cambia lo de las secciones 1 a 7. Las historias se citan como «US-NN de la spec 002» para no confundirlas con las de la spec 001, y las decisiones D-14 a D-29 y J-11 a J-16 siguen la numeración de la spec 001. La decisión de arquitectura está en [`ADR-007`](../00-vision/adr/ADR-007-plantilla-proyectos-segunda-subida.md).

El objetivo del sprint es que el profesor de una sección Capstone de Ingeniería Ambiental suba, después de su export de Blackboard, la plantilla de proyectos de sus estudiantes (grupo, título, tipo de empresa, RUC, organización y línea de investigación), que la tabla maestra los muestre en el formato nuevo y que el R-17 salga con la hoja «Cursos Capstone». Una sección Capstone es la de un curso que `plan_estudios.tipo_curso` marca como CAPSTONE (J-12), y qué asignaturas lo son sigue abierto en D-14.

### 8.1 Qué cambia en `src/`

No hay pantalla nueva. P1 y P5 no cambian, y P2, P3 y P4 suman lo que sigue. La razón es que el profesor llega a la plantilla desde la misma sección, con la misma sesión y el mismo rótulo del piloto (ADR-007).

```
src/
  servicios/api.ts         + subirProyectos(seccionId, archivo)
  servicios/tipos.ts       + BloqueProyectos, y los campos nuevos de la sección
  pantallas/
    MisSecciones.tsx       P2, + estado de proyectos
    SubirExport.tsx        P3, + <ZonaProyectos />
    ResultadoCarga.tsx     P4, + bloque «Plantilla de proyectos»
  componentes/
    ZonaProyectos.tsx      (nuevo) campo de archivo y botón de la plantilla
    TablaRechazos.tsx      + columna del encabezado de la plantilla
```

`subirProyectos` es la única llamada nueva y manda `POST /api/secciones/{seccion_id}/proyectos` con el campo multipart `archivo`. El bloque `proyectos` llega dentro de `obtenerCarga`, y la descarga del R-17 sigue siendo el enlace de `urlR17`, porque la API elige la hoja sola. Los contratos están en la sección 11 de [`03-api/contrato.md`](../03-api/contrato.md).

### 8.2 Cambios por pantalla

| Pantalla | Cambio | Historias de la spec 002 | Corte |
|---|---|---|---|
| P2 Mis secciones | Una línea de estado de proyectos en cada sección Capstone | US-06, US-23 | 1 |
| P3 Subir export | Zona «Plantilla de proyectos», solo en secciones Capstone | US-03, US-04, US-05, US-06, US-13, US-14, US-15, US-16 | 1 |
| P3 Subir export | Casilla de declaración «Los títulos y nombres de organización no nombran personas» (propuesta) | US-25 | 2 |
| P4 Resultado de la carga | Bloque «Plantilla de proyectos» con conteos, avisos y rechazos, y descarga del R-17 con la hoja «Cursos Capstone» | US-07 a US-12, US-17 a US-20 | 1 |

US-01 y US-02 (tipo de curso en el plan y permisos de la aplicación), US-21 y US-22 (tabla maestra en el formato nuevo y vistas que no cambian) y US-24 (consultas de control) no tienen pantalla. La tabla maestra de Capstone se consulta con psql y Power BI, y una vista previa en el Front queda fuera de alcance de la spec 002.

### 8.3 P2 Mis secciones, estado de proyectos

Justifica el cambio US-23 (ver el estado de proyectos de mis secciones). Una sección con `tipo_curso` CAPSTONE suma bajo su fila una línea que la pantalla arma con `proyectos_estado`, `estudiantes_con_proyecto` y `estudiantes_en_export`.

| `proyectos_estado` | Línea que muestra P2 (propuesta) | Acción |
|---|---|---|
| SIN_EXPORT | «Proyectos. Suba primero el export.» | «Subir export» (la de la spec 001) |
| PENDIENTE | «Proyectos. Plantilla pendiente.» | «Subir plantilla de proyectos», que abre P3 en la zona de la plantilla |
| PUBLICADA | «Proyectos. 9 de 11 con proyecto.» | Enlace al bloque de proyectos en P4 |
| NO_APLICA | Ninguna línea | Ninguna |

Para el coordinador la línea es solo informativa, porque en el corte 1 no sube archivos. Los conteos son números y nunca nombres ni códigos.

No muestra títulos, organizaciones ni RUC, la lista de estudiantes sin proyecto, ni el estado de proyectos de una sección que no es Capstone.

### 8.4 P3 Subir export, zona «Plantilla de proyectos»

Justifican la zona US-03 (subir la plantilla), US-04 (espera al export publicado), US-05 (solo secciones Capstone), US-06 (solo el profesor asignado), US-13 (estructura equivocada), US-14 (la columna ALUMNO no se guarda), US-15 (guardia de datos inventados) y US-16 (subir otra vez la misma plantilla), todas de la spec 002.

La zona aparece bajo el campo del export solo cuando `tipo_curso` es CAPSTONE y el usuario es el profesor de la sección. Muestra el campo de archivo que acepta .xlsx de hasta 1 MB, el botón «Subir plantilla» (propuesta) y dos rótulos, «La columna ALUMNO no se guarda» (propuesta) y «Solo plantillas con códigos y RUC inventados» (propuesta). Mientras la API responde, el botón queda desactivado. La zona cambia según `proyectos_estado`.

| Estado de la sección | Qué muestra la zona |
|---|---|
| SIN_EXPORT | El campo desactivado y el texto «Suba primero el export de Blackboard de la sección {numero}. La plantilla de proyectos se une a los estudiantes de ese export.» |
| PENDIENTE | El campo activo |
| PUBLICADA | «Esta sección ya tiene una plantilla de proyectos publicada.» (propuesta), con el enlace a P4 y sin campo de archivo, porque el reemplazo está fuera de alcance (D-27) |

Según la respuesta de la API, P3 hace una de cuatro cosas, como con el export.

| Respuesta | Qué hace la zona |
|---|---|
| 201 (subida PUBLICADA o RECHAZADA) | Pasa a P4 con el bloque de proyectos |
| 200 (la misma plantilla ya está publicada en esta sección) | Muestra «Esta plantilla ya se cargó el <fecha y hora de Lima>. No se cargó de nuevo.» (propuesta) con el enlace a P4 |
| 403, 409 o 422 | Se queda en P3 con el `detail`, por ejemplo «La sección no está a su cargo.», «Esta sección no es de un curso Capstone. No se cargó nada.», «La sección 420 ya tiene una plantilla de proyectos publicada. No se cargó el archivo.», «Este archivo ya está publicado en otra sección. No se cargó.», «El archivo ya está registrado como export de Blackboard. No se cargó nada.», «No se pudo abrir el archivo. No se cargó nada.» o «El piloto solo admite códigos inventados, de 99000000 a 99999999. Revise la fila 4. No se guardó nada.» |
| 500 (la transacción se deshace) | Se queda en P3 con «La carga no se completó y no se guardó ningún dato. Intente de nuevo.» |

Ante el 422 de la guardia por un RUC, la zona muestra el `detail` de la API, «El piloto solo admite RUC inventados. Revise la fila 11. No se guardó nada.» (propuesta de la spec 002). En el corte 2 (US-25), la zona exige marcar la casilla de declaración antes de enviar, manda `declaracion_sin_personas=true` y, ante el 422, muestra «Confirme que los títulos y nombres de organización no nombran personas.».

No muestra una vista previa de la plantilla, la columna ALUMNO ni ningún nombre, el código ni el RUC que rechaza la guardia, la ruta local del archivo, un botón para reemplazar la plantilla publicada ni un selector de otra sección.

### 8.5 P4 Resultado de la carga, bloque «Plantilla de proyectos»

Justifican el bloque US-07 a US-12 (rechazos por fila y avisos), US-17 (la transacción), US-18 (constancia de la plantilla), US-19 y US-20 (R-17 de Capstone), todas de la spec 002.

El bloque sale del campo `proyectos` de `obtenerCarga` y va bajo el resultado del export, con tres formas según su `estado`.

| `proyectos.estado` | Qué muestra el bloque |
|---|---|
| SIN_PLANTILLA | «Esta sección todavía no tiene plantilla de proyectos.» (propuesta) y, si el usuario es el profesor, el enlace a la zona de P3 |
| PUBLICADA | Los conteos con la forma «11 filas leídas, 10 aceptadas y 1 rechazada», «10 de 11 estudiantes con proyecto» (propuesta), los avisos, la tabla de rechazos y la constancia |
| RECHAZADA | El motivo de la estructura (por ejemplo, un encabezado ausente), «11 filas leídas, 0 aceptadas y 11 rechazadas» según el caso, y la tabla de rechazos |

La tabla de rechazos dice la fila, la columna del encabezado (CÓDIGO, GRUPO, TIPO DE EMPRESA, RUC y otras), el motivo en palabras y el efecto. Los textos que un escenario fija son «Fila 11, RUC, no corresponde a una organización.» y «Fila 11, el RUC debe tener 11 dígitos y empezar con 20.», y el aviso de estudiantes sin fila es «2 estudiantes del export no tienen fila en la plantilla.». La pantalla muestra el `mensaje` de cada rechazo sin reescribirlo. La constancia suma el nombre del archivo sin ruta, la hoja, la huella SHA-256, el correo de quien sube y las horas de inicio y fin, igual que la del export.

El botón «Descargar R-17» es el mismo de la spec 001. Para una sección Capstone, la API entrega la hoja «Cursos Capstone» con los seis datos de proyecto, y sin plantilla (o con estudiantes sin fila) la hoja trae una franja de aviso y las columnas vacías (US-20). Junto al botón, P4 dice «El R-17 saldrá con las columnas de proyecto vacías hasta subir la plantilla.» (propuesta) cuando el estado es SIN_PLANTILLA.

No muestra títulos, organizaciones, RUC, grupos ni líneas de investigación de ningún estudiante, nombres, ni el valor leído de una celda. Esos datos viven solo en el R-17 descargado y en la tabla maestra de la base.

### 8.6 Pruebas

Vitest con Testing Library suma, con respuestas del contrato dentro de las pruebas, que P2 muestre «9 de 11 con proyecto» (propuesta) con los conteos 9 y 11, que la zona de P3 no exista en una sección de carrera, que quede desactivada en SIN_EXPORT, que P4 no tenga ningún texto de un título, organización o RUC de la plantilla inventada, y que `TablaRechazos` no tenga columna de valor leído. El humo con Playwright (tarea T053 del Back, propuesta) suma al recorrido de la sección 6 el ingreso como `docente420@example.invalid`, la subida del export de la 420, la de la plantilla inventada y la lectura de «11 filas leídas, 11 aceptadas y 0 rechazadas» en el bloque de proyectos.

### 8.7 Lo que todavía NO está

1. **Código.** Ningún archivo de esta sección existe.
2. **Los textos marcados «(propuesta)».** Se confirman al aprobar la spec 002 y al escribir la spec viva `proyectos-capstone` del Back.
3. **La definición de Capstone (D-14).** Hasta cerrarla, la zona depende solo de lo que la API diga en `tipo_curso`.
4. **Diseño visual de la zona y del bloque.** Parten de componentes simples de Tailwind.
5. **Reemplazo de la plantilla, vista previa de la tabla maestra y R-18 (D-15).** Quedan fuera de alcance de la spec 002.
6. **El texto de J-16.** Cuando el reemplazo del export llegue a una sección con plantilla publicada, P3 debe mostrar el 409 que fije la spec, que hoy es «La sección tiene una plantilla de proyectos publicada. Su reemplazo todavía no está disponible.» (propuesta).

## Referencias

- [`03-api/contrato.md`](../03-api/contrato.md), las rutas que consume cada pantalla, con sus errores y sus mensajes literales. La sección 10 del contrato comprueba que esos mensajes coinciden con los de los escenarios.
- [`00-vision/adr/ADR-004-sesion-propia-mismo-origen.md`](../00-vision/adr/ADR-004-sesion-propia-mismo-origen.md), la sesión y el mismo origen.
- La spec del MVP en `specs/001-mvp-carga-r17/spec.md` del Back y sus escenarios en `specs/001-mvp-carga-r17/aceptacion/`.
- [`00-vision/adr/ADR-007-plantilla-proyectos-segunda-subida.md`](../00-vision/adr/ADR-007-plantilla-proyectos-segunda-subida.md), la decisión de la plantilla de proyectos de Capstone (spec 002).
- La spec de Capstone en `specs/002-capstone/spec.md` del Back y sus escenarios en `specs/002-capstone/aceptacion/`.
