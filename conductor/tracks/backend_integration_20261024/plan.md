# Implementation Plan: Integración Backend SQL Server y Herramientas de Sistema (VNC/MSRA/Ping)

## Phase 1: Conector SQL Server Híbrido (`mssql`) y Resolución Hostname/IP
- [x] Task: Instalar `mssql` y construir adaptador SQL con resolución IP->Hostname y fallback Mock (commit: 6431ece)
  - [x] Instalar paquete `mssql` y `@types/mssql`
  - [x] Escribir tests unitarios en Vitest para el adaptador SQL, mapeo de columnas de `CMDA_Trae_Info_DE_PC_PARAmesa_T`, resolución de IP y fallback automático a Mock (Red/Green)
  - [x] Implementar módulo `electron/dbService.cjs` (y wrapper TypeScript testable) con consultas parametrizadas seguras
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Empaquetado de Recursos Binarios y Orquestador de Procesos (VNC, MSRA, Ping)
- [x] Task: Copiar binarios a `resources/bin/` e implementar servicio de ejecución de herramientas de sistema (commit: 7e84fb3)
  - [x] Copiar `vncviewer.exe`, `admin_2.vnc` y `options.vnc` desde `C:\Cmda` a `C:\Projects\new-CMDA\resources\bin\`
  - [x] Escribir tests unitarios para sanitización de argumentos (IP/Hostname), generación de archivo `.vnc` y comandos de lanzamiento (Red/Green)
  - [x] Implementar `electron/systemTools.cjs` para lanzar VNC Viewer, MSRA y ejecutar Ping nativo
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: Puente IPC de Electron e Integración con la Consola React
- [x] Task: Exponer canales IPC en Electron (`main.cjs` / `preload.cjs`) e integrar con el frontend React (commit: 836f306)
  - [x] Escribir tests verificando el cliente de servicio frontend (uso de `window.electronAPI` cuando existe y fallback web en navegador)
  - [x] Actualizar `electron/main.cjs` y `electron/preload.cjs` registrando los handlers `cmda:search-terminal`, `cmda:status`, `cmda:launch-vnc`, `cmda:launch-msra` y `cmda:ping`
  - [x] Actualizar `Topbar`, `QuickActionsBar`, `LivePingConsole` y `App.tsx` para mostrar estado de conexión SQL en vivo y ejecutar las herramientas reales
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
