# Entornos y despliegue

> **Estado 2026-10-28.** Nada está desplegado todavía. Este documento fija cómo se despliega el piloto en la fase 7 del plan (historia US-17). Los proyectos de Vercel, el proyecto de Neon y sus ramas los crea Jefferson, y ningún agente pega variables ni secretos en Vercel.

Vercel llama Preview (vista previa) al entorno que despliega `develop` y cada PR, y Production (producción) al que despliega `main`. Este documento usa esos dos nombres.

| | Local | Preview | Production (piloto) |
|---|---|---|---|
| Código | Cualquier rama, en la Mac | `develop` y cada PR | `main` |
| Front | `npm run dev` de Vite | Proyecto `abet-ulima-front`, entorno Preview | Proyecto `abet-ulima-front`, entorno Production |
| API | `uvicorn` en la Mac | Proyecto `abet-ulima-back`, entorno Preview | Proyecto `abet-ulima-back`, entorno Production |
| Base | PostgreSQL 16 local o desechable | Rama `develop` de Neon | Rama principal de Neon |
| Datos | Solo inventados | Solo inventados | Solo inventados, hasta la autorización de la universidad |

## 1. El entorno local

El Front corre con Vite y su `server.proxy` reenvía `/api` hacia la API en la Mac, así que las pantallas usan las mismas rutas relativas que en Vercel. La API corre con uvicorn contra una base PostgreSQL 16 local. Las pruebas de la base (`db/pruebas/correr_pruebas.sh`) crean bases desechables, aplican las migraciones con psql, cargan los datos sintéticos y nunca tocan Neon. La CI del Back hace lo mismo contra un PostgreSQL 16 desechable, sin acciones ni imágenes de Redgate. Las pruebas de aceptación de los `.feature` también corren siempre contra un PostgreSQL 16 desechable con las migraciones aplicadas.

## 2. Vercel, dos proyectos en São Paulo

El piloto usa dos proyectos de Vercel Hobby en el equipo `jeffangeloss-projects`, uno por repositorio, con estos nombres.

| Proyecto | Repositorio | Qué sirve |
|---|---|---|
| `abet-ulima-front` | ABET-ULIMA-Front | El sitio estático de Vite y la reescritura de `/api` |
| `abet-ulima-back` | ABET-ULIMA-Back | La función de Python con FastAPI |

Los dos fijan la región `gru1` (São Paulo, la misma región `aws-sa-east-1` de Neon) en su `vercel.json`, porque Vercel crea los proyectos nuevos en `iad1` (Washington). Production sale de `main` y Preview sale de `develop` y de cada PR.

### 2.1 La reescritura de rutas al mismo origen

El `vercel.json` del Front reescribe toda ruta `/api/:path*` hacia el dominio del Back (una reescritura de rutas, rewrite en Vercel). Así el navegador habla con un solo origen, la cookie de sesión es de primera parte y no hace falta CORS (ADR-004). La forma propuesta es la siguiente, con el dominio de Production del Back.

```json
{
  "regions": ["gru1"],
  "rewrites": [
    { "source": "/api/:path*", "destination": "https://abet-ulima-back.vercel.app/api/:path*" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

La segunda regla devuelve `index.html` en cualquier otra ruta, para que una recarga de la página no dé 404.

### 2.2 Entrenamiento de IA desactivado

En el plan Hobby, los términos de Vercel le permiten usar el contenido del cliente para entrenar sus modelos, salvo que se desactive en la configuración del equipo. Jefferson lo desactiva en `jeffangeloss-projects` antes del primer despliegue. Con datos reales, esa sola condición deja fuera al plan Hobby.

### 2.3 Uso no comercial

Hobby es para uso personal o no comercial. El piloto con datos inventados entra en ese uso según la lectura de Jefferson, y la decisión J-07 incluye la consulta a soporte de Vercel antes del primer profesor externo. Desplegar en Hobby antes de esa respuesta es un riesgo de términos de servicio que solo Jefferson acepta, y si no lo acepta el piloto espera la respuesta o pasa a Vercel Pro.

## 3. Variables del Back

Jefferson pega estas variables en la configuración del proyecto `abet-ulima-back`, con un valor para Production y otro para Preview. Nunca entran al repositorio, a un `.env` versionado ni a un registro, y ningún agente las escribe en Vercel. El `.env.example` del Back nombra cada una sin valor.

| Variable | Production | Preview | Qué hace |
|---|---|---|---|
| `DATABASE_URL` | Cadena con pooler (host con «-pooler») de la rama principal de Neon, usuario `abet_app` | Cadena con pooler de la rama `develop` de Neon, usuario `abet_app` | Conexión de la API, con psycopg 3 y `prepare_threshold=None` |
| `SESION_SECRETO` | Valor aleatorio propio | Otro valor aleatorio | Clave del código de autenticación de mensajes basado en hash (hash-based message authentication code, HMAC) con que la base guarda el hash de cada token de sesión (propuesta) |
| `PERIODO_VIGENTE` | `2026-2` | `2026-2` | Periodo que lista P2 y que toma una carga nueva |
| `CONJUNTO_REGLAS` | `R-2026-BORRADOR` | `R-2026-BORRADOR` | Conjunto de reglas que toma una carga nueva |
| `GUARDIA_DATOS_INVENTADOS` | `1` | `1` | Rechaza todo export con un código fuera de 99000000 a 99999999 |

El valor aleatorio de `SESION_SECRETO` se genera en la Mac con `python -c "import secrets; print(secrets.token_urlsafe(48))"` y se pega directo en Vercel, sin guardarlo en un archivo.

El Front no necesita variables. Todo lo que se compila llega al navegador, y las rutas relativas `/api` hacen innecesaria `VITE_API_BASE_URL`.

## 4. Neon, una rama por entorno

| Rama de Neon | La usa | Cómo se llena |
|---|---|---|
| Principal | Production del Back | `flyway migrate` con `-environment=neon`, `crear_rol_app.sql`, `guardia_datos_inventados.sql` y `periodo_2026_2_inventado.sql` |
| `develop` | Preview del Back | Rama creada desde la principal, con las mismas migraciones y datos inventados |

Flyway entra por la conexión directa, sin «-pooler», con las variables `NEON_HOST`, `NEON_DB`, `NEON_DB_USER` y `NEON_DB_PASSWORD` de la Mac de Jefferson, porque toma bloqueos consultivos (advisory locks) que el pooler (el agrupador de conexiones de Neon) en modo transacción no admite. La API entra siempre por el pooler. Preview nunca comparte `DATABASE_URL` con Production, para que un despliegue de Preview no escriba en la base del piloto, defecto que IQBF tiene documentado.

## 5. Cómo se despliega

1. Jefferson crea los dos proyectos de Vercel, enlaza cada uno a su repositorio, fija `main` como rama de Production (Vercel toma la rama predeterminada de GitHub, que aquí es `develop`), desactiva el entrenamiento de IA y pega las variables de la sección 3.
2. Jefferson crea el proyecto de Neon en `aws-sa-east-1`, aplica las migraciones con Flyway y corre los scripts de plataforma y de datos inventados.
3. Un PR a `develop` despliega Preview en cada repositorio. Si la versión del Front depende de un cambio de la API, se publica antes la del Back (`docs/devops.md`).
4. La prueba de humo (recorrido mínimo de punta a punta que confirma que el sistema desplegado responde, US-17) corre contra Preview desde `develop`, sobre una base cuya sección 410 no tiene cargas. Ingresa con un usuario de prueba, sube el export con el 5 en la fila 3, ve «11 filas leídas, 10 aceptadas y 1 rechazada» y descarga el R-17 con 60,0 / 60,0 / 70,0. Es el valor provisional de J-09 («La prueba de humo corre en la CI o contra la vista previa»).
5. El PR de versión de `develop` a `main` despliega Production solo después de que la prueba de humo pasa en Preview. La prueba de humo no corre en Production, porque dejaría allí una carga publicada que nadie puede borrar. En Production, sobre la rama principal de Neon, se comprueban solo los criterios de `despliegue.feature` que no escriben cargas, que son la región, la reescritura, la cookie, el pooler y la guardia.

## 6. Camino a datos reales

El piloto en Vercel Hobby vale solo con datos inventados. Para datos reales, el orden es otro.

1. La universidad autoriza el tratamiento fuera del Perú (D-10), y Neon y Databricks entregan su acuerdo de tratamiento de datos (data processing agreement, DPA) por escrito.
2. La API pasa primero a Cloud Run en `southamerica-east1`, que ofrece un compromiso contractual de ubicación de datos para el servicio y sus registros. Vercel no compromete residencia en su DPA, y fijar `gru1` ubica la ejecución, no los registros.
3. Vercel Pro queda como segunda opción, condicionada a que Vercel confirme por escrito dónde guarda los registros de las funciones de `gru1`.
4. Se retiran la guardia de la base y la variable `GUARDIA_DATOS_INVENTADOS` con un cambio revisado.

## 7. Lo que todavía NO está

1. **Los proyectos de Vercel y Neon.** No existen todavía, y el despliegue espera el código del corte 1.
2. **La decisión J-07.** Jefferson todavía no acepta desplegar en Hobby antes de la respuesta de soporte sobre el uso no comercial.
3. **La decisión J-09.** El valor provisional de esta página (prueba de humo contra Preview, nunca en Production) espera su confirmación.
4. **El destino de la reescritura en Preview.** Un `vercel.json` fijo apunta a un solo dominio del Back, así que el Front de Preview llamaría a la API de Production. Las dos salidas propuestas son apuntar en `develop` al alias de la rama `develop` del Back o un middleware de Vercel que elija el destino por `VERCEL_ENV`, y se decide con la primera prueba.
5. **La protección de despliegues.** La protección de Vercel en Preview puede interponerse entre la reescritura del Front y el Back de Preview, y se prueba el primer día del despliegue.
6. **La prueba de la cookie a través de la reescritura.** Pide 15 minutos con el primer despliegue.
7. **El respaldo de Neon.** `respaldo_neon.yml` viaja con `bd/` al Back y se revisa para que no corra en Preview.
8. **El correo saliente del corte 2** (US-20, decisión J-04), con dominio propio y Resend en el piloto o Amazon SES en `sa-east-1` para datos reales.
