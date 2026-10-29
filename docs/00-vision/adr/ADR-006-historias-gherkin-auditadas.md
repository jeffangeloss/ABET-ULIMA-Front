# ADR-006: Ninguna historia entra a la spec sin Gherkin en español y sin pasar la auditoría de refutación

| | |
|---|---|
| **Estado** | Propuesta, pendiente de Jefferson |
| **Fecha** | 2026-10-28 |
| **Ámbito** | `specs/001-mvp-carga-r17/` del Back, `specs/001-mvp-carga-r17/revision-historias.md`, `specs/001-mvp-carga-r17/aceptacion/*.feature`, `tests/aceptacion/pasos/`, `docs/specs/workflow.md` del Front |

## Decisión

Cada historia del sistema nace con escenarios en Gherkin en español (`# language: es`), con datos literales inventados y resultados que se comprueban en la base o en el archivo (conteos, estados, motivos y restricciones). Cada historia nombra las tablas, restricciones y consultas de control que toca, y la pantalla donde ocurre.

Antes de entrar a la spec, las historias pasan una auditoría de refutación. Tres escritores las proponen desde ángulos distintos (el profesor, el coordinador con la base, y la evidencia y la privacidad), tres lentes intentan refutarlas (necesidad frente al objetivo, solapamiento y tamaño, y verificabilidad contra la base real) y un crítico ataca las decisiones técnicas. Los veredictos posibles son SOBREVIVE, REFUTADA, MOVER_A_DESPUES, FUSIONAR, PARTIR y CORREGIR. En el MVP, ninguna de las 25 candidatas (C-01 a C-25) se refuta del todo, la auditoría corrige 15, fusiona 8 y parte 7, y el resultado son las 21 historias finales US-01 a US-21.

Los escenarios viven en un solo lugar, `specs/001-mvp-carga-r17/aceptacion/` del Back, repartidos en siete archivos, que son `base_neon.feature` (US-01 a US-04), `acceso.feature` (US-05, US-06 y US-20), `carga.feature` (US-07 a US-14 y US-21), `r17_constancia.feature` (US-15 y US-16), `despliegue.feature` (US-17), `reemplazo_y_cargas.feature` (US-18 y US-19) y `varias_secciones.feature`. Este último reúne los seis escenarios del profesor que dicta varias secciones (US-06, US-07, US-09 y US-13). Los pasos viven en `tests/aceptacion/pasos/` y leen esos archivos desde su carpeta con `scenarios()` de pytest-bdd y la ruta relativa, así que nadie los copia ni los mueve a `tests/`. La spec lista, por historia, el archivo donde vive cada escenario, y cada escenario lleva su etiqueta `@US-NN` y `@corte1` o `@corte2`.

El Gherkin ejecutable cubre la carga y el R-17. El resto de las historias conserva su Gherkin como criterio escrito y se prueba con pytest. El primer día de la fase de contrato se prueba durante 30 minutos pytest-bdd 9 con un `.feature` que use Característica, Antecedentes, Esquema del escenario y Ejemplos. Si falla, se usa behave con `lang = es`. Una sola prueba de humo (recorrido mínimo de punta a punta que confirma que el sistema desplegado responde) con Playwright para Python ingresa, sube el export con el 5 en la fila 3, ve 11 leídas, 10 aceptadas y 1 rechazada y descarga el R-17 con 60,0 / 60,0 / 70,0.

## Invariantes

1. Todo `.feature` empieza con `# language: es`.
2. Toda historia de la spec tiene al menos un escenario y la spec dice en qué `.feature` vive.
3. Ninguna pantalla muestra algo que ninguna historia pide (`01-arquitectura/frontend.md`).
4. Los escenarios usan solo datos inventados, con códigos de 99000000 a 99999999 y correos de prueba `@example.invalid`. Los únicos códigos fuera de ese rango son los ejemplos de la guardia de US-08, que existen para probar el rechazo.
5. Cada prueba cubre lo que debe pasar y lo que no debe pasar.
6. `revision-historias.md` guarda el veredicto de cada lente por candidata, con los identificadores C-NN, y la historia final US-NN que la absorbe.

## Alternativas consideradas

**Historias en prosa con criterios en viñetas.** Se descarta porque no se pueden ejecutar ni comparar contra la base, y la regla de Jefferson es que la arquitectura de la base define las historias.

**Gherkin ejecutable en todas las historias.** Se descarta para el MVP porque enlazar cada paso en español cuesta tiempo en cada historia y las consultas de control Q01 a Q14 ya son la especificación ejecutable de la base.

**Copiar los `.feature` a `tests/aceptacion/features/`.** Se descarta porque dos copias se separan con el primer cambio, y la spec, que es la fuente revisada, dejaría de ser la que se ejecuta.

**Selenium para la prueba de humo.** Se descarta por Playwright, que trae esperas automáticas, trazas y una skill oficial en Python.

## Consecuencias

- La auditoría suma horas antes de la spec y ahorra historias que no sirven al objetivo o que no se pueden verificar.
- Si pytest-bdd no lee los escenarios en español, el Back adopta behave y cambia la carpeta de pasos, sin cambiar los `.feature`.
- Dónde corre la prueba de humo queda en J-09 («La prueba de humo corre en la CI o contra la vista previa»). El valor provisional es contra el entorno Preview (vista previa) de Vercel desde `develop` antes de pasar a `main`, y la prueba de humo no corre en el entorno Production (producción).

## Criterios de aceptación

```bash
# 1. Todo .feature declara el idioma (raíz del Back).
#    Esperado: sin salida (ningún archivo sin la línea).
grep -L '^# language: es' specs/001-mvp-carga-r17/aceptacion/*.feature
```

```bash
# 2. Toda historia de la spec aparece como etiqueta en algún .feature (raíz del Back).
#    Esperado: sin salida.
for us in $(grep -oE 'US-[0-9]{2}' specs/001-mvp-carga-r17/spec.md | sort -u); do
  grep -rq "@$us" specs/001-mvp-carga-r17/aceptacion/ || echo "$us sin escenario"
done
```

```bash
# 3. Los .feature solo traen códigos inventados, salvo los ejemplos de la guardia de US-08 (raíz del Back).
#    Esperado: solo 10000004 y 98999999.
grep -rhoE '\b[0-9]{8}\b' specs/001-mvp-carga-r17/aceptacion/ | grep -v '^99' | sort -u
```

```bash
# 4. Cada escenario lleva su corte con la forma fija (raíz del Back).
#    Esperado: sin salida (ninguna etiqueta @corte_2 ni otra variante).
grep -rnoE '@corte[^12 ]\S*' specs/001-mvp-carga-r17/aceptacion/
```

```bash
# 5. Los escenarios de la carga se ejecutan desde la carpeta de la spec (raíz del Back).
#    Esperado: todos pasan, incluido el caso 11 / 10 / 1.
pytest tests/aceptacion
```

## Lo que todavía NO está

1. **La prueba de pytest-bdd en español.** Ni pytest-bdd ni behave están instalados todavía en la Mac de Jefferson.
2. **La decisión J-09** sobre dónde corre la prueba de humo, con el valor provisional de esta página.
3. **`tests/aceptacion/pasos/`.** La carpeta de pasos no existe todavía, y se escribe en la fase de pruebas del plan.
