# Implementation Plan: Optimización Integral de Rendimiento, SQL/IPC, Cold Start, Escáner de Subred y Renderizado

## Phase 1: Paralelización SQL/IPC, Caché de Sondeo Remoto y Cold Start (Main Process)
- [x] Task: Write Tests: ejecución en paralelo de SPs secundarios en `dbService.getTerminalInfo` y carga diferida de `mssql` [71aaf8b]
- [x] Task: Implement paralelización (`Promise.allSettled`) en `electron/dbService.cjs` y pre-calentamiento no bloqueante del pool en `electron/main.cjs` [5361a86]
- [x] Task: Write Tests: caché con TTL en `probeRemotePorts`, caché de `getVncViewerPath`, `cleanupStaleVncFilesAsync` y caché de secreto VNC en `UncConfigProvider` [5bf6a79]
- [x] Task: Implement optimizaciones en `electron/systemTools.cjs`, `electron/configProvider.cjs` y `electron/main.cjs` (`requestSingleInstanceLock` temprano, `ready-to-show`, limpieza VNC asíncrona diferida) [ea919bc]
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Escáner de Subred `/24` con Worker Pool Continuo y Descubrimiento en 2 Fases
- [x] Task: Write Tests: `scanSubnetBatch` con Worker Pool deslizante (sin bloqueo por host con DNS lento) y emisión en 2 fases (host vivo inmediato + actualización de hostname) [b867d75]
- [x] Task: Implement Worker Pool continuo y emisión en 2 fases en `electron/subnetScanner.cjs` [3b5a07e]
- [~] Task: Write Tests: actualización in-place de hostname por IP, filtrado memorizado y throttling de progreso en `SubnetScannerDrawer.tsx`
- [ ] Task: Implement actualización in-place, `useMemo`, `React.memo` y throttling de progreso en `src/components/SubnetScannerDrawer.tsx`
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: Consola `LivePingConsole` `O(1)`, React 19 Memoization, Lazy Loading y Software Rendering
- [ ] Task: Write Tests: `LivePingConsole` con entradas estructuradas (`id` estable al superar 400 líneas, pre-clasificación de `tone` y preservación de controles)
- [ ] Task: Implement modelo de líneas `{ id, text, tone }` en `O(1)` y scroll con `requestAnimationFrame` en `src/components/LivePingConsole.tsx`
- [ ] Task: Write Tests: renderizado estable y carga diferida de modales/drawers en `App.tsx` y `Topbar.tsx`
- [ ] Task: Implement `React.memo` (`TerminalIdentity`, `TerminalDetailsGrid`, `ActivityPanel`), `React.lazy` + `Suspense` para diálogos secundarios, limpieza en `App.tsx` y optimización CSS sin `backdrop-blur` en `Topbar.tsx`
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4: Verificación Integral, Auditoría de Contraste/Seguridad y Documentación
- [ ] Task: Actualizar `conductor/product.md` y `conductor/tech-stack.md` documentando la arquitectura de rendimiento optimizada
- [ ] Task: Ejecutar suite completa de tests (`CI=true npm test`), auditoría de contraste (`npm run audit:contrast`) y build de producción (`npm run build`)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
