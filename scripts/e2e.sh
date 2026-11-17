#!/usr/bin/env bash
# Prueba de humo de P1 a P4 con Playwright (Chromium) sobre la API local y el Front de Vite.
# Requiere la API recién arrancada con bash ../back/scripts/api_local.sh --sin-https, Vite en el
# puerto 5173 (npm run dev) y la variable ABET_CLAVES_ARCHIVO con la ruta del archivo temporal que
# imprime api_local.sh. URL_FRONT y DIR_CAPTURAS son opcionales. Ver e2e/humo.spec.ts.
# Contra una vista previa de Vercel (T075), URL_FRONT es su URL https, VERCEL_AUTOMATION_BYPASS_SECRET trae la clave
# de omisión de la protección del proyecto del Front y ABET_CLAVES_ARCHIVO, las contraseñas de esa rama de Neon. Ahí la
# prueba corre una sola vez por cada restablecimiento de la rama, porque la carga de la 410 se publica una sola vez, y
# DIR_RESULTADOS debe ser una carpeta temporal que se borre al terminar, porque un fallo copia la página con la
# contraseña escrita en error-context.md.
if [ -z "${ABET_CLAVES_ARCHIVO:-}" ]; then
    echo "Falta ABET_CLAVES_ARCHIVO, la ruta del archivo de contraseñas que imprime api_local.sh." >&2
    exit 1
fi
case "${URL_FRONT:-}" in
    https://*)
        if [ -z "${VERCEL_AUTOMATION_BYPASS_SECRET:-}" ]; then
            echo "Falta VERCEL_AUTOMATION_BYPASS_SECRET, la clave de omisión de la protección de la vista previa." >&2
            exit 1
        fi ;;
esac
exec npx playwright test "$@"
