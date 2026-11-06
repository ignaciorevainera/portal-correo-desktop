# Portal Correo Desktop 1.2.0

**Actualización de interfaz compacta y diagnóstico.** Mantiene el mismo modelo de seguridad y de configuración corporativa que la 1.1.0.

## Qué cambia para el operador

### Ventana compacta

- La ventana se puede achicar hasta ~420 px de ancho, pensada para trabajar al lado de otra aplicación. El alto se mantiene igual que antes.
- **Barra superior compacta**: por debajo de 640 px el título se oculta y Ajustes, Información y Tema pasan a un menú de tres puntos. Minimizar y Bandeja siguen visibles.
- **Barra de acciones en dos filas** por debajo de 768 px: conexión remota, ping y "Más" arriba; los enlaces `.250`/`.231` y el uptime abajo, repartiendo todo el ancho. Si la terminal no tiene IP válida, el uptime ocupa la fila completa.
- **Consola siempre a la mitad del alto de la ventana**: 300 px en una ventana de 600 y 400 px en una de 800. El scroll queda dentro de la consola.
- **Datos del equipo en dos columnas** desde 425 px, con los valores largos truncados y su copia disponible.
- Los **diálogos** conservan un margen de 12 px a los costados en ancho compacto.

### Consola y diagnóstico

- La cabecera de la consola muestra las acciones de diagnóstico sólo como iconos en ancho compacto; los nombres accesibles se mantienen.
- **Copiar Último** y **Copiar Logs** ahora tienen iconos distintos y un aviso accesible cuando el copiado termina.
- Al detener un **ping continuo (`-t`)** se muestra el resumen de paquetes enviados, recibidos y perdidos, con mínimo, máximo y media, igual que un ping estándar. Antes el proceso se cortaba sin estadísticas.
- Al buscar una terminal, el estado de carga usa un **spinner** con la leyenda "Consultando...".

### Detalles

- El menú de tres puntos usa las primitivas accesibles de Radix: flechas, Escape, foco visible y retorno del foco al disparador.
- El resumen de un ping continuo se calcula sólo con la sesión actual, incluso cuando el ping tiene prefijo (`.250` o `.231`).
- Los hover de los menús usan el tinte neutral del resto de la aplicación.

## Notas técnicas

- Sin dependencias nuevas: el menú desplegable y el spinner usan `radix-ui` y `lucide-react` ya instalados.
- Suite: 69 archivos y 447 tests verdes. `tsc --noEmit` sin errores. Build de producción correcto.
- Se mantiene la auditoría de cero secretos y el control de contraste del pipeline de release.

## Requisitos

Los mismos de la 1.0.0 y la 1.1.0: Windows, configuración corporativa provista por el share autorizado y conectividad a la red interna para el desbloqueo.
