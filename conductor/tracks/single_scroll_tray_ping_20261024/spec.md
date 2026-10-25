# Specification (`spec.md`): Vista Unificada Sin Sidebar, Subheader Fijo, Bandeja del Sistema (Tray) y Consola Ping Avanzada (`Ping -t` & Copiar Logs)

## 1. Overview
Transformar la interfaz de **new CMDA** en un flujo de página única (Single-Scroll View) prescindiendo definitivamente de la Sidebar. Toda la información de la terminal consultada residirá en el contenedor `<main>` ordenada por prioridad operativa, con un **Subheader Fijo Superior** para ejecutar los comandos de soporte en cualquier punto del scroll. Asimismo, se integrará el ciclo de vida en la **Bandeja del Sistema (System Tray)** con un botón de Apagado (`Power`) en el Header (permitiendo cerrar definitivamente la app solo desde el menú contextual del Tray), y se potenciará el comando de Ping sumando un botón secundario **`Ping -t`** en la barra de comandos y controles de **Detener**, **Limpiar** y **Copiar Logs** en la consola interna.

---

## 2. Functional Requirements

### 2.1 Eliminación de Sidebar y Estructura Single-Scroll con Subheader Fijo
- **Sin Sidebar:** Se elimina por completo el componente `Sidebar` del layout principal en `src/App.tsx`.
- **Subheader Fijo de Comandos (`QuickActionsBar`):**
  - Posicionado de forma fija en la parte superior del contenedor de la terminal (`sticky top-0 z-20` o cabecera fija sobre el área scrollable de `<main>`), garantizando que los comandos (`VNC Viewer`, `Asistencia MSRA`, `Ping`, `Ping -t`, `Uptime` y mensajes de estado/error inline) estén siempre a la vista mientras el operador se desplaza verticalmente.
- **Orden Jerárquico de Secciones en `<main>` al Buscar una Terminal:**
  1. **Subheader Fijo de Comandos (`QuickActionsBar`)** — Siempre fijo arriba.
  2. **Grilla Principal de Identidad y Sistema (2 columnas compactas):**
     - Izquierda: **Red, Ubicación y Active Directory (`NetworkAdCard`)** (IP, MAC, Usuarios de Dominio `UserNT`, Ubicación, Centro de Costos).
     - Derecha: **Ficha Técnica & Sistema (`HardwareCard`)** (SO, Build, Modelo y CPU, RAM, Antivirus, Navegador, Fecha de Relevamiento).
  3. **Consola Interna de Ping (`LivePingConsole`)** — Siempre presente en el flujo con ancla de scroll automático (`ref`).
  4. **Alertas de Terminal (`AlertsPanel`)** — Con contador de alertas activas visible en su cabecera, alta de incidencias y cierre documentado.
  5. **Reseteo de Cuentas AD e Historial (`ResetUptimePanel`)** — Solicitud de reseteo en AD e historial de reseteos previos.

### 2.2 Botón de Apagado (`Power`) a Bandeja del Sistema (System Tray) y Minimizar
- **Controles en `Topbar` (a la derecha de `ThemeToggle`):**
  - Se elimina el botón de Maximizar y el botón de Cerrar (`X`) tradicional.
  - Se mantiene el botón de **Minimizar** a la barra de tareas (`minimizeWindow`).
  - Se añade a su derecha el botón con el icono de **Apagado (`Power` / Turn Off)** (`hideToTray`), que oculta la ventana y la envía a la **Bandeja del Sistema (System Tray)** sin finalizar el proceso.
- **Integración de `Tray` en Electron (`electron/main.cjs`):**
  - Crear una instancia de `Tray` con icono nativo generado (`nativeImage`) y tooltip `'new CMDA - Monitoreo e Inventario de Estaciones'`.
  - **Clic izquierdo / doble clic en el icono del Tray:** Restaura y enfoca la ventana principal (`win.show(); win.focus()`).
  - **Menú contextual del Tray (Clic derecho):**
    - `Abrir new CMDA` (restaura la ventana).
    - `Cerrar` (activa el flag `app.isQuiting = true` y ejecuta `app.quit()`, siendo la **única forma de cerrar definitivamente** la aplicación).
  - Interceptar el evento `close` de `BrowserWindow` para que, si `app.isQuiting` no es `true`, haga `event.preventDefault()` y `win.hide()`, enviando la app al System Tray.

### 2.3 Flujo de `Ping` (4 paquetes) + `Ping -t` (Infinito) y Consola Interna Mejorada
- **Botones de Ping en el Subheader Fijo (`QuickActionsBar`):**
  - El bloque de Ping dentro de la barra de comandos contendrá dos botones contiguos donde **`Ping -t` ocupa la mitad del ancho del CTA de Ping normal** (proporción `2:1` / `flex-[2]` vs `flex-1`):
    1. **CTA Principal (`Ping`):** Ejecuta un ping estándar de 4 paquetes (`ping -n 4 <ip>`).
    2. **Botón Secundario (`Ping -t`):** Ejecuta un ping continuo infinito (`ping -t <ip>`).
  - **Comportamiento al pulsar cualquiera de los dos botones:**
    - Reemplaza/limpia de inmediato los logs existentes en la consola interna.
    - Desplaza el scroll suavemente (`scrollIntoView({ behavior: 'smooth', block: 'center' })`) hasta la **Consola Interna de Ping (`LivePingConsole`)**.
    - Cancela cualquier proceso de ping anterior en curso e inicia el nuevo proceso (`4 paquetes` o `-t`).
- **Controles en la Esquina Superior Derecha de `LivePingConsole`:**
  1. **Detener:** Botón para finalizar en cualquier momento el proceso `ping` o `ping -t` activo (vía IPC `cmda:ping-stop`).
  2. **Limpiar:** Vacía los registros actuales de la consola.
  3. **Copiar Logs:** Copia el texto íntegro de todos los logs actuales de la consola al portapapeles (`navigator.clipboard.writeText(logs.join('\n'))`) y muestra confirmación visual (*"Logs copiados"*).
- **Soporte Backend para `ping -t` y `stopPing` (`electron/systemTools.cjs` & `electron/main.cjs`):**
  - Actualizar `getPingArgs(target, options)` y `executePing` para soportar modo continuo (`continuous: true` -> `['-t', cleanHost]`) además del conteo por paquetes (`['-n', String(count), cleanHost]`).
  - Mantener referencia al subproceso de ping activo en `electron/main.cjs` para poder terminarlo limpiamente (`activePingProcess.kill()`) cuando se invoque `cmda:ping-stop` o cuando se inicie un nuevo ping.

---

## 3. Non-Functional Requirements
- **Prevención de Procesos Huérfanos:** Cualquier proceso `ping -t` activo debe detenerse automáticamente si el operador cambia de terminal, pulsa "Detener" o cierra definitivamente la aplicación desde el System Tray.
- **Fidelidad al Theme OKLCH:** Mantener intactas las variables de color en `:root` y `.dark` de `src/index.css`.
- **Cobertura de Tests (TDD):** Pruebas unitarias en Vitest para los argumentos de `ping -t`, control IPC de System Tray y parada de ping, botones de `Ping` / `Ping -t` en `QuickActionsBar`, y botones de `Detener` / `Limpiar` / `Copiar Logs` en `LivePingConsole`.

---

## 4. Acceptance Criteria
1. No existe ninguna Sidebar en la aplicación; todas las secciones de la terminal (`NetworkAdCard`, `HardwareCard`, `LivePingConsole`, `AlertsPanel`, `ResetUptimePanel`) se muestran en `<main>` en el orden acordado y son accesibles haciendo scroll.
2. El Subheader de comandos (`QuickActionsBar`) permanece fijo en la parte superior del área principal al hacer scroll.
3. En el `Topbar`, a la derecha del cambio de tema, solo aparecen el botón de **Minimizar** y el botón con icono de **Apagado (`Power`)** que envía la ventana a la Bandeja del Sistema (System Tray); la app solo se cierra definitivamente desde el menú contextual del Tray (`Cerrar`).
4. En el Subheader fijo, el botón **`Ping -t`** se ubica junto al botón de **Ping** ocupando la mitad de su tamaño; al pulsar cualquiera de los dos, se reemplazan los logs de la consola, la vista hace scroll hacia la consola interna y se ejecuta el ping de 4 paquetes o el infinito (`-t`).
5. La consola interna de Ping cuenta en su esquina superior derecha con los botones **Detener**, **Limpiar** y **Copiar Logs** (copiando el log completo al portapapeles).
