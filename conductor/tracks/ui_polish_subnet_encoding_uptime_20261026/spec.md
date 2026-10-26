# Specification: UI Polish, Subnet Drawer, Character Encoding & Uptime Refactor

## 1. Overview
Este track aborda un conjunto de mejoras visuales, de codificación de caracteres y de optimización de espacio en **Portal Correo Desktop**:
1. **Subnet Scanner Drawer:** Restaurar el Drawer al comportamiento flotante nativo de Shadcn (modal/overlay `fixed inset-0 z-50` sobre toda la ventana, incluyendo Topbar).
2. **Corrección de Codificación de Caracteres en Diagnósticos:** Manejar la salida binaria de consola Windows (CP850 / Windows-1252) de herramientas como `ping`, `nbtstat` y `tracert` para que las palabras con tildes ('Estadísticas', 'Mínimo', 'Máximo') y caracteres especiales se muestren sin glifos rotos.
3. **Logo de Identidad de Barra Superior:** Corregir la carga de la imagen de marca de Correo Argentino en la esquina superior izquierda importando directamente el asset vía Vite (`import logoIcon from '@/assets/icon.png'`), asegurando que nunca figure rota.
4. **Reseteo de Cuentas Compacto & Historial en Tabla:**
   - Remover la card duplicada de Uptime dentro de la sección de Reseteo de Cuentas.
   - Dejar únicamente el formulario compacto de solicitud.
   - Reemplazar el listado de historial previo por una tabla compacta idéntica a la de Alertas de Terminal (con columnas para Motivo, Operador, Fecha y Estado).
   - Mostrar el mensaje de fallback en caso de no registrar historial previo.
5. **QuickActionsBar - Uptime Refresh & Escanear Subred:**
   - Mover el botón "Escanear Subred" a la barra de acciones rápidas (`QuickActionsBar`), al lado de los botones de diagnóstico/remotos.
   - Eliminar el header redundante superior de `TerminalTechnicalCard` (badges de 'En Línea' y arquitectura).
   - Incorporar un botón de refresco compacto en la tarjeta de Uptime de `QuickActionsBar` que permita reconsultar la métrica en tiempo real.

---

## 2. Functional Requirements

### 2.1 SubnetScannerDrawer (`src/components/SubnetScannerDrawer.tsx`)
- Debe renderizarse con un overlay/backdrop completo (`fixed inset-0 z-50 bg-black/60`).
- El panel lateral debe posicionarse en `fixed inset-y-0 right-0 z-50 w-80 md:w-96`, cubriendo la ventana completa incluida la Topbar.
- El botón de cierre (`X`), atajo Escape o clic en el backdrop debe cerrar el drawer.

### 2.2 Codificación de Caracteres en Subprocesos (`electron/systemTools.cjs`)
- Los procesos hijos (`ping`, `nbtstat`, `tracert`, `arp`) en Windows devuelven buffers con codificación OEM (típicamente CP850 en español).
- `sanitizePingOutput` o la decodificación de buffer debe decodificar adecuadamente los bytes CP850 / Windows-1252 o reemplazar bytes anómalos a sus caracteres UTF-8 correctos (`á`, `é`, `í`, `ó`, `ú`, `ñ`, `Ñ`, `¿`, `¡`, `°`).
- Debe garantizarse que textos como `Estadísticas de ping`, `Mínimo`, `Máximo`, `milisegundos` salgan 100% limpios en la consola en vivo.

### 2.3 Logo en Topbar (`src/components/Topbar.tsx`)
- Copiar/ubicar `icon.png` en `src/assets/icon.png` e importarlo como módulo estático de Vite (`import brandIcon from '../assets/icon.png'`).
- La etiqueta `<img>` en `Topbar.tsx` debe utilizar dicha importación para evitar problemas de rutas relativas o fallos de carga en runtime empaquetado/desarrollo.

### 2.4 Reseteo de Cuentas (`src/components/ResetUptimePanel.tsx`)
- Eliminar la Card de "Tiempo de Actividad Registrado" dentro de `ResetUptimePanel`.
- El formulario de solicitud de reseteo debe ocupar un espacio compacto y estilizado.
- El historial previo debe utilizar la misma estructura de tabla que `AlertsPanel`:
  - `table` con cabeceras `Motivo`, `Operador`, `Fecha`, `Resultado`.
  - Filas alternadas / hover sutil.
  - Si `resetHistory` está vacío o ausente, mostrar mensaje: *"No hay historial de reseteos registrado para este equipo."*
- Renombrar conceptualmente el componente o título a "Reseteo de Cuentas AD".

### 2.5 QuickActionsBar & Technical Card Polish
- **En `QuickActionsBar.tsx`:**
  - Agregar botón "Escanear Subred" (`Network` icon) con variante Shadcn outline accesible.
  - En la card de Uptime (`Clock`), agregar un botón de refresco miniatura (`RotateCcw`, size "icon-xs", 16px) que dispare un callback `onRefreshUptime`.
  - Mostrar feedback visual o estado de carga al refrescar el Uptime.
- **En `TerminalTechnicalCard.tsx`:**
  - Remover `<CardHeader>` con los badges de "En Línea", arquitectura y el botón viejo de escanear subred.
  - La card técnica comienza directamente mostrando los bloques de información técnica (Red, Hardware, SO, etc.) ahorrando espacio vertical valioso.
- **En `App.tsx`:**
  - Proveer la función `handleRefreshUptime` que reconsulta el uptime de la terminal activa (vía `searchTerminalUnified` o servicio de uptime) y actualiza el estado.

---

## 3. Non-Functional Requirements
- **Compatibilidad de Plataforma:** 100% compatible con Windows 10/11 en Electron y navegadores.
- **Accesibilidad y Contraste:** Estilos consistentes con Shadcn vanilla, soporte para modo claro y modo oscuro.
- **Cero Secretos:** Sin hardcoding de IPs ni credenciales en código ni tests.
- **Cobertura de Tests:** Pruebas unitarias completas con Vitest para verificar el renderizado del Drawer, la decodificación de caracteres y la integración de botones en QuickActionsBar.

---

## 4. Acceptance Criteria
1. El Drawer de escaneo de subred cubre toda la pantalla verticalmente (`z-50`, por encima de la barra superior).
2. Los logs de Ping en vivo muestran "Estadísticas de ping", "Mínimo", "Máximo", "milisegundos" sin el caracter `` o glifos rotos.
3. El logo superior izquierdo se visualiza nítido y transparente en modo claro y oscuro sin romperse.
4. La sección de Reseteo de Cuentas no tiene card duplicada de Uptime; su historial es una tabla compacta idéntica a la de Alertas.
5. El botón "Escanear Subred" reside en QuickActionsBar y funciona al hacer clic.
6. La ficha técnica no tiene header superior ni badges vacíos.
7. La tarjeta de Uptime en QuickActionsBar cuenta con un botón de refresco funcional.
8. Todos los tests de Vitest pasan y `tsc && vite build` compila con éxito.
