# Portal Correo Desktop 1.0.0

**Primera versión pública.**

## ¿Qué es esta aplicación?

Es una herramienta de escritorio para el personal de soporte técnico. Sirve para atender una terminal sin tener que ir hasta ella y sin abrir cinco programas distintos.

Con Portal Correo Desktop podés:

- **Buscar una terminal** por su nombre o por su IP y ver su ficha completa: a quién está asignada, qué sistema operativo tiene, procesador, memoria, antivirus y versión de Internet Explorer.
- **Ver su historial**: las alertas abiertas y cerradas, y los reseteos que se hicieron, con fecha, operador y motivo.
- **Conectarte a distancia con un clic.** La aplicación detecta sola si el equipo admite VNC o Escritorio Remoto de Windows y abre la opción que corresponde.
- **Diagnosticar sin salir de la aplicación**: ping, rastreo de ruta, NetBIOS y tabla ARP, con la salida en vivo.
- **Revisar la red**: escanear el rango de una terminal para encontrar los equipos que están respondiendo.
- **Consultar una cuenta de dominio**: estado, grupos y datos de la cuenta de un usuario.

Todo en una sola ventana, con atajos de teclado para buscar y conectar.

## Qué tiene de nuevo esta versión

Esta es la primera versión que se publica abiertamente. Los cambios importantes son de seguridad y de instalación:

- **El instalador ya no contiene contraseñas.** Antes, las claves de la base de datos y de acceso remoto viajaban dentro del archivo de instalación. Ahora no: se puede descargar desde cualquier lugar sin exponer nada de la empresa.
- **La configuración se toma de la red.** Al abrir la aplicación, toma los datos que necesita desde un recurso interno de Correo. No hay que configurar nada a mano ni pedir un archivo: si la computadora está en la red y la cuenta está habilitada, funciona.
- **Si no hay acceso, avisa.** En lugar de abrirse a medias o fallar sin explicación, muestra un cartel que dice qué está faltando: si es la conexión a la red, si es el permiso de la cuenta, o si falta la configuración.
- **No deja nada guardado en la computadora.** Los datos de acceso se usan en el momento y no quedan en el equipo. Si alguien usa otra máquina, no arrastra credenciales.
- **Limpia versiones anteriores.** Si en el equipo había quedado un archivo de configuración viejo con contraseñas, la aplicación lo elimina la primera vez que se abre.

## Cómo se instala

1. Descargar **Portal Correo Desktop Setup 1.0.0.exe**.
2. Ejecutarlo.
3. Windows va a mostrar un aviso azul de "Windows protegió tu PC" porque el programa todavía no está firmado digitalmente. Hay que elegir **Más información** y después **Ejecutar de todas formas**.
4. Abrir la aplicación desde el acceso directo o desde el menú Inicio.

Si no querés instalarla, también está **Portal Correo Desktop-Portable-1.0.0.exe**, que funciona sin instalarse.

## Qué necesita para funcionar

- Una computadora con Windows 10 o superior.
- Estar conectada a la red de Correo (en la oficina, no desde la casa).
- Una cuenta habilitada para usar el sistema.

## Si algo no funciona

La aplicación muestra un cartel con el motivo. Estos son los casos habituales:

| Lo que ves | Qué significa |
| --- | --- |
| "Solo funciona dentro de la red corporativa" | La computadora no está conectada a la red de Correo |
| "Tu usuario no tiene acceso" | La cuenta todavía no está habilitada; hay que pedir el alta |
| "No se encontró la configuración" | Falta el archivo de configuración del sistema; hay que avisar a soporte |
| "La configuración está incompleta" | El archivo de configuración tiene un problema; hay que avisar a soporte |
| No aparece ninguna ventana | El equipo tiene una protección que impide abrir la aplicación; probá de nuevo o avisá a soporte |

En **Ajustes → Conexión Corporativa** se puede ver el estado del acceso y el detalle del último intento.

## Notas

- En algunos equipos con protecciones corporativas, la aplicación puede tardar unos segundos más en abrir la primera vez. Es normal.
- Si la aplicación estaba abierta y se corta el acceso a la red, sigue funcionando hasta que se cierre. Al volver a abrirla, verifica el acceso de nuevo.
- Esta versión todavía no está firmada digitalmente; por eso Windows muestra la advertencia al instalar.
