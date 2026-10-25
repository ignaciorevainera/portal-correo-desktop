# Specification: Reorganización Integral UI, Unificación Técnica, Consola Windows de Ping y Arrastre de Ventana

## 1. Overview
Este track optimiza la jerarquía visual y la ergonomía operativa de **Portal Correo Desktop**:
1. Reordena las secciones principales en el contenedor `<main>`, posicionando la sección de **Alertas como la última** y colocando la de **Reseteo de Cuentas & Uptime** antes de ella.
2. Compacta la sección de Alertas transformándola en una **tabla de un solo renglón por registro**, altamente eficiente en espacio.
3. Incorpora separación visual vertical consistente (`space-y-4` / `space-y-6`) entre cada bloque de contenido.
4. Limpia los encabezados de sección eliminando los iconos decorativos para mantener únicamente título y subtítulo.
5. Transforma la **Consola de Ping en Vivo** a una estética fidedigna de terminal de Windows (`bg-[#0C0C0C]`, texto monospace nítido, idéntico en temas claro y oscuro), corrigiendo la decodificación de caracteres especiales (acentos y símbolos de `chcp 850/1252` como `Mínimo`, `Máximo`, `Estadísticas`) y permitiendo desplazamiento horizontal sin truncamiento ni quiebre de líneas artificiales.
6. Fusiona las tarjetas de **Ficha Técnica & Sistema** y **Red, Ubicación y Active Directory** en una única card consolidada de alta densidad y máximo aprovechamiento de espacio.
7. Habilita el **arrastre de ventana** (`app-drag-region`) sobre el área del logo y título de la aplicación en la barra superior.

## 2. Requerimientos Funcionales
1. **Reordenamiento & Separación de Secciones:**
   - Orden secuencial en `<main>`:
     1. Card Unificada de Ficha Técnica, Red y Sistema.
     2. Consola de Ping en Vivo (estética consola de Windows).
     3. Reseteo de Cuentas & Historial de Uptime.
     4. Alertas de Terminal (última sección).
   - Encabezados de sección sin iconos: sólo título semántico en negrita y subtítulo descriptivo en gris tenue.
   - Espaciado vertical explícito entre secciones para respiración visual.
2. **Tabla Compacta de Alertas:**
   - Sustituir las tarjetas individuales o listas abultadas de alertas por una tabla tabular compacta.
   - Columnas: *Título de Alerta*, *Operador*, *Fecha*, *Estado / Acciones*.
   - Cada alerta ocupa un único renglón conciso con botón para cerrar incidencia y botón discreto superior para agregar nueva alerta.
3. **Consola de Ping Tipo Windows Terminal:**
   - Contenedor con fondo oscuro inmutable `#0C0C0C` y fuente monospace clásica (`Consolas`, `Cascadia Code`, `monospace`), manteniendo la misma apariencia independientemente del tema de la app.
   - Decodificación limpia de stdout en `systemTools.cjs` / `LivePingConsole` utilizando decodificador con soporte para codepage Windows (reemplazo o sanitización de caracteres corruptos como `Estadsticas` -> `Estadísticas`, `Mnimo` -> `Mínimo`, etc.).
   - Estilo de logs con `whitespace-pre` y scroll horizontal suave (`overflow-x-auto`) sin restricciones de corte de ancho.
4. **Card Unificada de Hardware, Red y Active Directory:**
   - Fusionar `HardwareCard` y `NetworkAdCard` en un componente unificado (`TerminalTechnicalCard` o similar) con grilla balanceada de 2 a 4 columnas.
   - Conservar todas las acciones de copiado en 1 clic (IPv4, MAC, Usuario NT, Modelo de CPU, etc.) con alta legibilidad y badges de estado.
5. **Arrastre de Ventana desde Brand & Title:**
   - Remover la clase `app-no-drag` del contenedor de logo y nombre en `Topbar.tsx`, permitiendo que el operador arrastre y mueva la ventana cómodamente haciendo clic y arrastrando sobre el título superior izquierdo.

## 3. Criterios de Aceptación
- La ventana se puede mover libremente arrastrando desde el logo o título "Portal Correo Desktop".
- La sección de alertas figura al final de la página y se renderiza en una tabla condensada de una línea por alerta.
- La consola de ping muestra la tipografía y fondo `#0C0C0C` característico de consola Windows tanto en modo claro como en modo oscuro.
- Los caracteres en español del ping (acentos y eñes) se muestran sin símbolos ``.
- La información técnica y de red está unificada en una sola card armónica sin redundancias.
- Toda la suite de tests automatizados (`npm test`) y la compilación (`npm run build`) pasan al 100%.
