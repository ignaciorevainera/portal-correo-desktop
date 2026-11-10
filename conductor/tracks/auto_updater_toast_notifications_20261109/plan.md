# Plan de Implementación (`plan.md`)
## Track: `auto_updater_toast_notifications_20261109`

### Fase 1: Lógica Desacoplada y Estado del Auto-Updater (`useAutoUpdateNotifier`) [checkpoint: c20164e]
- [x] Task: Pruebas Unitarias para el Manejador de Notificación de Actualizaciones (TDD Red) [47aca90]
  - [x] Escribir tests en `src/test/useAutoUpdateNotifier.test.ts` para verificar la ejecución diferida (delay de 4s).
  - [x] Validar que si `hasUpdate: false` o falla la red, el sistema permanece silente sin disparar notificaciones intrusivas.
  - [x] Validar que si el usuario elige "Ahora no", se registre la clave en `sessionStorage` y se ignore en la sesión.
  - [x] Ejecutar vitest y confirmar la fase roja (fallo esperado).
- [x] Task: Implementación del Hook `useAutoUpdateNotifier` (TDD Green & Refactor) [c20164e]
  - [x] Implementar `src/hooks/useAutoUpdateNotifier.ts` con control de ciclo de vida, chequeo diferido y soporte de descarte por sesión.
  - [x] Ejecutar vitest y confirmar que todos los tests unitarios pasen a verde.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) [c20164e]

### Fase 2: Integración de Toasts Interactivos (Sonner) y Flujos de Descarga/Reinicio [checkpoint: 4eb6558]
- [x] Task: Pruebas de Renderizado e Interacción de Toasts (TDD Red) [9c05ae9]
  - [x] Escribir tests unitarios que simulen las interacciones con `toast` de Sonner (clic en "Descargar", clic en "Ahora no", clic en "Instalar y reiniciar").
  - [x] Validar el reporte de progreso de descarga y el disparo del toast final de confirmación.
- [x] Task: Conexión de Notificaciones Toast y Activación en `App.tsx` (TDD Green) [4eb6558]
  - [x] Diseñar los toasts interactivos con Sonner respetando la estética del preset Shadcn (`action` y `cancel`).
  - [x] Conectar los manejadores `startDownloadUpdate` e `installUpdateNow`.
  - [x] Activar el hook en `src/App.tsx` condicionado a que el Gate de Seguridad esté en estado `READY`.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) [4eb6558]

### Fase 3: Verificación E2E, Regresiones y Quality Gates [checkpoint: 3f010e0]
- [x] Task: Coexistencia con Test Harness E2E [3f010e0]
  - [x] Garantizar que en modo E2E mock (`PCD_E2E_MODE=mock` o `isE2eMock`) el auto-updater respete el entorno de pruebas sin bloquear la navegación de Playwright.
  - [x] Añadir o actualizar escenarios en `e2e/specs/` para cubrir la aparición y descarte del toast de actualización.
- [x] Task: Ejecución de Quality Gates Completos [3f010e0]
  - [x] Ejecutar `npm test` (pruebas unitarias y cobertura >85%).
  - [x] Ejecutar `npm run build` (verificación de tipos de TypeScript y bundle de Vite).
  - [x] Ejecutar `npm run test:e2e` (suite completa de Playwright para Electron).
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) [3f010e0]
