# Implementation Plan: Opción de Ajuste de Línea (Console Line Wrap) en Ajustes y Consola de Resultados

## Phase 1: Capa de Persistencia y Preferencias (Main Process y Helpers)
- [ ] Task: Test-Driven Development para `uiPreferences.cjs` y `@/lib/preferences.ts` (Red Phase)
  - [ ] Escribir pruebas unitarias en `test/uiPreferences.test.cjs` para la clave `consoleWrap` (valor por defecto `false`, normalización booleana, persistencia y recuperación).
  - [ ] Escribir pruebas unitarias en `src/test/preferences.test.ts` para `loadDefaultConsoleWrap`, `saveDefaultConsoleWrap` y emisión del evento reactivo `pcd:console-wrap-changed`.
  - [ ] Ejecutar pruebas y confirmar fallo esperado (Red).
- [ ] Task: Implementación de la propiedad `consoleWrap` (Green Phase)
  - [ ] Actualizar `electron/uiPreferences.cjs` para incluir `consoleWrap` en `DEFAULTS` y `normalizePreferences`.
  - [ ] Implementar helpers en `src/lib/preferences.ts` para lectura, guardado y disparo del evento `CustomEvent("pcd:console-wrap-changed")`.
  - [ ] Ejecutar pruebas y validar que pasen (Green).
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Integración en Interfaz de Usuario y Ajustes (`SettingsModal`)
- [ ] Task: Test-Driven Development para el control de `consoleWrap` en `SettingsModal` (Red Phase)
  - [ ] Escribir pruebas en `src/components/SettingsModal.test.tsx` verificando el renderizado del Switch "Ajuste de línea en consola", su estado inicial y la invocación de guardado.
  - [ ] Confirmar fallo esperado de las pruebas (Red).
- [ ] Task: Implementación del switch de ajuste de línea en `SettingsModal` (Green Phase)
  - [ ] Añadir el Switch y Label accesible dentro del bloque "Accesibilidad y Visualización" de `SettingsModal.tsx`.
  - [ ] Conectar el estado local y los handlers de cambio con `saveUiPreferences` y `saveDefaultConsoleWrap`.
  - [ ] Ejecutar pruebas y validar que pasen (Green).
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: Soporte de Line Wrap en la Consola de Resultados (`LivePingConsole`)
- [ ] Task: Test-Driven Development para el renderizado condicional de wrap en `LivePingConsole` (Red Phase)
  - [ ] Escribir pruebas en `src/components/LivePingConsole.test.tsx` verificando que con `consoleWrap = true` se apliquen las clases de wrap (`whitespace-pre-wrap break-words`) y con `false` se mantenga `whitespace-pre overflow-x-auto`.
  - [ ] Verificar fallo esperado de las pruebas (Red).
- [ ] Task: Implementación de la reactividad y estilos de wrap en `LivePingConsole` (Green Phase)
  - [ ] Integrar la lectura y sincronización reactiva de `consoleWrap` en `LivePingConsole.tsx` (escuchando el evento o recibiendo el estado).
  - [ ] Aplicar las clases dinámicas de wrap y ajuste de scroll en el contenedor y líneas de salida para todos los diagnósticos (Ping, Tracert, Nbtstat, ARP, Net User).
  - [ ] Propagar la preferencia en `App.tsx` para garantizar que la app principal y componentes futuros compartan la misma configuración.
  - [ ] Ejecutar pruebas de `LivePingConsole` y validar que pasen (Green).
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4: Verificación Integral de Sistema, Regresión y Documentación
- [ ] Task: Ejecución de la suite completa de pruebas y auditoría
  - [ ] Ejecutar `npm test` verificando cero regresiones en toda la suite.
  - [ ] Ejecutar `npm run audit:contrast` para certificar accesibilidad de los nuevos elementos visuales.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
