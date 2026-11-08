# Specification: Copiado Granular por Bloques en Hover para Consola Principal (LivePingConsole)

## Overview
Incorporar en la consola principal de diagnóstico (`LivePingConsole`) un sistema de segmentación semántica de salidas por bloques de ejecución de comando y un mecanismo de copiado en 1 clic mediante hover. Al posar el mouse sobre cualquier bloque de resultados (ping, ping continuo, tracert, nbtstat, arp, net user), el bloque se delimita visualmente y despliega un botón flotante para copiar exclusivamente ese bloque completo (comando + líneas de salida + estado de finalización), sin requerir selección manual de texto ni depender de los botones globales de la cabecera ("Copiar Último" o "Copiar Logs").

## Functional Requirements
1. **Segmentación y Detección de Bloques (Segmentation Engine):**
   - Agrupación determinística basada en límites de invocación de comandos.
   - Un bloque comienza cuando una línea coincide con el patrón de cabecera de invocación: `line.text.startsWith("[") && line.text.includes(">")`.
   - Todas las líneas subsiguientes de salida generadas por ese proceso pertenecen a dicho bloque hasta que se encuentre una nueva cabecera de comando.
   - Los mensajes de finalización o detención (`Proceso ... finalizado`, `Proceso ... detenido`, o el resumen de `ping -t`) forman parte integral del bloque correspondiente.
   - Si existen líneas previas sin cabecera (caso borde residual o banner inicial), se agrupan en un bloque inicial.
   - En caso de desborde del buffer circular de 400 líneas, si las primeras líneas de un bloque antiguo son descartadas, las líneas remanentes se mantienen agrupadas y copiables de manera segura.

2. **Interacción de Hover y Botón de Copiado en Bloque (UI/UX):**
   - Cada bloque se renderiza en un contenedor interactivo con estado hover (`group relative`).
   - Al hacer hover sobre el bloque:
     - El contenedor del bloque aplica un resaltado sutil: fondo tenue (`hover:bg-muted/10`) y borde sutil (`rounded-md border border-transparent hover:border-border/50`).
     - Aparece de forma fluida un botón de acción flotante en la esquina superior derecha del bloque (`absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity`).
   - La selección manual de texto (`select-text`) se preserva 100% libre de interferencias para permitir al operador copiar palabras, IPs o cadenas individuales si lo desea sin disparar el copiado del bloque.

3. **Copiado al Portapapeles y Retroalimentación (Feedback Loop):**
   - Al hacer clic en el botón "Copiar" del bloque:
     - Se extrae el texto concatenado de todas las líneas pertenecientes a ese bloque específico (con saltos de línea `\n`).
     - Se escribe en el portapapeles mediante `navigator.clipboard.writeText(blockText)`.
     - El botón del bloque cambia de ícono `Copy` a `Check` verde (`text-success`) durante 2000 ms.
     - Se emite una actualización accesible en la live region (`role="status" aria-live="polite"`, clase `sr-only`) con el mensaje *"Bloque copiado al portapapeles"*.
     - No interfiere con los botones globales de cabecera ("Copiar Último" y "Copiar Logs"), los cuales continuarán funcionando como de costumbre.

4. **Soporte Transversal de Modos:**
   - La funcionalidad aplica tanto en modo terminal estándar (`mode="terminal"`) para Ping, Tracert, Nbtstat, ARP como en modo de consulta de cuenta Active Directory (`mode="account"` para `net user`).

## Non-Functional Requirements
- **Rendimiento O(N):** La agrupación por bloques se realiza de forma eficiente o memorizada (`useMemo`), sin degradar la tasa de cuadros (60 FPS) ni generar re-renders masivos al recibir streaming de `ping -t`.
- **Zero Glitches con Auto-Scroll:** La aparición/ocultamiento del botón flotante en hover no debe alterar el cálculo de altura (`scrollHeight`) ni provocar saltos indeseados en el auto-scroll de la consola.
- **Estilo y Diseño:** Utilizar tokens y componentes coherentes con Shadcn UI, Tailwind CSS y el tema oscuro/claro de la aplicación.

## Acceptance Criteria
- [ ] Al posar el mouse sobre un bloque de resultados, el bloque se destaca sutilmente y muestra un botón de copiado en su esquina superior derecha.
- [ ] Al hacer clic en el botón de copiado del bloque, únicamente el texto de ese bloque se copia al portapapeles.
- [ ] El contenido copiado incluye la cabecera `[hora] > comando`, sus líneas de salida y el mensaje de cierre/resumen.
- [ ] El botón muestra un ícono de confirmación (`Check` verde) durante 2 segundos tras el clic.
- [ ] La selección manual con el cursor del mouse sigue funcionando normalmente sobre el texto sin ser bloqueada ni interferida por el contenedor del bloque.
- [ ] Se mantienen intactos los botones globales "Copiar Último", "Copiar Logs" y "Limpiar".
- [ ] Pruebas unitarias completas con Vitest en `src/test/LivePingConsole.test.tsx` (y utilidades de soporte) cubriendo la detección de bloques, la acción de copia por bloque, el cambio de estado/ícono y el manejo con múltiples comandos acumulados.

## Out of Scope
- Consolas secundarias fuera de `LivePingConsole` (ej. logs de monitoreo alternativos o terminales externas).
- Menú contextual derecho específico por bloque (el menú contextual global del operador sigue operando).
- Configuración para personalizar atajos de teclado específicos para cada bloque individual.
