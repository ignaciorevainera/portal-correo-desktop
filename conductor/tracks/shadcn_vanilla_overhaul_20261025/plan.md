# Implementation Plan: Migración Integral a Componentes Vanilla de Shadcn UI (Radix UI) y Paleta Estricta del Preset

## Phase 1: Catálogo Completo de Primitivas Vanilla de `shadcn/ui` sobre Radix UI
- [x] **Task 1.1: Instalar paquetes de Radix UI (`@radix-ui/react-dialog`, `@radix-ui/react-label`, `@radix-ui/react-separator`) y crear las primitivas vanilla en `src/components/ui/`**
  - Escribir pruebas unitarias en `src/test/ShadcnPreset.test.tsx` verificando que todas las primitivas (`Button`, `Card` + subcomponentes, `Badge`, `Input`, `Textarea`, `Label`, `Separator`, `Alert`, `Dialog`, `Kbd`) renderizan con sus `data-slot` oficiales y variantes del preset.
  - Implementar `dialog.tsx`, `alert.tsx`, `label.tsx`, `textarea.tsx`, `separator.tsx`, `kbd.tsx` y asegurar que `badge.tsx` soporte `asChild` vía `@radix-ui/react-slot`.

## Phase 2: Refactorización Vanilla de Tarjetas Principales, Subheader y Consola de Ping (`CardHeader`, `CardTitle`, `CardAction`, `CardContent`, `Alert`)
- [x] **Task 2.1: Migrar `NetworkAdCard.tsx`, `HardwareCard.tsx`, `QuickActionsBar.tsx` y `LivePingConsole.tsx` a subcomponentes vanilla de `Card`, `Alert`, `Badge`, `Button` y `Kbd` con la paleta del preset**
  - Actualizar pruebas en `src/test/ShadcnPreset.test.tsx` y `src/test/LivePingConsole.test.tsx` verificando el uso de `data-slot="card-header"`, `data-slot="card-title"`, `data-slot="card-content"` y la eliminación de colores ad-hoc (`bg-slate-950`, `bg-red-950`, `bg-emerald-950`).
  - Reemplazar las estructuras manuales en `NetworkAdCard.tsx`, `HardwareCard.tsx`, `QuickActionsBar.tsx` y `LivePingConsole.tsx` por los subcomponentes vanilla de `shadcn/ui`.

## Phase 3: Refactorización Vanilla de Paneles Operativos, Modales y Pantallas de Sistema (`AlertsPanel`, `ResetUptimePanel`, `InfoModal`, `SecurityLockScreen`, `Topbar`, `OperatorContextMenu`, `App`)
- [x] **Task 3.1: Migrar `AlertsPanel.tsx`, `ResetUptimePanel.tsx`, `InfoModal.tsx`, `SecurityLockScreen.tsx`, `Topbar.tsx`, `OperatorContextMenu.tsx` y `App.tsx` a `Dialog`, `Card`, `Alert`, `Label`, `Input`, `Textarea`, `Separator`, `Button` y `Badge`**
  - Escribir pruebas verificando que `AlertsPanel`, `ResetUptimePanel`, `InfoModal`, `SecurityLockScreen` y `OperatorContextMenu` utilizan las primitivas `data-slot` de `shadcn/ui` y que no quedan `<input>`, `<textarea>` o `<label>` crudos sin `data-slot` en las vistas del proyecto.
  - Refactorizar todos los componentes restantes para que el 100% de la interfaz obedezca a `shadcn/ui` vanilla y su paleta del preset.
