# Portal Correo Desktop 1.1.0

**Actualización de interfaz y de diagnóstico.** Mantiene el mismo modelo de
seguridad y de configuración corporativa que la 1.0.0.

## Qué cambia para el operador

### Interfaz más consistente

- Las secciones de la ficha («Datos del equipo», consola y «Alertas y reseteos»)
  ahora comparten la misma tarjeta, el mismo borde y el mismo margen: la pantalla
  deja de tener bloques que arrancan en coordenadas distintas.
- La barra superior, la barra de acciones y el contenido usan el mismo margen
  lateral.
- Tipografía unificada en cuatro tamaños y títulos de sección con una sola
  etiqueta, sin tamaños sueltos.
- La consola queda oscura en los dos temas, con el resto de la ventana siguiendo
  al tema elegido.

### Consola y diagnóstico

- La consola arranca abierta, se puede colapsar desde su encabezado y conserva
  los controles **Detener**, **Limpiar**, **Copiar Último** y **Copiar Logs**
  aunque esté cerrada.
- Al buscar una terminal se lanza **un solo ping automático al equipo buscado**.
  Ya no se encadena solo el ping al router `.250`: los enlaces `.250` y `.231`
  (con su `-t`) se disparan desde la barra cuando el operador los necesita.
- **Modo de ping predeterminado** en Ajustes: estándar (4 paquetes) o continuo
  (`-t`). La elección se aplica al ping automático de la siguiente búsqueda.
- El escaneo de subred muestra esqueletos mientras busca y el chip de uptime se
  puede refrescar desde el menú «Más».

### Cuenta de usuario

- El **icono del usuario** de la ficha es ahora el botón que ejecuta
  `net user` sobre la cuenta asignada; si la terminal tiene varias cuentas, abre
  el selector.
- El botón avisa con su descripción cuando el usuario NT tiene caracteres no
  permitidos.

### Búsqueda

- El historial muestra solo el valor y un icono, sin etiquetas de tipo ni
  animación de entrada.
- Si lo escrito no coincide con el historial, el panel no aparece: no queda un
  cartel de «sin coincidencias» colgado en pantalla.

### Ajustes y accesos

- **Minimizar a la bandeja** y el **atajo global `Ctrl + Espacio`** se guardan en
  disco y se aplican desde el arranque, no solo mientras la ventana está abierta.
  Si venías de la 1.0.0, la primera apertura migra lo que ya tenías configurado.
- El acceso al **Portal MDA** se movió de la barra superior a
  **Información → Acceso Directo**.
- El diálogo de información suma el acceso directo al inventario y el menú
  contextual conserva sus acciones.

## Mejoras internas que se notan en el uso

- Menos diálogos y menús propios: ahora usan las primitivas accesibles de Radix
  (foco, flechas, Escape y cierre con teclado).
- Los estados de carga y vacío son explícitos: buscando, sin resultados y sin
  actividad ya no se confunden entre sí.
- El paquete se divide en bloques de carga más chicos (React, Radix y el buscador
  por separado), así la ventana abre antes.
- La ventana no se relanza sobre una instancia destruida al reactivar la
  aplicación desde la bandeja.

## Actualizar desde 1.0.0

1. Descargar **Portal Correo Desktop Setup 1.1.0.exe**.
2. Ejecutarlo sobre la instalación existente. Se conservan los accesos directos y
   la configuración del equipo.
3. Si preferís no instalarla, **Portal Correo Desktop-Portable-1.1.0.exe**
   funciona sin instalación.

La aplicación también puede avisar de esta versión desde
**Ajustes → Actualizaciones del Sistema**.

## Cómo se instala (primera vez)

1. Descargar **Portal Correo Desktop Setup 1.1.0.exe**.
2. Ejecutarlo.
3. Windows va a mostrar el aviso de "Windows protegió tu PC" porque el programa
   todavía no está firmado digitalmente: elegir **Más información** y después
   **Ejecutar de todas formas**.
4. Abrir la aplicación desde el acceso directo o desde el menú Inicio.

## Qué necesita para funcionar

- Windows 10 o superior.
- Estar conectada a la red de Correo.
- Una cuenta habilitada para usar el sistema.

## Si algo no funciona

| Lo que ves | Qué significa |
| --- | --- |
| "Solo funciona dentro de la red corporativa" | La computadora no está conectada a la red de Correo |
| "Tu usuario no tiene acceso" | La cuenta todavía no está habilitada; hay que pedir el alta |
| "No se encontró la configuración" | Falta el archivo de configuración del sistema; avisar a soporte |
| "La configuración está incompleta" | El archivo de configuración tiene un problema; avisar a soporte |
| No aparece ninguna ventana | Una protección del equipo impide abrirla; reintentar o avisar a soporte |

El detalle del último intento queda en **Ajustes → Conexión Corporativa**.

## Notas

- Esta versión tampoco está firmada digitalmente; por eso Windows muestra la
  advertencia al instalar.
- Las preferencias de bandeja y atajo se guardan en el perfil del usuario
  (`%APPDATA%`), no en el equipo completo.
- El modelo de seguridad no cambió: la configuración se toma de la red en cada
  arranque y las credenciales no se guardan en disco.
