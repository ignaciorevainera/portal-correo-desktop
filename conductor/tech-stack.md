# Technology Stack: Portal Correo Desktop

## 1. Application Architecture & Runtime
- **Desktop Runtime:** Electron (Proceso Main y Renderer desacoplados con IPC seguro y `contextIsolation: true`).
  - Ventana sin marco nativo de Windows (`frame: false`), dimensiones compactas `1020x680` (min `860x560`) y captura de mensaje `WM_INITMENU` (`0x0116`).
  - Canales IPC para control de ventana (`minimizeWindow`, `maximizeWindow`, `closeWindow`) y apertura segura de enlaces corporativos (`shell.openExternal`).
- **Runtime Environment:** Node.js v24.x (LTS) / npm v12.x.
- **Language:** JavaScript (ESNext) / TypeScript para tipado estricto de contratos IPC y modelos de datos.

## 2. Frontend Layer (Renderer)
- **UI Framework:** React 19 (Componentes funcionales y Hooks).
- **Styling & Design System:** Tailwind CSS v4 con variables CSS nativas, temas OKLCH y fuentes variables (`@fontsource-variable/geist`, `@fontsource-variable/roboto-slab`).
- **Component Primitives:** Shadcn UI (`@/components/ui/button`, `@/components/ui/card`, `@/components/ui/badge`, `@/components/ui/input`) construidos sobre Radix UI (`@radix-ui/react-slot`) y utilidades `cn`.
- **Operator Context Menu:** Menú contextual propio integrado con clic derecho para acciones en 1 clic.
- **Icons:** `lucide-react`.

## 3. Data Access, Security & Backend Services (Main Process)
- **Database Engine:** Microsoft SQL Server Corporativo (configurado externamente vía `cmda.config.json` o `.env`).
- **SQL Client Library:** `mssql` con driver `tedious` (100% JavaScript puro, sin compilación nativa de C++ ni dependencias de OLE DB/ODBC).
- **Security & Secret Management:**
  - `electron/configManager.cjs`: Carga de configuración desde red interna (UNC Share) y cifrado local AES-256-GCM con clave derivada (`crypto.scryptSync`).
  - `electron/securityGate.cjs`: Candado Dual Adaptativo de validación de Dominio Active Directory y conectividad de red/VPN corporativa.
- **Stored Procedures Reutilizados:**
  - `CMDA_Trae_Info_DE_PC_PARAmesa_T`
  - `cmda_Busca_SI_HAY_ALERTA_Activa_para_terminal_T`
  - `CMDA_solicitud_De_Reset_En_proceso_T`
  - `Cmda_trae_historial_UptimeXterminal_T`
  - `CMDA_Trae_historial_De_REset_DE_UNA_PC_T`

## 4. System & Remote Tools Integration
- **VNC Launcher:** Ejecución de `vncviewer.exe` con configuración dinámica y paso seguro de credenciales mediante `child_process.spawn`.
- **Windows Remote Assistance:** Lanzamiento directo mediante `cmd.exe /c start "" msra.exe /offerRA <host>`.
- **Network Ping:** Monitor continuo de latencia ejecutado asíncronamente vía proceso hijo hacia la terminal consultada, complementado con derivación de IPs de sitio (`deriveSiteTargets`) para router (`.250`) y servidor de transacciones (`.231`) con streaming etiquetado.
- **Native Network Diagnostics (Nbtstat / Tracert / ARP):** Ejecución de subprocesos Win32 nativos con sanitización estricta (`sanitizeHostOrIp`), detención atómica concurrente y streaming hacia consola interna unificada.
- **KACE & Wake-on-LAN Bridge:** Módulo `electron/kaceBridge.cjs` para invocación validada de Wake-on-LAN (`kwol.exe` o socket UDP) y sincronización forzada de inventario corporativo (`runkbot.exe 4 0`).

## 5. Testing & Tooling
- **Unit & Service Testing:** Vitest para pruebas unitarias de IPC, validaciones, auditoría Zero-Secrets y servicios SQL.
- **Code Quality:** ESLint + Prettier.
- **Packaging & Distribution:** `electron-builder` para generar ejecutables portables o instaladores NSIS para Windows 10/11 x64.

## 6. High-Performance & Software-Rendering Architecture
- **SQL / IPC Concurrency:** Ejecución paralela de Stored Procedures secundarios (`cmda_Busca_SI_HAY_ALERTA_Activa_para_terminal_T`, `CMDA_Trae_historial_De_REset_DE_UNA_PC_T`, `Cmda_trae_historial_UptimeXterminal_T`) mediante `Promise.allSettled` tras resolver el SP principal de la terminal, reduciendo la latencia percibida en más de un 60%.
- **Cold Start & Main Process:** Carga diferida (`lazy require`) de la librería pesada `mssql`, adquisición inmediata de `requestSingleInstanceLock`, precalentamiento background del pool SQL tras el evento `READY` de Security Gate, y limpieza asíncrona no bloqueante de archivos `.vnc` huérfanos.
- **In-Memory Caching:** Caché TTL en memoria (8 segundos) para sondeo de puertos remotos (`probeRemotePorts`) y resolución en caché de rutas de ejecutables locales (`getVncViewerPath`), reduciendo I/O de disco repetitivo.
- **Subnet Scanner Engine:** Worker Pool deslizante continuo (16 tareas concurrentes) con arquitectura de descubrimiento en dos fases: reporte instantáneo del host vivo (`alive: true`) seguido de resolución asíncrona de nombre NetBIOS/DNS, y estrangulamiento de eventos de progreso (40 ms) para evitar saturación del puente IPC.
- **Renderer React 19 Optimization:**
  - Motor de segmentación determinística de bloques (`groupConsoleLinesIntoBlocks`) con memoización (`useMemo`), IDs estables y copiado en 1 clic tolerante a recorte circular de buffer.
  - Modelo de buffer circular con IDs monótonos estables (`{ id, text, tone }`) en `LivePingConsole`, eliminando re-renderizados masivos en buffers de 400 líneas.
  - Auto-scroll sincronizado con el ciclo de refresco del navegador mediante `requestAnimationFrame`.
  - Memorización con `React.memo` en vistas de ficha técnica (`TerminalIdentity`, `TerminalDetailsGrid`, `ActivityPanel`).
  - Carga diferida (`React.lazy` + `Suspense`) de componentes pesados secundarios (`SubnetScannerDrawer`, `SettingsModal`, `InfoModal`).
  - Reemplazo de filtros CSS pesados (`backdrop-blur`) por fondos sólidos (`bg-card`), optimizado para renderizado por software (`--disable-gpu`) en equipos corporativos.
