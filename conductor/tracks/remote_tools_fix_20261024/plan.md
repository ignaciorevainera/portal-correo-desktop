# Implementation Plan: Corrección y Diagnóstico Inteligente de Conectividad Remota (MSRA, VNC y DNS en Vivo)

## Phase 1: Lanzamiento Seguro de MSRA/VNC y Sondeo de Puertos TCP
- [x] Task: Actualizar `electron/systemTools.cjs` con ejecución shell para MSRA, `/config` para VNC y sondeo de puertos (`5901`, `5900`, `3389`)
  - [x] Escribir tests unitarios en `src/services/systemTools.test.ts` validando el comando `cmd.exe /c start "" msra.exe /offerRA`, el flag `/config` de VNC, el manejo de eventos `error` y la función `probeRemotePorts` (Red/Green)
  - [x] Implementar en `electron/systemTools.cjs` el lanzamiento de MSRA vía `cmd.exe`, detección de puertos abiertos (`5901`/`5900` y `3389`) y captura segura de errores de subprocesos
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Resolución DNS en Vivo y Ficha de Red para Equipos Fuera de SQL
- [x] Task: Incorporar resolución DNS directa/inversa en el flujo de búsqueda de terminales
  - [x] Escribir tests unitarios en `src/services/dnsResolver.test.ts` para resolución de IP actual por DNS y creación de ficha en vivo cuando el host responde en red pero no figura en SQL (Red/Green)
  - [x] Actualizar `electron/dbService.cjs` y `electron/main.cjs` para actualizar la IP si el DNS reporta una IP vigente distinta y permitir abrir cualquier IP/Hostname alcanzable en la red corporativa
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: Feedback Diagnóstico en Consola React (VNC / MSRA / Estado de Puertos)
- [x] Task: Mostrar notificaciones diagnósticas claras en la interfaz al lanzar VNC o MSRA
  - [x] Escribir tests unitarios verificando las notificaciones de éxito y de advertencia cuando VNC está cerrado pero MSRA (`3389`) está disponible (Red/Green)
  - [x] Actualizar `src/App.tsx` y `src/components/QuickActionsBar.tsx` para informar el puerto conectado o sugerir MSRA en 1 clic si los puertos VNC están cerrados
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
