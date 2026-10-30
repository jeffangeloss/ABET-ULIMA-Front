#!/usr/bin/env bash
# Prueba de humo de P1 a P4 con Playwright (Chromium) sobre la API local y el Front de Vite.
# Requiere la API recién arrancada con bash ../back/scripts/api_local.sh --sin-https, Vite en el
# puerto 5173 (npm run dev) y la variable ABET_CLAVES_ARCHIVO con la ruta del archivo temporal que
# imprime api_local.sh. URL_FRONT y DIR_CAPTURAS son opcionales. Ver e2e/humo.spec.ts.
if [ -z "${ABET_CLAVES_ARCHIVO:-}" ]; then
    echo "Falta ABET_CLAVES_ARCHIVO, la ruta del archivo de contraseñas que imprime api_local.sh." >&2
    exit 1
fi
exec npx playwright test "$@"
