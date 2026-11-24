# Diseño: TUI Unificada Inteligente (HDA + STS+SOP) y Terminal SSH Embebida

**Fecha:** 2026-11-24  
**Estado:** Borrador v2 (actualizado tras relevamiento de logs reales de HDA y STS+SOP)  
**Tamaño estimado:** Proyecto completo (Main Process + Orquestador TUI `@xterm/headless` + Salto SSH SOP + Preload/IPC + Ventana secundaria React/xterm + Seguridad + Tests)

---

## 1. Intención y Propósito

Los operadores de la Mesa de Ayuda utilizan actualmente una instalación portable externa de **KiTTY** con dos flujos complementarios sobre las terminales de sucursal (`tt.....p`):

1. **Servidor central HDA (`HDA*`):** Menú UNIX en texto plano (*Centro de Soporte*) para gestión centralizada de colas de impresión (`lpstat`, `lp`, `enable`, borrado de trabajos, cambio de IP con lock `mod_ip.lck` y segunda clave), habilitación de usuarios de escáner, desconexión de usuarios y controles centrales.
2. **Servidor salto STS+SOP (`tsunami` → `ssh mesa@<IP>`):** Shell Linux desde el cual el operador salta por SSH a cada terminal Linux Debian (SOP) consultada, abriendo un menú `dialog` (ncurses) para gestión local de impresoras CUPS (11 opciones), procesamiento de archivos/tablas SOP, blanqueo de contraseña SOP, dominio, escáner local e información de hardware.

Hoy el operador debe mantener KiTTY externo, elegir perfiles separados, copiar a mano la IP de la terminal consultada en Portal Correo Desktop y ejecutar `ssh mesa@<IP>` manualmente en `tsunami`.

Este diseño integra una **ventana secundaria de TUI Unificada Inteligente** en Portal Correo Desktop (operando lado a lado con la ficha técnica de la PC) que:
- Reúne **HDA (Central)** y **SOP (Terminal Linux activa)** en **un único menú TUI unificado** operable por teclado y clic.
- Automatiza el salto SSH `tsunami → ssh mesa@<IP>` tomando la IP de la PC consultada en la ventana principal (o una IP ingresada manualmente).
- Presenta **vistas/formularios limpios** dentro de la TUI unificada para las consultas y acciones simples ya mapeadas, y **navega automáticamente al submenú exacto en un visor interactivo embebido (`@xterm/xterm`)** para las acciones complejas, dinámicas o con prompts no mapeados, garantizando que el operador nunca quede ciego ante un mensaje inesperado del servidor.

---

## 2. Objetivos, No-Objetivos y Anti-Objetivos

### Objetivos
- **TUI Unificada de entrada (HDA + SOP):** Al abrir la ventana SSH se despliega un menú unificado operable 100% por teclado (`1–9`, flechas, `Enter`, `Esc`) y clic que agrupa operaciones de **HDA** y **SOP** sobre la PC activa.
- **Salto SSH automático a terminales SOP:** Conectar a la terminal Linux SOP activa (`tsunami → mesa@<IP>`) en 1 clic sin tipear `ssh mesa@<IP>`.
- **Ejecución híbrida segura (Vistas Limpias + Visor Pre-posicionado):**
  - Vistas limpias nativas con prellenado de contexto (`PC`, `IP`, `cola`) para operaciones determinísticas y de lectura ya relevadas en ambos logs.
  - Navegación automática hasta el submenú exacto en `@xterm/xterm` embebido para flujos complejos/dinámicos (`Cambio de IP impresora` con 2ª clave y lock `mod_ip.lck`, `Habilitar scanner`, `Desconexión de usuarios`, CRUD dinámico de impresoras CUPS en SOP, etc.).
  - Botón *"Ver terminal original"* disponible en todo momento como escape hatch ante cualquier salida inesperada del servidor.
- **Puente contextual con la ficha activa y productividad:** Botones de 1 clic para inyectar `Usuario`, `PC`, `IP` y `Sucursal` (sin `Enter` automático), macros configurables, soporte multipestaña (incluyendo acceso a otros perfiles como `HOST*`), búsqueda en scrollback, copiar/pegar moderno, tamaño de fuente y reconexión en 1 clic.
- **Modelo flexible de perfiles y credenciales (Zero-Secrets):** Perfiles base opcionales desde `cmda.config.json` (`fail-open`), bóveda cifrada local por operador (`safeStorage`/DPAPI), soporte de clave opcional para `mesa@<IP>` (guardable cifrada o solicitada al vuelo) e importador secundario opcional desde carpetas KiTTY locales.

### No-Objetivos
- Automatizar a ciegas (ocultando la pantalla) flujos con segundas claves dinámicas, locks compartidos (`mod_ip.lck`), listas dinámicas de impresoras (`dialog`) o prompts aún no relevados (`HDA 3`, `4`, `5`, `6`, `2→2`).
- Transferencia de archivos (`SCP`/`SFTP`), port-forwarding manual para el usuario o protocolos no-SSH (`Telnet`, `Serial`, `Raw`, `ADB`).
- Modificar o escribir archivos dentro de instalaciones externas de KiTTY.

### Anti-Objetivos
- **Fuga de secretos al repositorio:** Cualquier IP corporativa real (`10.x.x.x`), MAC, hostname real, usuario real, contraseña o log de sesión (`*.log.txt`) en Git o en logs de diagnóstico.
- **Dejar locks colgados en HDA:** Cerrar silenciosamente una sesión durante `Cambio de IP impresora` sin advertir al operador que `/home/appl/adm/hda/log//mod_ip.lck` podría quedar activo.
- **Exposición de contraseñas al proceso Renderer:** Ninguna clave (ni HDA, ni `tsunami`, ni `mesa`) viaja de vuelta al renderer ni se persiste en `localStorage`.
- **Rotura bajo `--disable-gpu`:** Todo renderizado de `@xterm/xterm` es estrictamente DOM (sin WebGL).
- **Compilación nativa C++:** Prohibido depender de `node-pty` / `electron-rebuild`.
- **Degradación del cold start:** Carga diferida (`lazy require`) de `ssh2` y `@xterm/headless`.

---

## 3. Restricciones y Seguridad

1. **Zero-Secrets & Auditoría Git:**
   - Solo IPs de documentación RFC 5737 (`192.0.2.x`) y datos ficticios en código, tests y documentación.
   - Ampliar `src/test/securityAudit.test.ts` para prohibir bóvedas SSH (`*.enc.json`, `ssh-known-hosts.json`), logs PuTTY/KiTTY y archivos de sesión en Git.
2. **Aislamiento Electron y Security Gate:**
   - Ventana SSH con `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` y preload dedicado (`electron/ssh-preload.cjs`).
   - Canales IPC `pcd:ssh-*` habilitados solo cuando `SecurityGate` está en `READY`.
3. **Almacenamiento cifrado de credenciales locales:**
   - Bóveda local en `userData/ssh-profiles.enc.json` cifrada con `safeStorage.encryptString` (Windows DPAPI).
   - Si `safeStorage.isEncryptionAvailable()` es `false`, nunca se guardan contraseñas en texto plano; se solicitan al vuelo en memoria.
   - Al renderer solo se exponen flags booleanos (`hasSavedPassword`, `hasSavedTargetPassword`).
4. **Verificación de Host Key (TOFU):**
   - Claves aceptadas en `userData/ssh-known-hosts.json` por `host:port` (algoritmo + fingerprint SHA-256).
   - **Nota operativa para saltos SOP (`mesa@<IP>`):** Al conectarse a terminales Linux de sucursal vía `forwardOut` (SSH directo tunelizado), aplica TOFU por IP de terminal con opción en el diálogo de recordar confianza para esa terminal; si la clave de una terminal ya conocida cambia, alerta bloqueante con confirmación explícita.
5. **Compatibilidad `--disable-gpu`:**
   - `@xterm/xterm` con renderer DOM exclusivamente (sin addon WebGL).
6. **Nuevas dependencias npm aprobadas:**
   - Producción: `ssh2`, `@xterm/xterm`, `@xterm/headless`, `@xterm/addon-fit`, `@xterm/addon-search`.
   - Desarrollo: `@types/ssh2`.

---

## 4. Enfoques Considerados

| Enfoque | Descripción | Trade-offs | Decisión |
| :--- | :--- | :--- | :--- |
| **A. TUI Unificada Inteligente (`ssh2` + `@xterm/headless` + `@xterm/xterm` DOM)** | Menú unificado HDA + SOP con salto automático `tsunami → mesa@<IP>`. Vistas limpias para los flujos simples mapeados leyendo la grilla VT100 con `@xterm/headless`, y visor `@xterm/xterm` pre-posicionado para flujos complejos/dinámicos + escape hatch *"Ver terminal original"*. | Agrega 5 paquetes JS puros (0 C++). Requiere mantener selectores de pantalla para el set acotado de vistas limpias, pero nunca bloquea al operador porque cualquier caso no reconocido cae al visor interactivo real. | **Elegido** |
| **B. Orquestador puro sin vistas limpias** | Menú unificado + salto automático, pero toda salida se ve siempre en el visor crudo `@xterm/xterm`. | Más simple, pero obliga a leer salida cruda y navegar `dialog`/menus incluso en consultas de solo lectura frecuentes (Info terminal, Estado impresoras, Estado cola). | Descartado |
| **C. Abstracción 100% oculta para todas las opciones** | Ocultar completamente HDA y SOP automatizando incluso locks, segundas claves y listas dinámicas de impresoras. | Alto riesgo operativo ante prompts no relevados (`HDA 3/4/5/6`, `mod_ip.lck`) y cambios dinámicos de `dialog`. | Descartado |
| **D. `node-pty` + `ssh.exe`/`klink.exe`** | Envoltorio sobre binario externo en ConPTY nativo. | Compilación C++ contra Electron 34, fricción con EDR/antivirus y paso inseguro de claves a procesos externos. | Descartado |

---

## 5. Diseño Arquitectónico y Funcional

### 5.1 Ventana Secundaria Dedicada y Ciclo de Vida (`electron/sshWindows.cjs`)

- Instancia única de `BrowserWindow` (`frame: false`, dimensiones iniciales `980×660`, mínimo `780×500`, entrada `ssh.html` en `vite.config.ts`).
- *(Decisión de arquitectura — ciclo de vida independiente del tray):* A diferencia de `Monitor` (`skipTaskbar: true`, `alwaysOnTop: true`), la ventana SSH usa `skipTaskbar: false` y `alwaysOnTop: false`. Al ocultar la ventana principal a la bandeja (`minimizeToTray` / `hideToTray`), **la ventana SSH permanece abierta** para no interrumpir operaciones activas ni dejar locks colgados en HDA. Solo se cierra al cerrar explícitamente la ventana SSH (con diálogo de confirmación si hay sesiones activas, y advertencia reforzada si hay un flujo de `Cambio de IP impresora` abierto) o al salir completamente de la app (`quitApp` / `shutdownChildProcesses`).
- Persiste posición y tamaño (clamped a `workArea`) en `userData/ssh-preferences.json`.
- Puntos de entrada: botón `Terminal` en `Topbar`, entrada *"Abrir TUI Unificada / SSH"* en `OperatorContextMenu` y entrada en el menú del `Tray`.
- Sincronización de PC activa: `main.cjs` mantiene el snapshot `{ pc, ip, userNt, location, costCenter, os }` de la terminal consultada y lo empuja reactivamente a la ventana SSH.

### 5.2 Motor SSH, Salto SOP y Decodificación (`electron/sshSessionManager.cjs`)

- **Carga diferida:** `require('ssh2')` y `require('@xterm/headless')` solo al abrir la primera conexión SSH.
- **Compatibilidad de algoritmos SSH (moderno + legacy):**
  - Prioriza algoritmos modernos (`ecdh-sha2-nistp256`, `aes256-gcm@openssh.com`, `ssh-ed25519`, `ecdsa-sha2-nistp256`) y habilita fallback legacy (`diffie-hellman-group14-sha1`, `diffie-hellman-group-exchange-sha1`, `ssh-rsa`, `aes128-cbc`, `aes256-cbc`) para servidores UNIX/AIX y Debian 10 antiguos.
- **Autenticación resiliente:** soporta `password` y `keyboard-interactive` (`tryKeyboard: true`); si falta contraseña o falla la autenticación, emite `auth-required` para solicitarla en diálogo seguro (con casilla opcional *"Guardar cifrada en este equipo"*).
- **Decodificación híbrida UTF-8 / ISO-8859-1 *(hallazgo del log real de HDA)*:**
  - En los logs reales, **SOP (Debian)** envía UTF-8 puro (`está`, `↓(+)`, `contraseña`), mientras **HDA** envía bytes ISO-8859-1/Latin-1 en mensajes del sistema (`Última conexión`, `Mié`).
  - Se implementa un decodificador por chunk en `sshSessionManager.cjs` con modo `auto` (por defecto): valida secuencias UTF-8 y convierte cualquier byte aislado inválido en UTF-8 según ISO-8859-1 antes de entregarlo a `@xterm/headless` y al renderer, preservando intactos tanto UTF-8 como tildes Latin-1 sin configuración manual.
- **Salto SSH automático a terminales Linux SOP (`tsunami → mesa@<IP>`):**
  - **Estrategia primaria (ProxyJump nativo vía `forwardOut`):** Reutiliza una conexión persistente `ssh2` contra el bastión `tsunami` por perfil `sop-jump`, abriendo un canal TCP `jumpClient.forwardOut('127.0.0.1', 0, targetIp, 22, ...)` y negociando un segundo `ssh2.Client` sobre ese stream hacia `mesa@<targetIp>`. Ventajas: autenticación SSH limpia (`password`/`keyboard-interactive`), TOFU nativo en `userData/ssh-known-hosts.json` por terminal y cierre limpio sin parsear prompts de `ssh`.
  - **Fallback automático si `AllowTcpForwarding` está deshabilitado en `tsunami` *(Decisión de arquitectura)*:** Si `forwardOut` falla por política del servidor (`Channel open failure` / `administratively prohibited`), abre un PTY en `tsunami` y ejecuta `ssh mesa@<targetIp>` **sin** la bandera `StrictHostKeyChecking=accept-new` (para mantener compatibilidad con cualquier versión de OpenSSH en `tsunami`, incluso `< 7.6`), con `targetIp` validada estrictamente por `sanitizeHostOrIp`. El orquestador detecta mediante `@xterm/headless` los prompts de primera conexión (`Are you sure you want to continue connecting`), alerta de cambio de clave (`REMOTE HOST IDENTIFICATION HAS CHANGED!`), solicitud de contraseña y `Permission denied`, derivándolos a los mismos diálogos de confirmación/auth de la UI sin eco de claves en logs.
- **Reutilización de sesiones y concurrencia *(Decisión de arquitectura)*:**
  - **HDA:** Se mantiene una única sesión HDA activa por perfil para evitar límites de sesiones concurrentes del servidor UNIX. El orquestador reutiliza esa sesión solo si está en estado limpio (`Menu principal` o `Menu impresiones`). Si está ocupada en modo interactivo o tiene `lockRisk === true`, el Hub **nunca** inyecta pulsaciones encima: notifica al operador y ofrece enfocar la pestaña interactiva activa (o abrir una pestaña libre adicional bajo confirmación).
  - **SOP:** Cada pestaña `[SOP: <PC>]` queda anclada a la IP con la que se abrió aunque el operador consulte otra PC en la ventana principal; el Hub actualiza únicamente la tarjeta de destino activo para futuras acciones.
  - **Selección de perfil por rol:** Si hay múltiples perfiles con `role: 'hda'` o `role: 'sop-jump'`, el encabezado de cada columna del Hub muestra un selector desplegable compacto (`[Perfil ▾]`) recordando el último elegido en `ssh-preferences.json`.
- **Ciclo de vida PTY y límites:**
  - Máximo 8 pestañas/sesiones simultáneas; `keepaliveInterval: 15000`, `keepaliveCountMax: 3`, `readyTimeout: 15000`; `resize` vía `stream.setWindow(rows, cols, 0, 0)` con debounce de 50 ms.

### 5.3 Orquestador de TUI Unificada (`electron/tuiOrchestrator.cjs`)

Mantiene un espejo `@xterm/headless` (80×50 para HDA/SOP) sincronizado con cada sesión orquestada para leer la grilla exacta renderizada sin fragilidad frente a códigos ANSI de posicionamiento de cursor (`\x1b[row;colH`) o marcos `dialog` (ncurses).

#### A. Flujos con Vista Limpia en la TUI Unificada (Mapeados y Determinísticos)

Cada flujo verifica la pantalla actual en `@xterm/headless`, envía las pulsaciones necesarias (números + `\r` en HDA; flechas/número + `\r` en `dialog` de SOP), espera estabilidad de la pantalla destino (timeout máximo 12 s), extrae el texto limpio y regresa al menú base al cerrar la vista.

| Origen | Acción en Menú Unificado | Ruta en Servidor | Entrada / Prellenado | Salida en Vista Limpia |
| :--- | :--- | :--- | :--- | :--- |
| **HDA** | Estado de cola de impresión | `2` → `1` | Nombre de cola (sugerido desde `pc`/`location`, editable) | Salida limpia de `lpstat` + botón Copiar |
| **HDA** | Prueba de impresión | `2` → `3` | Impresora destino + confirmación explícita | Resultado limpio de `lp` |
| **HDA** | Habilitar cola deshabilitada | `2` → `4` | Nombre de cola + confirmación explícita | Resultado limpio de `enable` |
| **SOP** | Información de la terminal | Salto `mesa@IP` → `6` | IP activa (o manual) | Ficha estructurada (PC, IP, MAC, RAM, Disco, Impresoras) |
| **SOP** | Versión de Master / OS | Salto `mesa@IP` → `7` | IP activa (o manual) | Ficha limpia (Master, Upgrade, Distro, Kernel) |
| **SOP** | Configuración de Red | Salto `mesa@IP` → `4` → `1` | IP activa (o manual) | Ficha limpia (PC, Red, IP, MAC, Máscara, Gateway) |
| **SOP** | Estado de Impresoras CUPS | Salto `mesa@IP` → `4` → `2` → `1` | IP activa (o manual) | Estado del planificador, predeterminada, URIs `socket://` y estado |
| **SOP** | Estado de archivos SOP | Salto `mesa@IP` → `1` → `1` | IP activa (o manual) | Listado limpio de corruptos / pendientes (escrollando si supera 1 pantalla) |

#### B. Flujos Complejos / Dinámicos / No Mapeados (Visor Interactivo Pre-posicionado)

Para estas acciones, el orquestador abre/enfoca la sesión, navega automáticamente hasta la puerta de entrada del submenú exacto y cambia a la vista interactiva `@xterm/xterm` con barra contextual de inyección (`Usuario`, `PC`, `IP`, `Sucursal`) y botón *"← Volver al Menú Unificado"*:

- **HDA:** `2→2` (Eliminar trabajos de cola), `2→5` (Cambio de IP impresora — marca bandera de sesión `lockRisk: true` por `mod_ip.lck` y deja la 2ª `Clave:` al operador), `2→6` (Desbloqueo cambio de IP), `3` (Habilitar usuario de escáner), `4` (Desconexión de usuarios), `5` (Control de archivos transmitidos), `6` (Control de contenedores), `1` (Pings a CTPs).
- **SOP (vía salto automático a `IP` activa):** `4→2` (Menú completo de Impresoras CUPS — ver/borrar trabajos en cola por impresora, predeterminar, agregar/modificar/cambiar driver/eliminar/rehabilitar cola), `1→2` (Blanquear contraseña SOP), `1→3` (Rehabilitar bajada de tablas), `5` (Menú de Tareas Varias: dominio, conectividad, impresión config, escáner).

#### C. Regla de Rescate Automático (Escape Hatch)

- Si en cualquier flujo de Vista Limpia ocurre un timeout (12 s), se detecta un prompt no esperado (ej. advertencia del servidor o caída de conexión) o falla el parseo de pantalla, el orquestador **no cierra la sesión**: conmuta de inmediato (con aviso claro) al visor interactivo `@xterm/xterm` mostrando la pantalla real viva para que el operador continúe o cancele sin pérdida de control.
- Adicionalmente, cada Vista Limpia tiene un botón discreto *"Ver terminal cruda"* para inspeccionar o tomar control manual cuando el operador quiera.

### 5.4 Perfiles, Configuración Corporativa e Importador KiTTY (`electron/sshProfileStore.cjs` & `electron/kittyImporter.cjs`)

#### Modelo de Perfil (`SshProfilePublic`)
```ts
type SshProfileRole = 'hda' | 'sop-jump' | 'generic';

interface SshMacro {
  id: string;
  label: string;
  sequence: string;      // soporta \r, \n, \t, \x1b
  stepDelayMs?: number;
}

interface SshProfilePublic {
  id: string;
  name: string;
  role: SshProfileRole;
  group?: string;        // ej. "HDA" | "STS+SOP" | "HOST" | "Personal"
  host: string;
  port: number;          // default 22
  username: string;
  targetUsername?: string;           // solo para role === 'sop-jump' (default 'mesa')
  backspaceMode: 'del' | 'bs';       // default 'del' (\x7f)
  hasSavedPassword: boolean;
  hasSavedTargetPassword?: boolean;  // solo para role === 'sop-jump'
  source: 'corporate' | 'local' | 'merged';
  macros: SshMacro[];
}
```

#### Resolución por capas
1. **Capa corporativa (opcional, solo lectura, `fail-open`):**
   - `electron/configProvider.cjs` extiende `validateCorporateConfig` aceptando `sshProfiles` opcional. Cada entrada válida exige `id`, `name` y `host`; `port` toma default `22`, `role` default `'generic'`, y tanto `username` como `password` / `targetPassword` son **opcionales** (permitiendo tanto perfiles solo-host para cuentas personales como cuentas compartidas de equipo si IT decide distribuirlas en el archivo UNC fuera de Git).
   - *(Decisión de arquitectura — aislamiento de secretos corporativos):* Siguiendo el patrón exacto de `vncPassword` en `configProvider.cjs`, `getConfig()` elimina `password` y `targetPassword` de `sshProfiles` (exponiendo solo `hasCorporatePassword` / `hasCorporateTargetPassword`); un accesor dedicado `getSshCorporateSecrets(profileId)` entrega los secretos estrictamente al proceso Main (`sshSessionManager.cjs`).
   - *(Decisión de arquitectura — fail-open):* Cualquier entrada malformada o con `id` duplicado en `sshProfiles` se omite con advertencia en `logger` y se expone en `sshProfileWarnings: string[]` para aviso no bloqueante en UI; **nunca** lanza `BAD_CONFIG` ni bloquea SQL/VNC/Ping.
2. **Capa local cifrada (`userData/ssh-profiles.enc.json`):**
   - Guarda `localProfiles` y `corporateOverrides` separados, cifrando `password` y `targetPassword` con `safeStorage` (DPAPI).
   - *(Decisión de arquitectura — clave `mesa` variable por terminal):* Si `targetPassword` guardada en el perfil `sop-jump` falla con `Permission denied` en una terminal particular, el diálogo pide la clave para esa terminal y la usa solo en memoria para esa sesión (`tabId`) sin sobrescribir la del perfil, salvo que el operador marque explícitamente *"Guardar como clave predeterminada para SOP"*.
   - *(Decisión de arquitectura — inmutabilidad corporativa y huérfanos):* Sobre perfiles corporativos (`corporate`/`merged`), `host`, `port`, `name`, `group` y `role` son de solo lectura para permitir rotación central de IPs en `cmda.config.json`; el override local guarda solo `{ username?, encryptedPassword?, targetUsername?, encryptedTargetPassword?, macros?, backspaceMode? }`. Si IT elimina un perfil corporativo `id`, su override huérfano se ignora de forma segura. El operador puede duplicar un perfil corporativo como `local` si necesita cambiar host/puerto.
3. **Importador opcional de KiTTY (`electron/kittyImporter.cjs`):**
   - Botón secundario en el Gestor de Perfiles (*"Importar carpeta KiTTY..."*).
   - Lee `Sessions/*` (omitiendo `Default%20Settings` y protocolos no-SSH) y `kitty.ini` (para `cryptsalt` si estuviera definido), parsea `HostName`, `PortNumber`, `UserName`, `WinTitle`, `TerminalType`, `BackspaceIsDelete` y `Password`.
   - Infiere automáticamente el `role` sugerido según el nombre del perfil (`HDA*` → `'hda'`, `STSSOP*` → `'sop-jump'` con `targetUsername: 'mesa'`, resto → `'generic'`), editable en la vista previa antes de confirmar.
   - Intenta migrar la contraseña ofuscada de KiTTY hacia DPAPI solo si el usuario lo tilda; si falla la decodificación (ej. `PassPhrase` personalizada), importa el perfil sin contraseña con aviso claro.

### 5.5 Interfaz de Usuario (`src/ssh.tsx` y `src/components/ssh/`)

Alineada con `DESIGN.md` (Tailwind v4, tokens OKLCH, modo claro/oscuro y alto contraste):

```text
┌───────────────────────────────────────────────────────────────────────────┐
│ [⌂ TUI Unificada] [HDA ●] [SOP: PC-DEMO-001 ●] [+ Sesión] [⚙]     ─ □ ×  │
├───────────────────────────────────────────────────────────────────────────┤
│ PC activa: PC-DEMO-001 (192.0.2.101) │ Inyectar: [Usuario][PC][IP][Suc.]  │
├───────────────────────────────────────────────────────────────────────────┤
│   CENTRO DE SOPORTE UNIFICADO                                             │
│                                                                           │
│   ── HDA (Central) ──────────────────  ── SOP (Terminal 192.0.2.101) ───  │
│   [1] Estado de cola de impresión  ★   [6] Info de la terminal        ★   │
│   [2] Habilitar cola de impresión  ★   [7] Estado de impresoras CUPS  ★   │
│   [3] Prueba de impresión          ★   [8] Estado de archivos SOP     ★   │
│   [4] Cambio IP impresora / Lock   →   [9] Versión de Master          ★   │
│   [5] Scanner / Desconexión / Otros→   [0] Impresoras y Tareas SOP    →   │
│                                                                           │
│   ★ Vista limpia en TUI   → Abre terminal interactiva pre-posicionada     │
│   [T] Cambiar IP destino SOP   [Enter/1-0] Ejecutar   [Esc] Volver        │
└───────────────────────────────────────────────────────────────────────────┘
```

- **Navegación 100% teclado + clic (árbol de 2 niveles en el Hub) *(Decisión de arquitectura)*:**
  - En la pestaña `TUI Unificada`, las teclas numéricas `1–0` o flechas + `Enter` ejecutan el flujo elegido.
  - Los ítems agrupados (`[4] Cambio IP / Lock HDA`, `[5] Otros HDA`, `[0] Impresoras y Tareas SOP`) abren un **segundo nivel inline** dentro del mismo Hub (`Esc` vuelve al nivel raíz) listando las rutas exactas (`HDA 2→2`, `2→5`, `2→6`, `3`, `4`, `5`, `6`, `1`; `SOP 4→2`, `1→2`, `1→3`, `5`) para que el orquestador pre-posicione cada submenú exacto sin sobrecargar la pantalla raíz.
  - `Esc` vuelve al nivel anterior o al Menú Unificado desde cualquier Vista Limpia; cuando el foco de teclado está dentro de `@xterm/xterm`, `Esc` se envía intacto al servidor y se usa el botón / atajo `Alt+H` para volver al Hub.
- **Sugerencia de cola HDA y aviso de SO Windows en SOP *(Decisión de arquitectura)*:**
  - En las Vistas Limpias de HDA que piden nombre de cola/impresora (`2→1`, `2→3`, `2→4`), el campo de entrada es siempre editable y ofrece chips de sugerencia rápida basados en `pc`, `location` (si están presentes) y las últimas colas consultadas en la sesión, sin asumir una fórmula rígida de nomenclatura.
  - Cuando la PC activa tiene un sistema operativo Windows (no Linux), la columna SOP **no bloquea** el acceso (por si el inventario difiere o el operador desea usar `[T]` para ingresar otra IP), pero muestra un aviso visual discreto (*"PC activa es Windows — usá [T] para indicar una IP Linux o intentá igual"*).
- **Puente con PC activa (`src/lib/sshContext.ts`):**
  - *(Decisión de arquitectura — parser dedicado):* No modifica `splitUsernames` de `src/lib/usernames.ts` (reservado para `net user /domain`). Usa `extractSshInjectableUsers` que divide por `|` o `,`, quita prefijos `DOMINIO\` y elimina caracteres de control (`\x00`–`\x1f`, `\x7f`).
  - La inyección nunca envía `\r` automático y devuelve foco al terminal.
- **Usabilidad moderna en el visor `@xterm/xterm`:**
  - Renderer DOM, `scrollback: 5000`, fuente monoespaciada (`Geist Mono`, `Consolas`, `Courier New`), búsqueda inline (`@xterm/addon-search`, `Ctrl+Shift+F`), tamaño de fuente `A-/A+` persistido, reconexión en 1 clic (`↻`), copiar/pegar claro (`Ctrl+Shift+C`/`V`, `Ctrl+C` contextual, menú clic derecho) y macros editables por perfil.

### 5.6 Estrategia de Pruebas y Modo Mock E2E

- **Pruebas unitarias (Vitest):**
  - `sshProfileStore`: merge corporativo + local, DPAPI mock, fallback sin cifrado, protección de no fuga de claves, overrides huérfanos.
  - `kittyImporter`: parseo `Key\Value\`, detección de roles `hda`/`sop-jump`/`generic`, tolerancia ante claves no decodificables.
  - `sshSessionManager`: handshake, TOFU (primera vez / coincidencia / mismatch), decodificador híbrido UTF-8/Latin-1, salto `forwardOut` y fallback PTY `ssh mesa@<IP>`.
  - `tuiOrchestrator`: máquina de estados sobre `@xterm/headless` alimentado con fixtures sintéticos anonimizados basados en el Apéndice A, incluyendo scroll de `dialog --textbox` (`SOP 1→1`), escape hatch por timeout/pantalla inesperada y bandera `lockRisk`.
  - `configProvider` (`fail-open` en `sshProfiles` y aislamiento de secretos vía `getSshCorporateSecrets`) y `securityAudit.test.ts` ampliado.
- **Pruebas E2E (Playwright + `testHarness.cjs`):**
  - En modo `--e2e-mock`, `testHarness.cjs` agrega un fixture de terminal Linux SOP mock (ej. `TTDEM01P`, `192.0.2.165`, `os: 'Debian GNU/Linux 10'`) además de la terminal Windows existente, junto a un simulador PTY determinístico para HDA y SOP (con menú texto y `dialog` ficticios del Apéndice A).
  - Flujos E2E: abrir TUI Unificada desde `Topbar`, ejecutar vista limpia HDA (*Estado de cola*) y vista limpia SOP (*Info de terminal* con la PC Linux mock), abrir flujo complejo pre-posicionado desde el 2º nivel del Hub, inyectar `Usuario`/`PC`/`IP`, buscar en scrollback y verificar advertencia al cerrar con sesión activa.

---

## 6. Decisiones que Quedan a Criterio del Implementador

- Nombres exactos de canales IPC (`pcd:ssh-*`), estructura interna de componentes bajo `src/components/ssh/` y hooks auxiliares.
- Primitivos exactos de Shadcn UI / Radix cumpliendo `DESIGN.md` y `npm run audit:contrast`.
- Reglas concretas de detección de fin de renderizado de `dialog` (estabilidad de buffer `@xterm/headless` tras ventana de quietud, ej. 150–250 ms) y debounce de `ResizeObserver`.
- Paleta ANSI específica de `@xterm/xterm` para modo claro, oscuro y alto contraste respetando WCAG AA.

---

## Apéndice A — Especificación Anonimizada de Pantallas y Transiciones (HDA y SOP)

Referencia determinística derivada del relevamiento real (todos los identificadores e IPs han sido reemplazados por valores RFC 5737 / ficticios) para implementar `electron/tuiOrchestrator.cjs` y sus fixtures de test sin ambigüedad.

### A.1 Servidor Central HDA (`80×50`, texto plano + códigos ANSI simples, codificación híbrida Latin-1/UTF-8)

- **Ancla Menú Principal:** contiene `Menu principal` y el prompt `Elegir una opcion :`.
  - Opciones: `1. Pings a CTPs`, `2. Sistema de Impresion`, `3. Habilitar usuario de scaner`, `4. Desconexion de usuarios`, `5. Control de Archivos Transmitidos`, `6. Control de Contenedores`, `7. Salir`.
  - Salida limpia de sesión: enviar `7\r`.
- **Ancla Submenú Impresiones (`2\r` desde Menú Principal):** contiene `Menu impresiones` y `Elegir una opcion :`.
  - Opciones: `1. Estado de una cola de impresion`, `2. Eliminar trabajos de una cola de impresion`, `3. Prueba de impresion`, `4. Habilitar una cola de impresion`, `5. Cambio de ip impresora`, `6. Desbloqueo cambio de ip`, `7. Volver`.
  - Volver a Menú Principal: enviar `7\r`.
- **Transiciones de Vistas Limpias HDA (desde `Menu impresiones`):**
  - **`2→1` Estado de cola:** enviar `1\r` → esperar `Ingrese el Nombre de la Cola de Impresion :` → enviar `<cola>\r` → capturar líneas entre el eco de `<cola>` y la reaparición automática de `Menu impresiones` (salida de `lpstat`, ej. estado o `lpstat: "<cola>" no es un id de solicitud o un destino`).
  - **`2→3` Prueba de impresión:** enviar `3\r` → esperar `Ingrese el Nombre de la Impresora Destino :` → enviar `<impresora>\r` → capturar líneas de salida de `lp` hasta la reaparición automática de `Menu impresiones`.
  - **`2→4` Habilitar cola:** enviar `4\r` → esperar `Ingrese el Nombre de la Cola Deshabilitada :` → enviar `<cola>\r` → capturar líneas de salida de `enable` hasta la reaparición automática de `Menu impresiones`.
- **Transición de riesgo de lock (`2→5` Cambio de IP impresora — visor interactivo pre-posicionado):**
  - Al enviar `5\r` desde `Menu impresiones`, el servidor muestra `Cambio de ip impresora` y solicita `Clave:`.
  - El orquestador marca `lockRisk = true` en la sesión desde que se navega a `2→5` (ya que tras autenticar crea `/home/appl/adm/hda/log//mod_ip.lck` y valida `^tt.....p$|^tt......p$`), y limpia `lockRisk = false` automáticamente cuando `@xterm/headless` detecta que volvió a renderizarse `Menu impresiones` (o al completarse `2→6` *Desbloqueo cambio de ip*).

### A.2 Terminal Linux SOP vía `tsunami` (`80×50`, `dialog` ncurses, UTF-8)

- **Ancla Menú Principal (`dialog --menu`):** cabecera `Correo Argentino - Mesa de ayuda`, título de caja `Configuracion de la terminal`, botón `<Aceptar>`.
  - Ítems con tecla rápida roja (`0`, `1`, `4`, `5`, `6`, `7`): `0 Salir`, `1 Configuracion de SOP`, `4 Configuracion de Hardware`, `5 Tareas Varias`, `6 Informacion de la terminal`, `7 Version de Master`.
  - Navegación en `dialog --menu` de 1 dígito: enviar la tecla del dígito (`1`, `4`, `5`, `6`, `7`, `0`) para posicionar el foco y luego `\r` para confirmar `<Aceptar>` (verificando previamente que el título de caja coincida con el menú esperado).
  - Salida limpia de sesión SOP: en `Configuracion de la terminal`, enviar `0` + `\r` (cierra la conexión con la terminal Linux y retorna al prompt de `tsunami` o cierra el canal `forwardOut`).
- **Transiciones de Vistas Limpias SOP (desde `Configuracion de la terminal`):**
  - **`SOP 6` Información de la terminal:** enviar `6` + `\r` → esperar caja `Informacion de la Terminal` con `<Salir>` → parsear pares `Clave: Valor` de las líneas internas (`Nombre de PC`, `Direccion IP`, `Mascara de Red`, `Gateway`, `DNS Primario-Secundario`, `Mac Address`, `RAM`, `SWAP`, `Disco Rigido`, `Marca de Disco Rigido`, `Impresora instalada`, `Placa de video`) → enviar `\r` para volver a `Configuracion de la terminal`.
  - **`SOP 7` Versión de Master:** enviar `7` + `\r` → esperar caja `Version de Master` con `<Salir>` → capturar fecha y pares (`Version MASTER`, `Version UPGRADE`, `OS`, `DISTRO`, `Kernel`, `SOP`) → enviar `\r` para volver.
  - **`SOP 4→1` Configuración de Red:** enviar `4` + `\r` → esperar `Menu Configuracion de Hardware` → enviar `1` + `\r` → esperar `Informacion de configuracion de RED` con `<Salir>` → parsear pares (`Nombre de PC`, `Conectado a la red`, `Direccion IP`, `Mac Address`, `Mascara de Red`, `Gateway`) → enviar `\r` (vuelve a Hardware) → enviar `0` + `\r` (vuelve a Menú Principal).
  - **`SOP 4→2→1` Estado de Impresoras CUPS:** enviar `4` + `\r` → esperar `Menu Configuracion de Hardware` → enviar `2` + `\r` → esperar `Menu Configuracion de Impresoras` → enviar `1` + `\r` → esperar caja `Estado de Impresoras` con `<Salir>` → extraer las líneas internas de CUPS (planificador, `destino predeterminado del sistema:`, líneas `dispositivo para ...: socket://192.0.2.x:9100`, líneas aceptando peticiones y estado activa/inactiva) → enviar `\r` → `0` + `\r` → `0` + `\r` para retornar al Menú Principal.
  - **`SOP 1→1` Estado de procesamiento de archivos (`dialog --textbox` con scroll):** enviar `1` + `\r` → esperar `Menu Configuracion de SOP` → enviar `1` + `\r` → esperar caja `Ver estado de procesamiento de archivos` con `<Salir>`.
    - Si aparece el indicador de paginación `↓(+)` o un porcentaje `< 100%` en la esquina inferior derecha del cuadro, enviar `PageDown` (`\x1b[6~`) en bucle (máximo 15 páginas, esperando estabilidad de buffer en cada paso) acumulando y deduplicando líneas nuevas hasta que desaparezca `↓(+)` o alcance `100%`.
    - Al terminar, enviar `\r` (sale de `<Salir>` a `Menu Configuracion de SOP`) y `0` + `\r` (vuelve al Menú Principal).
- **Submenús complejos pre-posicionados en visor interactivo:**
  - `SOP 4→2` (*Menu Configuracion de Impresoras*, 11 ítems `0..11`), `SOP 1→2` / `1→3` (*Menu Configuracion de SOP*), `SOP 5` (*Menu de tareas varias*: estado dominio, conectividad, impresión config, escáner). En estos, el orquestador navega hasta el menú destino, entrega el control al visor `@xterm/xterm` y, al volver al Hub, deja la pestaña abierta en ese punto (o retorna al menú principal si el usuario pulsa *"Volver al menú raíz"*).

