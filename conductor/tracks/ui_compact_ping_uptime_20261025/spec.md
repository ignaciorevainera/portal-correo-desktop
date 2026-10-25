# Specification: Compactación de Reseteo/Uptime, Iconos Consistentes y Rediseño de Consola de Ping Contigua

## 1. Contexto & Problemática
En la versión actual de *Portal Correo Desktop*:
1. **Sección de Reseteo de Cuentas & Historial de Uptime (`ResetUptimePanel`)**:
   - Ocupa demasiado espacio vertical con tarjetas separadas y etiquetas redundantes.
   - Los tamaños de iconos entre títulos no son completamente consistentes (`h-4 w-4` vs otros tamaños, o diferentes alturas de línea).
   - Necesita un diseño más compacto, horizontal o de tarjeta única integrada con métricas alineadas y formulario en línea limpio.
2. **Consola de Ping en Vivo (`LivePingConsole`)**:
   - Actualmente tiene un encabezado de tarjeta clásico con un título (`Consola de Ping en Vivo: <ip>`) que consume espacio vertical y resta protagonismo a la consola.
   - El contenedor exterior de la tarjeta (`Card`, `CardContent` con paddings extras) encierra la consola en una caja interna, cuando la sección misma debería ser directamente el header que contiene exclusivamente los 3 CTAs de control (`Iniciar / Detener`, `Limpiar`, `Copiar logs`) e indicador de estado, y justo debajo de manera **contigua** (sin márgenes ni padding sobrante), la pantalla de comandos de Windows.
   - La altura actual de la consola (`h-44` / 11rem) resulta algo baja para observar con claridad la cascada continua de paquetes de ping; debe tener una mayor altura (`h-64` o `h-72` / ~256px - 288px) para una mejor legibilidad operativa.

---

## 2. Requerimientos Funcionales y de UI

### A. Consola de Ping Integrada y Contigua (Sin Título, Solo 3 CTAs)
- **Eliminación del Título:** Desestimar el texto del título (`CardTitle` con "Consola de Ping en Vivo: ...") para liberar la barra superior.
- **Barra de Acciones / Cabecera:**
  - Debe contener únicamente los 3 CTAs:
    1. Botón de **Iniciar / Detener Ping** (con estado activo/inactivo, variante shadcn y atajo visual).
    2. Botón de **Limpiar** logs (`Trash2`).
    3. Botón de **Copiar logs** de ping (`Copy` / `Check`).
  - Mostrar la IP de destino y badge de estado de forma compacta y elegante en el extremo izquierdo o alineado a los botones.
- **Cuerpo de Consola Contiguo:**
  - La consola no debe estar metida dentro de un `<CardContent>` con paddings internos redundantes.
  - La card o bloque en sí debe estructurarse como un header superior con los botones, y directamente pegada/contigua abajo, la pantalla de terminal `#0C0C0C` con bordes redondeados inferiores (`rounded-b-lg`) o borde perimetral limpio.
  - **Altura ampliada:** Aumentar de `h-44` a `h-64` (o `min-h-[260px] max-h-[340px]`), permitiendo visualizar holgadamente varias respuestas de ping e informes de estadísticas sin cortar la vista.

### B. Compactación de Reseteo de Cuentas e Historial de Uptime
- **Compactación visual:** Unificar o compactar el tiempo de actividad registrado y la solicitud de reseteo en una estructura de menor altura vertical o grilla compacta de una sola card con dos columnas bien aprovechadas.
- **Consistencia de Iconografía:** Estandarizar los tamaños de iconos en los títulos a un tamaño armónico consistente (`h-3.5 w-3.5` o `h-4 w-4` uniforme en todo el panel).
- **Eficiencia operativa:** Conservar la funcionalidad de solicitud de reset con feedback temporal y visualización clara del uptime.

---

## 3. Criterios de Aceptación y Validación
1. `LivePingConsole` no muestra título textual de sección; su cabecera aloja exclusivamente los 3 CTAs de acción (Iniciar/Detener, Limpiar, Copiar) e indicador de IP/estado.
2. La ventana de terminal `#0C0C0C` es contigua a la barra de controles (sin doble contenedor ni padding blanco/gris intermedio).
3. La altura de la terminal de comandos es significativamente más generosa (`h-64` / ~260px) para facilitar el monitoreo continuo de paquetes.
4. `ResetUptimePanel` tiene un diseño compacto y ordenado, con iconos de títulos de tamaño exactamente consistente.
5. Todos los tests de regresión y nuevos tests unitarios pasan al 100% (`npm test`).
6. `npm run build` compila con 0 errores TypeScript/Vite.
