# Plan de Implementación (`plan.md`)
## Track: `settings_updater_release_pipeline_20261025`

### Phase 1: Servicio In-App Updater en Electron y Bridge IPC (`updaterService.cjs` & `electronClient.ts`)
- [x] Task: Implementar lógica de comparación de versiones semánticas y consulta a GitHub Releases
  - [x] Write Failing Tests: Crear `src/test/updaterService.test.ts` evaluando: (1) comparación semántica de versiones (`v1.0.0` vs `v1.1.0`), (2) consulta mockeada a GitHub Releases endpoint y filtrado de assets (`.exe`), (3) reporte de progreso de descarga y errores de red.
  - [x] Implement to Pass Tests: Desarrollar `electron/updaterService.cjs` con soporte para verificación de releases públicas en GitHub y descarga controlada a directorio temporal.
  - [x] Implement to Pass Tests: Exponer canales IPC en `main.cjs` y `preload.cjs` (`cmda:check-updates`, `cmda:download-update`, `cmda:install-update-on-quit`) y cablear en `src/services/electronClient.ts`.
  - [x] Refactor & Coverage: Confirmar cobertura >85% en pruebas unitarias del updater.
- [x] Task: Phase 1 Verification & Checkpoint (Protocol in workflow.md) d0126e6

### Phase 2: Componente `SettingsModal.tsx` con Shadcn Radix (Actualizador & Preferencias)
- [x] Task: Construir diálogo de ajustes con pestañas (Actualizaciones, Preferencias y Diagnóstico)
  - [x] Write Failing Tests: Crear `src/test/SettingsModal.test.tsx` verificando: (1) renderizado de versión actual y botón de búsqueda, (2) estado *"Al día"*, (3) detección de nueva versión con notas de release y botón para confirmar descarga, (4) visualización del progreso en segundo plano y toast de reinicio, (5) toggles de preferencias (minimizar a bandeja, atajo global `Ctrl+Espacio`, ping por defecto).
  - [x] Implement to Pass Tests: Crear `src/components/SettingsModal.tsx` utilizando primitivas vanilla de Shadcn (`Dialog`, `Tabs`, `Switch`, `Badge`, `Progress`, `Button`, `Label`), con persistencia local de configuración vía `localStorage`.
  - [x] Refactor & Coverage: Validar accesibilidad del diálogo (foco, tecla `Escape`) y contraste en modo claro y oscuro.
- [x] Task: Phase 2 Verification & Checkpoint (Protocol in workflow.md)

### Phase 3: Integración de Botón CTA en `Topbar.tsx` y Cableado de Reinicio en `App.tsx`
- [~] Task: Integrar acceso a Ajustes en la barra superior y atajo global de teclado
  - [ ] Write Failing Tests: Actualizar `src/components/Topbar.test.tsx` y `src/App.test.tsx` para verificar la presencia del botón ⚙️ con tooltip, la respuesta al atajo de teclado (`F10`) y el disparo del toast de reinicio cuando la descarga en background finaliza.
  - [x] Implement to Pass Tests: Agregar botón de ajustes en `src/components/Topbar.tsx`, cablear apertura del modal y registrar listener para aplicar actualización al cerrar el aplicativo si el usuario no reinicia de inmediato.
  - [x] Refactor & Coverage: Ejecutar suite completa de tests de la interfaz.
- [x] Task: Phase 3 Verification & Checkpoint (Protocol in workflow.md)

### Phase 4: Empaquetado Dual (`electron-builder`) y Scripts de Release con Blindaje Zero-Secrets
- [ ] Task: Configurar `electron-builder` y script pre-release de auditoría obligatoria
  - [ ] Write Failing Tests: Crear test en `src/test/releaseGate.test.ts` que valide que el script de release falle si `securityAudit.test.ts` detecta cualquier secreto o IP privada en el repositorio.
  - [ ] Implement to Pass Tests: Instalar y configurar `electron-builder` en `package.json` para compilar los targets `nsis` (`.exe` de instalación) y `portable` (`.exe` autónomo sin instalación), integrando el script `npm run release:check` y `npm run release:build`.
  - [x] Refactor & Coverage: Validar compilación local de artefactos y verificación de 0 referencias a secretos en los bundles de distribución.
- [x] Task: Phase 4 Verification & Checkpoint (Protocol in workflow.md)
