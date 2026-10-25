# Implementation Plan: Empty State de Terminal Inexistente y Supresión de Auto-Scroll en Ping

## Phase 1: Empty State para Terminal No Encontrada (TDD)
- [ ] Task: Escribir pruebas unitarias (Red Phase) para el estado de búsqueda fallida
  - [ ] Escribir tests en `src/App.test.tsx` que verifiquen el estado inicial vs. estado no encontrado cuando la consulta no devuelve terminal.
  - [ ] Validar que los tests fallen antes de implementar los cambios.
- [ ] Task: Implementar lógica de estado no encontrado y componente UI (Green Phase)
  - [ ] Actualizar `App.tsx` con tracking de término buscado no encontrado (`notFoundTerm`).
  - [ ] Diseñar el bloque visual del empty state con icono `SearchX`, nombre buscado, orientación técnica y botón para limpiar búsqueda.
  - [ ] Hacer pasar todos los tests de la fase.
- [ ] Task: Refactorización y verificación de cobertura de Fase 1
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Supresión Total de Auto-Scroll y Foco en Ping y Terminal (TDD)
- [ ] Task: Escribir pruebas unitarias (Red Phase) para eliminación de scrollIntoView
  - [ ] Escribir tests en `src/test/LivePingConsole.test.tsx` verificando que la recepción de logs de ping no invoca `scrollIntoView`.
  - [ ] Verificar que acciones de limpiar o iniciar ping no generan desplazamiento.
  - [ ] Confirmar que los tests fallen antes de remover la lógica.
- [ ] Task: Eliminar llamadas a scrollIntoView y asegurar ausencia de saltos de foco (Green Phase)
  - [ ] Remover `useEffect` de auto-scroll con `scrollIntoView` en `LivePingConsole.tsx`.
  - [ ] Verificar que `App.tsx` mantenga el auto-ping al seleccionar PC sin forzar foco ni scroll a la consola.
  - [ ] Asegurar que el contenedor de logs mantenga scroll puramente manual por el usuario.
  - [ ] Hacer pasar todos los tests de la fase.
- [ ] Task: Refactorización y verificación de cobertura de Fase 2
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: Verificación Integral y Suite Completa
- [ ] Task: Ejecutar suite completa de tests y verificar calidad de código
  - [ ] Ejecutar `npm test` asegurando 100% de pruebas pasando sin regresiones.
  - [ ] Validar cobertura >80%.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
