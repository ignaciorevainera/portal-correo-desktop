# Specification: Consola General de Diagnóstico de Red e Historial Unificado con Comandos Nativos (Nbtstat, Tracert, ARP)

## 1. Overview
Actualmente, la sección inferior de la pantalla aloja `LivePingConsole`, dedicada exclusivamente a mostrar el resultado del comando Ping. Además, el inicio de acciones se encuentra duplicado entre los botones superiores y el botón "Iniciar" interno de dicha tarjeta.

Este track transforma la consola en una **Consola General de Diagnóstico de Red** con **historial continuo acumulativo**. Se incorporan 3 comandos nativos de Windows (`nbtstat -A`, `tracert -d -h 6`, `arp -a`) accesibles desde un nuevo menú compacto en la barra de acciones rápidas (`QuickActionsBar`). La consola elimina su botón interno redundante "Iniciar" (manteniendo únicamente "Detener" cuando hay un proceso en streaming, "Limpiar" y "Copiar Logs") y añade cronológicamente la salida de cada nuevo comando debajo de las anteriores.

---

## 2. Functional Requirements

### 2.1 Backend: Herramientas Nativas de Diagnóstico en `electron/systemTools.cjs`
- **Sanitización Estricta:** Toda IP o hostname debe pasar por `sanitizeHostOrIp` para evitar inyección de argumentos o comandos en el shell.
- **Ejecución Asíncrona Streaming de Comandos Nativos:**
  1. `nbtstat -A <IP>`: Resuelve tabla NetBIOS (Hostname, Dominio, MAC y usuario logueado en registro `<03>`).
  2. `tracert -d -h 6 <IP>`: Traza de red ultrarrápida sin resolución DNS (`-d`) limitada a un máximo de 6 saltos (`-h 6`).
  3. `arp -a <IP>`: Consulta de dirección física MAC directa en tabla local ARP.
- **Control de Proceso Activo Unificado:** El backend gestionará un único proceso activo en streaming para la consola. Al dispararse cualquier nuevo comando, cualquier proceso en ejecución (ej. un `ping -t` continuo) se cancela ordenadamente antes de iniciar el nuevo proceso.

### 2.2 IPC Channels & Bridge (`electron/main.cjs`, `preload.cjs`, `electronClient.ts`)
- **Canal de Envío / Inicio:** `cmda:cmd-start` recibe `{ command: 'ping' | 'nbtstat' | 'tracert' | 'arp', target: string, options?: any }`.
- **Canal de Cancelación:** `cmda:cmd-stop` interrumpe el subproceso hijo activo.
- **Eventos de Streaming:**
  - `cmda:cmd-data`: Emite fragmentos de texto en tiempo real.
  - `cmda:cmd-end`: Notifica la finalización con el código de salida.
- **Cliente Frontend:** `subscribeToCommand(cmd, target, options, onData, onEnd)` y `stopActiveCommand()`, con emulación segura en navegador (mock mode para tests y dev).

### 2.3 Barra de Acciones (`QuickActionsBar.tsx`)
- **Menú Compacto "Diagnóstico ▾":**
  - Un Menú Dropdown estilizado con Shadcn UI contiguo al grupo de Ping.
  - Opciones del menú con icono y descripción clara:
    - `Nbtstat -A` *(Tabla NetBIOS, MAC y Usuario)*
    - `Tracert -d -h 6` *(Traza rápida de saltos)*
    - `ARP -a` *(Caché física local)*
  - Al pulsar cualquiera de ellos, se lanza el comando contra la IP activa y se actualiza la consola.
- Mantiene el Split Button de Conexión Remota Inteligente (VNC/MSRA), el grupo de Ping (2:1 con `-t`) y el indicador de Uptime sin alterar la densidad visual (1020x680).

### 2.4 Consola de Diagnóstico General con Historial Continuo (`DiagnosticConsole.tsx` / `LivePingConsole.tsx`)
- **Eliminación del botón "Iniciar":** La consola ya no inicia procesos por sí misma; todos los comandos se disparan desde los CTAs de la barra superior.
- **Controles de Cabecera:**
  - Badge dinámico del estado/comando en ejecución (`Ping`, `Ping -t`, `Tracert`, `Nbtstat`, `ARP` o `Inactivo`).
  - Botón **"Detener"** visible/habilitado únicamente mientras haya un subproceso corriendo.
  - Botón **"Limpiar"** para vaciar el historial de la pantalla.
  - Botón **"Copiar Logs"** que copia todo el historial actual al portapapeles.
- **Historial Continuo:**
  - Cada ejecución inserta un encabezado visual claro:
    `[15:42:01] > tracert -d -h 6 192.0.2.101`
  - La salida se va anexando debajo de los comandos previos sin borrar el historial anterior.
  - El scroll se ajusta automáticamente hacia el final mientras fluye la salida.
- **Cambio de Terminal:**
  - Al seleccionar o buscar una nueva terminal, el historial se reinicia limpiamente para evitar mezclar diagnósticos de diferentes equipos.

---

## 3. Non-Functional Requirements & Security
- **Zero-Secrets:** Ninguna IP privada corporativa ni dato sensible en el código ni en las pruebas; uso estricto de RFC 5737 (`192.0.2.x`).
- **Zero-Freeze:** Salida de procesos desacoplada del hilo de renderizado; ejecución no bloqueante.
- **Compatibilidad con Pruebas Existentes:** Mantener backwards compatibility en contratos para que la suite de Vitest (31 archivos, 140 tests) continúe al 100% verde.

---

## 4. Acceptance Criteria
1. El botón redundante "Iniciar" dentro de la consola queda eliminado; el botón "Detener" sigue funcionando si hay un comando corriendo.
2. Al presionar "Ping", "Ping -t", "Nbtstat", "Tracert" o "ARP", la consola muestra el comando ejecutado y sus líneas debajo de las ejecuciones anteriores.
3. Al disparar un comando mientras corre un `ping -t`, el ping se detiene sin errores y arranca el nuevo comando.
4. Al buscar un equipo diferente, la consola se vacía e inicia con el auto-ping del nuevo equipo.
5. El botón "Copiar Logs" copia la totalidad del historial acumulado.
6. 100% de tests unitarios e integración pasando.
