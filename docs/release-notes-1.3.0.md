# Portal Correo Desktop 1.3.0

**Actualización de accesibilidad, consola y actualizaciones automáticas.** Mantiene el mismo modelo de seguridad y de configuración corporativa que la 1.2.0.

## Qué cambia para el operador

### Actualizaciones automáticas

- Al abrir la aplicación, unos segundos después de superar el control de acceso, se consulta en segundo plano si hay una versión nueva. No frena el arranque ni interfiere con la búsqueda de terminales.
- Si hay una versión nueva, aparece un aviso con las opciones **Descargar** y **Ahora no**. La descarga corre en segundo plano con progreso y verificación SHA-256; al terminar, el mismo aviso ofrece **Instalar y reiniciar** o dejar la actualización preparada.
- **Ahora no** oculta el aviso por el resto de la sesión. Los errores de red se descartan en silencio.
- Los usuarios de la 1.2.0 verán esta versión desde **Ajustes → Actualizaciones del Sistema**; a partir de la 1.3.0 el aviso es automático.

### Accesibilidad y visualización

- Nueva sección **Accesibilidad y Visualización** en Ajustes con **escala de texto** de 100 %, 110 %, 120 % y 130 %, también con los atajos `Ctrl +`, `Ctrl -` y `Ctrl 0`.
- **Modo de alto contraste** complementario del tema claro u oscuro: bordes sólidos, sin transparencias ni tintes tenues y contraste reforzado para pantallas corporativas o baja visión.
- **Ajuste de línea en consola**: pliega las líneas largas de los resultados y evita el desplazamiento horizontal. Viene desactivado para conservar el comportamiento de terminal clásica.
- La escala, el alto contraste y el ajuste de línea se guardan en el perfil del usuario y se restauran al iniciar sin parpadeo.

### Consola de diagnóstico

- La salida se agrupa por **bloques de comando** (ping, ping continuo `-t`, nbtstat, tracert, arp y net user). Al pasar el mouse por un bloque se resalta y aparece un botón para **copiar ese bloque completo**: comando, salida y línea de finalización.
- El copiado confirma con un tinte verde y un aviso breve. La selección manual de texto sigue disponible para copiar una IP o una palabra suelta.
- Al detener un ping continuo se mantiene el resumen de paquetes y tiempos de la sesión.

### Ventana, menús y atajos

- El botón de energía ahora tiene un menú con **Ocultar en bandeja del sistema** y **Cerrar la aplicación definitivamente**, anclado al botón y siempre dentro de la ventana.
- El **monitor flotante** de diagnóstico se abre con `Ctrl + Shift + Espacio` (hasta cuatro ventanas independientes).
- Los menús contextuales, los avisos y los diálogos conservan un margen de resguardo y agregan desplazamiento interno cuando la escala o el zoom achican el área visible.

### Inicio y errores

- La pantalla de bloqueo explica el motivo con pasos concretos: sin red corporativa, sin permiso de la cuenta, configuración faltante o incompleta.
- Si la aplicación falla al arrancar, muestra un mensaje amigable con opciones para reintentar, sin detalles internos ni rutas técnicas.

### Ventanas compactas y zoom

- La barra de acciones se reparte sola en hasta tres filas, sin huecos ni botones huérfanos, y el uptime queda al final.
- En ventanas angostas la IP del objetivo se oculta en la cabecera de la consola para que no se superpongan los botones de control.
- El panel de búsquedas recientes, los desplegables y el modal de Ajustes se adaptan al ancho disponible con la escala activa.

## Rendimiento

- Arranque en frío más corto: instancia única temprana, carga diferida de SQL, iconos y recursos cacheados y ventana que aparece cuando está lista.
- Consulta de terminal más rápida: los procedimientos secundarios de SQL corren en paralelo y el sondeo de puertos remotos se reutiliza durante unos segundos al conectar con `F2`.
- Escáner de subred con pool continuo y descubrimiento en dos fases: muestra cada equipo apenas responde y completa el nombre después, sin bloquear la lista.
- Consola con actualización de líneas en tiempo constante, desplazamiento suave y menor trabajo de renderizado; los modales secundarios se cargan sólo cuando se abren.

## Notas técnicas

- Suite: 84 archivos y 530 tests unitarios verdes; 10 suites E2E de Playwright con 25 tests verdes.
- La suite E2E quedó integrada al gate de release (`npm run release:check`), además de la auditoría de secretos, el control de contraste y el build de producción.
- Se podaron tests de JSDOM redundantes con cobertura equivalente en E2E, sin pérdida de casos de usuario.
- Las preferencias nuevas (`textScale`, `highContrast`, `consoleWrap`) se normalizan con valores por defecto: un archivo de preferencias de la 1.2.0 sigue funcionando sin migración manual.
- Sin dependencias nuevas de ejecución; Playwright se agrega como dependencia de desarrollo para las pruebas E2E.
- El actualizador sigue verificando el SHA-256 del instalador descargado y rechaza la instalación si falta el checksum.

## Requisitos

Los mismos de las versiones anteriores: Windows 10 o superior, configuración corporativa provista por el share autorizado, conectividad a la red interna para el desbloqueo y una cuenta habilitada. La aplicación todavía no está firmada digitalmente, por lo que Windows muestra el aviso de SmartScreen al instalar.

Se instala sobre la 1.2.0 conservando accesos directos y preferencias del equipo.
