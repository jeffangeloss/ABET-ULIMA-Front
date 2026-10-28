# Reglas para agentes y personas

Este archivo lo leen Claude Code (a través de `CLAUDE.md`), Codex y cualquier persona que trabaje en el repositorio. Las reglas valen igual para todos.

1. **Primero se lee `MEMORIA.md`.** Su sección «Punto actual» dice dónde quedó el trabajo, qué está en curso y cuál es el siguiente paso.
2. **Cada cambio actualiza `MEMORIA.md` en el mismo commit.** Se actualiza «Punto actual» y se agrega una entrada nueva al comienzo del «Registro» con la plantilla del propio archivo. La entrada dice qué cambió, por qué, cómo se probó lo que debe hacer, cómo se probó lo que no debe hacer, qué se corrigió y cómo se reporta. El hook `pre-commit` y el check `pruebas` de la CI rechazan un cambio sin esa entrada.
3. **Nada se implementa sin una spec aprobada.** Las specs viven en `specs/` de ABET-ULIMA-Back y cada historia trae sus escenarios en Gherkin en español (`# language: es`). Cada pantalla nombra las historias que la justifican, y lo que ninguna historia pide no se muestra.
4. **Ramas.** Se trabaja en `feat/*`, `fix/*`, `docs/*`, `chore/*`, `test/*` o `refactor/*`, que salen de `develop` y vuelven por PR. Nadie empuja directo a `main` ni a `develop`. `main` solo recibe la versión desde `develop` o un `hotfix/*` (`docs/devops.md`).
5. **Autoría.** Los commits y los PR van solo a nombre de Jefferson (identidad de git `Jeffangeloss`), sin `Co-Authored-By` ni firmas de herramientas. Nada se empuja sin su permiso explícito.
6. **Datos.** Solo datos inventados (códigos de estudiante de 99000000 a 99999999) en el repositorio, en las pruebas y en las capturas, hasta que la universidad autorice los reales (Ley 29733 y DS 016-2024-JUS). Nunca se muestran nombres de estudiantes.
7. **Secretos.** Ninguna credencial en el repositorio, en el código que llega al navegador ni en los registros. Las variables `VITE_*` son públicas por diseño y nunca llevan secretos.
8. **Pruebas.** Cada prueba nueva cubre lo que debe pasar y lo que no debe pasar. El resultado se reporta con el comando y su salida resumida, en el PR y en `MEMORIA.md`.
9. **Delegación.** Cuando un agente reparte trabajo entre subagentes, la entrada de `MEMORIA.md` dice qué hizo cada uno y qué se verificó de su trabajo antes de aceptarlo.
