#!/usr/bin/env bash
# Prueba scripts/preflight.sh y el hook scripts/recordar_memoria.sh en un repositorio temporal, con
# casos que deben pasar y casos que deben fallar. Lo corre el check «pruebas» de la CI.
#   bash scripts/probar_preflight.sh
# Solo usa bash, git y python3 de la biblioteca estándar; los archivos de prueba se generan aquí
# con datos inventados y un secreto falso que nunca debe aparecer en la salida.
set -u

SCRIPTS="$(cd "$(dirname "$0")" && pwd)"
PREFLIGHT="$SCRIPTS/preflight.sh"
T="$(mktemp -d)"
trap 'rm -rf "$T"' EXIT
cd "$T"
git init -q
git config user.name prueba
git config user.email prueba@example.invalid
mkdir -p scripts tests/datos_inventados
cp "$PREFLIGHT" scripts/preflight.sh
cp "$SCRIPTS/recordar_memoria.sh" scripts/recordar_memoria.sh
echo "# memoria" > MEMORIA.md
echo "x" > README.md
git add -A
git commit -qm base --no-verify
RAMA_BASE="$(git rev-parse --abbrev-ref HEAD)"

xlsx() { # ruta, código
  python3 - "$1" "$2" <<'PY'
import sys, zipfile
ruta, codigo = sys.argv[1], sys.argv[2]
with zipfile.ZipFile(ruta, "w") as z:
    z.writestr("xl/worksheets/sheet1.xml",
               '<worksheet><sheetData><row r="2"><c r="C2"><v>%s</v></c>'
               '<c r="Y2"><v>3</v></c></row></sheetData></worksheet>' % codigo)
    z.writestr("xl/sharedStrings.xml", "<sst/>")
PY
}

bien=0
mal=0
caso() { # nombre, esperado (0 pasa, 1 falla), comando
  local nombre="$1" esperado="$2" salida rc real
  shift 2
  salida="$("$@" 2>&1)"
  rc=$?
  real=$([ "$rc" -eq 0 ] && echo 0 || echo 1)
  # Ninguna salida muestra el secreto falso, el código ajeno 20231234 ni los correos de los casos de la spec 008.
  if [ "$real" = "$esperado" ] && ! printf '%s' "$salida" | grep -qi -e 'secretoFalso' -e '20231234' -e 'real.inventado' -e 'alguienEnClaro'; then
    bien=$((bien + 1)); echo "bien  $nombre"
  else
    mal=$((mal + 1)); echo "MAL   $nombre (salida $rc)"; printf '%s\n' "$salida" | sed 's/^/      /'
  fi
  git checkout -q "$RAMA_BASE" 2>/dev/null
  git reset -q --hard
  git clean -qfdx
  mkdir -p tests/datos_inventados
}

caso "commit con MEMORIA.md pasa" 0 bash -c 'echo y >> README.md; echo e >> MEMORIA.md; git add -A; bash scripts/preflight.sh --staged'
caso "commit sin MEMORIA.md falla" 1 bash -c 'echo y >> README.md; git add -A; bash scripts/preflight.sh --staged'
caso "xlsx fuera de datos_inventados falla" 1 bash -c "$(declare -f xlsx); xlsx export.xlsx 99000001; echo e >> MEMORIA.md; git add -f -A; bash scripts/preflight.sh --staged"
caso "xlsx con código 99 en datos_inventados pasa" 0 bash -c "$(declare -f xlsx); xlsx tests/datos_inventados/e.xlsx 99000001; echo e >> MEMORIA.md; git add -f -A; bash scripts/preflight.sh --staged"
caso "xlsx con código que no empieza con 99 falla" 1 bash -c "$(declare -f xlsx); xlsx tests/datos_inventados/r.xlsx 20231234; echo e >> MEMORIA.md; git add -f -A; bash scripts/preflight.sh --staged"
caso "csv con 99000001,99000002 pasa" 0 bash -c 'printf "codigo\n99000001,99000002\n" > tests/datos_inventados/a.csv; echo e >> MEMORIA.md; git add -f -A; bash scripts/preflight.sh --staged'
caso "csv con 99000001,20231234 falla" 1 bash -c 'printf "codigo\n99000001,20231234\n" > tests/datos_inventados/a.csv; echo e >> MEMORIA.md; git add -f -A; bash scripts/preflight.sh --staged'
caso ".env versionado falla" 1 bash -c 'echo "A=1" > .env; echo e >> MEMORIA.md; git add -f -A; bash scripts/preflight.sh --staged'
caso ".env.example sin valores pasa" 0 bash -c 'echo "DATABASE_URL=" > .env.example; echo e >> MEMORIA.md; git add -f -A; bash scripts/preflight.sh --staged'
caso "cadena de conexión con clave falla sin mostrarla" 1 bash -c 'echo "url = postgres://usuario:secretoFalso@ep-x.sa-east-1.aws.neon.tech/neondb" > conf.txt; echo e >> MEMORIA.md; git add -A; bash scripts/preflight.sh --staged'
caso "token con valor falla sin mostrarlo" 1 bash -c 'echo "SONAR_TOKEN=secretoFalsoAAAAAAAAAAAAAA" > conf.txt; echo e >> MEMORIA.md; git add -A; bash scripts/preflight.sh --staged'
caso "referencia a un secreto de Actions pasa" 0 bash -c 'echo "SONAR_TOKEN: \${{ secrets.SONAR_TOKEN }}" > w.yml; echo e >> MEMORIA.md; git add -A; bash scripts/preflight.sh --staged'
caso "PR sin MEMORIA.md falla" 1 bash -c "git checkout -qb feat/x; echo y >> README.md; git commit -qam c --no-verify; bash scripts/preflight.sh --pr $RAMA_BASE"
caso "PR con MEMORIA.md pasa" 0 bash -c "git checkout -qb feat/y; echo y >> README.md; echo e >> MEMORIA.md; git commit -qam c --no-verify; bash scripts/preflight.sh --pr $RAMA_BASE"
caso "repositorio limpio en modo completo pasa" 0 bash scripts/preflight.sh
caso "hook de memoria: repositorio limpio no bloquea" 0 bash -c 'printf "{}" | CLAUDE_PROJECT_DIR="$PWD" bash scripts/recordar_memoria.sh'
caso "hook de memoria: cambio sin MEMORIA.md bloquea" 1 bash -c 'echo y >> README.md; printf "{}" | CLAUDE_PROJECT_DIR="$PWD" bash scripts/recordar_memoria.sh'
caso "hook de memoria: cambio con MEMORIA.md no bloquea" 0 bash -c 'echo y >> README.md; echo e >> MEMORIA.md; printf "{}" | CLAUDE_PROJECT_DIR="$PWD" bash scripts/recordar_memoria.sh'
caso "hook de memoria: no bloquea dos veces seguidas" 0 bash -c 'echo y >> README.md; printf "{\"stop_hook_active\": true}" | CLAUDE_PROJECT_DIR="$PWD" bash scripts/recordar_memoria.sh'
caso "src con localStorage falla" 1 bash -c 'mkdir -p src; echo "const a = window.localStorage;" > src/x.ts; echo e >> MEMORIA.md; git add -A; bash scripts/preflight.sh --staged'
caso "src con sessionStorage falla" 1 bash -c 'mkdir -p src; echo "sessionStorage.setItem(1, 2);" > src/x.tsx; echo e >> MEMORIA.md; git add -A; bash scripts/preflight.sh --staged'
caso "src con una URL absoluta falla" 1 bash -c 'mkdir -p src; echo "const u = \"https://otro.example.invalid/x\";" > src/x.ts; echo e >> MEMORIA.md; git add -A; bash scripts/preflight.sh --staged'
caso "fetch fuera de servicios/api.ts falla" 1 bash -c 'mkdir -p src; echo "fetch(\"/api/sesion\");" > src/x.ts; echo e >> MEMORIA.md; git add -A; bash scripts/preflight.sh --staged'
caso "XMLHttpRequest en src falla" 1 bash -c 'mkdir -p src; echo "new XMLHttpRequest();" > src/x.ts; echo e >> MEMORIA.md; git add -A; bash scripts/preflight.sh --staged'
caso "ruta que no es /api en servicios/api.ts falla" 1 bash -c 'mkdir -p src/servicios; echo "await fetch(\"/otra/ruta\");" > src/servicios/api.ts; echo e >> MEMORIA.md; git add -A; bash scripts/preflight.sh --staged'
caso "fetch de una ruta /api en servicios/api.ts pasa" 0 bash -c 'mkdir -p src/servicios; echo "await fetch(\"/api/sesion\");" > src/servicios/api.ts; echo e >> MEMORIA.md; git add -A; bash scripts/preflight.sh --staged'
caso "localStorage en las pruebas de tests/ pasa" 0 bash -c 'mkdir -p tests src; echo "window.localStorage.clear();" > tests/x.test.ts; echo "export const a = 1;" > src/x.ts; echo e >> MEMORIA.md; git add -A; bash scripts/preflight.sh --staged'
caso "src sin almacenamiento ni URLs pasa y no muestra el contenido" 0 bash -c 'mkdir -p src; echo "export const a = \"/api/x\";" > src/x.ts; echo e >> MEMORIA.md; git add -A; bash scripts/preflight.sh --staged'

caso_por() { # nombre, regla que debe nombrar la salida (por ejemplo «regla de ocho cifras»), comando que debe fallar
  local nombre="$1" regla="$2" salida rc
  shift 2
  salida="$("$@" 2>&1)"
  rc=$?
  if [ "$rc" -ne 0 ] && printf '%s' "$salida" | grep -qF "($regla)" \
     && ! printf '%s' "$salida" | grep -qi -e 'secretoFalso' -e '20231234' -e 'real.inventado' -e 'alguienEnClaro'; then
    bien=$((bien + 1)); echo "bien  $nombre"
  else
    mal=$((mal + 1)); echo "MAL   $nombre (salida $rc, se esperaba una falla por la $regla)"; printf '%s\n' "$salida" | sed 's/^/      /'
  fi
  git checkout -q "$RAMA_BASE" 2>/dev/null
  git reset -q --hard
  git clean -qfdx
  mkdir -p tests/datos_inventados
}
texto() { # ruta, codificación (utf-16 con BOM LE, utf-8-sig o cp1252), contenido
  python3 - "$1" "$2" "$3" <<'PY2'
import sys
ruta, codificacion, contenido = sys.argv[1:4]
contenido = contenido.replace("\\n", "\n").replace("\\t", "\t")
if codificacion == "utf-16":
    datos = b"\xff\xfe" + contenido.encode("utf-16-le")
else:
    datos = contenido.encode(codificacion)
open(ruta, "wb").write(datos)
PY2
}
CON_TEXTO="$(declare -f texto)"

# Reglas de privacidad de la spec 008 (US-88). Los escenarios viven en guia_y_privacidad.feature y los corre pytest
# en el Back; estos casos repiten los bordes con el mismo bloque de reglas en el Back y en el Front.
HUELLA_INVENTADA="$(printf '%s' 'real.inventado@example.invalid' | { sha256sum 2>/dev/null || shasum -a 256; } | cut -d' ' -f1)"
CON_HUELLA="export HUELLAS_CORREOS_PROHIBIDOS='$HUELLA_INVENTADA'"
RS='echo e >> MEMORIA.md; git add -f -A; bash scripts/preflight.sh --staged'
caso "sin huellas avisa y pasa" 0 bash -c "unset HUELLAS_CORREOS_PROHIBIDOS; bash scripts/preflight.sh | grep -qF 'Sin huellas de correos prohibidos. La regla del correo real no se revisó.'"
caso_por "correo prohibido con otras mayúsculas falla sin repetirlo" "regla del correo prohibido" bash -c "$CON_HUELLA; mkdir -p docs; echo 'Escribir a Real.Inventado@Example.invalid' > docs/a.md; $RS"
caso "otro correo de ejemplo pasa con la huella" 0 bash -c "$CON_HUELLA; mkdir -p docs; echo 'Escribir a docente701@example.invalid' > docs/a.md; $RS"
caso_por "un correo en claro en la variable falla sin repetirlo" "regla del correo prohibido" bash -c "export HUELLAS_CORREOS_PROHIBIDOS='alguienEnClaro@example.invalid'; bash scripts/preflight.sh"
caso "el historial sin huellas no se revisa y termina con 2" 0 bash -c "unset HUELLAS_CORREOS_PROHIBIDOS; bash scripts/preflight.sh --historial $RAMA_BASE; [ \$? -eq 2 ]"
caso_por "el historial con el correo prohibido en un commit ya revertido falla" "regla del correo prohibido, historial" bash -c "$CON_HUELLA; git checkout -qb h; echo 'real.inventado@example.invalid' > docs.md; git add -A; git commit -qm c --no-verify; git rm -q docs.md; git commit -qm r --no-verify; bash scripts/preflight.sh --historial h"
caso_por "código 20231234 agregado en specs falla" "regla de ocho cifras" bash -c "mkdir -p specs; echo '| 20231234 |' > specs/a.feature; $RS"
caso_por "código 20231234 agregado en e2e falla" "regla de ocho cifras" bash -c "mkdir -p e2e; echo 'const c = \"20231234\";' > e2e/humo.spec.ts; $RS"
caso_por "código 20231234 agregado en MEMORIA.md falla" "regla de ocho cifras" bash -c "echo 'código 20231234' >> MEMORIA.md; git add -A; bash scripts/preflight.sh --staged"
caso "código 20231234 fuera del alcance de la regla pasa" 0 bash -c "mkdir -p db; echo '-- 20231234' > db/a.sql; $RS"
caso "códigos de prueba, rango 99, fechas, siete cifras y 9 cifras pasan" 0 bash -c "mkdir -p specs; printf '10000004 98999999 99000001 2026-11-23 9000061 202312345 x20231234 20231234x\n' > specs/a.feature; $RS"
caso_por "código separado por guion bajo falla" "regla de ocho cifras" bash -c "mkdir -p tests; echo 'alumno_20231234.xlsx' > tests/a.py; $RS"
caso "un 20231234 ya versionado no cuenta en un cambio" 0 bash -c "mkdir -p tests; echo 'c = 20231234' > tests/a.py; git add -A; git commit -qm v --no-verify; echo 'sin cifras' >> tests/a.py; $RS"
caso_por "PR que agrega 20231234 en docs falla" "regla de ocho cifras" bash -c "git checkout -qb feat/z; mkdir -p docs; echo '20231234' > docs/a.md; echo e >> MEMORIA.md; git add -A; git commit -qm c --no-verify; bash scripts/preflight.sh --pr $RAMA_BASE"
caso_por "captura en e2e falla" "regla de las capturas" bash -c "mkdir -p e2e/capturas; printf 'x' > e2e/capturas/P4_701.png; $RS"
caso_por "traza en test-results falla" "regla de las capturas" bash -c "mkdir -p test-results; printf 'x' > test-results/trace.zip; $RS"
caso_por "video de playwright-report falla" "regla de las capturas" bash -c "mkdir -p playwright-report/data; printf 'x' > playwright-report/data/v.webm; $RS"
caso_por "tabla maestra en .txt falla" "regla de la tabla maestra" bash -c "mkdir -p docs; printf 'AÑO,CICLO,CÓDIGO DEL ESTUDIANTE,SECCIÓN,CALIFICACIÓN\n2026,1,99000001,701,3\n' > docs/notas.txt; $RS"
caso_por "tabla maestra en datos_inventados falla" "regla de la tabla maestra" bash -c "$CON_TEXTO; texto tests/datos_inventados/m.csv cp1252 'Código del estudiante;Calificación\\n99000001;3\\n'; $RS"
caso_por "tabla maestra en .xlsx falla" "regla de la tabla maestra" bash -c "python3 -c \"import zipfile; z = zipfile.ZipFile('tests/datos_inventados/m.xlsx', 'w'); z.writestr('xl/sharedStrings.xml', '<sst><si><t>CÓDIGO DEL ESTUDIANTE</t></si><si><t>CALIFICACIÓN</t></si></sst>'); z.writestr('xl/worksheets/sheet1.xml', '<worksheet/>'); z.close()\"; $RS"
caso "csv con solo una de las dos columnas pasa" 0 bash -c "printf 'CÓDIGO DEL ESTUDIANTE,NIVEL\n99000001,3\n' > tests/datos_inventados/m.csv; $RS"
# Cambio del 2026-11-23 del cierre de la spec 008, copiado del Back. Un export con una línea de título, o con un BOM y
# una línea vacía antes del encabezado, también falla, porque la regla lee las primeras 20 líneas no vacías de un texto.
caso_por "tabla maestra con una línea de título falla" "regla de la tabla maestra" bash -c "mkdir -p db/referencia; printf 'Tabla maestra 2026-1\nAÑO,CICLO,CÓDIGO DEL ESTUDIANTE,CALIFICACIÓN\n2026,1,99000001,3\n' > db/referencia/maestra.txt; $RS"
caso_por "tabla maestra con BOM y una línea vacía falla" "regla de la tabla maestra" bash -c "mkdir -p db/referencia; printf '\357\273\277\nAÑO;CICLO;CÓDIGO DEL ESTUDIANTE;CALIFICACIÓN\n2026;1;99000001;3\n' > db/referencia/maestra.csv; $RS"
caso "un texto que nombra las columnas después de la línea 20 pasa" 0 bash -c "mkdir -p docs; { for i in \$(seq 1 20); do echo \"línea \$i\"; done; echo 'CÓDIGO DEL ESTUDIANTE y CALIFICACIÓN'; } > docs/notas.txt; $RS"
caso_por "tarjeta de profesor falla" "regla de las tarjetas" bash -c "mkdir -p docs/capacitacion; echo 'docente701@example.invalid' > docs/capacitacion/tarjeta_701.md; $RS"
caso_por "carpeta de tarjetas falla" "regla de las tarjetas" bash -c "mkdir -p docs/tarjetas; echo x > docs/tarjetas/701.pdf; $RS"
caso "componente con tarjeta en el nombre pasa" 0 bash -c "mkdir -p src/componentes; echo 'export {}' > src/componentes/TarjetaSeccion.tsx; echo 'export {}' > src/componentes/tarjeta_seccion.ts; $RS"

echo "Prueba de la revisión previa y del hook de memoria: $bien bien, $mal mal."
[ "$mal" -eq 0 ]
