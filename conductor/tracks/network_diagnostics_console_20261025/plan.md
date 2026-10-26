# Implementation Plan: Consola General de Diagnóstico de Red e Historial Unificado con Comandos Nativos (Nbtstat, Tracert, ARP)

## Phase 1: Backend Native Diagnostics Runners & IPC Streaming
- [ ] Task: TDD tests y ejecución de comandos nativos en `electron/systemTools.cjs`
  - [ ] Escribir pruebas unitarias en `src/services/systemTools.test.ts` para `executeNbtstat`, `executeTracert`, `executeArp` y control de procesos hijos concurrentes.
  - [ ] Implementar `executeNbtstat`, `executeTracert`, `executeArp` en `electron/systemTools.cjs` con sanitización estricta (`sanitizeHostOrIp`) y streaming de `stdout`/`stderr`.
  - [ ] Verificar pruebas unitarias en verde (`npx.cmd vitest run src/services/systemTools.test.ts`).
- [ ] Task: Canales IPC y cliente frontend (`electron/main.cjs`, `electron/preload.cjs`, `src/services/electronClient.ts`)
  - [ ] Escribir pruebas unitarias en `src/services/electronClient.test.ts` para el canal unificado de comandos de diagnóstico.
  - [ ] Registrar manejadores `cmda:cmd-start` y `cmda:cmd-stop` en `electron/main.cjs` con detención automática del proceso anterior.
  - [ ] Exponer funciones en `electron/preload.cjs` e implementar `subscribeToDiagnosticCommand` y `stopDiagnosticCommand` en `src/services/electronClient.ts` con modo simulación para navegador/tests.
  - [ ] Verificar que las pruebas de cliente e IPC pasen en verde.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Consola de Diagnóstico con Historial Continuo y Supresión de "Iniciar"
- [ ] Task: TDD tests y actualización de la consola (`LivePingConsole.tsx` / `src/test/LivePingConsole.test.tsx`)
  - [ ] Actualizar `src/test/LivePingConsole.test.tsx` verificando la eliminación del botón redundante "Iniciar", la permanencia del botón "Detener" durante ejecución, y la acumulación secuencial de comandos en el historial.
  - [ ] Modificar `LivePingConsole.tsx` para aceptar eventos de comandos genéricos, renderizar bloques de historial ordenados cronológicamente (`[HH:mm:ss] > comando`) y mantener "Limpiar" y "Copiar Logs" de todo el historial acumulado.
  - [ ] Confirmar paso de pruebas de la consola (`npx.cmd vitest run src/test/LivePingConsole.test.tsx`).
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: Menú "Diagnóstico ▾" en QuickActionsBar e Integración en App.tsx
- [ ] Task: TDD tests y Menú Dropdown en `QuickActionsBar.tsx`
  - [ ] Escribir pruebas en `src/test/QuickActionsBar.test.tsx` para el nuevo menú compacto "Diagnóstico ▾" con opciones para Nbtstat, Tracert y ARP.
  - [ ] Implementar el menú desplegable en `src/components/QuickActionsBar.tsx` preservando el layout en 1020x680 y los botones existentes (Split Remote, Ping 2:1, Uptime).
  - [ ] Verificar pruebas de la barra de acciones en verde.
- [ ] Task: Orquestación integral en `src/App.tsx` y validación de regresión
  - [ ] Conectar los disparadores de diagnóstico en `src/App.tsx` para cancelar cualquier proceso en streaming previo, anexar la salida a la consola y limpiar el historial cuando se selecciona una nueva terminal.
  - [ ] Ejecutar auditoría completa de seguridad Zero-Secrets y suite completa (`npx.cmd vitest run`) asegurando 100% verde sin regresiones.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
