# Specification: Optimización Integral de Rendimiento, SQL/IPC, Cold Start, Escáner de Subred y Renderizado

## Overview
Optimizar de extremo a extremo el rendimiento, la velocidad de respuesta y la fluidez de **Portal Correo Desktop** en sus 4 capas críticas:
1. **Backend SQL/IPC y Conexión Remota:** Paralelización de Stored Procedures secundarios y DNS, caché de sondeo de puertos remotos (`probeRemotePorts`) y secreto VNC en memoria.
2. **Arranque en Frío (*Cold Start*) y Proceso Principal:** Evaluación temprana de instancia única, carga diferida de `mssql`, limpieza asíncrona de temporales VNC y visualización sin parpadeos (`ready-to-show`).
3. **Escáner de Subred `/24`:** Worker Pool continuo sin bloqueo de lote (*head-of-line blocking*), descubrimiento en 2 fases (IP inmediata + actualización asíncrona de hostname) y throttling de progreso.
4. **Renderer React 19 y *Software Rendering*:** Consola de diagnóstico `LivePingConsole` en `O(1)` con claves estables y clasificación pre-calculada, memorización de vistas (`React.memo`), carga diferida (`React.lazy`) de modales/drawers y eliminación de filtros CSS costosos en CPU sin GPU.

## Functional Requirements
1. **Paralelización SQL/IPC y Caché de Sondeo Remoto (`electron/dbService.cjs`, `electron/systemTools.cjs`, `electron/configProvider.cjs`, `electron/main.cjs`):**
   - En `dbService.getTerminalInfo(query)`, tras obtener el registro principal (`CMDA_Trae_Info_DE_PC_PARAmesa_T`), ejecutar los 4 Stored Procedures complementarios (`Cmda_Trae_Datos_De_Ubicacion_Y_cpa_centro_Costo_T`, `cmda_Busca_SI_HAY_ALERTA_Activa_para_terminal_T`, `CMDA_Trae_historial_De_REset_DE_UNA_PC_T`, `Cmda_trae_historial_UptimeXterminal_T`) **en paralelo** con `Promise.allSettled`.
   - En `main.cjs` (`pcd:search-terminal`), paralelizar o acotar la resolución DNS complementaria cuando SQL ya devolvió una IP válida, y pre-calentar el pool SQL en segundo plano tras superar el Gate de seguridad.
   - Cachear en memoria con TTL corto (`8000 ms`) el resultado de `probeRemotePorts(host)` para que `launchRemoteSmart` y `launchVncSmart` reutilicen el sondeo reciente al conectar con `F2` sin volver a esperar timeouts TCP.
   - Cachear la ruta de `vncviewer.exe` en `getVncViewerPath()` y el secreto VNC leído en `UncConfigProvider` durante la sesión autorizada.
2. **Optimización de Arranque en Frío (*Cold Start*) (`electron/main.cjs`, `electron/systemTools.cjs`, `electron/dbService.cjs`):**
   - Evaluar `app.requestSingleInstanceLock()` al inicio de `electron/main.cjs` antes de inicializar servicios o registrar canales IPC.
   - Diferir (*lazy require*) la carga de `mssql` en `electron/dbService.cjs` hasta el primer uso real.
   - Agregar `cleanupStaleVncFilesAsync()` usando `fs.promises` y ejecutarlo de forma diferida fuera de la ruta crítica del arranque, manteniendo `cleanupStaleVncFiles()` síncrono para compatibilidad con tests existentes.
   - Unificar los bloques `app.whenReady()` en `electron/main.cjs`, cachear `getAppIconPath()` y configurar `show: false` + `ready-to-show` en `BrowserWindow`.
3. **Escáner de Subred `/24` con Worker Pool Continuo y Emisión en 2 Fases (`electron/subnetScanner.cjs`, `src/components/SubnetScannerDrawer.tsx`):**
   - Reemplazar el bucle por lotes estáticos (`slice` + `Promise.all`) en `scanSubnetBatch` por un **Worker Pool deslizante** de `concurrency` workers continuos, evitando que un `nbtstat` o `ping -a` lento frene a los demás workers.
   - Emitir `onHostFound` apenas el socket TCP confirme `alive: true` y, si `dnsResolver` resuelve un `hostname` válido posteriormente, notificar la actualización para que `SubnetScannerDrawer` actualice el host en sitio (`in-place`) sin duplicar tarjetas.
   - En `SubnetScannerDrawer.tsx`, memorizar `filteredHosts` con `useMemo`, throttlear las actualizaciones de progreso y envolver las filas en `React.memo`.
4. **Renderizado React 19, Consola `LivePingConsole` `O(1)` y *Software Rendering* (`src/`):**
   - Refactorizar `LivePingConsole.tsx` para almacenar entradas `{ id, text, tone }` con `id` incremental estable como `key` y cálculo de `tone` al ingresar cada línea, evitando re-evaluar regex sobre 400 líneas y mutar 400 nodos DOM en cada paquete de `ping -t`.
   - Agrupar el auto-scroll del contenedor de logs con `requestAnimationFrame`.
   - Envolver `TerminalIdentity`, `TerminalDetailsGrid` y `ActivityPanel` en `React.memo`, eliminar `getAllTerminals()` sin uso en `App.tsx`, estabilizar el listener global `keydown` (`F2/F3/F4`) y cargar con `React.lazy` + `Suspense` los modales/drawers cerrados al inicio (`SettingsModal`, `InfoModal`, `SubnetScannerDrawer`, `NetUserChooserDialog`).
   - Reemplazar `backdrop-blur` en `Topbar.tsx` por superficie opaca (`bg-card`) y aplicar contención CSS en áreas de scroll para optimizar la rasterización por CPU.

## Non-Functional Requirements
- Cero regresiones funcionales, visuales ni de seguridad (`securityAudit.test.ts` y `audit:contrast` en verde).
- Desarrollo guiado por TDD según `conductor/workflow.md`.

## Acceptance Criteria
- `getTerminalInfo` ejecuta los 4 SPs complementarios en paralelo reduciendo la latencia total al tiempo del SP más lento en lugar de la suma de los 4.
- `launchRemoteSmart` y `launchVncSmart` reutilizan el sondeo reciente de `probeRemotePorts` dentro del TTL sin re-abrir sockets TCP innecesarios.
- `scanSubnetBatch` procesa IPs con un pool continuo sin bloqueo de lote y actualiza hostnames en 2 fases.
- `LivePingConsole` mantiene claves DOM estables al recortar el buffer de 400 líneas.
- Suite completa de tests (`npm test`), chequeo de contraste (`npm run audit:contrast`) y build (`npm run build`) exitosos.

## Out of Scope
- Modificaciones en procedimientos almacenados del motor SQL Server corporativo.
- Activación forzosa de aceleración por GPU por defecto.
