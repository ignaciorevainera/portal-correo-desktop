# Specification (`spec.md`): Rediseño UI/UX Compacto, Ventana Personalizada y Flujos en 1 Clic

## 1. Overview
Rediseñar la interfaz de **new CMDA** para convertirla en una consola de escritorio compacta, de alta eficiencia espacial y enfocada en la velocidad operativa del analista de soporte. Se eliminará el marco y menú contextual nativo superior de Windows en favor de una barra unificada personalizada, se fijará la estructura de navegación con una Sidebar de botones centrados colapsada por defecto, se integrará la vista principal de **Ficha & Diagnóstico** (Hardware + Red + Consola Ping en vivo), se unificará el feedback de éxito/error inline dentro de la barra de acciones sin desplazar el layout, y se añadirá acceso directo al **Portal MDA** y un menú contextual propio de operador, manteniendo 100% el sistema de tokens OKLCH configurado.

---

## 2. Functional Requirements

### 2.1 Ventana Compacta Sin Marco (`frame: false`) y Header Unificado
- **Dimensiones de Consola Compacta:** Configurar `BrowserWindow` en Electron con tamaño inicial `1020x680` y mínimo `860x560`, permitiendo trabajar cómodamente en paralelo con sesiones VNC o tickets.
- **Frameless Window & Supresión de Menú Nativo de Windows:**
  - Configurar `frame: false` y `autoHideMenuBar: true` en `electron/main.cjs`.
  - Interceptar el mensaje de sistema `WM_INITMENU` (`0x0116`) en Windows cuando aplique y deshabilitar el menú nativo superior para que no aparezca el menú de contexto clásico de Windows en la barra de título.
  - Exponer canales IPC seguros (`cmda:window-minimize`, `cmda:window-maximize`, `cmda:window-close`, `cmda:open-external`) en `electron/preload.cjs` y `src/services/electronClient.ts`.
- **Barra Superior Unificada (~40px / `h-10`):**
  - Región arrastrable (`-webkit-app-region: drag`) con exclusión explícita (`-webkit-app-region: no-drag`) en controles interactivos.
  - **Elementos integrados en una sola fila:**
    1. Identidad compacta de `new CMDA`.
    2. Buscador rápido (`Ctrl+F`) con autocompletado y botones de acción directa en 1 clic (VNC / Ping) sobre cada resultado sugerido.
    3. Indicadores compactos de estado (`SQL Online` / `Offline` y terminal activa).
    4. **Botón "Portal MDA":** Acceso directo que abre `https://mda.corporativo.internal/inventario-terminales` en el navegador predeterminado mediante `shell.openExternal` (con fallback a `window.open` en entorno web) para ampliar información de hardware.
    5. Botón de información (`Info`), selector de tema (`Light`/`Dark`) y botones de control de ventana personalizados (**Minimizar**, **Maximizar/Restaurar**, **Cerrar** con hover semántico).

### 2.2 Layout Fijo (`h-screen overflow-hidden`) y Sidebar Colapsada Corregida
- **Estructura Fijo:** El contenedor raíz usará `h-screen overflow-hidden flex flex-col`. Tanto el `Topbar` como la `Sidebar` permanecerán 100% fijos; el único contenedor con desplazamiento vertical (`overflow-y-auto`) será el área `<main>` donde residen los datos de la terminal.
- **Sidebar con Botones por Defecto y Sin Espacio Sobrante:**
  - Inicia **colapsada por defecto** (`sidebarCollapsed = true`, ancho `w-12` / `48px`; expandida `w-52`).
  - Cuando está colapsada, los botones de navegación se renderizan como botones cuadrados perfectamente centrados (`justify-center px-0 h-9 w-9 mx-auto`), eliminando `gap-3` y cualquier elemento vacío que generaba espacio adicional a la derecha de los iconos.
  - Indicador numérico (badge) de alertas activas posicionado de forma flotante en la esquina superior derecha del icono cuando la barra está colapsada.
- **Navegación Simplificada en 3 Vistas:**
  1. **Ficha & Diagnóstico (`inventory`):** Vista principal predeterminada que unifica Hardware, Red/AD y la Consola de Ping en vivo.
  2. **Alertas Activas (`alerts`):** Gestión de alta y cierre de alertas.
  3. **Reseteos & Uptime (`reset-uptime`):** Historial y solicitud de reseteo de cuentas AD y métricas de actividad.

### 2.3 Experiencia en Pocos Clics (VNC, Ping, MSRA y Menú Contextual Propio)
- **Vista Unificada de Operación:** En la vista principal (`Ficha & Diagnóstico`), el operador visualiza simultáneamente la barra de acciones rápidas, los datos de Hardware, Red/AD (con botones para copiar `Hostname`, `IP`, `MAC` y `UserNT` en 1 clic) y la consola de Ping en vivo acoplada cuando se inicia el Ping (o expandible en 1 clic sin cambiar de pestaña).
- **Atajos Globales de Teclado:**
  - `Ctrl+F`: Enfocar y seleccionar buscador.
  - `F2`: Conectar por VNC Viewer a la terminal actual.
  - `F3`: Iniciar / Detener Ping en vivo.
  - `F4`: Lanzar Asistencia Remota MSRA.
- **Menú Contextual Personalizado de Operador (Clic Derecho):**
  - Reemplaza el menú contextual nativo de Windows/Chromium en el área de la aplicación por un menú compacto estilizado con los tokens OKLCH (`bg-popover`, `border-border`, `text-popover-foreground`).
  - Opciones rápidas en 1 clic para la terminal activa: *Conectar VNC (F2)*, *Iniciar/Detener Ping (F3)*, *Asistencia MSRA (F4)*, *Copiar IP*, *Copiar Hostname*, *Copiar MAC*, *Abrir Portal MDA* y *Buscar otra terminal (Ctrl+F)*.

### 2.4 Feedback Inline de Acciones y Errores (Sin Banners Debajo del Header)
- **Eliminación del Banner bajo el Header:** Se suprime por completo la barra de notificación global debajo del `Topbar` para evitar saltos de layout o pérdida de espacio vertical.
- **Estado Unificado en `QuickActionsBar`:**
  - **En caso de éxito o disparo de acción:** Se mantiene el mensaje inline actual (*"Acción disparada: VNC Viewer para <PC>"*) en el encabezado de `QuickActionsBar`.
  - **En caso de error o advertencia (ej. puertos VNC 5901/5900 cerrados o fallo de ejecución):** En ese **mismo lugar** donde figura el mensaje de acción disparada, se sustituye el texto por el **motivo exacto del error** estilizado con semántica y color de error de alto contraste (`text-destructive`, icono de alerta y borde/fondo sutil `bg-destructive/10`), incluyendo un botón compacto inline de fallback (*"Usar MSRA"*) cuando VNC esté cerrado y MSRA esté disponible.

### 2.5 Contraste de Textos y Fidelidad al Theme OKLCH
- **Respeto Estricto del Theme Configurado:** Mantener intactas las variables CSS en `:root` y `.dark` definidas en `src/index.css`.
- **Mejora de Contraste y Legibilidad (WCAG AA):**
  - Elevar el contraste de etiquetas secundarias y metadatos técnicos usando pesos tipográficos claros (`font-medium` / `font-semibold`), `text-foreground/80` para etiquetas clave y `text-foreground` en `font-mono` para valores críticos (IP, MAC, Hostname, RAM, OS, Usuarios AD).
  - Compactar paddings (`p-3`, `gap-2.5`) y bordes para lograr una densidad visual limpia, sin contenedores decorativos innecesarios.

---

## 3. Non-Functional Requirements
- **Rendimiento:** Cero desplazamientos de layout (CLS = 0) al disparar acciones remotas o recibir errores.
- **Accesibilidad:** Contraste mínimo 4.5:1 en textos operativos tanto en tema claro como oscuro; `aria-label` y `title` en todos los botones de icono de la Sidebar, Topbar y controles de ventana.
- **Cobertura de Tests:** Mantener >80% de cobertura en Vitest actualizando y añadiendo pruebas unitarias para la barra de título personalizada, la Sidebar colapsada, el feedback inline de éxito/error en `QuickActionsBar`, el enlace al Portal MDA y el menú contextual personalizado.

---

## 4. Acceptance Criteria
1. La ventana de Electron inicia sin el marco nativo de Windows (`frame: false`) en dimensiones compactas (`1020x680`) y cuenta con controles funcionales de minimizar, maximizar y cerrar en el `Topbar`.
2. El Header incluye el botón **Portal MDA** que dirige a `https://mda.corporativo.internal/inventario-terminales`.
3. La Sidebar inicia colapsada por defecto (`w-12`) con botones de icono centrados sin espacio vacío adicional a la derecha, y permanece fija junto con el Header mientras solo `<main>` hace scroll.
4. No aparece ningún banner debajo del Header al lanzar VNC o MSRA: los éxitos muestran el mensaje de acción disparada en `QuickActionsBar`, y los errores sustituyen ese mismo mensaje con el motivo del error en color de error (`text-destructive`).
5. La vista principal muestra Hardware, Red/AD y permite usar la consola de Ping en vivo sin cambiar de pestaña, además de ofrecer menú contextual personalizado con clic derecho y atajos `F2`/`F3`/`F4`.

---

## 5. Out of Scope
- Modificación de los Stored Procedures en SQL Server.
- Cambios en la paleta de colores base OKLCH del proyecto.
