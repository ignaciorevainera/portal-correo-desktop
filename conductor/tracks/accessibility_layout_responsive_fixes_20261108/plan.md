# Implementation Plan: Correcciones de Diseño, Responsividad y Layout con Escalado de Accesibilidad

## Phases

### Phase 1: Homogeneización de Estilos en `SettingsModal.tsx`
- [ ] Task: (TDD) Pruebas y armonización de la sección de Accesibilidad en `SettingsModal`
  - [ ] Escribir/actualizar tests unitarios en `src/test/SettingsModal.test.tsx` para verificar la coherencia estructural y clases de tarjeta de la sección de accesibilidad
  - [ ] Refactorizar el renderizado de la sección "Accesibilidad y Visualización" en `src/components/SettingsModal.tsx` adoptando la estructura idéntica de tarjetas (`p-3.5`, `rounded-xl`, `border-border/80`, `bg-muted/20`), labels y separación visual
  - [ ] Validar que cumpla con `src/test/designContract.test.ts`
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

### Phase 2: Adaptabilidad y Resiliencia en Diálogos (`InfoModal.tsx`, `SettingsModal.tsx`, `dialog.tsx`)
- [ ] Task: (TDD) Pruebas y resguardo de viewport en diálogos y reparación de `InfoModal`
  - [ ] Escribir tests unitarios en `src/test/InfoModal.test.tsx` y `src/test/dialogPrimitive.test.tsx` validando contención en viewports chicos y scroll interno
  - [ ] Mejorar `DialogContent` en `src/components/ui/dialog.tsx` asegurando márgenes seguros (`max-h-[calc(100vh-2rem)]`, `max-w-[calc(100vw-2rem)]`) y scroll adaptativo
  - [ ] Rediseñar el interior de `src/components/InfoModal.tsx` para que las capacidades y atajos utilicen layout flexible (`flex-wrap`, scroll vertical si es necesario) sin cortarse
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

### Phase 3: Layout Responsivo de `QuickActionsBar.tsx` y `Topbar.tsx`
- [ ] Task: (TDD) Pruebas y layout fluido en la barra de acciones rápidas y popover de búsquedas
  - [ ] Actualizar y escribir pruebas en `src/test/QuickActionsBar.test.tsx` y `src/test/TopbarSearchNavigation.test.tsx` para validar ausencia de overflow horizontal y distribución correcta en viewport mínimo
  - [ ] Refactorizar el layout de `src/components/QuickActionsBar.tsx` para organizar de manera fluida y cohesionada los grupos de botones según el espacio disponible sin dejar huecos vacíos
  - [ ] Asegurar que el popover de búsquedas recientes en `src/components/Topbar.tsx` se adapte dinámicamente al ancho de la ventana truncando strings largos con elipsis
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

### Phase 4: Cabecera Adaptativa en `LivePingConsole.tsx` y Verificación Integral
- [ ] Task: (TDD) Pruebas y cabecera responsiva en la terminal integrada
  - [ ] Escribir tests unitarios en `src/test/LivePingConsole.test.tsx` para verificar que la cabecera preserve la legibilidad de la IP/destino en viewports mínimos
  - [ ] Ajustar la cabecera en `src/components/LivePingConsole.tsx` para que los botones de acción se envuelvan (`flex-wrap`) o colapsen etiquetas textuales en anchos reducidos sin tapar la IP
- [ ] Task: Ejecución y validación de la suite completa de calidad y empaquetado
  - [ ] Ejecutar todos los tests unitarios con `npm test` verificando 100% de casos exitosos
  - [ ] Ejecutar `npm run release:check` (`vitest`, `audit:contrast`, `tsc`, `vite build`) asegurando cero errores
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
