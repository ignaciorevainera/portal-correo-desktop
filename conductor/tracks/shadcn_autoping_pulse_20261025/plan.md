# Implementation Plan: Incorporación de Shadcn UI (`preset b5XRZYXrNg`), Auto-Ping al Buscar Terminal, Sin Auto-Scroll y Animación de Pulsación

## Phase 1: Incorporación Obligatoria de `shadcn/ui` con Preset `b5XRZYXrNg`, Fuentes y Componentes Base
- [x] **Task 1.1: Configurar alias `@/*` y aplicar el preset `shadcn@latest apply --preset b5XRZYXrNg`**
  - Configurar paths `@/*` -> `./src/*` en `tsconfig.json` y `vite.config.ts`.
  - Ejecutar la inicialización/aplicación de `shadcn@latest apply --preset b5XRZYXrNg` para generar `components.json`, `src/lib/utils.ts`, e incorporar los tokens, estilos y fuentes definidos en el preset dentro de `index.html` / `src/index.css` / `package.json`.
  - Añadir componentes primitivos de `shadcn/ui` (`button`, `card`, `badge`, `input`) en `src/components/ui/`.
- [x] **Task 1.2: Migrar los componentes de la interfaz a las primitivas de `shadcn/ui`**
  - Escribir/actualizar pruebas unitarias verificando el renderizado con componentes `shadcn/ui` (`Button`, `Card`, `Badge`, `Input`) y las fuentes del preset.
  - Actualizar `Topbar.tsx`, `QuickActionsBar.tsx`, `NetworkAdCard.tsx`, `HardwareCard.tsx`, `LivePingConsole.tsx`, `AlertsPanel.tsx` y `ResetUptimePanel.tsx` utilizando los componentes `Button`, `Card`, `Badge` e `Input` de `@/components/ui/*` sin desplazamientos de layout.

## Phase 2: Auto-Ping de 4 Tics al Buscar Terminal, Eliminación de Auto-Scroll y Animación de Pulsación
- [x] **Task 2.1: Implementar animación de pulsación (`animate-pulse`) durante el ping y finalización automática (`onPingComplete`)**
  - Escribir pruebas en `src/test/QuickActionsBar.test.tsx` y `src/test/LivePingConsole.test.tsx` validando que cuando `isPinging` es `true` se utiliza `animate-pulse` (y nunca `animate-spin`), y que al finalizar el ping (`onDone`) se notifica mediante callback `onPingComplete` para apagar `isPinging`.
  - Actualizar `QuickActionsBar.tsx` y `LivePingConsole.tsx` para usar animación de pulsación y disparar `onPingComplete` al concluir el proceso de ping.
- [x] **Task 2.2: Implementar Auto-Ping de 4 tics al buscar/cargar terminal y eliminar redirección/scroll a la sección de Ping**
  - Escribir pruebas en `src/test/App.test.tsx` verificando que:
    1. Al buscar o cargar una terminal válida, se ejecuta automáticamente el ping estándar de 4 paquetes (`isPinging = true`, `pingMode = 'standard'`).
    2. Al terminar los 4 tics, `isPinging` vuelve automáticamente a `false`.
    3. Ni el auto-ping ni los botones `Ping` / `-t` invocan `scrollIntoView` hacia la sección de ping dentro de `<main>`.
  - Actualizar `src/App.tsx` eliminando la redirección/scroll en `handleStartPing` y activando el auto-ping de 4 paquetes cuando se carga una terminal.
