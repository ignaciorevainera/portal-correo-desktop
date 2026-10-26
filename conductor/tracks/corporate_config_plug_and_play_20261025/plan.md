# Plan de Implementación: Importación de Configuración Corporativa en Ajustes, Autodescubrimiento en Arranque y Empaquetado Interno Plug & Play

## Protocolo de Trabajo
- Seguir estrictamente TDD (Red -> Green -> Refactor) según el estándar del proyecto.
- Ejecutar verificación automatizada y compuerta de seguridad Zero-Secrets en cada fase.

---

### Phase 1: Servicio de Configuración en Electron (Autodescubrimiento y Persistencia en %APPDATA%)
- [ ] Task: Extender `configManager.cjs` y handlers IPC de Electron
  - [ ] Write Failing Tests: Crear `src/test/corporateConfigDiscovery.test.ts` verificando la resolución jerárquica de archivos (`%APPDATA%`, `process.execPath`, `.env`), importación de JSON/ENV, prueba de conexión y borrado de configuración.
  - [ ] Implement to Pass Tests: Actualizar `electron/configManager.cjs` y `electron/main.cjs` con soporte para resolver la carpeta de datos de usuario de Electron (`app.getPath('userData')`), handlers IPC `cmda:import-config-file`, `cmda:test-sql-connection`, `cmda:clear-config` y actualización dinámica del pool de SQL Server.
  - [ ] Refactor & Coverage: Actualizar `electronClient.ts` y tipos correspondientes. Ejecutar tests unitarios de configuración.
- [x] Task: Phase 1 Verification & Checkpoint (Protocol in workflow.md)

### Phase 2: Pestaña "Conexión Corporativa" en `SettingsModal.tsx`
- [ ] Task: Diseñar e implementar la pestaña de gestión de configuración en el Modal de Ajustes
  - [ ] Write Failing Tests: Actualizar `src/test/SettingsModal.test.tsx` verificando la presencia de la pestaña "Conexión", los botones de importar archivo, testear conexión, estado en tiempo real y eliminar configuración.
  - [ ] Implement to Pass Tests: Integrar en `src/components/SettingsModal.tsx` la nueva pestaña con Shadcn UI (Badge de estado, botón con input file y soporte para selector nativo de Windows, feedback sonner y visualización segura sin contraseñas).
  - [x] Refactor & Coverage: Validar accesibilidad, tema claro/oscuro y reactividad al conectar o desconectar SQL.
- [x] Task: Phase 2 Verification & Checkpoint (Protocol in workflow.md)

### Phase 3: Pipeline de Empaquetado Interno Plug & Play (`release:internal`)
- [ ] Task: Configurar script de empaquetado corporativo para distribución interna
  - [ ] Write Failing Tests: Crear test en `src/test/internalReleasePackaging.test.ts` que valide que el script `release:internal` empaque con archivo maestro opcional y que `release:build` siga estrictamente libre de secretos.
  - [ ] Implement to Pass Tests: Añadir script y lógica de empaquetado en `package.json` y scripts de build para compilar `Portal-Correo-Desktop-Setup-Corporativo.exe` inyectando la configuración en el instalador si existe localmente.
  - [ ] Refactor & Coverage: Validar compilación, ejecución de tests y asegurar que `release/` y archivos sensibles sigan ignorados en `.gitignore`.
- [ ] Task: Phase 3 Verification & Checkpoint (Protocol in workflow.md)
