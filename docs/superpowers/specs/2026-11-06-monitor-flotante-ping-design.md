# Monitor flotante de ping (`ping -t`) con conexión remota — Diseño

**Fecha:** 2026-11-06
**Estado:** Para revisión del usuario
**Rama:** `main`

---

## 1. Objetivo

Recuperar la capacidad que tenía HMDA: al pulsar un atajo, abrir una ventana pequeña y móvil que muestra el `ping -t` del equipo consultado, para poder monitorear un equipo mientras la consola principal sigue pingeando otro. No se debe detener el ping actual para monitorear uno nuevo.

En Portal Correo Desktop esto se implementa con:

- una **ventana compacta dedicada** de Electron, no una segunda instancia completa de la app;
- **sesiones de ping independientes por ventana**, para que la consola principal y cada monitor no se interrumpan;
- hasta **4 monitores simultáneos**, uno por equipo, con reutilización;
- un atajo **global** `Ctrl + Shift + Espacio`, porque `Ctrl + Espacio` ya está tomado por la búsqueda global;
- **conexión remota inteligente desde la cabecera del monitor**, reutilizando el sondeo de puertos y el lanzador VNC/MSRA que ya usa la barra principal.

La respuesta corta a “¿es posible con Electron?” es sí. El costo real no es el ping —una línea por segundo— sino cada renderer adicional; por eso la ventana compacta y el tope de 4.

---

## 2. Contexto y hallazgos

| Hallazgo | Ubicación | Consecuencia |
|---|---|---|
| Un solo `activePingProcess` global; cada `pcd:ping-start` mata el anterior | `electron/main.cjs:524-568` | Sin cambios, abrir el monitor mataría el ping de la consola. |
| `pcd:ping-data` / `pcd:ping-end` se envían al sender del ping | `electron/main.cjs:537-553` | El modelo por sender ya existe a medias; falta aislar la sesión por ventana. |
| `Ctrl + Espacio` está registrado globalmente para traer la app y buscar | `electron/main.cjs:786-819` | El monitor necesita otro atajo; no se toca el existente. |
| La ventana principal es frameless y su cierre oculta a bandeja | `electron/main.cjs:269-306` | Una segunda ventana no puede heredar `hideToTray`: debe destruirse. |
| La app tiene una sola `BrowserWindow` y una sola entrada `index.html` | `electron/main.cjs:269`, `vite.config.ts` | La ventana compacta requiere entrada propia y configuración multi-página. |
| El renderer de la app carga React, Radix, cmdk, fuentes y servicios | `src/main.tsx`, `src/App.tsx` | Una segunda ventana completa duplicaría todo eso; el monitor no lo necesita. |
| La consola principal ya usa un viewport oscuro fijo | `src/components/LivePingConsole.tsx`, `DESIGN.md` | El monitor reutiliza los mismos tokens `--console-*`. |
| `ping.exe` corre en el proceso principal con `windowsHide` y decodificación CP850 | `electron/systemTools.cjs` | El monitor recibe texto limpio; no hay que decodificar en el renderer. |
| La conexión remota inteligente ya existe: `launchRemoteSmart` sondea 5901/5900/3389/135 y elige VNC o MSRA | `electron/systemTools.cjs`, `electron/main.cjs:519-522` | El monitor puede reutilizarla con un canal que use su target registrado. |

HMDA resolvía esto con un timer ICMP de WinForms. En Electron el equivalente es un `ping.exe -t` por ventana, propiedad del proceso principal, con eventos IPC.

### 2.1 Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Segunda ventana completa de la app | Carga `App`, servicios de DB, buscador, VNC, Settings y fuentes; duplica chequeos de estado y atajos. 80–150 MB por ventana y semántica de cierre ambigua. Para “solamente mostrar el ping” es sobreingeniería. |
| Panel embebido en la ventana principal | Desaparece al minimizar u ocultar la principal y no flota sobre VNC ni otras aplicaciones. No cumple el caso de uso. |
| Monitor con campo de destino editable | Agrega validación, errores y UI que el operador no pidió; el flujo es consultar el equipo en la principal y abrir su monitor. |

---

## 3. Decisiones

| Tema | Decisión |
|---|---|
| Atajo | `Ctrl + Shift + Espacio`, global. `Ctrl + Espacio` sigue siendo la búsqueda global. |
| Tipo de ventana | Compacta y dedicada (`monitor.html` + `MonitorWindow`), no una segunda app completa. |
| Cantidad | Hasta 4 monitores, uno por equipo, con reutilización por target. |
| Alcance | Ping del equipo consultado + conexión remota inteligente; sin campo de destino, buscador ni diagnóstico. |
| Conexión remota | Botón inteligente en la cabecera; sondea puertos y elige VNC o MSRA. Sin selección manual en el monitor. |
| Feedback remoto | Toast de sonner en la ventana principal; el monitor solo refleja el estado de carga del botón. |
| Disparo | Atajo global; sin botón nuevo en la barra de acciones de la principal en v1. |
| Ventana | Frameless, always-on-top con pin, `skipTaskbar`, 420×300, redimensionable, bounds persistidos. |
| Cierre del monitor | Destruye la ventana y mata su ping. No oculta a bandeja. |
| Ciclo de vida | La principal manda: al ocultarse/cerrarse, destruye todos los monitores. La app sigue en bandeja; solo termina desde la bandeja o al cerrar la principal sin bandeja. |
| Ping | Sesiones por `webContents.id`; consola principal y monitores independientes. |
| Target | Lo provee el proceso principal desde el último equipo consultado; el monitor no lo escribe. |
| Copiar | Portapapeles vía IPC del proceso principal. |
| UI | Cabecera arrastrable + consola; tope de 500 líneas; auto-scroll respetuoso. |
| Dependencias | Ninguna nueva. |

---

## 4. Arquitectura

### 4.1 Modelo de procesos

El proceso principal sigue siendo el único dueño de los `ping.exe` y de las ventanas. Los renderers no lanzan procesos.

- **Ventana principal:** conserva `window.electronAPI` y todo el flujo actual.
- **Monitor:** recibe un preload mínimo, `window.monitorAPI`, con contexto, ping, pin, copiar y cerrar.
- **Proceso principal:** registra ventanas, sesiones de ping, atajo global y ciclo de vida.

### 4.2 Sesiones de ping por renderer

Se reemplaza el estado global por un mapa:

```text
pingSessions: Map<webContentsId, { proc, sessionId, target, continuous }>
```

Contratos:

| Canal | Quién lo envía | Comportamiento |
|---|---|---|
| `pcd:ping-start` | Ventana principal | Valida el target, detiene **solo la sesión de ese sender** y lanza la nueva. |
| `pcd:monitor-ping-start` | Monitor | Usa el target registrado para esa ventana; no acepta target del renderer. Detiene solo su sesión previa. |
| `pcd:ping-data` | Main → sender | Solo al `webContents` que inició la sesión. |
| `pcd:ping-end` | Main → sender | Solo al sender; código de salida o `null` si se mató. |
| `pcd:ping-stop` | Ventana principal | Mata solo la sesión de ese sender. |
| `pcd:monitor-ping-stop` | Monitor | Mata solo la sesión de ese monitor. |
| `pcd:monitor-connect-remote` | Monitor | Usa el target registrado, ejecuta `launchRemoteSmart` con la clave VNC y devuelve el resultado. No toca las sesiones de ping. |
| `pcd:monitor-remote-result` | Main → ventana principal | Resultado de la conexión remota para el toast de sonner. |
| `pcd:monitor-shortcut-status` | Ventana principal → Main | Devuelve si `CommandOrControl+Shift+Space` está registrado; el fallback local solo abre si es `false`. |
| `pcd:cmd-start` | Ventana principal | Detiene solo el ping de ese sender antes del diagnóstico. Los diagnósticos siguen siendo un proceso global. |
| `closed` / `destroyed` | Main | Mata la sesión del `webContents` que desaparece. |
| `before-quit` | Main | Mata todas las sesiones. |

Detalles:

- Un `sessionId` incremental por sesión protege contra callbacks viejos: si el proceso anterior emite `close` después de que el sender ya inició otro ping, no se envía nada. `isCurrent` compara el token, no solo la identidad del objeto.
- `send` verifica `webContents.isDestroyed()` antes de emitir y envuelve `webContents.send` en try/catch; `logger` es null-safe.
- Un sender ya destruido se rechaza antes de lanzar el ping. `watchSender` registra un único listener `destroyed` por `webContents` (WeakSet) para detener la sesión.
- Si `executePing` devuelve `null` o un proceso inválido, se elimina la sesión y se emite `pcd:ping-end` con código 1; si ya había emitido `onDone`, no se duplica.
- La API del renderer principal (`electronAPI.ping`, `electronAPI.stopPing`, `subscribeToPing`) no cambia. El cambio es interno.
- Esto también corrige un problema latente: hoy dos ventanas que escuchen `pcd:ping-data` recibirían la salida de la misma sesión.
- **Conexión remota:** el handler `pcd:monitor-connect-remote` busca el target en el registro del monitor, resuelve la clave VNC con `resolveVncSecret()` y llama a `systemTools.launchRemoteSmart(target, { vncPassword })`. Devuelve el resultado al monitor y emite `pcd:monitor-remote-result` a la ventana principal con `{ ...result, target }` para el toast.
- El handler remoto captura errores inesperados y siempre devuelve `{ success: false, message }`; el monitor rehabilita el botón y la principal muestra el toast de error.
- Si la principal está minimizada o el resultado es un error, se llama `flashFrame(true)`; se apaga al enfocar la ventana. Así el toast no pasa desapercibido cuando el monitor está encima.
- El monitor **no reutiliza** el `remoteProbe` de la barra principal: ese estado corresponde al equipo consultado en la principal, que puede ser otro. Cada monitor sondea su propio target.
- El sondeo del monitor **no actualiza** los badges de puertos de la barra principal; son estados independientes.
- La conexión remota no detiene, pausa ni reinicia el ping del monitor.

### 4.3 Registro de monitores

Módulo nuevo `electron/monitorWindows.cjs`:

```text
monitorWindows: Map<targetNormalizado, { win, target, label, pinned, webContentsId }>
```

Responsabilidades:

- **Abrir:** si el target ya tiene monitor, se restaura/muestra/enfoca. Si hay 4, no se crea nada y se emite un aviso a la ventana principal. Si no, se crea la ventana. La clave del mapa es el target normalizado (trim + minúsculas).
- **Crear:** `BrowserWindow` con `frame: false`, `alwaysOnTop`, `skipTaskbar: true`, `resizable: true`, `minimizable: false`, `maximizable: false`, `fullscreenable: false`, `show: false`, `backgroundColor: '#0C0C0C'`, 420×300, mínimo 320×220, máximo 800×600. Sin `parent`, para que flote sobre otras aplicaciones y no se oculte con la principal. `autoHideMenuBar: true`, `icon` de la app y `title` `Monitor de ping — <label>`.
- **Bounds:** se leen de `monitorPreferences.cjs`; si no hay, se usa el centro del área de trabajo del monitor donde está la ventana principal. Los monitores nuevos se abren en cascada (+24 px) y se ajustan al `workArea`. Los bounds son globales, no por target.
- **Cerrar:** `pcd:monitor-close` busca la ventana por sender, la cierra y el evento `closed` limpia el registro y mata la sesión. No hay `preventDefault` ni hide-to-tray.
- **Pin:** `setAlwaysOnTop(pinned)`; la preferencia se persiste globalmente y se aplica a los monitores nuevos.
- **Seguridad:** `setWindowOpenHandler` deniega ventanas nuevas; `will-navigate` bloquea navegación; el preload es mínimo.
- **Fallo de carga:** si el renderer no carga, se destruye la ventana, se limpia el registro y se emite un aviso a la principal.
- **`closeAllMonitors()`:** destruye todas las ventanas y limpia el mapa; se usa al ocultar/cerrar la principal y al salir.

El módulo acepta inyección de `BrowserWindow`, `screen`, `loadRenderer` y el store de preferencias para poder testearse sin abrir ventanas reales.

### 4.4 Último target y atajo

La ventana principal avisa al proceso principal cuando cambia el equipo consultado:

- `pcd:monitor-target-set` con `{ target, label }` cuando hay `terminal.ip`.
- `pcd:monitor-target-set` con `null` cuando no hay terminal, es una cuenta AD, no se encontró o el equipo no tiene IP.
- Solo se acepta si el sender es la ventana principal.
- El target se valida con `sanitizeHostOrIp` antes de guardarlo.
- Se usa **el IP del equipo consultado** (`terminal.ip`), no el `pingTarget` de la consola. Un ping a `.250` o `.231` no cambia el target del monitor.
- Si el equipo no tiene IP, no se abre monitor; se limpia el target. No se usa el hostname como fallback porque el flujo actual de ping exige IP.

`Ctrl + Shift + Espacio` se registra con `globalShortcut` después de crear la ventana principal:

1. Si no hay ventana principal, no hace nada.
2. Si está minimizada, `restore()`.
3. Si no está visible, `show()`.
4. `focus()`.
5. Si hay último target, abre o enfoca su monitor.
6. Si no hay target, envía el evento de autofocus existente para enfocar el buscador.
7. Si se alcanzó el tope, `monitorWindows.open()` emite `pcd:monitor-notice`; el atajo solo propaga el resultado.
8. Si el atajo global no se registró, el fallback local consulta `pcd:monitor-shortcut-status` y solo llama a `open-current` cuando es `false`.

Fallback: si `globalShortcut.register` devuelve `false` porque otra app tomó la combinación, la ventana principal escucha `Ctrl + Shift + Espacio` localmente, consulta `pcd:monitor-shortcut-status` y solo llama a `pcd:monitor-open-current` cuando el atajo global no está registrado. Así no se duplican aperturas ni avisos.

`pcd:monitor-open-current` es un `invoke` que devuelve `{ ok, reason }` y usa el último target. También sirve para un futuro botón visible.

`pcd:monitor-notice` lleva `{ kind: 'limit' | 'error', message }` a la ventana principal, que lo traduce a un toast de sonner.

El atajo del monitor **no depende** de la preferencia `globalHotkeyEnabled`, que sigue controlando únicamente `Ctrl + Espacio`. Si el operador desactiva la búsqueda global, el monitor sigue disponible con `Ctrl + Shift + Espacio`.

### 4.5 Ciclo de vida

| Evento | Comportamiento |
|---|---|
| X del monitor | Cierra y destruye esa ventana; mata su ping. La principal no se toca. |
| Power de la principal (`pcd:window-hide-tray`) | `closeAllMonitors()` y luego `hide()` de la principal. |
| Cierre de la principal con `minimizeToTray = true` | `closeAllMonitors()`, `preventDefault()` y `hide()`. |
| Cierre de la principal con `minimizeToTray = false` | `app.isQuiting = true`, `closeAllMonitors()`; la app termina y con ella todos los monitores. |
| Bandeja → Cerrar | `app.isQuiting = true`, `closeAllMonitors()`, `app.quit()`. |
| `before-quit` | `closeAllMonitors()`, `stopAllPings()`, `globalShortcut.unregisterAll()`. |
| `second-instance` | Enfoca la principal; no altera los monitores. |
| Crash del renderer del monitor | `render-process-gone` destruye la ventana y limpia la sesión. |
| Crash del renderer principal | Se mantiene el comportamiento actual de relanzamiento; al reiniciar no sobreviven monitores. |

La app **no termina por cerrar monitores**. La ventana principal es el ancla: puede quedar visible o en la bandeja. La app solo termina desde la bandeja o al cerrar la principal sin bandeja; `before-quit` solo limpia recursos.

### 4.6 Flujo de datos

```text
Ctrl + Shift + Espacio
  └─ main: ¿hay lastMonitorTarget?
       ├─ no → main window: autofocus buscador
       └─ sí → openMonitor(target)
            └─ BrowserWindow(monitor.html)
                 ├─ monitorAPI.getContext() → { target, label, pinned }
                 ├─ monitorAPI.startPing()
                 │    └─ main: pingSessions[sender.id] = spawn('ping', ['-t', target])
                 │         └─ pcd:ping-data → solo ese monitor
                 ├─ monitorAPI.connectRemote()
                 │    └─ main: target del registro → launchRemoteSmart
                 │         └─ pcd:monitor-remote-result → toast en la principal
                 └─ monitorAPI.close()
                      └─ main: win.close() → closed → stopPing(sender.id)
```

---

## 5. Interfaz

### 5.1 Ventana y layout

```text
┌──────────────────────────────────────────────┐
│ ● PC-OPERADOR · 10.66.10.25   ▷  📌  ⧉  ■  ✕ │  36 px, arrastrable
├──────────────────────────────────────────────┤
│ > ping -t 10.66.10.25                        │
│ Haciendo ping a 10.66.10.25 con 32 bytes...  │
│ Respuesta desde 10.66.10.25: bytes=32 ...    │
│ Tiempo de espera agotado para esta solicitud.│
│ ...                                          │
└──────────────────────────────────────────────┘
```

- **Tamaño:** 420×300 por defecto; mínimo 320×220; máximo 800×600.
- **Chrome:** frameless, sin barra de menú, `skipTaskbar`, always-on-top con pin. Sin minimizar ni maximizar.
- **Arrastre:** la cabecera usa `app-drag-region`; los botones usan `app-no-drag`. La consola es seleccionable, no arrastrable.
- **Bordes:** ventana opaca (sin `transparent`) con borde interior `border-border`; no se usan sombras ni degradados propios.
- **Fondo:** `bg-card` para el cromo, `bg-console-bg` para la consola.

### 5.2 Cabecera

- **Izquierda:** punto de estado de 6 px + etiqueta `hostname · IP` (o solo IP si no hay hostname), `font-mono`, `text-xs`, truncada con `title` completo.
- **Derecha, en orden:** conectar remotamente, pin, copiar, detener/reiniciar, cerrar.
- **Botones:** `Button` `variant="ghost"` `size="icon-xs"`, con `aria-label` y `title`.
  - Conectar remotamente: `MonitorPlay`; `aria-label="Conectar remotamente"`, `title="Conectar remotamente (VNC o MSRA según puertos)"`. Mientras sondea, muestra `Spinner`, queda deshabilitado y su `aria-label` pasa a “Conectando remotamente…”; al terminar vuelve al icono. Si el invoke rechaza, también vuelve al icono y se registra el warning. No detiene el ping.
  - Pin: `Pin` / `PinOff`, `aria-pressed` refleja el estado.
  - Copiar: `Copy` → `Check` durante 2 s; `role="status"` anuncia “Logs copiados” o “No se pudo copiar”.
  - Detener/Reiniciar: `Square` mientras corre, `RotateCw` cuando está detenido.
  - Cerrar: `X`, hover destructivo, `aria-label="Cerrar monitor"`.
- **Estado:** el punto usa `bg-warning` (iniciando), `bg-success` (en vivo), `bg-muted-foreground` (detenido) o `bg-destructive` (error). Solo “iniciando” pulsa; “en vivo” queda fijo.
- **Ancho:** a 320 px la etiqueta trunca; los cinco botones se mantienen visibles.

### 5.3 Consola

- Ocupa el resto de la ventana; `bg-console-bg`, `font-mono`, `text-micro`, `leading-relaxed`, `p-2.5`, `overflow-y-auto`, `select-text`.
- Primera línea: `> ping -t <target>` en `text-console-info font-bold`.
- Líneas:
  - timeouts, “agotado”, “inaccesible” → `text-console-warning`;
  - errores, “100% perdidos” → `text-console-destructive font-semibold`;
  - estadísticas y encabezados → `text-console-info font-semibold`;
  - resto → `text-console-fg`.
- **Tope de 500 líneas:** se descartan las más viejas.
- **Auto-scroll:** solo baja si el operador está a menos de 24 px del final. Si scrolleó hacia arriba, no se lo mueve; al volver abajo se reanuda.
- **Copiar:** copia las líneas actuales unidas por `\n`; usa `pcd:monitor-copy`, que valida sender, tipo y longitud, y escribe con `clipboard.writeText` del proceso principal.
- **Vacío:** “Iniciando ping -t a <target>…” mientras llega la primera línea.
- **Accesibilidad:** `role="log"` con `aria-live="off"` para no anunciar una línea por segundo; el punto de estado tiene texto alternativo; los botones tienen `aria-label` y `title`.

### 5.4 Estados

| Estado | Punto | Botón principal | Consola |
|---|---|---|---|
| Cargando contexto | gris | — | vacía, “Monitor de ping” |
| Iniciando | ámbar, pulso | Detener | `> ping -t target` |
| En vivo | verde fijo | Detener | líneas entrando |
| Detenido | gris | Reiniciar | últimas líneas + “Proceso detenido” |
| Error | rojo | Reiniciar | mensaje de error |
| Copiado | — | Copiar → check 2 s | sin cambios |
| Conectando remoto | — | spinner en el botón remoto | sin cambios |
| Resultado remoto | — | — | toast en la principal; consola y estado del ping no cambian |

El botón remoto está disponible en todos los estados y no altera el ping. El resultado de la conexión no se muestra dentro del monitor: se envía a la ventana principal como toast.

El punto refleja el **estado del proceso**, no la calidad de red. Un “Tiempo de espera agotado” se colorea en la línea, pero el monitor sigue “En vivo” mientras `ping -t` corre. Así se evita un semáforo que parpadea con cada paquete perdido.

### 5.5 Tema y accesibilidad

- El cromo sigue al tema de la app (`pcd-theme`); la consola queda oscura en ambos temas, como el resto de la app.
- `monitor.html` aplica la clase `dark` antes del primer paint leyendo `localStorage`, para evitar un flash.
- El monitor escucha el evento `storage` para actualizarse si el operador cambia el tema en la principal.
- Contraste: se usan los tokens existentes; no se introducen colores nuevos. `npm run audit:contrast` debe seguir pasando.
- Fuentes: `index.css` ya importa Geist, Geist Mono y Roboto Slab; el monitor las hereda.

### 5.6 Fuera de alcance (v1)

- Estadísticas acumuladas en vivo (Enviados/Recibidos/Perdidos/Último ms).
- Múltiples pings por ventana.
- Editar el target desde el monitor.
- Elegir manualmente VNC o MSRA desde el monitor; solo existe el botón inteligente.
- Mostrar el resultado de la conexión remota dentro del monitor; va como toast a la principal.
- Actualizar los badges de puertos de la barra principal desde el sondeo del monitor.
- Recordar monitores abiertos entre sesiones; solo se recuerdan bounds y pin.
- Botón visible en la barra de acciones.
- Historial persistente de monitoreos.
- Notificaciones cuando un equipo deja de responder.

---

## 6. Componentes y archivos

### 6.1 Nuevos

| Archivo | Responsabilidad |
|---|---|
| `monitor.html` | Entrada Vite del monitor; aplica el tema antes del paint y monta `src/monitor.tsx`. |
| `src/monitor.tsx` | Bootstrap de React + `ErrorBoundary` + `MonitorWindow`; importa `index.css`. |
| `src/components/MonitorWindow.tsx` | UI, estados, consola, controles, botón de conexión remota y suscripciones a `monitorAPI`. |
| `src/lib/pingLog.ts` | `sanitizePingText` compartido y `classifyPingLine` para los tonos del monitor. |
| `src/types/monitor.ts` | Tipos compartidos de `monitorAPI` y augmentación global `Window.monitorAPI`. |
| `electron/monitor-preload.cjs` | `contextBridge` con `monitorAPI` mínimo, incluida la conexión remota. |
| `electron/monitorWindows.cjs` | Registro, creación, reutilización, tope, bounds, pin, cierre y seguridad de ventanas. |
| `electron/monitorShortcut.cjs` | Handler puro del atajo: restaura la principal, abre/reutiliza, enfoca el buscador o avisa el tope. |
| `electron/monitorRemote.cjs` | Handler de conexión remota: target del registro, `launchRemoteSmart`, clave VNC y resultado a la principal. |
| `electron/monitorPreferences.cjs` | Persistencia de `{ bounds, pinned }` en `userData`. |
| `electron/pingSessions.cjs` | Mapa de sesiones por `webContents.id`, arranque/parada, tokens y enrutamiento. |
| `src/components/MonitorWindow.test.tsx` | Pruebas de UI. |
| `src/test/monitorSecurity.test.ts` | Pruebas estáticas de preload, ventana y build. |
| `src/test/monitorWindows.test.ts` | Pruebas del registro y bounds con dependencias inyectadas. |
| `src/test/pingSessions.test.ts` | Pruebas de aislamiento de sesiones. |
| `src/test/monitorPreferences.test.ts` | Pruebas de persistencia. |
| `src/test/monitorShortcut.test.ts` | Pruebas del handler del atajo y del target. |
| `src/test/monitorRemote.test.ts` | Pruebas del handler remoto con dependencias inyectadas. |

### 6.2 Modificados

| Archivo | Cambio |
|---|---|
| `electron/main.cjs` | Composición de sesiones, registro de monitores, registro del atajo, target, ciclo de vida, handler remoto y avisos. |
| `electron/preload.cjs` | `setMonitorTarget`, `openMonitorCurrent`, `onMonitorNotice`, `onMonitorRemoteResult`, `isMonitorShortcutRegistered`. |
| `vite.config.ts` | `monitor.html` como input multi-página. |
| `src/services/electronClient.ts` | Wrappers de target, apertura, aviso, resultado remoto y estado del atajo. |
| `src/App.tsx` | Avisa el target al cargar/limpiar terminal, muestra los avisos y el resultado remoto como toast, y gatea el fallback local por `isMonitorShortcutRegistered`. |
| `src/components/SettingsModal.tsx` | Documenta `Ctrl + Shift + Espacio` sin agregar un toggle. |
| `src/components/LivePingConsole.tsx` | Usa `sanitizePingText` desde `src/lib/pingLog.ts`; sin cambios de comportamiento. |
| `src/types/monitor.ts` | Tipos de `monitorAPI`, del resultado remoto y augmentación global `Window.monitorAPI`. |
| `DESIGN.md` | Nota corta sobre la ventana de monitoreo y su consola oscura. |

### 6.3 Contratos

```ts
interface MonitorContext {
  target: string;
  label: string;
  pinned: boolean;
}

interface MonitorApi {
  getContext(): Promise<MonitorContext | null>;
  startPing(): void;
  stopPing(): Promise<boolean>;
  onPingData(callback: (text: string) => void): () => void;
  onPingEnd(callback: (code: number | null) => void): () => void;
  setPinned(pinned: boolean): Promise<boolean>;
  close(): Promise<boolean>;
  copyText(text: string): Promise<boolean>;
  connectRemote(): Promise<MonitorRemoteResult>;
}

interface MonitorRemoteResult {
  success: boolean;
  methodUsed: 'vnc' | 'msra' | 'none';
  target?: string;
  portUsed?: number;
  message?: string;
  vncClosed?: boolean;
  msraAvailable?: boolean;
}
```

`monitorWindows.cjs` expone una fábrica con dependencias inyectables:

```text
createMonitorManager({
  BrowserWindow, screen, getMainWindow, loadRenderer, preloadPath, iconPath,
  loadPreferences, savePreferences, notify, onClosed, logger, maxMonitors
}) → {
  open({ target, label }),
  close(webContents),
  closeAll(),
  getContext(webContents),
  getTarget(webContents),
  setPinned(webContents, pinned),
  has(target),
  count()
}
```

`pingSessions.cjs` expone:

```text
createPingSessions({ executePing, logger }) → {
  start(webContents, target, continuous),
  stop(webContents),
  stopById(webContentsId),
  stopAll(),
  has(webContents),
  count()
}
```

`monitorShortcut.cjs` expone:

```text
createMonitorShortcut({
  getMainWindow, getLastTarget, openMonitor, focusSearch, logger
}) → { handle() }
```

`monitorPreferences.cjs` persiste:

```text
{ bounds: { x, y, width, height } | null, pinned: boolean }
```

`monitorRemote.cjs` expone:

```text
createMonitorRemote({
  getTarget, launchRemoteSmart, resolveVncSecret,
  notifyMain, flashMain, isMainMinimized, logger
}) → { connect(webContents) }
```

---

## 7. Rendimiento

- **Renderer:** 40–70 MB por monitor; cuatro monitores, 160–280 MB extra. Es el costo dominante.
- **Ping:** 1–2 MB por `ping.exe -t`, una línea por segundo. Consola + 4 monitores = 5 procesos; CPU prácticamente nula.
- **Conexión remota:** sondeo de 4 puertos TCP en paralelo con timeout de 600 ms, solo al pulsar el botón. No hay polling ni impacto en el ping. VNC/MSRA se lanzan como proceso externo detached.
- **Bundle:** `monitor.html` importa React, pocos primitivos, iconos y `index.css`. No importa `App`, servicios de DB, Radix de diálogos, cmdk ni Settings.
- **IPC:** un `webContents.send` por chunk, sin polling ni intervalos. El renderer acumula líneas completas en un buffer de 200k, las vuelca por frame con `requestAnimationFrame` y usa un fallback de 250 ms si el frame se throttlea; un burst produce un solo re-render.
- **DOM:** máximo 500 líneas, nodos simples; no hace falta virtualizar.
- **Auto-scroll:** una lectura/escritura de `scrollTop` por flush.
- **Sin `backgroundThrottling: false`:** el monitor está visible y always-on-top; no necesita desactivar el throttle.
- **Arranque:** `show: false` hasta `ready-to-show`; contexto por un `invoke`. Objetivo: menos de 300 ms.
- **Limpieza:** listeners al desmontar, entradas de mapas al cerrar, timers de debounce cancelados, procesos muertos en `closed`/`destroyed`/`before-quit`.
- **Tope:** 4 es una constante del módulo, no una preferencia en v1. Si en producción resulta ajustado, se baja a 3 sin tocar la UI.
- **Limitación conocida:** un crash duro del proceso principal puede dejar `ping.exe` huérfanos; es la misma limitación que ya tiene la app.

---

## 8. Seguridad

- `contextIsolation: true`, `nodeIntegration: false`, sandbox por defecto. Nada de `nodeIntegrationInWorker`.
- **Preload mínimo del monitor:** contexto, iniciar/detener ping, eventos, pin, copiar, cerrar y `connectRemote`. Sin DB, búsqueda, shell, updater ni diagnóstico. La única acción remota es `connectRemote`, que no acepta target.
- **El target no viene del renderer del monitor:** el proceso principal lo toma de su registro. La ventana principal sigue validando con `sanitizeHostOrIp` al iniciar su ping.
- **Validación de sender:** los handlers de monitor solo actúan si el `webContents.id` pertenece a un monitor registrado; `pcd:monitor-target-set` solo acepta a la ventana principal.
- **Conexión remota:** `pcd:monitor-connect-remote` solo acepta monitores registrados; el target sale del registro, no del renderer. El main resuelve la clave VNC y llama a `launchRemoteSmart`, que sanitiza el host y lanza VNC/MSRA con argumentos separados (`cmd.exe /c start` en MSRA, target sanitizado).
- **Sin acciones manuales:** el monitor no expone `launchVnc` ni `launchMsra` directo; solo la acción inteligente. No puede lanzar VNC/MSRA a un target distinto del suyo.
- **Navegación:** `setWindowOpenHandler` deniega ventanas nuevas y `will-navigate` bloquea la navegación fuera del origen local. El monitor no tiene enlaces externos.
- **Portapapeles:** se escribe desde el proceso principal vía IPC, validando que sea string y con un tope de longitud. No depende de permisos del navegador.
- **Sin dependencias nuevas.**
- La app no tiene CSP hoy; el monitor mantiene la misma postura. Agregar CSP estricta es una tarea de hardening aparte, para no romper HMR en desarrollo.

---

## 9. Pruebas

### 9.1 Proceso principal

- `pingSessions.cjs` con `executePing` inyectado:
  - dos senders corren en paralelo;
  - iniciar un ping nuevo de A mata solo el anterior de A;
  - datos y fin se enrutan solo al sender dueño;
  - detener A no toca B;
  - un `end` viejo no emite después de reiniciar;
  - `stopAll` limpia todo;
  - un sender destruido no recibe eventos.
- `monitorWindows.cjs` con `BrowserWindow`/`screen` inyectados:
  - reutilización por target normalizado;
  - tope de 4;
  - cascada y clamp de bounds dentro del área visible;
  - cierre elimina registro y mata la sesión;
  - `closeAllMonitors` no deja ventanas ni procesos;
  - fallo de carga destruye la ventana y avisa.
- `monitorPreferences.cjs`: defaults, JSON corrupto, campos parciales, bounds inválidos.
- `monitorRemote.cjs` con `launchRemoteSmart`/`resolveVncSecret` inyectados:
  - usa el target del monitor registrado, no un target del renderer;
  - llama a `launchRemoteSmart` con `{ vncPassword }`;
  - devuelve el resultado al monitor y emite `pcd:monitor-remote-result` a la principal;
  - rechaza senders que no son monitores;
  - no toca las sesiones de ping.
- Handler del atajo extraído y testeado: sin target enfoca buscador; con target abre; con tope avisa; restaura si está minimizada/oculta.
- `pcd:monitor-target-set` rechaza senders que no son la ventana principal y targets inválidos.

### 9.2 Renderer

- `MonitorWindow.test.tsx` con `window.monitorAPI` mockeado:
  - renderiza label/target e inicia ping al montar;
  - append, split de líneas y tope de 500;
  - detener/reiniciar, pin, copiar y cerrar;
  - auto-scroll respetuoso (abajo sí, arriba no, volver abajo sí);
  - estados iniciando/en vivo/detenido/error;
  - botón remoto: llama a `connectRemote`, muestra spinner y se deshabilita mientras espera; al volver, el ping sigue igual; si el invoke rechaza, el botón se rehabilita;
  - el monitor no muestra un menú manual de VNC/MSRA;
  - no hay campo de destino ni buscador.
- `electronClient.test.ts`: nuevas funciones de target, apertura, aviso y suscripción al resultado remoto, con y sin `electronAPI`.
- `App.test.tsx`: al cargar terminal avisa `{ target, label }`; al limpiar, cambiar a cuenta o no encontrar, envía `null`; el aviso de tope se traduce a toast; el resultado remoto se traduce a toast success (VNC), info (MSRA) o error (sin acceso).
- `SettingsModal.test.tsx`: muestra el atajo del monitor.

### 9.3 Estáticas y build

- `monitor-preload.cjs` expone solo las claves permitidas y no expone `ipcRenderer` ni canales arbitrarios.
- `monitor-preload.cjs` no expone `launchVnc`/`launchMsra` ni acepta target en `connectRemote`; solo el canal fijo `pcd:monitor-connect-remote`.
- `monitorWindows.cjs` declara `contextIsolation`, `nodeIntegration: false` y deniega ventanas nuevas.
- `vite.config.ts` incluye `monitor.html` como input y `dist/monitor.html` se genera en el build.
- `monitor.html` referencia `src/monitor.tsx` y aplica el tema antes del paint.
- No se agregan dependencias a `package.json`.

### 9.4 Checklist manual en Electron

1. Consultar equipo A → `Ctrl + Shift + Espacio` → monitor A abre y pingea.
2. Consultar equipo B → atajo → monitor B abre; A sigue pingeando.
3. La consola principal puede iniciar/detener su ping sin afectar a A ni B.
4. Cerrar monitor A → su `ping.exe` desaparece; B sigue.
5. Ocultar la principal → se cierran todos los monitores; la bandeja sigue viva.
6. Cerrar desde la bandeja → no queda ningún `ping.exe` iniciado por la app.
7. Pin/unpin y bounds: cerrar y reabrir conserva posición y tamaño.
8. Cuatro monitores → quinto intento muestra toast.
9. Sin terminal consultada o sin IP → el atajo enfoca el buscador.
10. Tema claro: cromo claro, consola oscura. DPI 125/150%: texto legible y bounds dentro de pantalla.
11. Diez minutos con 4 monitores: memoria estable, CPU < 1%, sin crecimiento por encima de 500 líneas.
12. `Ctrl + Espacio` sigue trayendo la app y buscando desde el portapapeles.
13. Pulsar el botón remoto del monitor A → abre VNC o MSRA según los puertos; el ping de A sigue corriendo; la principal muestra el toast.
14. Sin acceso remoto → toast de error en la principal; el monitor sigue pingeando.
15. Con la principal minimizada o ante un error remoto, se dispara `flashFrame`; el toast se ve al restaurar.
16. El monitor no ofrece un menú manual de VNC/MSRA; solo el botón inteligente.

### 9.5 Regresión

- `npm test`
- `npm run build`
- `npm run audit:contrast`
- `npm run release:check`

---

## 10. Criterios de aceptación

1. Con una terminal cargada, `Ctrl + Shift + Espacio` abre una ventana (420×300 por defecto) para esa IP y ejecuta `ping -t`.
2. La consola principal puede mantener su propio ping; iniciar o detener uno no afecta al otro.
3. Se pueden abrir hasta 4 monitores; el mismo target reutiliza ventana; el quinto muestra un toast y no crea ventana ni proceso.
4. La X de un monitor destruye la ventana y mata su ping; la principal sigue viva.
5. Power/ocultar la principal destruye todos los monitores y sus pings; la app sigue en la bandeja; Cerrar desde la bandeja termina la app y todos los pings.
6. Sin terminal consultada o sin IP, el atajo enfoca el buscador y no abre monitor.
7. Pin alterna always-on-top; bounds y pin se conservan entre aperturas y se ajustan al área visible.
8. La consola respeta el tope de 500 líneas, el auto-scroll solo cuando el operador está abajo, y el botón Copiar funciona.
9. El monitor tiene un botón de conexión remota inteligente; al pulsarlo sondea 5901/5900/3389/135 y abre VNC o MSRA sin detener el ping.
10. Si no hay acceso remoto, la principal muestra un toast de error y el monitor sigue pingeando.
11. El resultado remoto se muestra como toast en la principal; el monitor solo refleja el estado de carga del botón y no tiene selección manual de VNC/MSRA.
12. El monitor no tiene campo de destino, buscador ni diagnóstico.
13. `Ctrl + Espacio` conserva exactamente el comportamiento actual.
14. `monitor.html` se genera en `dist`; no se agregan dependencias.
15. `npm test`, `npm run build`, `npm run audit:contrast` y `npm run release:check` pasan.

---

## 11. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Otra app ya usa `Ctrl + Shift + Espacio` | Fallback local en la ventana principal + aviso en Ajustes; si ambos fallan, se evalúa un ítem visible en “Más”. |
| Memoria en equipos de 8 GB | Entrada compacta, tope 4, cierre mata renderer y proceso, sin polling. |
| `ping.exe` huérfano tras crash | Limpieza en `closed`/`destroyed`/`before-quit`; el crash duro queda como limitación conocida. |
| Bounds fuera de pantalla al desconectar un monitor | Clamp contra el `workArea` en cada apertura; no se confía en el JSON guardado. |
| Salida de ping localizada o distinta | El clasificador cae a color base si no reconoce la línea; no hay parsing funcional que pueda romperse. |
| Duplicar ping al mismo host | Es intencional: consola y monitor son sesiones independientes. Una línea por segundo no justifica acoplarlas. |
| `skipTaskbar` deja el monitor fuera de la barra de tareas | El atajo global lo enfoca; el pin lo mantiene visible. |
| El monitor tapa contenido | Pin/unpin; se puede cerrar y reabrir. |
| Copiar falla | El estado del botón no cambia y se anuncia “No se pudo copiar”. |
| El sondeo remoto tarda hasta ~600 ms | Spinner + botón deshabilitado; una sola ejecución; el ping sigue. |
| El toast de la principal puede quedar detrás del monitor | El toast de error dura 10 s; si la principal está minimizada o el resultado es error, `flashFrame(true)`. El éxito se evidencia porque VNC/MSRA abre. |
| El sondeo del monitor no actualiza los badges de la principal | Estados independientes; el toast incluye el target para evitar confusión. |
| VNC sin clave o MSRA no disponible | `resolveVncSecret` y `launchRemoteSmart` ya devuelven el motivo; se muestra en el toast. |

---

## 12. Orden de implementación

1. **Sesiones por renderer:** extraer `pingSessions.cjs`, cablear en `main.cjs`, pruebas de aislamiento y regresión de la consola.
2. **Preferencias y ventanas:** `monitorPreferences.cjs` y `monitorWindows.cjs` con pruebas de reutilización, tope, bounds y cierre.
3. **Entrada y UI del monitor:** `monitor.html`, `src/monitor.tsx`, `MonitorWindow` (incluido el botón remoto), preload, estilos y pruebas de componente.
4. **Cableado principal:** target, atajo global con fallback, avisos, ciclo de vida, handler remoto (`monitorRemote.cjs`), Ajustes y pruebas de `App`/`electronClient`.
5. **Verificación:** checklist manual (incluida la conexión remota), rendimiento, `npm test`, `npm run build`, `npm run audit:contrast`, `npm run release:check`, y nota en `DESIGN.md`.

---

## 13. Notas de implementación (2026-11-06)

Implementado en la rama `feat/monitor-flotante-ping` y mergeado a `main`. La suite completa quedó en **627 tests**, el build genera `dist/monitor.html`, `audit:contrast` y `release:check` pasan.

Desvíos respecto del diseño inicial, todos revisados por spec y calidad:

- **Avisos:** `monitorWindows.open()` es el único dueño de los avisos de tope/error; `monitorShortcut` ya no notifica para no duplicar toasts. El fallback local consulta `pcd:monitor-shortcut-status` y solo abre si el atajo global no está registrado.
- **Remoto:** `monitorRemote` deduplica conexiones concurrentes por sender, normaliza rechazos no-`Error`, protege `notifyMain`/`flashMain`, hace flash si la principal está minimizada y acepta `isMainMinimized`. `systemTools.launchRemoteSmart` ahora reenvía `vncPassword` al lanzador VNC (bug preexistente).
- **Ventanas:** `close()` espera el evento `closed` para desregistrar; `setPinned` tolera ventanas destruidas y revierte; `open()` normaliza el target del registro, protege notificaciones y navegación; `closeAll()` limpia pings y bounds pendientes.
- **Sesiones:** sender destruido rechazado antes de lanzar; `send` protegido; `sessionId` usado como token; proceso nulo/inválido emite `pcd:ping-end`; un listener `destroyed` por sender.
- **Preferencias:** bounds enteros, tamaño positivo y tope 10000; `stored` solo es `true` si la escritura/rename terminó; temp único con `wx` y limpieza en `finally`.
- **Tipos:** `src/types/monitor.d.ts` se eliminó porque quedaba sombreado por `monitor.ts`; la augmentación `Window.monitorAPI` vive en `src/types/monitor.ts`.
- **UI:** ids estables por línea, buffer de líneas completas, fallback de 250 ms, tope de 200k, guarda para no revivir `live` tras stop/error, tema con `pcd-theme` + `storage`, `color-scheme: dark`, pin/copy/tema endurecidos.
- **Clasificador:** `error`/`media` con límites de palabra, `unreachable` y variantes `agotó/agotada`; tabla de 21 casos.

Deudas aceptadas, fuera del alcance de esta entrega:

- `pcd:cmd-start` tiene una carrera preexistente: el `onDone` de un comando anterior puede limpiar `activeDiagnosticProcess` de un comando nuevo. No la introduce este cambio; conviene un token de generación en una tarea aparte.
- `will-navigate` compara orígenes; en `file://` el origen es `"null"`, así que la navegación entre archivos locales no queda bloqueada por origen. La UI no tiene enlaces y el preload del monitor es mínimo; se deja como hardening pendiente.
- El guardado de bounds con debounce de 300 ms puede perderse si la ventana se cierra dentro de esa ventana; no afecta la operación.
- La cascada puede apilarse en la esquina cuando los bounds guardados ya están clampados al borde.
- Checklist manual en Electron pendiente de ejecución por el operador (VNC/MSRA reales, DPI y bandeja).
