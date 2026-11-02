# Entornos y despliegue

> **Estado 2026-11-02.** El proyecto de Neon del piloto ya existe, con sus dos ramas en la versión 1.09 de Flyway (T027), y los proyectos de Vercel todavía no. Este documento fija cómo se despliega el piloto en la fase 7 del plan (historia US-17). Los proyectos de Vercel, el proyecto de Neon y sus ramas los crea Jefferson, y ningún agente pega variables ni secretos en Vercel.

Vercel llama Preview (vista previa) al entorno que despliega `develop` y cada PR, y Production (producción) al que despliega `main`. Este documento usa esos dos nombres.

| | Local | Preview | Production (piloto) |
|---|---|---|---|
| Código | Cualquier rama, en la Mac | `develop` y cada PR | `main` |
| Front | `npm run dev` de Vite | Proyecto `abet-ulima-front`, entorno Preview | Proyecto `abet-ulima-front`, entorno Production |
| API | `uvicorn` en la Mac | Proyecto `abet-ulima-back`, entorno Preview | Proyecto `abet-ulima-back`, entorno Production |
| Base | PostgreSQL 18 local o desechable | Rama `develop` de Neon | Rama principal de Neon |
| Datos | Solo inventados | Solo inventados | Solo inventados, hasta la autorización de la universidad |

## 1. El entorno local

El Front corre con Vite y su `server.proxy` reenvía `/api` hacia la API en la Mac, así que las pantallas usan las mismas rutas relativas que en Vercel. La API corre con uvicorn contra una base PostgreSQL 18 local. Las pruebas de la base (`db/pruebas/correr_pruebas.sh`) crean bases desechables, aplican las migraciones con psql, cargan los datos sintéticos y nunca tocan Neon. La CI del Back hace lo mismo contra un PostgreSQL 18 desechable, sin acciones ni imágenes de Redgate. Las pruebas de aceptación de los `.feature` también corren siempre contra un PostgreSQL 18 desechable con las migraciones aplicadas.

## 2. Vercel, dos proyectos en iad1

El piloto usa dos proyectos de Vercel Hobby en el equipo `jeffangeloss-projects`, uno por repositorio, con estos nombres.

| Proyecto | Repositorio | Qué sirve |
|---|---|---|
| `abet-ulima-front` | ABET-ULIMA-Front | El sitio estático de Vite y la reescritura de `/api` |
| `abet-ulima-back` | ABET-ULIMA-Back | La función de Python con FastAPI |

Los dos fijan en su `vercel.json` la región `iad1`, que corre en la zona us-east-1 de Amazon Web Services (AWS), en Virginia, la misma del proyecto de Neon (decisión J-17 del Back). Así cada consulta de la API a la base queda dentro de esa zona. Vercel ya crea los proyectos nuevos en `iad1`, y el archivo la fija para que un cambio en la configuración del proyecto no la mueva. Production sale de `main` y Preview sale de `develop` y de cada PR.

### 2.1 La reescritura de rutas al mismo origen

El `vercel.json` del Front reescribe toda ruta `/api/:path*` hacia el Back del mismo entorno (una reescritura de rutas, rewrite en Vercel). Así el navegador habla con un solo origen, la cookie de sesión es de primera parte y no hace falta CORS (ADR-004). Vercel prueba las reglas en orden y aplica la primera que coincide (T072).

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "regions": ["iad1"],
  "rewrites": [
    {
      "source": "/api/:path*",
      "has": [{ "type": "host", "value": "abet-ulima-front.vercel.app" }],
      "destination": "https://abet-ulima-back-gray.vercel.app/api/:path*"
    },
    {
      "source": "/api/:path*",
      "destination": "https://abet-ulima-back-git-develop-jeffangeloss-projects.vercel.app/api/:path*"
    }
  ]
}
```

La primera regla atiende solo al dominio de Production del Front y lleva la petición al dominio de Production del Back. La segunda atiende cualquier otro dominio, como la vista previa de `develop` o la de un PR, y la lleva al alias de la rama `develop` del Back, que Vercel nombra `<proyecto>-git-<rama>-<equipo>.vercel.app`. De este modo, una vista previa del Front nunca escribe en la base del piloto, y `tests/vercel.test.ts` lo comprueba. Vercel da al Back el dominio `abet-ulima-back-gray.vercel.app`, porque `abet-ulima-back.vercel.app` ya es de otro proyecto. Una regla hacia ese dominio ajeno le mandaría la cookie de sesión y las contraseñas del ingreso, así que la prueba comprueba también que ninguna regla lo use. La URL propia de un despliegue de Production, con su sufijo aleatorio, cae en la segunda regla, y solo la ve Jefferson, porque la protección de Vercel la cubre.

El archivo no lleva la regla que devuelve `index.html` en cualquier otra ruta, porque las pantallas del Front cambian por estado y no por ruta, así que una recarga siempre pide `/`. Si un enrutador llega con el corte 2, la regla entra con él.

### 2.2 Entrenamiento de IA desactivado

En el plan Hobby, los términos de Vercel le permiten usar el contenido del cliente para entrenar sus modelos, salvo que se desactive en la configuración del equipo. Jefferson lo desactiva en `jeffangeloss-projects` antes del primer despliegue. Con datos reales, esa sola condición deja fuera al plan Hobby.

### 2.3 Uso no comercial

Hobby es para uso personal o no comercial. El piloto con datos inventados entra en ese uso según la lectura de Jefferson, y la decisión J-07 incluye la consulta a soporte de Vercel antes del primer profesor externo. Desplegar en Hobby antes de esa respuesta es un riesgo de términos de servicio que solo Jefferson acepta, y si no lo acepta el piloto espera la respuesta o pasa a Vercel Pro.

### 2.4 La protección de despliegues

Vercel protege por omisión las vistas previas con su propio ingreso (Vercel Authentication), y la reescritura no lleva ese ingreso de un proyecto al otro. Sin un cambio, la vista previa del Back respondería 401 con una página HTML, que el Front muestra como «El entorno de pruebas no está disponible.». Por eso Jefferson desactiva esa protección en `abet-ulima-back` y la deja activa en `abet-ulima-front`. La API de `develop` queda abierta en internet, solo con datos inventados y detrás del ingreso propio de la API (ADR-004). La prueba de humo de T075 entra a la vista previa del Front con la clave de omisión para automatización de Vercel (Protection Bypass for Automation), guardada como secreto y nunca en el repositorio (propuesta).

## 3. Variables del Back

Jefferson pega estas variables en la configuración del proyecto `abet-ulima-back`, con un valor para Production y otro para Preview. Nunca entran al repositorio, a un `.env` versionado ni a un registro, y ningún agente las escribe en Vercel. El `.env.example` del Back nombra cada una sin valor.

| Variable | Production | Preview | Qué hace |
|---|---|---|---|
| `DATABASE_URL` | Cadena con pooler (host con «-pooler») de la rama principal de Neon, usuario `abet_app` | Cadena con pooler de la rama `develop` de Neon, usuario `abet_app` | Conexión de la API, con psycopg 3 y `prepare_threshold=None` |
| `SESION_SECRETO` | Valor aleatorio propio | Otro valor aleatorio | Secreto de la aplicación del que se deriva la clave del código de autenticación de mensajes basado en hash (hash-based message authentication code, HMAC) del correo de cada intento fallido en `acceso.intento_fallido` (regla de negocio BR-ACCESO-05 del Back, propuesta) |
| `PERIODO_VIGENTE` | `2026-2` | `2026-2` | Periodo que lista P2 y que toma una carga nueva |
| `CONJUNTO_REGLAS` | `R-2026-BORRADOR` | `R-2026-BORRADOR` | Conjunto de reglas que toma una carga nueva |
| `GUARDIA_DATOS_INVENTADOS` | `1` | `1` | Rechaza todo export con un código fuera de 99000000 a 99999999 |

El valor aleatorio de `SESION_SECRETO` se genera en la Mac con `python3 -c "import secrets; print(secrets.token_urlsafe(48))" | pbcopy` y se pega directo en Vercel desde el portapapeles, sin mostrarlo ni guardarlo en un archivo.

El Front no necesita variables. Todo lo que se compila llega al navegador, y las rutas relativas `/api` hacen innecesaria `VITE_API_BASE_URL`.

## 4. Neon, una rama por entorno

| Rama de Neon | La usa | Cómo se llena |
|---|---|---|
| Principal | Production del Back | `flyway migrate` con `-environment=neon`, `crear_rol_app.sql`, `guardia_datos_inventados.sql` y `periodo_2026_2_inventado.sql` |
| `develop` | Preview del Back | Rama creada desde la principal, con las mismas migraciones y datos inventados |

El proyecto de Neon del piloto se llama ABET-ULIMA, vive en us-east-1 con PostgreSQL 18.6 y nace de la integración Neon × Vercel (J-17). Esa integración puede agregar a un proyecto de Vercel su propia `DATABASE_URL`, con el rol dueño de la base, así que Jefferson no conecta la base al proyecto `abet-ulima-back`. Si esa cadena llega a la API, `comprobar_base` de `app/configuracion.py` detiene el arranque, porque rechaza un rol de administración.

Flyway entra por la conexión directa, sin «-pooler», con las variables `NEON_HOST`, `NEON_DB`, `NEON_DB_USER` y `NEON_DB_PASSWORD` de la Mac de Jefferson, porque toma bloqueos consultivos (advisory locks) que el pooler (el agrupador de conexiones de Neon) en modo transacción no admite. La API entra siempre por el pooler. Preview nunca comparte `DATABASE_URL` con Production, para que un despliegue de Preview no escriba en la base del piloto, defecto que IQBF tiene documentado.

## 5. Cómo se despliega

1. Jefferson crea los dos proyectos de Vercel, enlaza cada uno a su repositorio, confirma `main` como rama de Production en Settings, Environments, Production, Branch Tracking, desactiva el entrenamiento de IA, desactiva la protección de despliegues del Back (sección 2.4) y pega las variables de la sección 3, sin conectar al Back la base de Neon de la integración (sección 4). Vercel fija `main` porque existe, pero construye el despliegue de Production de la importación desde `develop`, la rama predeterminada de GitHub. Ese despliegue no se vuelve a desplegar, y Production llega desde `main` con la versión 0.1.0 (T076).
2. El proyecto de Neon ABET-ULIMA ya tiene en sus dos ramas las migraciones de Flyway, los scripts de plataforma y los datos inventados (T027).
3. Un PR a `develop` despliega Preview en cada repositorio. Si la versión del Front depende de un cambio de la API, se publica antes la del Back (`docs/devops.md`).
4. La prueba de humo (recorrido mínimo de punta a punta que confirma que el sistema desplegado responde, US-17) corre contra Preview desde `develop`, sobre una base cuya sección 410 no tiene cargas. Ingresa con un usuario de prueba, sube el export con el 5 en la fila 3, ve «11 filas leídas, 10 aceptadas y 1 rechazada» y descarga el R-17 con 60,0 / 60,0 / 70,0. Es el valor provisional de J-09 («La prueba de humo corre en la CI o contra la vista previa»).
5. El PR de versión de `develop` a `main` despliega Production solo después de que la prueba de humo pasa en Preview. La prueba de humo no corre en Production, porque dejaría allí una carga publicada que nadie puede borrar. En Production, sobre la rama principal de Neon, se comprueban solo los criterios de `despliegue.feature` que no escriben cargas, que son la región, la reescritura, la cookie, el pooler y la guardia.

## 6. Camino a datos reales

El piloto en Vercel Hobby vale solo con datos inventados. Para datos reales, el orden es otro.

1. La universidad autoriza el tratamiento fuera del Perú (D-10) y decide la región de la base (J-17), y Neon y Databricks entregan su acuerdo de tratamiento de datos (data processing agreement, DPA) por escrito.
2. La API pasa primero a Cloud Run en `southamerica-east1`, que ofrece un compromiso contractual de ubicación de datos para el servicio y sus registros. Vercel no compromete residencia en su DPA, y fijar una región ubica la ejecución, no los registros.
3. Vercel Pro queda como segunda opción, condicionada a que Vercel confirme por escrito dónde guarda los registros de las funciones de la región que se fije.
4. Se retiran la guardia de la base y la variable `GUARDIA_DATOS_INVENTADOS` con un cambio revisado.

## 7. Lo que todavía NO está

1. **Los proyectos de Vercel.** No existen todavía (T070). El proyecto de Neon ya existe y el código del corte 1 está en `develop`.
2. **La decisión J-07.** Jefferson todavía no acepta desplegar en Hobby antes de la respuesta de soporte sobre el uso no comercial.
3. **La decisión J-09.** El valor provisional de esta página (prueba de humo contra Preview, nunca en Production) espera su confirmación.
4. **El alias de `develop` del Back.** Ya existe (`abet-ulima-back-git-develop-jeffangeloss-projects.vercel.app`) y apunta al despliegue de la importación, sin variables, hasta el primer despliegue de Preview de `develop`. Los dominios de Production de la sección 2.1 ya están confirmados (`abet-ulima-front.vercel.app` y `abet-ulima-back-gray.vercel.app`).
5. **La protección de despliegues.** La protección desactivada en el Back (sección 2.4) se prueba con el primer despliegue de Preview.
6. **La prueba de la cookie a través de la reescritura.** Pide 15 minutos con el primer despliegue.
7. **El respaldo diario de Neon.** `respaldo_neon.yml` del Back corre solo a pedido y pasa a diario cuando Jefferson cargue sus cinco secretos en GitHub.
8. **El correo saliente del corte 2** (US-20, decisión J-04), con dominio propio y Resend en el piloto o Amazon SES en `sa-east-1` para datos reales.
