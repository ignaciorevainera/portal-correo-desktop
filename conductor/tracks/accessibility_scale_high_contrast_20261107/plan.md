# Implementation Plan: Accesibilidad Visual (Escala de Texto y Alto Contraste)

## Phases

### Phase 1: Capa de Persistencia y Soporte IPC (Backend / Electron / Preferences) [checkpoint: 5bc3c28]
- [x] Task: (TDD) Pruebas y soporte de preferencias para `textScale` y `highContrast` en `uiPreferences` y `electronClient` (5bc3c28)
  - [x] Escribir tests unitarios en Vitest para validar los valores por defecto, lectura y guardado de `textScale` ("100" | "110" | "120" | "130") y `highContrast` (boolean)
  - [x] Extender `electron/uiPreferences.cjs` y canales IPC en `electron/main.cjs` y `electron/preload.cjs` para persistir y sincronizar las preferencias de accesibilidad
  - [x] Implementar helpers y tipos en `src/services/electronClient.ts` y `src/lib/preferences.ts` con respaldo bidireccional en `localStorage`
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

### Phase 2: Motor de Escalado Visual, Atajos de Teclado y Estilos de Alto Contraste [checkpoint: e3cac55]
- [x] Task: (TDD) Pruebas y reglas de estilo para Modo de Alto Contraste (`.high-contrast`) (a99b928)
  - [x] Escribir tests unitarios para verificar la inyección de la clase `.high-contrast` en el elemento raíz del documento
  - [x] Incorporar reglas de estilo en `src/index.css` bajo la clase `.high-contrast` (bordes sólidos nítidos, eliminación de transparencias tenues, textos y badges de máximo contraste WCAG AAA)
  - [x] Verificar la compatibilidad de tokens con el script de auditoría (`npm run audit:contrast`)
- [x] Task: (TDD) Motor de escala visual y atajos de teclado (`Ctrl + +`, `Ctrl + -`, `Ctrl + 0`) (e3cac55)
  - [x] Escribir tests unitarios para la navegación entre los 4 niveles de escala discretos y la detección de atajos de teclado
  - [x] Implementar hook/utilidad de accesibilidad que aplique el zoom factor en Electron (`webFrame.setZoomFactor`) y escuche los atajos de teclado globales en la ventana
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

### Phase 3: Controles en Diálogo de Ajustes (`SettingsModal.tsx`) e Integración Global
- [~] Task: (TDD) Pruebas y renderizado de la sección "Accesibilidad y Visualización" en `SettingsModal`
  - [ ] Escribir pruebas en `@testing-library/react` para validar la presencia de la sección, la selección de escala (`ToggleGroup`) y el switch de alto contraste
  - [ ] Integrar la sección "Accesibilidad y Visualización" en `SettingsModal.tsx` con `ToggleGroup` para escala de texto y `Switch` para alto contraste
  - [ ] Conectar los controles a la sincronización en tiempo real para que los cambios se reflejen de inmediato sin recargar la aplicación
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

### Phase 4: Verificación Integral End-to-End, Auditoría de Calidad y Empaquetado
- [ ] Task: Ejecución y validación de la suite completa de calidad y empaquetado
  - [ ] Ejecutar todos los tests unitarios con `npm test` verificando 100% de casos exitosos
  - [ ] Ejecutar `npm run release:check` (`vitest`, `audit:contrast`, `tsc`, `vite build`) asegurando cero errores
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
