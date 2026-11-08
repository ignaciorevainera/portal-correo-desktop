# Track Specification: Correcciones de Diseño, Responsividad y Layout con Escalado de Accesibilidad

## 1. Contexto y Problema
Tras la incorporación del motor de escalado visual (`webFrame.setZoomFactor`) y alto contraste, se detectaron fallas de maquetado y superposiciones en pantallas compactas y al activar tamaños de escala superiores (110%, 120%, 130%), especialmente en la dimensión mínima de ventana (`420x600px`):

1. **Inconsistencia de formato en `SettingsModal`**: La sección "Accesibilidad y Visualización" no sigue la estructura de tarjeta y estilos usados en las demás secciones del modal (como "Comportamiento de Ventana y Bandeja", "Atajo Global de Teclado" y "Modo de Ping Predeterminado").
2. **Quiebre y espacios vacíos en `QuickActionsBar`**: Con escala aumentada y viewport estrecho, los botones se desbordan o dividen en múltiples líneas dejando huecos y desalineaciones entre acciones principales (VNC, Ping) y secundarias (sitio .250/.231, Uptime, Más).
3. **Márgenes de viewport en Diálogos y Dropdowns**: Al agrandar la escala, `DialogContent` (incluyendo `SettingsModal` y `InfoModal`) y menús contextuales/dropdowns se pegan a los bordes sin margen de resguardo visual (`min-h`, `max-h` en viewport).
4. **Diálogo de Características (`InfoModal.tsx`) roto**: La lista de capacidades, atajos y accesos directos queda cortada o desbordada al escalar la fuente.
5. **Panel de Búsquedas Recientes cortado**: El desplegable de búsqueda en `Topbar` se recorta o no muestra adecuadamente las opciones en anchos reducidos con zoom activo.
6. **Superposición en la Cabecera de la Terminal Integrada**: En la ventana mínima con escala máxima (130%), los botones de control (Detener, Limpiar, Copiar Último, Copiar Logs) y el título/IP en la cabecera de `LivePingConsole` se superponen e impiden leer la IP de destino.

---

## 2. Requerimientos Funcionales y de UI/UX

### 2.1 Armonización Visual en `SettingsModal.tsx`
- Reestructurar la sección de accesibilidad para alinearse 100% con los patrones del modal:
  - Título de sección bajo el estándar de subencabezados con icono decorativo.
  - Tarjetas unificadas con padding `p-3.5`, bordes `border-border/80`, fondos `bg-muted/20` y esquinas `rounded-xl`.
  - El selector de escala (`ToggleGroup`) debe estar integrado armónicamente con labels claros, descripción de atajos con `Kbd` y alineación idéntica a la tarjeta de "Modo de Ping Predeterminado".
  - El switch de "Modo de Alto Contraste" debe coincidir en estructura y espaciados con los switches de "Minimizar a la bandeja" y "Atajo Global".

### 2.2 Resiliencia y Flexibilidad en `QuickActionsBar.tsx`
- Implementar un layout de ancho completo en todo momento (`w-full`, `flex-1`, `basis` elástica):
  - Los botones deben ocupar el 100% del ancho horizontal disponible en cualquier tamaño de ventana, expandiéndose sin dejar espacios vacíos ni huecos laterales.
  - Al reducirse el ancho o incrementarse el zoom de texto, los elementos se reorganizan de forma limpia y ordenada en dos o como máximo tres filas cohesivas.
  - Priorizar el ancho de los dos CTAs principales: Conexión Remota Inteligente (VNC/MSRA) y Ping de la terminal activa, asignándoles mayor proporción/peso (`flex-[1.5]` o `flex-2`) para que sus etiquetas y estados textuales se visualicen completos y legibles sin cortes.

### 2.3 Adaptabilidad de Diálogos (`dialog.tsx`, `SettingsModal.tsx`, `InfoModal.tsx`)
- Asegurar que `DialogContent` mantenga márgenes seguros en el viewport (`max-h-[calc(100vh-2rem)]`, `max-w-[calc(100vw-2rem)]`) y scroll vertical fluido con `overflow-y-auto`.
- Reestructurar `InfoModal.tsx` con contenedor scrolleable interno y etiquetas flexibles para que las capacidades y atajos no se desborden ni colapsen al activar zoom del 130%.

### 2.4 Búsquedas Recientes Adaptativas en `Topbar.tsx`
- Ajustar `PopoverContent` y `CommandList` en `Topbar.tsx` para que el ancho se adapte dinámicamente (`min-w-[var(--radix-popover-trigger-width)]`, `max-w-[calc(100vw-2rem)]`) y el contenido de cada ítem trunque con elipsis limpia en vez de desbordar la ventana.

### 2.5 Header Responsivo en `LivePingConsole.tsx`
- Refactorizar la cabecera de `LivePingConsole`:
  - En anchos reducidos de ventana (o escalado alto), ocultar dinámicamente el texto de la IP en el encabezado (ej. mediante breakpoint como `hidden sm:inline` o contenedor elástico) dejando exclusivamente los botones de acción para garantizar que nunca ocurra solapamiento ni desborde.
  - La IP de la estación permanece siempre visible y accesible de forma destacada en la sección superior de identidad (`TerminalIdentity.tsx`).

---

## 3. Criterios de Aceptación
1. `SettingsModal` presenta un diseño 100% homogéneo en todas sus secciones, respetando el contrato de diseño (`designContract.test.ts`).
2. Al colocar escala 130% y achicar la ventana al mínimo soportado (`420x600`), no hay desbordes horizontales ni superposiciones de texto/botones en `QuickActionsBar`, `LivePingConsole`, `Topbar` ni diálogos.
3. El diálogo de capacidades (`InfoModal`) se visualiza completo, sin textos cortados, permitiendo scroll vertical si la altura del viewport lo requiere.
4. El popover de búsquedas recientes se lee de manera íntegra sin salirse de la pantalla en tamaño de ventana mínimo.
5. Pasa el 100% de la suite de pruebas unitarias (`npm test`), la auditoría de contrastes (`npm run audit:contrast`) y `npm run release:check`.
