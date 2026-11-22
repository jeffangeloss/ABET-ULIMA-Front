# ADR-009: Las causas y las acciones de mejora se declaran en el sistema y el R-17 las escribe desde la base

| | |
|---|---|
| **Estado** | Aceptada y vigente (spec 005 del Back, aprobada por Jefferson en el chat el 2026-11-18) |
| **Fecha** | 2026-11-18 |
| **Enmienda** | ADR-005 (su frase «El profesor escribe a mano las causas, las acciones y el comentario.» y su invariante 2) y ADR-008 (su invariante 8), a partir de la aprobación de la spec 005 |
| **Ámbito** | Las rutas 13 a 16 de `docs/03-api/contrato.md` (sección 13), `abet.mejora_borrador`, `abet.mejora_declaracion`, `abet.plan_medicion.descripcion_instrumento`, `abet_carga/r17.py`, `abet_carga/resultados.py`, `app/permisos.py`, `src/pantallas/ResultadoCarga.tsx` (P4), `src/App.tsx` y `src/servicios/api.ts` |

> **Cambio del 2026-11-21 (propuesta, pendiente de reaprobación de Jefferson).** El cambio de la spec 005 del Back (Clarification «Session 2026-11-21») enmienda este ADR. La declaración deja de ser un par de textos por carga y pasa a un registro por indicador de desempeño (performance indicator, PI), con una causa y una acción que el semáforo rotula como oportunidad de mejora o como buena práctica (D-39). V1_12 crea cuatro tablas en lugar de dos (J-38), cada campo admite hasta 800 puntos de código (J-39) y el R-17 compone los recuadros A y B con un párrafo por PI (D-41). Las secciones 13.2 a 13.6 del contrato traen la forma propuesta. El texto de abajo, la consulta 1 de «Cómo se verifica» y las columnas `causas` y `acciones` siguen la versión del 2026-11-18 hasta que la tarea T011 de la spec 005 los reescriba. La versión del borrador que evita que dos pestañas se pisen es AD-19.

## Decisión

Hoy el R-17 sale con los recuadros A (causas) y B (acciones) vacíos, y el profesor los completa a mano en el archivo descargado. Ese texto no pasa por el sistema, así que la base no lo guarda, nadie comprueba que exista y el reporte que llega a la acreditación puede salir sin él. La spec 005 propone que el profesor declare las causas y las acciones en P4, que la base las guarde y que el R-17 las escriba en B29 y B34 desde la última declaración (US-47 y US-50, J-30).

El borrador vive en `abet.mejora_borrador`, con una fila por carga y una `version` entera que evita que dos pestañas se pisen, y se guarda solo mientras el profesor escribe (US-48). La declaración vive en `abet.mejora_declaracion`, a la que la aplicación solo inserta, y la vigente de una carga es la última. Corregir es declarar otra vez, y la declaración anterior queda guardada (D-37). Escribe solo el profesor asignado, por una función propia `puede_declarar()`, y el coordinador lee la declaración sin recibir el borrador (J-33).

El R-17 solo se entrega con una declaración. La ruta 7 responde 409 a una carga publicada sin ella, también al coordinador, y P4 pasa a ser el único lugar que ofrece «Descargar R-17», mientras P2, P5 y P6 llevan a P4 (US-49, J-32). El 409 alcanza a toda carga publicada antes de la migración V1_12, sin excepción por fecha (J-37), y por eso el Front se despliega antes que el Back.

La spec 005 suma además el semáforo de la carga en P4. La ruta 13 entrega los conteos por nivel, el logro, la meta y un `semaforo` que decide una función pura del Back con `en_meta` y CORTE_ROJO, de modo que el Front no compara cifras (US-45 y US-46, J-29). Por eso P4 deja de ocultar los porcentajes del R-17.

Como la declaración es texto libre, el riesgo de datos personales cambia. La ruta 15, la ruta 16 y dos restricciones CHECK de la base usan el mismo patrón ASCII para rechazar códigos de estudiante y correos, y P4 recuerda no escribir nombres. Un nombre no se detecta, y Jefferson acepta que BR-R17-07 y la regla 6 de `AGENTS.md` se cumplan en estos dos campos por aviso y no por construcción (US-53, J-36).

Las decisiones de arquitectura de la spec 005 que esta decisión recoge son AD-05 (borrador en la base con guardado automático), AD-19 (versión del borrador), AD-10 (normalización del texto), AD-11 (códigos y correos), AD-13 y AD-14 (navegación por el fragmento) y AD-24 (P4 único lugar del R-17).

## Enmiendas a ADR-005 y ADR-008

1. **ADR-005, frase del cuerpo.** «El profesor escribe a mano las causas, las acciones y el comentario.» deja de valer, porque las causas y las acciones salen de la declaración guardada y la hoja no tiene recuadro de comentario (el recuadro de comentario de BR-R17-04 se cierra). El texto de ADR-005 se corrige al aprobar la spec 005 (tarea T011).
2. **ADR-005, invariante 2.** «Ninguna celda del libro empieza por "="» pasa a «Ninguna celda del libro es una fórmula» (J-35). La declaración puede empezar por «=», como «=SUMA(1;2)», y el libro la escribe como cadena de texto y no como fórmula.
3. **ADR-008, invariante 8.** «P2 y P4 siguen sin mostrar porcentajes, que solo muestran P6 y el R-17.» pasa a que P4 muestra los porcentajes del semáforo con las cifras de la ruta 13, que son las del R-17 de la misma carga (US-46 y J-35). P2 sigue sin mostrarlos.

El invariante 1 de ADR-005 y los invariantes 1 a 7 de ADR-008 siguen vigentes. Las cifras de la ruta 13 amplían el invariante 1 de ADR-008.

## Invariantes

1. Cada cifra de la ruta 13 es igual a la de la fila de la misma carga en `abet.v_r17_por_pi` y a la del bloque II y la tabla K28:Q31 de su R-17.
2. `semaforo` sale de una sola función pura del Back. VERDE coincide siempre con `en_meta` verdadero, y el Front no compara cifras.
3. Un PI sin calificaciones es SIN_DATO y nunca ROJO ni 0 % en pantalla.
4. `abet_app` solo inserta en `abet.mejora_declaracion`, y la declaración vigente de una carga es la última fila. Ninguna declaración se modifica ni se borra.
5. Escribe el borrador y la declaración únicamente el profesor asignado a la sección, y el coordinador nunca recibe el texto del borrador.
6. Las rutas 15 y 16 responden en el orden 401, 403, 422 y 409, y leen el cuerpo después de comprobar el alcance.
7. El R-17 de una carga PUBLICADA sin declaración responde 409, para el profesor y para el coordinador. El 409 de una carga no PUBLICADA manda sobre el de la declaración.
8. Las rutas 13 a 16 responden `Cache-Control: no-store`, y ninguna trae códigos, nombres ni correos de estudiantes.
9. Las causas y las acciones no contienen un código de estudiante de 8 dígitos ni un correo, por validación de las rutas y por CHECK, y ni la respuesta ni el registro repiten el texto rechazado.
10. El libro del R-17 no contiene ninguna fórmula, y B29 y B34 llevan el texto de la última declaración como cadena.
11. P4 es el único lugar que ofrece «Descargar R-17», y ningún enlace del Front abre un 409 en JSON.
12. El borrador se guarda en la base y nunca en `localStorage` ni en `sessionStorage`, y un 401 durante el guardado no hace perder el texto.
13. `history.state` lleva solo la ruta y una marca del ingreso, nunca la constancia ni el borrador.

## Alternativas consideradas

**Dejar los recuadros A y B a mano en el archivo.** Se descarta porque la base no guarda el texto, nadie comprueba que exista y el R-17 puede llegar a la acreditación con A y B vacíos (US-49).

**Un solo texto editable, sin borrador ni declaración.** Se descarta porque un R-17 ya descargado perdería su respaldo al editar y porque el guardado automático dejaría un texto a medias como oficial. La declaración de solo INSERT conserva cada versión declarada (J-30).

**Sumar el estado de la declaración a `GET /api/secciones`, `GET /api/cargas` y la ruta 12**, para que P2, P5 y P6 sigan ofreciendo el R-17. Se descarta para la spec 005 porque amplía tres rutas y repite la regla en tres pantallas. P4 como único lugar mantiene una sola regla (J-32).

**Guardar el borrador en `localStorage`.** Se descarta porque no cruza equipos ni sesiones, queda en el navegador y rompe la regla de que ningún dato de sesión va al almacenamiento del navegador (J-30).

**Que el Front calcule el semáforo.** Se descarta por la misma razón que en ADR-008, porque abre una segunda regla de la meta y su redondeo puede diferir del de la vista (J-29).

**Rutas literales por pantalla en `vercel.json`** para el botón atrás. Se descarta porque la regla 7 de `scripts/preflight.sh` rechaza rutas literales fuera de `/api`, y el fragmento de la dirección no necesita servidor (J-34).

**Excepción por fecha para las cargas publicadas antes de V1_12.** Se descarta porque cada R-17 tiene que traer A y B desde la base, así que la 410 y la 411 quedan en 409 hasta declarar (J-37).

**Que el coordinador escriba la declaración.** Queda fuera de alcance. Si el profesor no declara, la salida es reasignar la sección en `acceso.docente_seccion` (J-33).

## Consecuencias

- El contrato suma la sección 13, la ruta 7 gana un 409, y la tabla resumen de la sección 2 y la sección 10 se ajustan al aprobar (tarea T011).
- La migración V1_12 crea las dos tablas y sus restricciones, `crear_rol_app.sql` da a `abet_app` los permisos exactos, y V1_11 agrega la descripción del instrumento, que el R-17 escribe en G17:I19. Esas migraciones se corren desde el Windows de Jefferson (J-31).
- Toda carga publicada antes de V1_12 queda en 409 hasta declarar, así que el Front se despliega primero, tolerante a un 404 de la ruta 13, y el Back después (J-37).
- Las pruebas de P4 sin porcentajes y los escenarios 1 a 4 de US-15 cambian, porque ahora declaran antes de descargar.
- Un nombre de estudiante escrito en el texto no se detecta, y el cumplimiento de BR-R17-07 en esos dos campos descansa en el aviso de P4.
- La descripción del SO en B15, quién declaró, la marca «Declaración pendiente» en P2 y P5, la reunión de mejora y las acciones con responsable quedan fuera de esta spec.

## Cómo se verifica

Los criterios se corren cuando exista el código, contra la base desechable de las pruebas o contra la vista previa (Preview) de `develop`, nunca contra Production. Los nombres de tablas, columnas y restricciones son propuestas de la spec 005.

```sql
-- 1. Ninguna declaración ni borrador guarda un código de estudiante de 8 dígitos ni un correo (control Q16 de db/pruebas/pruebas.sql).
-- El patrón de la consulta es ilustrativo, y el exacto es el de las restricciones CHECK de la base.
-- Esperado: 0 filas.
SELECT 'borrador' AS tabla, carga_id FROM abet.mejora_borrador
WHERE causas ~ '(^|[^0-9])[0-9]{8}($|[^0-9])' OR acciones ~ '(^|[^0-9])[0-9]{8}($|[^0-9])' OR causas ~ '@' OR acciones ~ '@'
UNION ALL
SELECT 'declaracion', carga_id FROM abet.mejora_declaracion
WHERE causas ~ '(^|[^0-9])[0-9]{8}($|[^0-9])' OR acciones ~ '(^|[^0-9])[0-9]{8}($|[^0-9])' OR causas ~ '@' OR acciones ~ '@';
```

```bash
# 2. Sin declaración, el R-17 de la 410 responde 409 (Preview, con la sesión de prueba de docente410).
#    Esperado: una línea con 409 y otra con «cache-control: no-store».
curl -s -o /dev/null -D - -b "$COOKIES_PRUEBA" "$URL_FRONT/api/cargas/$CARGA_410/r17.xlsx" | grep -i -E '^HTTP|^cache-control'
```

```bash
# 3. Las rutas 13 a 16 responden sin sesión con 401 y no-store (Preview).
#    Esperado: cuatro pares de líneas, con 401 y «cache-control: no-store».
for ruta in indicadores mejora; do
  curl -s -o /dev/null -D - "$URL_FRONT/api/cargas/$CARGA_410/$ruta" | grep -i -E '^HTTP|^cache-control'
done
curl -s -o /dev/null -D - -X PUT -H 'Content-Type: application/json' -d '{}' "$URL_FRONT/api/cargas/$CARGA_410/mejora/borrador" | grep -i -E '^HTTP|^cache-control'
curl -s -o /dev/null -D - -X POST -H 'Content-Type: application/json' -d '{}' "$URL_FRONT/api/cargas/$CARGA_410/mejora/declaracion" | grep -i -E '^HTTP|^cache-control'
```

```bash
# 4. El Front no usa el almacenamiento del navegador (raíz del Front).
#    Esperado: «0».
grep -rEn "localStorage|sessionStorage" src | wc -l | tr -d ' '
```

## Lo que todavía NO está

1. **El código.** Las rutas 13 a 16, V1_11, V1_12, P4 con el formulario y la navegación por el fragmento no existen todavía, así que los criterios esperan a la implementación.
2. **Las decisiones de la carrera.** D-35 (valor de CORTE_ROJO), D-36 (si una sección en la meta también declara), D-37 (si el profesor corrige tras descargar) y D-34 (quién redacta la descripción del instrumento) siguen abiertas.
3. **La edición de ADR-005 y de ADR-008**, que se hace con la tarea T011 de la spec 005. Hasta entonces, este ADR manda donde los dos dicen otra cosa.
