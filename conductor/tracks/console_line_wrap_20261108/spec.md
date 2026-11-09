# Specification: Opción de Ajuste de Línea (Console Line Wrap) en Ajustes y Consola de Resultados

## Overview
Actualmente, las consolas de diagnóstico y monitoreo de la aplicación (`LivePingConsole`) renderizan las salidas de comandos (Ping estándar, Ping continuo `-t`, Nbtstat, Tracert, ARP y Net User) utilizando estilos de terminal de una sola línea (`whitespace-pre`), lo que ocasiona desplazamiento horizontal (`overflow-x-auto`) cuando los resultados o rutas de red exceden el ancho visible del contenedor.

Esta feature añade un nuevo control en la sección de **Ajustes** (Accesibilidad y Visualización) para alternar el ajuste automático de línea ("Ajuste de línea en consola" / Line Wrap). Al activarlo, el texto de los resultados se pliega armónicamente (`whitespace-pre-wrap break-words`) con saltos de línea suaves sin requerir scroll horizontal. La preferencia se persiste de manera centralizada en el proceso principal (`uiPreferences.json`) y en el Renderer (`localStorage`), garantizando sincronización entre la aplicación principal y cualquier futura ventana o monitor de diagnóstico desprendido.

## Functional Requirements
1. **Control de Preferencia en Ajustes (`SettingsModal`):**
   - Incorporar un interruptor (`Switch`) en el modal de Ajustes, dentro del bloque "Accesibilidad y Visualización", denominado "Ajuste de línea en consola" (con texto descriptivo indicando que evita el desplazamiento horizontal en los resultados de diagnóstico y ping).
   - El estado por defecto es **desactivado** (`consoleWrap: false`), preservando el comportamiento de terminal clásica con scroll horizontal.
2. **Persistencia Centralizada y Sincronización:**
   - Extender el esquema y validaciones de `electron/uiPreferences.cjs` para incluir la propiedad booleana `consoleWrap` (por defecto `false`).
   - Sincronizar la lectura y escritura mediante los canales IPC existentes (`pcd:ui-preferences-get` y `pcd:ui-preferences-save`).
   - Exponer helpers en `@/lib/preferences` (`loadDefaultConsoleWrap`, `saveDefaultConsoleWrap`) con respaldo en `localStorage` (`pcd_pref_console_wrap`) y eventos reactivos de cambio (`CustomEvent("pcd:console-wrap-changed")`) para que los cambios en Ajustes se reflejen de inmediato sin recargar la aplicación.
3. **Comportamiento en Consola (`LivePingConsole`):**
   - Consumir la preferencia de ajuste de línea.
   - Si `consoleWrap` está desactivado (default): mantener `whitespace-pre` y `overflow-x-auto`.
   - Si `consoleWrap` está activado: aplicar `whitespace-pre-wrap break-words [overflow-wrap:anywhere]` y prescindir de la barra de desplazamiento horizontal, respetando los saltos de línea y tabulaciones originales pero plegando las líneas que desborden el contenedor.
   - Aplica a todas las salidas y comandos de la consola: Ping estándar, Ping continuo (`-t`), Nbtstat, Tracert, ARP y Net User.
4. **Preparación Arquitectónica para Monitores / Ventanas Secundarias:**
   - La persistencia a nivel de proceso principal en `uiPreferences.json` e IPC asegura que cualquier nueva ventana o monitor secundario que se inicialice consulte y adopte automáticamente la misma preferencia de `consoleWrap`.

## Non-Functional Requirements
- **Rendimiento O(1) y 60 FPS:** El cambio de estilo CSS no debe alterar el modelo de buffer circular ni degradar la reconciliación React de las 400 líneas en el buffer.
- **Accesibilidad y Contraste:** El control en `SettingsModal` debe cumplir con los estándares de accesibilidad existentes (`Label` vinculado con `htmlFor`, foco visible `focus-visible`, soporte completo de temas Claro/Oscuro y Alto Contraste).
- **Tipado Estricto y Cobertura de Tests:** Cobertura de tests unitarios (>80%) para el almacenamiento de preferencias en `uiPreferences.test.cjs` / `@/lib/preferences.test.ts`, y pruebas en `LivePingConsole.test.tsx` y `SettingsModal.test.tsx`.

## Acceptance Criteria
- En `SettingsModal`, existe el nuevo switch "Ajuste de línea en consola" apagado por defecto.
- Al activarlo, las líneas largas en `LivePingConsole` se ajustan en múltiples renglones visibles sin generar barra de scroll horizontal.
- Al desactivarlo, se restablece el comportamiento original de desplazamiento horizontal con `whitespace-pre`.
- La preferencia sobrevive al reinicio de la aplicación (se lee desde `uiPreferences.json`).
- Cualquier ventana o componente de consola secundario hereda el valor configurado.
- La suite completa de tests (`npm test`) pasa exitosamente.

## Out of Scope
- Implementación de la apertura de ventanas desprendidas (monitores secundarios) en este track (se garantiza la compatibilidad arquitectónica y de preferencias cuando se desarrollen).
- Modificación del buffer o formato del texto plano al copiar logs al portapapeles (el portapapeles conserva el formato y líneas originales de Windows).
