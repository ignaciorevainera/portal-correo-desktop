# Implementation Plan: Correcciones de Diseño, Responsividad y Layout con Escalado de Accesibilidad

## Phases

### Phase 1: Homogeneización de Estilos en `SettingsModal.tsx`
- [x] Task: (TDD) Pruebas y armonización de la sección de Accesibilidad en `SettingsModal` (0fe8e34)
  - [x] Escribir/actualizar tests unitarios en `src/test/SettingsModal.test.tsx` para verificar la coherencia estructural y clases de tarjeta de la sección de accesibilidad
  - [x] Refactorizar el renderizado de la sección "Accesibilidad y Visualización" en `src/components/SettingsModal.tsx` adoptando la estructura idéntica de tarjetas (`p-3.5`, `rounded-xl`, `border-border/80`, `bg-muted/20`), labels y separación visual
  - [x] Validar que cumpla con `src/test/designContract.test.ts`
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

### Phase 2: Adaptabilidad y Resiliencia en Diálogos (`InfoModal.tsx`, `SettingsModal.tsx`, `dialog.tsx`)
- [x] Task: (TDD) Pruebas y resguardo de viewport en diálogos y reparación de `InfoModal` (2fc7070)
  - [x] Escribir tests unitarios en `src/test/InfoModal.test.tsx` y `src/test/dialogPrimitive.test.tsx` validando contención en viewports chicos y scroll interno
  - [x] Mejorar `DialogContent` en `src/components/ui/dialog.tsx` asegurando márgenes seguros (`max-h-[calc(100vh-2rem)]`, `max-w-[calc(100vw-2rem)]`) y scroll adaptativo
  - [x] Rediseñar el interior de `src/components/InfoModal.tsx` para que las capacidades y atajos utilicen layout flexible (`flex-wrap`, scroll vertical si es necesario) sin cortarse
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

### Phase 3: Layout Responsivo de `QuickActionsBar.tsx` y `Topbar.tsx`
- [ ] Task: (TDD) Pruebas y layout fluido de ancho completo en la barra de acciones rápidas y popover de búsquedas
  - [ ] Actualizar y escribir pruebas en `src/test/QuickActionsBar.test.tsx` y `src/test/TopbarSearchNavigation.test.tsx` para validar que los botones cubran el ancho total sin huecos y se distribuyan en un máximo de 2 o 3 filas según el espacio disponible
  - [ ] Refactorizar `src/components/QuickActionsBar.tsx` para que los botones llenen el 100% del ancho (`w-full`, `flex-1`, `grow`), asignando mayor prioridad y peso a los CTAs de conexión remota y ping para que sus labels no se corten
  - [ ] Asegurar que el popover de búsquedas recientes en `src/components/Topbar.tsx` se adapte dinámicamente al ancho de la ventana truncando strings largos con elipsis
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

### Phase 4: Cabecera Adaptativa en `LivePingConsole.tsx` y Verificación Integral
- [ ] Task: (TDD) Pruebas y ocultamiento responsivo de IP en cabecera de la terminal integrada
  - [ ] Escribir tests unitarios en `src/test/LivePingConsole.test.tsx` para verificar que en anchos reducidos se oculte la IP del header para prevenir solapamiento con los botones
  - [ ] Ajustar la cabecera en `src/components/LivePingConsole.tsx` para ocultar la IP después de determinado ancho (`hidden sm:inline`), preservando exclusivamente los botones de control visibles sin desbordar ni colisionar
- [ ] Task: Ejecución y validación de la suite completa de calidad y empaquetado
  - [ ] Ejecutar todos los tests unitarios con `npm test` verificando 100% de casos exitosos
  - [ ] Ejecutar `npm run release:check` (`vitest`, `audit:contrast`, `tsc`, `vite build`) asegurando cero errores
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
