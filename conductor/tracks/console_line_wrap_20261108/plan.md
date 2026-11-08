# Implementation Plan: Opción de Ajuste de Línea (Console Line Wrap) en Ajustes y Consola de Resultados

## Phase 1: Capa de Persistencia y Preferencias (Main Process y Helpers) [checkpoint: b4d1e58]
- [x] Task: Test-Driven Development para `uiPreferences.cjs` y `@/lib/preferences.ts` (Red Phase) [b4d1e58]
  - [x] Escribir pruebas unitarias en `src/test/uiPreferences.test.ts` para la clave `consoleWrap` (valor por defecto `false`, normalización booleana, persistencia y recuperación).
  - [x] Escribir pruebas unitarias en `src/test/preferences.test.ts` para `loadDefaultConsoleWrap`, `saveDefaultConsoleWrap` y emisión del evento reactivo `pcd:console-wrap-changed`.
  - [x] Ejecutar pruebas y confirmar fallo esperado (Red).
- [x] Task: Implementación de la propiedad `consoleWrap` (Green Phase) [b4d1e58]
  - [x] Actualizar `electron/uiPreferences.cjs` para incluir `consoleWrap` en `DEFAULTS` y `normalizePreferences`.
  - [x] Implementar helpers en `src/lib/preferences.ts` para lectura, guardado y disparo del evento `CustomEvent("pcd:console-wrap-changed")`.
  - [x] Ejecutar pruebas y validar que pasen (Green).
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) [b4d1e58]

## Phase 2: Integración en Interfaz de Usuario y Ajustes (`SettingsModal`) [checkpoint: 562773d]
- [x] Task: Test-Driven Development para el control de `consoleWrap` en `SettingsModal` (Red Phase) [562773d]
  - [x] Escribir pruebas en `src/test/SettingsModal.test.tsx` verificando el renderizado del Switch "Ajuste de línea en consola", su estado inicial y la invocación de guardado.
  - [x] Confirmar fallo esperado de las pruebas (Red).
- [x] Task: Implementación del switch de ajuste de línea en `SettingsModal` (Green Phase) [562773d]
  - [x] Añadir el Switch y Label accesible dentro del bloque "Accesibilidad y Visualización" de `SettingsModal.tsx`.
  - [x] Conectar el estado local y los handlers de cambio con `saveUiPreferences` y `saveDefaultConsoleWrap`.
  - [x] Ejecutar pruebas y validar que pasen (Green).
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) [562773d]

## Phase 3: Soporte de Line Wrap en la Consola de Resultados (`LivePingConsole`) [checkpoint: 1fd0433]
- [x] Task: Test-Driven Development para el renderizado condicional de wrap en `LivePingConsole` (Red Phase) [1fd0433]
  - [x] Escribir pruebas en `src/test/LivePingConsole.test.tsx` verificando que con `consoleWrap = true` se apliquen las clases de wrap (`whitespace-pre-wrap break-words`) y con `false` se mantenga `whitespace-pre overflow-x-auto`.
  - [x] Verificar fallo esperado de las pruebas (Red).
- [x] Task: Implementación de la reactividad y estilos de wrap en `LivePingConsole` (Green Phase) [1fd0433]
  - [x] Integrar la lectura y sincronización reactiva de `consoleWrap` en `LivePingConsole.tsx` (escuchando el evento o recibiendo el estado).
  - [x] Aplicar las clases dinámicas de wrap y ajuste de scroll en el contenedor y líneas de salida para todos los diagnósticos (Ping, Tracert, Nbtstat, ARP, Net User).
  - [x] Propagar la preferencia en `App.tsx` para garantizar que la app principal y componentes futuros compartan la misma configuración.
  - [x] Ejecutar pruebas de `LivePingConsole` y validar que pasen (Green).
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) [1fd0433]

## Phase 4: Verificación Integral de Sistema, Regresión y Documentación
- [ ] Task: Ejecución de la suite completa de pruebas y auditoría
  - [ ] Ejecutar `npm test` verificando cero regresiones en toda la suite.
  - [ ] Ejecutar `npm run audit:contrast` para certificar accesibilidad de los nuevos elementos visuales.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
