#!/usr/bin/env bash
# Revisión previa de cada cambio (docs/devops.md, sección «Controles de cada cambio»).
#
#   bash scripts/preflight.sh                  revisa todos los archivos versionados
#   bash scripts/preflight.sh --staged         revisa lo preparado para el commit (hook pre-commit)
#   bash scripts/preflight.sh --pr <rama-base> revisa el repositorio y el diff del PR contra <rama-base>
#   bash scripts/preflight.sh --historial [ref...] barre una vez el historial de develop, main y HEAD (o de las
#                                              referencias dadas) con la regla del correo prohibido
#
# Reglas.
#   1. Planillas, exports y respaldos solo dentro de tests/datos_inventados/.
#   2. En esa carpeta, todo número de 8 dígitos empieza con 99 (códigos inventados).
#   3. Ningún .env versionado, salvo .env.example.
#   4. Ningún secreto con valor (cadena de conexión con clave, tokens, llaves privadas).
#   5. Todo commit y todo PR que cambia archivos actualiza MEMORIA.md.
#   6. Aviso, sin fallar, si un PR cambia código o configuración y no toca CHANGELOG.md.
#   7. Nada de src/ usa el almacenamiento del navegador (localStorage, sessionStorage) ni llama a una
#      URL que no sea /api: sin URL absoluta, sin fetch ni XMLHttpRequest fuera de
#      src/servicios/api.ts y sin ruta literal que no empiece con /api (T045).
#
# Reglas de privacidad de la spec 008 (US-88, FR-022). El bloque es el mismo en el Back y en el Front, y cada
# regla se nombra por su tema para que los mensajes digan lo mismo en los dos.
#   correo prohibido  Ningún correo cuya huella SHA-256, sin espacios y en minúsculas, esté en la variable
#                     HUELLAS_CORREOS_PROHIBIDOS, que pone Jefferson con huellas separadas por comas o espacios y
#                     nunca con correos en claro. Sin la variable avisa y no falla. Con --historial revisa cada
#                     commit, su mensaje y sus autores.
#   ocho cifras       En las líneas que agrega un cambio (--staged o --pr) dentro de specs/, tests/, e2e/, docs/,
#                     MEMORIA.md y CHANGELOG.md, ningún número de 8 cifras con límite de palabra (una letra o una
#                     cifra al lado lo vuelve parte de otra palabra, como en una huella de 64 caracteres) que no
#                     empiece con 99 y que no esté en la lista cerrada CODIGOS_DE_PRUEBA. El contenido anterior no
#                     se revisa, porque trae colores y decimales de 8 cifras.
#   capturas          Ninguna captura, video, traza ni informe de Playwright.
#   tabla maestra     Ningún archivo tabular (.csv, .tsv, .txt, .dat, .psv, .tab, .xlsx, .xlsm) cuyo encabezado
#                     traiga «CÓDIGO DEL ESTUDIANTE» y «CALIFICACIÓN», con cualquier nombre y en cualquier carpeta.
#   tarjetas          Ninguna tarjeta de profesor (un archivo tarjeta_*, tarjetas.* o dentro de tarjetas/), que
#                     vive fuera de los repositorios.
#
# Los mensajes nombran el archivo y la regla, nunca el contenido encontrado, para no copiar un
# secreto ni un dato personal en los registros de la CI.
set -euo pipefail

MODO="todo"
BASE=""
REFERENCIAS=()
case "${1:-}" in
  --staged) MODO="staged" ;;
  --pr) MODO="pr"; BASE="${2:?Falta la rama base, por ejemplo origin/develop}" ;;
  --historial) MODO="historial"; shift; REFERENCIAS=("$@") ;;
  "") ;;
  *) echo "Uso: $0 [--staged | --pr <rama-base> | --historial [ref...]]" >&2; exit 2 ;;
esac

cd "$(git rev-parse --show-toplevel)"

INVENTADOS="tests/datos_inventados/"
fallas=0
falla() { echo "::error::$1"; fallas=$((fallas + 1)); }

if [ "$MODO" = "staged" ]; then
  ARCHIVOS="$(git diff --cached --name-only --diff-filter=ACMR)"
  GREP_ORIGEN=(--cached)
else
  ARCHIVOS="$(git ls-files)"
  GREP_ORIGEN=()
fi

# Reglas de privacidad de la spec 008 (US-88, FR-022). Este bloque es el mismo en el Back y en el Front.
CORREO_RE='[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+([.][A-Za-z0-9-]+)+'
# Lista cerrada de los códigos ajenos al rango 99 que usan las pruebas de la guardia de la spec 001 (FR-022).
CODIGOS_DE_PRUEBA=(10000004 98999999)
ALCANCE_OCHO_CIFRAS=(specs tests e2e docs MEMORIA.md CHANGELOG.md)
AVISO_SIN_HUELLAS="Sin huellas de correos prohibidos. La regla del correo real no se revisó."

sha256_texto() {
  if command -v sha256sum >/dev/null 2>&1; then sha256sum | cut -d' ' -f1
  else shasum -a 256 | cut -d' ' -f1; fi
}
# Una huella por línea, en minúsculas. Nunca se imprimen.
HUELLAS="$(printf '%s\n' "${HUELLAS_CORREOS_PROHIBIDOS:-}" | tr ',;\t\r' '\n\n\n\n' | tr ' ' '\n' | sed '/^$/d' | tr 'A-F' 'a-f')"
huellas_validas() {
  # Falla sin repetir el valor si la variable trae algo que no es una huella, como un correo en claro.
  if printf '%s\n' "$HUELLAS" | grep -qvE '^[0-9a-f]{64}$'; then
    falla "HUELLAS_CORREOS_PROHIBIDOS trae un valor que no es una huella SHA-256 en hexadecimal (regla del correo prohibido)"
    return 1
  fi
}
revisar_correos() { # líneas «origen:correo», sufijo del motivo
  # Calcula la huella de cada correo distinto, normalizado en minúsculas, y falla una vez por cada origen que trae
  # uno prohibido. El mensaje nombra el origen y nunca el correo.
  local lineas="$1" motivo="$2" correo origen
  [ -z "$lineas" ] && return 0
  # Los signos + y - del comienzo son la marca de una línea de un diff, no parte del correo.
  lineas="$(printf '%s\n' "$lineas" | LC_ALL=C sed -E 's/:[-+]+([^:]*)$/:\1/')"
  while IFS= read -r correo; do
    [ -z "$correo" ] && continue
    printf '%s\n' "$HUELLAS" | grep -qxF "$(printf '%s' "$correo" | sha256_texto)" || continue
    while IFS= read -r origen; do
      [ -n "$origen" ] && falla "$origen: trae un correo prohibido por su huella ($motivo)"
    done <<EOF_ORIGENES
$(printf '%s\n' "$lineas" | LC_ALL=C awk -v c="$correo" '{
  e = $0; sub(/.*:/, "", e); o = substr($0, 1, length($0) - length(e) - 1)
  if (tolower(e) == c && !(o in visto)) { visto[o] = 1; print o } }')
EOF_ORIGENES
  done <<EOF_CORREOS
$(printf '%s\n' "$lineas" | sed 's/.*://' | LC_ALL=C tr 'A-Z' 'a-z' | sort -u)
EOF_CORREOS
}
leer() { # archivo: su contenido en el índice con --staged y en la copia de trabajo en los otros modos
  if [ "$MODO" = "staged" ]; then git cat-file blob ":$1" 2>/dev/null || true
  else cat -- "$1" 2>/dev/null || true; fi
}

# Barrido del historial, una vez antes de publicar (US-88). Revisa cada commit de develop, main y HEAD, o de las
# referencias dadas, con su mensaje, sus autores y su diff, y termina sin correr las demás reglas.
if [ "$MODO" = "historial" ]; then
  if [ -z "$HUELLAS" ]; then
    echo "Sin huellas de correos prohibidos. El historial no se revisó."
    exit 2
  fi
  huellas_validas || { echo "Revisión del historial: 1 falla(s)."; exit 1; }
  if [ "${#REFERENCIAS[@]}" -eq 0 ]; then
    for r in develop main; do
      if git rev-parse --verify -q "origin/$r^{commit}" >/dev/null; then REFERENCIAS+=("origin/$r")
      elif git rev-parse --verify -q "$r^{commit}" >/dev/null; then REFERENCIAS+=("$r"); fi
    done
    [ "${#REFERENCIAS[@]}" -eq 0 ] && { echo "No se encontraron develop ni main." >&2; exit 2; }
    REFERENCIAS+=(HEAD)
  fi
  total="$(git rev-list --count "${REFERENCIAS[@]}")"
  revisar_correos "$(git -c core.quotePath=false log -p --no-color --no-ext-diff \
      --format='%x01%h%n%an <%ae>%n%cn <%ce>%n%B' "${REFERENCIAS[@]}" | LC_ALL=C awk -v re="$CORREO_RE" '
    /^\001/ { c = substr($0, 2); next }
    { s = $0; while (match(s, re)) { print "commit " c ":" substr(s, RSTART, RLENGTH); s = substr(s, RSTART + RLENGTH) } }')" \
    "regla del correo prohibido, historial"
  if [ "$fallas" -gt 0 ]; then
    echo "Revisión del historial: $fallas falla(s) en $total commits de ${REFERENCIAS[*]}."
    exit 1
  fi
  echo "Historial sin correos prohibidos: $total commits revisados de ${REFERENCIAS[*]}."
  exit 0
fi

# Correo prohibido, en todo el contenido que revisa el modo, con su archivo y su línea.
if [ -z "$HUELLAS" ]; then
  echo "$AVISO_SIN_HUELLAS"
elif huellas_validas; then
  revisar_correos "$(git -c core.quotePath=false grep -nIoE ${GREP_ORIGEN[@]+"${GREP_ORIGEN[@]}"} -e "$CORREO_RE" -- . 2>/dev/null || true)" \
    "regla del correo prohibido"
fi

# Ocho cifras, solo en las líneas que agrega el cambio. Una palabra es una racha de letras y cifras ASCII, así que
# una huella de 64 caracteres, una fecha con guiones y una cifra de 7 dígitos no son códigos.
if [ "$MODO" = "staged" ] || [ "$MODO" = "pr" ]; then
  if [ "$MODO" = "staged" ]; then RANGO=(--cached); else RANGO=("$BASE...HEAD"); fi
  RESULTADO="$(git -c core.quotePath=false diff "${RANGO[@]}" -U0 --no-color --no-ext-diff --diff-filter=ACMR \
      -- "${ALCANCE_OCHO_CIFRAS[@]}" | LC_ALL=C awk -v lista="${CODIGOS_DE_PRUEBA[*]}" '
    BEGIN { split(lista, l, " "); for (i in l) prueba[l[i]] = 1 }
    /^diff --git / { cabecera = 1; next }
    cabecera && /^\+\+\+ / { f = substr($0, 5); sub(/^b\//, "", f); sub(/\t$/, "", f); next }
    /^@@ / { cabecera = 0; match($0, /\+[0-9]+/); n = substr($0, RSTART + 1, RLENGTH - 1) + 0; next }
    cabecera { next }
    /^\+/ {
      revisadas++; s = substr($0, 2); k = 0
      while (match(s, /[0-9A-Za-z]+/)) {
        t = substr(s, RSTART, RLENGTH); s = substr(s, RSTART + RLENGTH)
        if (length(t) == 8 && t ~ /^[0-9]+$/ && t !~ /^99/ && !(t in prueba)) k++
      }
      if (k > 0) print k "\t" f ":" n
      n++
    }
    END { print "#revisadas\t" revisadas + 0 }')"
  revisadas=0
  while IFS="$(printf '\t')" read -r cuenta origen; do
    [ -z "$cuenta" ] && continue
    if [ "$cuenta" = "#revisadas" ]; then revisadas="$origen"; continue; fi
    falla "$origen: trae $cuenta números de 8 cifras fuera del rango 99 y de CODIGOS_DE_PRUEBA (regla de ocho cifras)"
  done <<EOF
$RESULTADO
EOF
  if [ "$revisadas" = "1" ]; then lineas="línea agregada"; else lineas="líneas agregadas"; fi
  echo "Regla de ocho cifras: revisó $revisadas $lineas en specs/, tests/, e2e/, docs/, MEMORIA.md y CHANGELOG.md."
fi

# Capturas, videos, trazas e informes de Playwright.
while IFS= read -r f; do
  [ -z "$f" ] && continue
  falla "$f: captura, video, traza o informe de Playwright versionado (regla de las capturas)"
done <<EOF
$(printf '%s\n' "$ARCHIVOS" | grep -Ei '(^|/)(test-results|playwright-report|blob-report|capturas)/|(^|/)trace\.zip$|^e2e/.*\.(png|jpe?g|webp|gif|bmp|webm|mp4|zip)$' || true)
EOF

# Tabla maestra por su encabezado, con cualquier nombre y en cualquier carpeta. En un texto se lee la primera línea
# (sin nulos, para leer un UTF-16 como ASCII), y en un libro, sus cadenas compartidas y su primera hoja.
encabezado_tabular() {
  local f="$1" t
  case "$f" in
    *.[xX][lL][sS][xX] | *.[xX][lL][sS][mM])
      t="$(mktemp)"
      leer "$f" > "$t"
      { unzip -p "$t" 'xl/sharedStrings.xml' 'xl/worksheets/sheet1.xml' 2>/dev/null | LC_ALL=C tr -d '\000'; } || true
      rm -f "$t" ;;
    *) { leer "$f" | head -c 65536 | LC_ALL=C tr -d '\000' | LC_ALL=C tr '\r' '\n' | head -n 1; } 2>/dev/null || true ;;
  esac
}
while IFS= read -r f; do
  [ -z "$f" ] && continue
  # La plantilla del R-17 del Back nombra esas columnas en su tabla, y la regla 2 ya revisa sus textos y sus correos.
  [ "$f" = "${PLANTILLA_R17:-}" ] && continue
  encabezado="$(encabezado_tabular "$f")"
  if printf '%s' "$encabezado" | LC_ALL=C grep -aiqE 'C.{0,2}DIGO[ _]+DEL[ _]+ESTUDIANTE' \
     && printf '%s' "$encabezado" | LC_ALL=C grep -aiqE 'CALIFICACI.{0,2}N'; then
    falla "$f: archivo tabular con el encabezado de la tabla maestra (regla de la tabla maestra)"
  fi
done <<EOF
$(printf '%s\n' "$ARCHIVOS" | grep -Ei '\.(csv|tsv|txt|dat|psv|tab|xlsx|xlsm)$' || true)
EOF

# Tarjetas de profesor, por su nombre. Un componente o una prueba con «tarjeta» en el nombre no es una tarjeta.
while IFS= read -r f; do
  [ -z "$f" ] && continue
  falla "$f: tarjeta de profesor dentro del repositorio (regla de las tarjetas)"
done <<EOF
$(printf '%s\n' "$ARCHIVOS" | grep -Ei '(^|/)tarjetas?([_ .-][^/]*)?$|(^|/)tarjetas/' \
  | grep -Evi '\.(ts|tsx|js|jsx|mjs|cjs|py|sh|css|sql|feature)$' || true)
EOF

# 1. Planillas, exports y respaldos fuera de la carpeta de datos inventados.
while IFS= read -r f; do
  [ -z "$f" ] && continue
  case "$f" in
    "$INVENTADOS"*) ;;
    *) falla "$f: planilla, export o respaldo fuera de $INVENTADOS (regla 1)" ;;
  esac
done <<EOF
$(printf '%s\n' "$ARCHIVOS" | grep -Ei '\.(csv|tsv|xls|xlsx|xlsm|ods|dump|gpg|bak)$' || true)
EOF

# 2. Solo códigos inventados en la carpeta de datos inventados.
codigos_reales() {
  # Imprime cuántos números de exactamente 8 dígitos no empiezan con 99, sin mostrarlos.
  grep -oE '[0-9]+' | grep -E '^[0-9]{8}$' | grep -vc '^99' || true
}
while IFS= read -r f; do
  [ -z "$f" ] && continue
  case "$f" in
    *.xlsx|*.xlsm)
      n="$( (unzip -p "$f" 'xl/worksheets/*.xml' 'xl/sharedStrings.xml' 2>/dev/null || true) | codigos_reales)" ;;
    *.csv|*.tsv|*.txt)
      n="$(codigos_reales < "$f")" ;;
    *) n=0 ;;
  esac
  if [ "${n:-0}" -gt 0 ]; then
    falla "$f: trae $n números de 8 dígitos que no empiezan con 99 (regla 2)"
  fi
done <<EOF
$(printf '%s\n' "$ARCHIVOS" | grep -E "^${INVENTADOS}" || true)
EOF

# 3. Archivos .env versionados.
while IFS= read -r f; do
  [ -z "$f" ] && continue
  falla "$f: archivo de entorno versionado; solo se admite .env.example (regla 3)"
done <<EOF
$(printf '%s\n' "$ARCHIVOS" | grep -E '(^|/)\.env($|\.)' | grep -vE '(^|/)\.env\.example$' || true)
EOF

# 4. Secretos con valor. git grep -I salta los binarios; cut deja solo archivo y línea.
#    Se excluyen este script y scripts/probar_preflight.sh, que traen los patrones y un
#    secreto falso a propósito para probar la regla.
PATRONES=(
  'postgres(ql)?://[^:/@[:space:]]+:[^@[:space:]]+@'
  'npg_[A-Za-z0-9]{12,}'
  '-----BEGIN [A-Z ]*PRIVATE KEY-----'
  'gh[pousr]_[A-Za-z0-9]{36}'
  'github_pat_[A-Za-z0-9_]{40,}'
  'AKIA[0-9A-Z]{16}'
  '(SECRET|TOKEN|PASSWORD|PASSWD|CLAVE|API_KEY)[A-Z_]*[[:space:]]*[:=][[:space:]]*["'"'"']?[A-Za-z0-9+/_-]{16,}'
)
for p in "${PATRONES[@]}"; do
  while IFS= read -r hallazgo; do
    [ -z "$hallazgo" ] && continue
    falla "$hallazgo: posible secreto con valor (regla 4)"
  done <<EOF
$(git grep -nIE ${GREP_ORIGEN[@]+"${GREP_ORIGEN[@]}"} -e "$p" -- . ':!scripts/preflight.sh' ':!scripts/probar_preflight.sh' 2>/dev/null | cut -d: -f1,2 || true)
EOF
done

# 7. Front: sin almacenamiento del navegador y con /api como único destino HTTP (T045). La sesión
#    viaja en la cookie abet_sesion y la pantalla de ingreso no guarda nada (ADR-004). Solo se revisa
#    src/, porque las pruebas de tests/ comprueban justamente que el almacenamiento quede vacío.
#    Los comentarios de src/ no nombran estas APIs, para que la regla pueda ser literal.
revisar_src() {
  local patron="$1" motivo="$2"; shift 2
  while IFS= read -r hallazgo; do
    [ -z "$hallazgo" ] && continue
    falla "$hallazgo: $motivo (regla 7)"
  done <<EOF2
$(git grep -nIE ${GREP_ORIGEN[@]+"${GREP_ORIGEN[@]}"} -e "$patron" -- src/ "$@" 2>/dev/null | cut -d: -f1,2 || true)
EOF2
}
revisar_src 'localStorage|sessionStorage|indexedDB' 'usa el almacenamiento del navegador'
revisar_src 'https?://|wss?://' 'llama o nombra una URL absoluta'
revisar_src 'XMLHttpRequest|sendBeacon|EventSource|WebSocket|axios' 'usa una puerta HTTP distinta de api.ts'
revisar_src '(^|[^A-Za-z_.])fetch[[:space:]]*\(' 'llama a fetch fuera de src/servicios/api.ts' ':!src/servicios/api.ts'
# Ruta literal entre comillas que no empieza con /api (cualquier carácter tras la barra salvo «a», o «a» sin «pi»).
revisar_src "[\"'\`]/([^a]|a([^p]|p[^i]))" 'tiene una ruta literal que no es /api' ':!src/**/*.css'

# 5 y 6. MEMORIA.md en cada cambio y aviso de CHANGELOG.md.
revisar_memoria() {
  local cambiados="$1" donde="$2"
  [ -z "$cambiados" ] && return 0
  if ! printf '%s\n' "$cambiados" | grep -qx 'MEMORIA.md'; then
    falla "$donde cambia archivos y no actualiza MEMORIA.md (AGENTS.md, regla 2; regla 5 de este script)"
  fi
}
if [ "$MODO" = "staged" ]; then
  revisar_memoria "$ARCHIVOS" "El commit"
elif [ "$MODO" = "pr" ]; then
  CAMBIADOS="$(git diff --name-only "$BASE"...HEAD)"
  revisar_memoria "$CAMBIADOS" "El PR"
  if printf '%s\n' "$CAMBIADOS" | grep -vqE '^(MEMORIA\.md|CHANGELOG\.md|README\.md|AGENTS\.md|CLAUDE\.md|docs/|specs/)' \
     && ! printf '%s\n' "$CAMBIADOS" | grep -qx 'CHANGELOG.md'; then
    echo "::warning::El PR cambia código o configuración y no toca CHANGELOG.md (sección «Sin publicar»)"
  fi
fi

if [ "$fallas" -gt 0 ]; then
  echo "Revisión previa: $fallas falla(s). Detalle en docs/devops.md, sección «Controles de cada cambio»."
  exit 1
fi
echo "Revisión previa sin fallas ($MODO)."
