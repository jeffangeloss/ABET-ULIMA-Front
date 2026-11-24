#!/usr/bin/env bash
# Humo de punta a punta de Química General (spec 008, T053) con e2e/humo_quimica.spec.ts.
#
# Uso, desde la raíz del Front.
#   ABET_CLAVES_ARCHIVO=... EXPORTS_QUIMICA=... EJERCICIO_QUIMICA=... [URL_FRONT=https://...] \
#       [VERCEL_AUTOMATION_BYPASS_SECRET=...] [DIR_CAPTURAS=...] bash scripts/humo_quimica.sh
#
# ABET_CLAVES_ARCHIVO es el archivo temporal de contraseñas (líneas «correo clave»), EXPORTS_QUIMICA la carpeta del
# generador de US-74 con manifiesto.json y los exports inventados de la 701 a la 703, y EJERCICIO_QUIMICA la carpeta del
# generador con --ejercicio de la 799. En local URL_FRONT es el Vite que levanta playwright.config.ts
# (http://localhost:5199), con la API en 127.0.0.1:8000. Contra la vista previa de develop (T071), URL_FRONT es su URL
# https y VERCEL_AUTOMATION_BYPASS_SECRET la clave de omisión de la protección.
#
# DIR_RESULTADOS es siempre una carpeta temporal nueva, porque un fallo copia la página en error-context.md. Las
# capturas van a DIR_CAPTURAS o, sin ella, a otra carpeta temporal, y las dos deben quedar fuera de todo repositorio.
# Al terminar, pase lo que pase, el guion borra la carpeta de resultados y el archivo de contraseñas, comprueba que
# ya no existen y deja las capturas para que Jefferson las revise y las borre.
set -uo pipefail

for variable in ABET_CLAVES_ARCHIVO EXPORTS_QUIMICA EJERCICIO_QUIMICA; do
    if [ -z "${!variable:-}" ]; then
        echo "Falta $variable. Lea el uso al comienzo de scripts/humo_quimica.sh." >&2
        exit 2
    fi
done
case "${URL_FRONT:-}" in
    https://*)
        if [ -z "${VERCEL_AUTOMATION_BYPASS_SECRET:-}" ]; then
            echo "Falta VERCEL_AUTOMATION_BYPASS_SECRET, la clave de omisión de la protección de la vista previa." >&2
            exit 2
        fi ;;
    "") export URL_FRONT="http://localhost:${PUERTO_VISUAL:-5199}" ;;
esac

# Mira la carpeta o, si todavía no existe, la carpeta existente más cercana que la contiene, sin crear nada.
dentro_de_un_repositorio() {
    local carpeta="$1"
    while [ ! -d "$carpeta" ]; do carpeta="$(dirname "$carpeta")"; done
    git -C "$carpeta" rev-parse --is-inside-work-tree >/dev/null 2>&1
}

TEMPORAL="${TMPDIR:-/tmp}"
DIR_RESULTADOS="$(mktemp -d "${TEMPORAL%/}/abet_humo_quimica_resultados_XXXXXX")"
export DIR_RESULTADOS
if [ -z "${DIR_CAPTURAS:-}" ]; then
    DIR_CAPTURAS="$(mktemp -d "${TEMPORAL%/}/abet_humo_quimica_capturas_XXXXXX")"
fi
for carpeta in "$DIR_RESULTADOS" "$DIR_CAPTURAS" "$(dirname "$ABET_CLAVES_ARCHIVO")"; do
    if dentro_de_un_repositorio "$carpeta"; then
        echo "Una carpeta del humo queda dentro de un repositorio git. Nada corre." >&2
        rm -rf "$DIR_RESULTADOS"
        exit 2
    fi
done
mkdir -p "$DIR_CAPTURAS"
export DIR_CAPTURAS

limpiar() {
    local codigo=$?
    rm -rf "$DIR_RESULTADOS"
    rm -f "$ABET_CLAVES_ARCHIVO"
    if [ -e "$DIR_RESULTADOS" ] || [ -e "$ABET_CLAVES_ARCHIVO" ]; then
        echo "La carpeta de resultados o el archivo de contraseñas siguen existiendo." >&2
        exit 1
    fi
    echo "Resultados y contraseñas borrados. Capturas en $DIR_CAPTURAS, fuera de los repositorios."
    exit "$codigo"
}
trap limpiar EXIT
trap 'exit 130' INT TERM

export HUMO_QUIMICA_LIMPIEZA=1
npx playwright test e2e/humo_quimica.spec.ts "$@"
