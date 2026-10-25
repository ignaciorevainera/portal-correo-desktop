# Implementation Plan (`plan.md`): Vista Unificada Sin Sidebar, Subheader Fijo, Bandeja del Sistema (Tray) y Consola Ping Avanzada

## Phase 1: Bandeja del Sistema (System Tray), Botón de Apagado (`Power`) y Backend `Ping -t` / `Stop`
Implementación del icono y menú contextual en la Bandeja del Sistema (System Tray) en Electron (con cierre definitivo exclusivo desde el Tray), actualización del `Topbar` para dejar únicamente Minimizar y Apagado (`Power` -> ocultar al Tray) a la derecha del selector de tema, y soporte backend/IPC para `ping -t` (continuo) y detención de procesos de ping en vivo (`cmda:ping-stop`).

- [x] Task: Implementar soporte para `ping -t`, parada de proceso (`stopPing`) y Bandeja del Sistema (`Tray`) en Electron e IPC
  - [x] Actualizar y escribir pruebas unitarias en `src/services/systemTools.test.ts` y `src/test/windowControls.test.ts` validando `getPingArgs` con modo continuo (`-t`), `stopPing` y la acción `hideToTray`
  - [x] Actualizar `electron/systemTools.cjs` para soportar `continuous: true` (`ping -t`) en `getPingArgs` y `executePing`
  - [x] Actualizar `electron/main.cjs` integrando `Tray` + `Menu` (con opciones `Abrir new CMDA` y `Cerrar` definitivo), intercepción del cierre de ventana para ocultar al Tray, handler `cmda:window-hide-tray`, soporte de modo continuo en `cmda:ping-start` y handler `cmda:ping-stop` para terminar el proceso de ping activo
  - [x] Exponer `hideToTray`, `startPing(target, continuous)` y `stopPing()` en `electron/preload.cjs` y `src/services/electronClient.ts`
- [~] Task: Actualizar `Topbar` con botón de Minimizar y botón de Apagado (`Power`) hacia la Bandeja del Sistema
  - [ ] Actualizar pruebas en `src/components/Topbar.test.tsx` verificando que a la derecha del selector de tema estén el botón de Minimizar y el botón de Apagado (`Power` / ocultar en bandeja del sistema), sin los botones de maximizar ni cerrar directo
  - [ ] Refactorizar `src/components/Topbar.tsx` reemplazando los controles anteriores por el botón de Minimizar y el botón `Power` conectado a `hideToTray`
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Subheader Fijo con `Ping` / `Ping -t` (2:1) y Consola Interna con Detener, Limpiar y Copiar Logs
Actualización de `QuickActionsBar` como Subheader fijo con el CTA de Ping normal y el botón secundario `Ping -t` ocupando la mitad de su ancho (ambos reemplazando logs e iniciando su modo respectivo), y mejora de `LivePingConsole` con controles de **Detener**, **Limpiar** y **Copiar Logs** en la esquina superior derecha.

- [ ] Task: Añadir botón secundario `Ping -t` (mitad de ancho del CTA de Ping) en `QuickActionsBar`
  - [ ] Actualizar pruebas en `src/test/QuickActionsBar.test.tsx` verificando la presencia del botón `Ping` (4 paquetes) y del botón secundario `Ping -t` (proporción 2:1) y que ambos disparen su callback correspondiente
  - [ ] Refactorizar `src/components/QuickActionsBar.tsx` para ser el Subheader fijo (`sticky top-0 z-20`) e incluir el grupo de botones `Ping` (`flex-[2]`) + `Ping -t` (`flex-1`)
- [ ] Task: Potenciar `LivePingConsole` con reemplazo de logs al iniciar, Detener proceso, Limpiar y Copiar Logs completos
  - [ ] Crear pruebas unitarias en `src/test/LivePingConsole.test.tsx` validando el reemplazo de logs al iniciar un nuevo `Ping` o `Ping -t`, el botón `Detener`, el botón `Limpiar` y el botón `Copiar Logs` en la esquina superior derecha
  - [ ] Refactorizar `src/components/LivePingConsole.tsx` incorporando los botones **Detener**, **Limpiar** y **Copiar Logs** (con feedback visual *"Logs copiados"*) y soporte para modo `standard` (4 paquetes) e `infinite` (`ping -t`)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: Diseño Single-Scroll Sin Sidebar y Orden Jerárquico de Secciones en `<main>`
Eliminación completa de la Sidebar y unificación de todas las secciones de la terminal en `<main>` con el orden jerárquico definido (1° Subheader Fijo -> 2° Grilla Red/AD + Hardware -> 3° Consola Interna de Ping con auto-scroll al pulsar `Ping`/`Ping -t` -> 4° Alertas de Terminal -> 5° Reseteo AD e Historial).

- [ ] Task: Eliminar `Sidebar` y estructurar la vista única scrollable en `App.tsx` con auto-scroll a la consola de Ping
  - [ ] Actualizar pruebas en `src/App.test.tsx` comprobando que no exista Sidebar, que todas las secciones (`NetworkAdCard`, `HardwareCard`, `LivePingConsole`, `AlertsPanel`, `ResetUptimePanel`) se rendericen en orden dentro de `<main>`, que el Subheader permanezca fijo arriba y que al pulsar `Ping` o `Ping -t` se haga scroll hacia la consola interna reemplazando los logs previos
  - [ ] Refactorizar `src/App.tsx` eliminando toda referencia a `Sidebar`, fijando el Subheader de comandos en la parte superior del contenedor principal y disponiendo las secciones en el orden acordado con auto-scroll a `LivePingConsole`
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
