# Track Plan: Racionalización de la Suite de Pruebas: Poda de JSDOM Redundante y Migración a Playwright E2E

## Phase 1: Migración de Flujos UI Faltantes a Playwright E2E (Context Menu & Info Modal) [checkpoint: c11339c]
- [x] Task: Crear `e2e/specs/08-operator-context-menu.spec.ts` validando clic derecho, opciones en 1 clic y acciones del menú contextual [27a3485]
- [x] Task: Crear `e2e/specs/09-info-modal.spec.ts` validando apertura de información del sistema, atajo/botón y visualización de versión [c11339c]
- [x] Task: Phase Verification & Checkpoint [c11339c]

---

## Phase 2: Poda de Archivos de Prueba JSDOM 100% Redundantes
- [~] Task: Eliminar suites de integración JSDOM redundantes de ciclo de vida (`src/App.test.tsx`, `src/test/AppInitialState.test.tsx`)
- [ ] Task: Eliminar suites de componentes redundantes con E2E (`SettingsModal.test.tsx`, `SubnetScannerDrawer.test.tsx`, `LivePingConsole.test.tsx`, `MonitorIntegration.test.tsx`, `MonitorWindow.test.tsx`, `Topbar.test.tsx`, `OperatorContextMenu.test.tsx`, `InfoModal.test.tsx`)
- [ ] Task: Eliminar suites de autoupdate JSDOM redundantes (`useAutoUpdateNotifier.test.ts`, `useAutoUpdateNotifierToast.test.ts`)
- [ ] Task: Phase Verification & Checkpoint

---

## Phase 3: Verificación Integral de Tiempos, Limpieza y Quality Gates
- [ ] Task: Ejecutar `npm test` y verificar reducción drástica de tiempo y eliminación de advertencias `act(...)`
- [ ] Task: Ejecutar `npm run test:e2e` confirmando que todas las specs (00 a 09) pasen en verde
- [ ] Task: Ejecutar `npm run release:check` para validar el gate final
- [ ] Task: Phase Verification & Checkpoint
