# Implementation Plan: Ping de Sitio (Router .250 / Servidor .231)

## Phase 1: Lógica de derivación y secuenciación (TDD)
- [x] Task: Write Tests: helper `deriveSiteTargets(ip)` (`.250`, `.231`, IP inválida, ya `.250`)
- [x] Task: Implement helper en `src/utils/siteTargets.ts` [1e97888]
- [x] Task: Write Tests: secuencia de ping (equipo → .250, omitida si ya es .250, cancelación con Detener) [7711a2e]
- [x] Task: Implement estado de secuencia en `App.tsx` (objetivo activo, cola, etiqueta) [7711a2e]
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Consola con etiquetas
- [x] Task: Write Tests: `LivePingConsole` con prefijos `[ROUTER .250]` / `[SERVIDOR .231]` y separador [454339b]
- [x] Task: Implement prefijos y separador en la consola [454339b]
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: Botones manuales en QuickActionsBar
- [x] Task: Write Tests: split buttons Router .250 / Servidor .231 (-4 principal, -t en desplegable, cierre al hacer clic fuera) [8d1155f]
- [x] Task: Implement split buttons y props `onLaunchSitePing(target, mode)` en `QuickActionsBar.tsx` [8d1155f]
- [x] Task: Conectar handlers en `App.tsx` [8d1155f]
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4: Cierre
- [~] Task: Actualizar `product.md` y `tech-stack.md` (nueva capacidad)
- [ ] Task: Ejecutar suite completa, lint y typecheck
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
