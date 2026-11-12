# Plan: Corrección de Resolución de Terminales Linux / VNC y Lanzamiento Remoto

## Phase 1: Supresión de Falso Positivo de `net user` y Clasificación de Búsqueda [checkpoint: b8b4b7c]
- [x] Task: Escribir pruebas unitarias para `classifySearch` y eliminación del auto-disparo de `net user` en fallo de búsqueda (TDD Red) [b8b4b7c]
  - [x] Escribir tests en `src/lib/usernames.test.ts` para hostnames corporativos tipo `TTBUE07P`, `B1617FRPU0001`, `B1757CLCU0002`, `I1161STM002`
  - [x] Escribir tests en `src/test/NetUserFlow.test.tsx` verificando que un fallo de terminal muestra pantalla Empty sin auto-ejecutar `net user`
- [x] Task: Implementar clasificación refinada y suprimir la invocación automática de `net user` [b8b4b7c]
  - [x] Ajustar `classifySearch` en `src/lib/usernames.ts` para reconocer prefijos y patrones de estaciones corporativas
  - [x] Modificar `src/App.tsx` para no disparar `runNetUser` automáticamente cuando `searchTerminalUnified` devuelve `null`
  - [x] Mostrar en el estado `Empty` la sugerencia de consultar por IP para terminales Linux o transaccionales, y mantener la opción manual de *"Consultar como cuenta AD"*
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) [b8b4b7c]

## Phase 2: Cadena Híbrida de Resolución por Hostname (SQL + DNS/Red) [checkpoint: b8b4b7c]
- [x] Task: Escribir pruebas unitarias para la cadena de resolución de hostname en `dbService` y `dnsResolver` (TDD Red) [b8b4b7c]
  - [x] Testear fallback a `Fecha_Relevada_PCs` por hostname en `src/services/dbService.test.ts`
  - [x] Testear resolución con sufijos corporativos y fallback NetBIOS en `src/services/dnsResolver.test.ts`
- [x] Task: Implementar resolución por hostname en `electron/dbService.cjs` y `electron/dnsResolver.cjs` [b8b4b7c]
  - [x] Agregar consulta a `Fecha_Relevada_PCs` por hostname cuando `CMDA_Trae_Info_DE_PC_PARAmesa_T` no devuelva registros
  - [x] Fortalecer `dnsResolver.resolveNetworkTarget` para iterar sufijos corporativos configurados
  - [x] Detectar y tipificar terminal como *"Estación Linux / VNC"* si se descubren puertos VNC o indicios de OS Linux
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) [b8b4b7c]

## Phase 3: Robustecimiento de Lanzamiento Remoto VNC y Bloqueo de MSRA en Linux [checkpoint: b8b4b7c]
- [x] Task: Escribir pruebas unitarias para empaquetado de `vncviewer.exe`, timeout resiliente y exclusión de MSRA en Linux (TDD Red) [b8b4b7c]
  - [x] Testear detección de ruta `vncviewer.exe` con `app.isPackaged` / `process.resourcesPath` en `src/services/systemTools.test.ts`
  - [x] Testear que `launchRemoteSmart` nunca elija MSRA cuando el OS es Linux o los puertos VNC están presentes
  - [x] Testear manejo de errores de inicio de proceso y retención de archivo temporal en `launchVnc`
- [x] Task: Implementar mejoras de empaquetado y ejecución de VNC en `systemTools.cjs` y `package.json` [b8b4b7c]
  - [x] Configurar `asarUnpack: ["resources/bin/**/*"]` en `package.json` para garantizar que `vncviewer.exe` exista físicamente en disco
  - [x] Actualizar `getVncViewerPath()` para considerar `process.resourcesPath` y rutas unpacked
  - [x] Incrementar timeout de `probeRemotePorts` a 1500 ms y asegurar que `launchRemoteSmart` bloquee MSRA en estaciones Linux
  - [x] Garantizar que `launchVnc` y `launchRemoteSmart` prioricen la dirección IP resuelta (`terminal.ip`) como destino de UltraVNC
  - [x] Extender tiempo de retención de temporales `.vnc` a 10s y capturar errores inmediatos de `spawn`
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) [b8b4b7c]

## Phase 4: Integración E2E, Quality Gates y Verificación Final [checkpoint: b8b4b7c]
- [x] Task: Actualizar y verificar suite E2E y pruebas unitarias [b8b4b7c]
  - [x] Ejecutar suite completa de tests unitarios (`npm test`)
  - [x] Verificar auditorías de contraste y seguridad (`npm run test:securityAudit`, `npm run audit:contrast`)
  - [x] Ejecutar suite E2E con Playwright (`npm run test:e2e`)
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) [b8b4b7c]
