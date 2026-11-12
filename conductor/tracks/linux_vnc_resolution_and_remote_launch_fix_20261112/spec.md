# Specification: Corrección de Resolución de Terminales Linux / VNC y Lanzamiento Remoto

## Overview
Este track corrige los fallos detectados al consultar y operar terminales con sistema operativo Linux o estaciones transaccionales con puertos VNC (5901/5900):
1. **Derivación errónea a `net user`:** Al buscar un hostname válido sin guiones (ej. `TTBUE07P`, `B1617FRPU0001`, `B1757CLCU0002`, `I1161STM002`) que no se halla en el inventario Windows SQL, la aplicación lo confunde con una cuenta de Active Directory y dispara automáticamente `net user <hostname> /domain` en la consola.
2. **Falla en resolución por Hostname (Contexto CMDA Legacy):** Históricamente en el aplicativo CMDA original de Visual Basic 6, las terminales transaccionales y Linux no contaban con agente de inventario Windows ni registro en Active Directory, por lo que **era obligatorio consultarlas directamente por su dirección IP**. En Portal Correo Desktop, cuando el operador intenta buscarlas por hostname, el backend solo consulta el Stored Procedure `CMDA_Trae_Info_DE_PC_PARAmesa_T` sin consultar la tabla `Fecha_Relevada_PCs` ni aplicar la cadena completa de resolución de red corporativa (DNS con sufijo corporativo / NetBIOS / ping -a).
3. **Lanzamiento remoto silencioso (Solo Toast sin ejecución):** Al intentar conectar a estaciones Linux o con VNC (incluso tras hallarlas por IP), la UI solo muestra un toast de notificación sin levantar ninguna ventana de asistencia, originado por timeouts cortos en la verificación de puertos (600-800 ms), derivación errónea a MSRA (incompatible con Linux), y empaquetado/ejecución asíncrona ciega de `vncviewer.exe` donde los errores de proceso se enmascaran como exitosos. Además, VNC debe asegurar la conexión hacia la dirección IP directa del equipo para evitar que UltraVNC intente resolver hostnames inexistentes en el DNS corporativo.

---

## Functional Requirements

### 1. Eliminación del Auto-Disparo de `net user` y Mejora de Clasificación
- **Fin del auto-trigger:** Cuando `searchTerminalUnified` no devuelve datos para un término de búsqueda, la aplicación **NUNCA** debe ejecutar `net user` de forma automática.
- **Estado 'Terminal no encontrada' con guía de operador y acción opcional:** Si no se halla el equipo, se presentará el componente visual `Empty` ("Terminal no encontrada") con mensaje explicativo: *"Si se trata de una terminal Linux o transaccional, podés consultarla directamente por su dirección IP."*. Si el término cumple la sintaxis de usuario AD, se proveerá además el botón secundario explícito: *"Consultar «<término>» como cuenta AD"*.
- **Heurística de clasificación:** Ajustar `classifySearch` para que patrones conocidos de estaciones corporativas y transaccionales (prefijos `TT*`, `B*`, `I*`, `C*`, sufijos numéricos de sucursal/puesto) se clasifiquen por defecto como `terminal`.

### 2. Cadena Híbrida de Resolución por Hostname
- **Fallback SQL a `Fecha_Relevada_PCs`:** En `electron/dbService.cjs`, si `CMDA_Trae_Info_DE_PC_PARAmesa_T` no devuelve filas para un hostname:
  - Ejecutar consulta a `Fecha_Relevada_PCs` buscando coincidencias (`WHERE pc = @pc OR pc LIKE @pc + '%'`).
  - Si se obtiene la IP histórica, generar la ficha técnica básica con la IP asociada y la fecha de relevamiento.
- **Resolución de Red Robusta (DNS Corporativo + NetBIOS):** En `electron/dnsResolver.cjs`, si la consulta por hostname directo falla:
  - Intentar resolución con el sufijo corporativo configurado (dominio AD corporativo o el del Gatekeeper).
  - Utilizar el resolvedor NetBIOS / ping -a (`hostnameResolver.cjs`) como mecanismo de respaldo.
- **Detección de Entorno Linux / VNC:** Si la terminal proviene de red viva o `Fecha_Relevada_PCs` y sus puertos VNC (5901/5900) están abiertos, tipificar el sistema como *"Estación Linux / VNC"* para adaptar los controles y opciones de soporte.

### 3. Lanzador Remoto Robusto y Confiable para VNC y Linux
- **Desempaquetado y Ruta de `vncviewer.exe`:** Configurar `package.json` con `asarUnpack: ["resources/bin/**/*"]` y corregir `getVncViewerPath()` para que en entornos de producción empaquetados (`app.isPackaged`) resuelva la ruta física fuera del `.asar` (`process.resourcesPath/app.asar.unpacked/resources/bin/vncviewer.exe`).
- **Prioridad de Destino por IP para VNC:** `launchVnc` y `launchRemoteSmart` deben priorizar siempre la dirección IPv4 resuelta (`terminal.ip`) por sobre el hostname en el parámetro `HOST=` del archivo `.vnc` o en la línea de comando de UltraVNC, evitando que el visor intente una resolución de nombre NetBIOS/DNS que en terminales Linux siempre falla.
- **Validación de Inicio de Proceso:** `systemTools.launchVnc` debe capturar errores inmediatos de `spawn` (evento `error` del child process antes de confirmar éxito) y extender el tiempo de retención del archivo temporal `.vnc` a un mínimo de 10 segundos para garantizar que el visor termine de leerlo antes de eliminarlo.
- **Ajuste de Timeouts en Sondeo de Puertos:** Incrementar el timeout de verificación de puertos de 600-800 ms a 1500 ms para tolerar latencias de enlaces WAN hacia sucursales remotas.
- **Incompatibilidad MSRA en Linux:** Si el sistema operativo detectado es Linux o si los puertos VNC (5900/5901) están abiertos, el orquestador inteligente **NO** debe derivar a MSRA (`msra.exe`), enfocándose exclusivamente en la conexión VNC y reportando con precisión si el puerto VNC no responde.

---

## Non-Functional Requirements
- **Zero-Secrets:** Preservar la seguridad y privacidad de credenciales VNC según `configProvider.cjs` sin persistir claves en texto claro en logs o archivos huérfanos.
- **Cobertura de Pruebas:** Pruebas unitarias en Vitest para la nueva cadena de resolución en `dbService`, `dnsResolver`, `systemTools` (lanzamiento VNC, exclusión MSRA en Linux) y tests de integración/UI para la supresión del auto-disparo de `net user`.
- **Compatibilidad con Windows 10/11 x64:** Asegurar funcionamiento tanto en modo desarrollo como en el instalador NSIS y versión portable generadas por `electron-builder`.

---

## Acceptance Criteria
- [ ] Buscar hostnames como `TTBUE07P`, `TTBUE07P-D`, `B1617FRPU0001`, `B1757CLCU0002`, `I1161STM002` no dispara en ningún caso la consola con `net user`.
- [ ] Si una terminal Linux/VNC no figura en `CMDA_Trae_Info`, el sistema la localiza a través de `Fecha_Relevada_PCs` o DNS corporativo y la presenta en pantalla con su IP real.
- [ ] Si una terminal no es encontrada por hostname, la pantalla Empty orienta al operador sugiriendo consultar directamente por IP si se trata de un puesto Linux o transaccional.
- [ ] Al pulsar "Conectar VNC" o la conexión remota inteligente en una terminal Linux/VNC encontrada por IP o por hostname, se ejecuta efectivamente `vncviewer.exe` apuntando a la IP directa y abriendo la sesión remota en pantalla.
- [ ] En terminales Linux, el sistema no intenta lanzar `msra.exe` ni emite toasts de éxito falsos cuando el proceso remoto no puede iniciarse.
- [ ] La suite de pruebas unitarias (`npm test`) y chequeo de empaquetado pasan al 100%.

---

## Out of Scope
- Instalación remota o configuración del servidor VNC del lado del sistema operativo Linux en las terminales físicas.
- Modificación del esquema de tablas o procedimientos almacenados existentes en el servidor SQL Server de producción.
