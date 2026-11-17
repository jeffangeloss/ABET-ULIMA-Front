# ADR-004: La sesión es propia, viaja en una cookie HttpOnly y el Front y la API comparten origen

| | |
|---|---|
| **Estado** | Propuesta, pendiente de Jefferson (solo la fusión en `develop`, porque confirma J-03 el 2026-10-28) |
| **Fecha** | 2026-10-28 |
| **Ámbito** | `app/sesion.py` y `app/permisos.py` del Back, esquema `acceso` (V1_09), `vercel.json` del Front, `src/servicios/api.ts` del Front |

## Decisión

El sistema maneja su propia sesión. En la semana 1 el usuario entra con una contraseña que asigna Jefferson por comando (decisión J-03), guardada como hash Argon2id en `acceso.credencial`. Jefferson confirma J-03 con la aprobación del plan el 2026-10-28, así que el corte 1 usa la contraseña asignada. En el corte 2 se suma el código de 6 dígitos enviado al correo institucional (US-20), sin cambiar el resto de la capa.

Al iniciar sesión, la API crea un token aleatorio, guarda solo su hash en `acceso.sesion` con su vencimiento y lo entrega en la cookie `abet_sesion`, con HttpOnly, Secure, SameSite=Lax y 12 horas de vida (Max-Age 43200). En cada petición la API lee la cookie, busca la sesión vigente y lee el rol y las secciones del usuario desde la base. El Front nunca ve el token y nunca guarda nada de la sesión en `localStorage`.

La cookie es de primera parte porque el Front y la API comparten origen. El `vercel.json` del Front reescribe `/api/:path*` hacia la URL del proyecto del Back (una reescritura de rutas, rewrite en Vercel), de modo que el navegador solo habla con el dominio del Front. Sin esa reescritura, dos subdominios de `vercel.app` serían sitios distintos y una cookie SameSite=Lax del Back no viajaría en las peticiones del Front.

Se descarta Neon Auth para el MVP. Sus cookies viven en el dominio de Neon Auth, su hoja de ruta declara no soportados el frontend y el backend en despliegues separados, y su token web JSON (JSON Web Token, JWT) de 15 minutos no reemplaza la sesión del navegador. El inicio con cuenta Microsoft queda para después del MVP.

## Invariantes

1. Ningún archivo de `src/` del Front lee ni escribe `localStorage` o `sessionStorage` para la sesión.
2. `POST /api/sesion` responde 401 con «Correo o contraseña incorrectos.» para un correo desconocido, un usuario inactivo y una contraseña errada.
3. La base guarda el hash del token y el hash de la contraseña, nunca sus valores.
4. El rol y las secciones del usuario se leen de la base en cada petición, nunca del cliente.
5. El límite de intentos de ingreso corre en la API por correo, con 5 intentos fallidos en 15 minutos contados en `acceso.intento_fallido` exista o no el usuario, y no bloquea a otro correo que entra desde el mismo origen.
6. El Front llama siempre a rutas relativas `/api/...`, nunca a una URL absoluta del Back.

## Alternativas consideradas

**Token Bearer en `localStorage`, como IQBF-ULIMA_Front.** Se descarta porque cualquier script que corra en la página puede leerlo, y la crítica de arquitectura lo marca como lo que no se copia de IQBF.

**CORS con cookie entre dominios.** Exigiría SameSite=None y depender de que el navegador acepte cookies de terceros, que los navegadores bloquean cada vez más.

**Código por correo desde el primer día.** Se descarta para la semana 1 porque depende de un dominio propio con SPF, DKIM y DMARC, de un proveedor de correo y de la entrega hacia la pasarela de correo de la universidad, plazos que no controla el proyecto. Queda en el corte 2 (US-20, decisión J-04).

## Consecuencias

- Jefferson asigna y entrega las contraseñas del piloto por un canal aparte y nunca por el repositorio.
- El Back del entorno Preview (vista previa) de Vercel necesita su propio destino de reescritura, y la protección de despliegues de Vercel puede interponerse entre los dos proyectos (`05-operacion/entornos-y-despliegue.md`).
- Esta decisión depende de J-02. Un solo rol de base para la aplicación deja la regla de visibilidad en el código de `app/permisos.py`, con pruebas que cubren el 403 «La sección no está a su cargo.» de una sección ajena.

## Criterios de aceptación

```bash
# 1. El Front no guarda la sesión en el navegador (raíz del Front).
#    Esperado: sin salida (código 1 de grep).
grep -rnE 'localStorage|sessionStorage' src/
```

```bash
# 2. El Front no llama a una URL absoluta del Back (raíz del Front).
#    Esperado: sin salida (código 1 de grep).
grep -rnE 'https?://[^"'"'"' ]*abet-ulima-back' src/
```

```bash
# 3. La cookie sale con sus banderas (entorno Preview de Vercel o local con HTTPS).
#    El correo es de prueba y la contraseña se lee de una variable local, nunca escrita aquí.
#    Esperado: una línea Set-Cookie con abet_sesion, HttpOnly, Secure, SameSite=Lax y Max-Age=43200.
curl -si -X POST "$URL_FRONT/api/sesion" -H 'Content-Type: application/json' \
  -d "{\"correo\":\"docente410@example.invalid\",\"contrasena\":\"$CLAVE_PRUEBA\"}" | grep -i '^set-cookie'
```

```sql
-- 4. La base no guarda tokens en claro.
-- Esperado: 0 columnas.
SELECT count(*) FROM information_schema.columns
WHERE table_schema = 'acceso' AND table_name = 'sesion' AND column_name IN ('token', 'valor');
```

```bash
# 5. El mismo 401 para correo desconocido, usuario sin contraseña y contraseña errada (raíz del Back).
#    Esperado: las pruebas pytest de los criterios escritos de acceso.feature (US-05) pasan.
#    Comando (propuesta), hasta que T051 fije el suyo.
pytest tests/unit -k sesion
```

## Lo que todavía NO está

1. **La prueba de que la reescritura conserva la cookie.** Pide 15 minutos con el primer despliegue.
2. **Las cifras del límite de intentos.** El valor provisional de `acceso.feature` es 5 intentos fallidos por correo en 15 minutos, con 429 y «Demasiados intentos. Espere 15 minutos.», y la regla BR-ACCESO-05 de la spec viva `acceso` las conserva como propuesta hasta su revisión.
3. **Una comprobación de la cabecera `Origin`** en las rutas que escriben, que reforzaría SameSite=Lax y queda como propuesta.
