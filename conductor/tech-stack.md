# Technology Stack: new CMDA

## 1. Application Architecture & Runtime
- **Desktop Runtime:** Electron (Proceso Main y Renderer desacoplados con IPC seguro y `contextIsolation: true`).
  - Ventana sin marco nativo de Windows (`frame: false`), dimensiones compactas `1020x680` (min `860x560`) y captura de mensaje `WM_INITMENU` (`0x0116`).
  - Canales IPC para control de ventana (`minimizeWindow`, `maximizeWindow`, `closeWindow`) y apertura segura de enlaces corporativos (`shell.openExternal`).
- **Runtime Environment:** Node.js v24.x (LTS) / npm v12.x.
- **Language:** JavaScript (ESNext) / TypeScript para tipado estricto de contratos IPC y modelos de datos.

## 2. Frontend Layer (Renderer)
- **UI Framework:** React 19 (Componentes funcionales y Hooks).
- **Styling & Design System:** Tailwind CSS v4 con variables CSS nativas, temas OKLCH, fuentes variables (`@fontsource-variable/geist`, `@fontsource-variable/roboto-slab`) y preset `b5XRZYXrNg` (`base-vega`).
- **Component Primitives:** Shadcn UI (`@/components/ui/button`, `@/components/ui/card`, `@/components/ui/badge`, `@/components/ui/input`) construidos sobre `@base-ui/react` y utilidades `cn`.
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
- **Network Ping:** Monitor continuo de latencia ejecutado asíncronamente vía proceso hijo hacia la terminal consultada.

## 5. Testing & Tooling
- **Unit & Service Testing:** Vitest para pruebas unitarias de IPC, validaciones, auditoría Zero-Secrets y servicios SQL.
- **Code Quality:** ESLint + Prettier.
- **Packaging & Distribution:** `electron-builder` para generar ejecutables portables o instaladores NSIS para Windows 10/11 x64.
