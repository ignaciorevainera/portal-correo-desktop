# Implementation Plan: Empty State de Terminal Inexistente y Supresión de Auto-Scroll en Ping

## Phase 1: Empty State para Terminal No Encontrada (TDD) [checkpoint: ff599c0]
- [x] Task: Escribir pruebas unitarias (Red Phase) para el estado de búsqueda fallida (87bbc46)
  - [x] Escribir tests en `src/App.test.tsx` que verifiquen el estado inicial vs. estado no encontrado cuando la consulta no devuelve terminal.
  - [x] Validar que los tests fallen antes de implementar los cambios.
- [x] Task: Implementar lógica de estado no encontrado y componente UI (Green Phase) (c8e732e)
  - [x] Actualizar `App.tsx` con tracking de término buscado no encontrado (`notFoundTerm`).
  - [x] Diseñar el bloque visual del empty state con icono `SearchX`, nombre buscado, orientación técnica y botón para limpiar búsqueda.
  - [x] Hacer pasar todos los tests de la fase.
- [x] Task: Refactorización y verificación de cobertura de Fase 1
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) (ff599c0)

## Phase 2: Supresión Total de Auto-Scroll y Foco en Ping y Terminal (TDD) [checkpoint: c8d7b3b]
- [x] Task: Escribir pruebas unitarias (Red Phase) para eliminación de scrollIntoView (5495d40)
  - [x] Escribir tests en `src/test/LivePingConsole.test.tsx` verificando que la recepción de logs de ping no invoca `scrollIntoView`.
  - [x] Verificar que acciones de limpiar o iniciar ping no generan desplazamiento.
  - [x] Confirmar que los tests fallen antes de remover la lógica.
- [x] Task: Eliminar llamadas a scrollIntoView y asegurar ausencia de saltos de foco (Green Phase) (c8d7b3b)
  - [x] Remover `useEffect` de auto-scroll con `scrollIntoView` en `LivePingConsole.tsx`.
  - [x] Verificar que `App.tsx` mantenga el auto-ping al seleccionar PC sin forzar foco ni scroll a la consola.
  - [x] Asegurar que el contenedor de logs mantenga scroll puramente manual por el usuario.
  - [x] Hacer pasar todos los tests de la fase.
- [x] Task: Refactorización y verificación de cobertura de Fase 2
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) (c8d7b3b)

## Phase 3: Verificación Integral y Suite Completa
- [ ] Task: Ejecutar suite completa de tests y verificar calidad de código
  - [ ] Ejecutar `npm test` asegurando 100% de pruebas pasando sin regresiones.
  - [ ] Validar cobertura >80%.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
