# Implementation Plan (`plan.md`): Rediseño UI/UX Compacto, Ventana Personalizada y Flujos en 1 Clic

## Phase 1: Ventana Frameless en Electron, Controles IPC y Header Compacto con Portal MDA
Configuración de ventana sin marco nativo en Electron (`1020x680`), bloqueo del menú de sistema nativo de Windows, canales IPC para minimizar/maximizar/cerrar y apertura de enlaces externos (`https://mda.corporativo.internal/inventario-terminales`), y rediseño compacto del `Topbar` (`h-10`) con acciones en 1 clic desde el buscador.

- [x] Task: Configurar ventana frameless compacta y canales IPC de ventana/enlaces externos en Electron [30dbe11]
  - [x] Escribir pruebas unitarias en `src/test/windowControls.test.ts` validando los contratos IPC (`minimizeWindow`, `maximizeWindow`, `closeWindow`, `openExternalUrl`) y su fallback en navegador
  - [x] Actualizar `electron/main.cjs` con `frame: false`, dimensiones `1020x680` (min `860x560`), bloqueo de menú nativo de sistema y handlers IPC `cmda:window-minimize`, `cmda:window-maximize`, `cmda:window-close` y `cmda:open-external` (usando `shell.openExternal`)
  - [x] Exponer los nuevos métodos en `electron/preload.cjs` y `src/services/electronClient.ts`
- [x] Task: Rediseñar `Topbar` como barra de título unificada y arrastrable con botón "Portal MDA" y acciones rápidas en buscador [678c12a]
  - [x] Actualizar/escribir pruebas en `src/test/Topbar.test.tsx` verificando el botón "Portal MDA" (`https://mda.corporativo.internal/inventario-terminales`), los botones de control de ventana (Minimizar, Maximizar, Cerrar) y las acciones rápidas en resultados de búsqueda
  - [x] Implementar utilidades CSS `.app-drag-region` y `.app-no-drag` en `src/index.css` sin alterar los tokens OKLCH
  - [x] Refactorizar `src/components/Topbar.tsx` a una altura compacta (`h-10`), integrando el botón **Portal MDA**, acciones directas de VNC/Ping en el desplegable del buscador y controles de ventana personalizados
- [~] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Layout Fijo (`h-screen`), Sidebar Compacta Corregida y Vista Unificada de Diagnóstico
Fijación del layout general (`h-screen overflow-hidden`) para que solo `<main>` tenga scroll, corrección de la `Sidebar` colapsada por defecto (`w-12`) con botones cuadrados centrados sin espacio sobrante a la derecha, y unificación de Hardware + Red + Consola Ping en la vista principal.

- [ ] Task: Corregir `Sidebar` colapsada por defecto (`w-12`) con botones centrados y 3 vistas operativas
  - [ ] Escribir pruebas en `src/test/Sidebar.test.tsx` comprobando el estado colapsado por defecto, ausencia de espaciado lateral asimétrico (`justify-center px-0`), badge flotante de alertas y navegación entre las 3 vistas (`inventory`, `alerts`, `reset-uptime`)
  - [ ] Refactorizar `src/components/Sidebar.tsx` eliminando el padding/gap causante del espacio a la derecha cuando está colapsada, dejándola fija e integrando las 3 vistas principales
- [ ] Task: Unificar Feedback Inline de Éxito/Error en `QuickActionsBar` y eliminar el banner bajo el Header
  - [ ] Escribir pruebas en `src/test/QuickActionsBar.test.tsx` verificando que el mensaje de *"Acción disparada"* se muestre en caso de éxito y sea sustituido en el mismo lugar por el motivo de error con color de error (`text-destructive`) y botón inline de fallback a MSRA cuando falle VNC
  - [ ] Refactorizar `src/components/QuickActionsBar.tsx` y `src/App.tsx` para eliminar el banner debajo del Header y pasar el estado de resultado/error directamente al área de mensaje de `QuickActionsBar`, además de soportar atajos `F2` (VNC), `F3` (Ping) y `F4` (MSRA)
- [ ] Task: Integrar Hardware, Red y Consola de Ping en vivo en la vista principal con layout fijo (`h-screen overflow-hidden`)
  - [ ] Escribir pruebas en `src/test/App.test.tsx` verificando que `<main>` sea el único contenedor scrollable (`overflow-y-auto`), que la Sidebar inicie colapsada y que al iniciar Ping la consola `LivePingConsole` sea visible directamente en la vista principal
  - [ ] Actualizar `src/App.tsx` y `src/components/LivePingConsole.tsx` para acoplar el Ping en vivo en la vista principal sin requerir cambio de pestaña
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: Alto Contraste Tipográfico, Copiado en 1 Clic y Menú Contextual Personalizado de Operador
Optimización de densidad y contraste de textos en tarjetas técnicas (`HardwareCard`, `NetworkAdCard`, `AlertsPanel`, `ResetUptimePanel`) respetando los tokens OKLCH, botones de copiado rápido en 1 clic y reemplazo del menú contextual de clic derecho por un menú propio de operador.

- [ ] Task: Mejorar contraste de textos, densidad compacta y copiado en 1 clic en tarjetas de datos
  - [ ] Escribir pruebas en `src/test/CardsContrastCopy.test.tsx` validando los botones de copiado rápido (IP, MAC, Hostname, UserNT) y la renderización compacta de alto contraste
  - [ ] Refactorizar `src/components/HardwareCard.tsx`, `src/components/NetworkAdCard.tsx`, `src/components/AlertsPanel.tsx` y `src/components/ResetUptimePanel.tsx` con jerarquía tipográfica de mayor contraste y botones de copiar en 1 clic
- [ ] Task: Implementar Menú Contextual Personalizado de Operador (Clic Derecho)
  - [ ] Escribir pruebas en `src/test/OperatorContextMenu.test.tsx` verificando la apertura con clic derecho (`onContextMenu`) y la ejecución en 1 clic de VNC, Ping, MSRA, Copiar IP/Hostname/MAC y abrir Portal MDA
  - [ ] Crear `src/components/OperatorContextMenu.tsx` e integrarlo en `src/App.tsx` bloqueando el menú contextual nativo de Windows/Chromium
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
