# Plan de Implementación (`plan.md`)
## Track: `auto_updater_toast_notifications_20261109`

### Fase 1: Lógica Desacoplada y Estado del Auto-Updater (`useAutoUpdateNotifier`)
- [ ] Task: Pruebas Unitarias para el Manejador de Notificación de Actualizaciones (TDD Red)
  - [ ] Escribir tests en `src/test/useAutoUpdateNotifier.test.ts` para verificar la ejecución diferida (delay de 4s).
  - [ ] Validar que si `hasUpdate: false` o falla la red, el sistema permanece silente sin disparar notificaciones intrusivas.
  - [ ] Validar que si el usuario elige "Ahora no", se registre la clave en `sessionStorage` y se ignore en la sesión.
  - [ ] Ejecutar vitest y confirmar la fase roja (fallo esperado).
- [ ] Task: Implementación del Hook `useAutoUpdateNotifier` (TDD Green & Refactor)
  - [ ] Implementar `src/hooks/useAutoUpdateNotifier.ts` con control de ciclo de vida, chequeo diferido y soporte de descarte por sesión.
  - [ ] Ejecutar vitest y confirmar que todos los tests unitarios pasen a verde.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

### Fase 2: Integración de Toasts Interactivos (Sonner) y Flujos de Descarga/Reinicio
- [ ] Task: Pruebas de Renderizado e Interacción de Toasts (TDD Red)
  - [ ] Escribir tests unitarios que simulen las interacciones con `toast` de Sonner (clic en "Descargar", clic en "Ahora no", clic en "Instalar y reiniciar").
  - [ ] Validar el reporte de progreso de descarga y el disparo del toast final de confirmación.
- [ ] Task: Conexión de Notificaciones Toast y Activación en `App.tsx` (TDD Green)
  - [ ] Diseñar los toasts interactivos con Sonner respetando la estética del preset Shadcn (`action` y `cancel`).
  - [ ] Conectar los manejadores `startDownloadUpdate` e `installUpdateNow`.
  - [ ] Activar el hook en `src/App.tsx` condicionado a que el Gate de Seguridad esté en estado `READY`.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

### Fase 3: Verificación E2E, Regresiones y Quality Gates
- [ ] Task: Coexistencia con Test Harness E2E
  - [ ] Garantizar que en modo E2E mock (`PCD_E2E_MODE=mock` o `isE2eMock`) el auto-updater respete el entorno de pruebas sin bloquear la navegación de Playwright.
  - [ ] Añadir o actualizar escenarios en `e2e/specs/` para cubrir la aparición y descarte del toast de actualización.
- [ ] Task: Ejecución de Quality Gates Completos
  - [ ] Ejecutar `npm test` (pruebas unitarias y cobertura >85%).
  - [ ] Ejecutar `npm run build` (verificación de tipos de TypeScript y bundle de Vite).
  - [ ] Ejecutar `npm run test:e2e` (suite completa de Playwright para Electron).
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
