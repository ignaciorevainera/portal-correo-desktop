# Consulta de cuenta AD con `net user /domain` — Diseño

**Fecha:** 2026-10-27
**Estado:** Para revisión del usuario
**Rama:** `feat/terminal-layout-activity`

---

## 1. Objetivo

Permitir que el operador consulte, desde la app, la información de una cuenta de dominio y los grupos globales a los que pertenece, ejecutando `net user <usuario> /domain` en la PC del operador y mostrando la salida cruda.

La consulta se dispara en dos contextos:

1. **Con terminal encontrada:** botón junto al Usuario NT y opción en el menú contextual, habilitados solo si hay al menos un usuario válido.
2. **Sin terminal:** desde el estado “No se encontró”, ofreciendo consultar el texto buscado como cuenta AD. La salida se muestra reutilizando la consola integrada en modo cuenta AD, no un modal.

En ambos casos la salida se ve en la misma consola estilo CMD (`LivePingConsole`); cambia solo el encabezado y el lugar donde se renderiza.

Fuera de alcance: buscar terminales por nombre de usuario. Requiere un SP o consulta nueva (`CMDA_Trae_Info_DE_PC_PARAmesa_T` recibe solo `pc`, `electron/dbService.cjs:99-102`) y se tratará en otra iteración.

---

## 2. Decisiones

| Tema | Decisión |
|---|---|
| Regla de usuario | Solo letras y números: `^[A-Za-z0-9]{1,64}$`. Sin dominio, puntos, guiones, guiones bajos ni espacios. |
| Validación | En renderer (UI) y en main (defensa en profundidad). |
| Ejecución | `spawn('net.exe', ['user', usuario, '/domain'])`, sin `cmd.exe` ni shell. |
| Timeout | 12 s; al vencer, `kill()` y mensaje accionable. |
| Con terminal | La salida va a la consola de diagnóstico existente. |
| Sin terminal | Se reutiliza `LivePingConsole` en modo cuenta AD; no hay modal de resultado. |
| Encabezado de consola | `ip` en modo terminal; `Cuenta AD · <usuario>` en modo cuenta. |
| Cierre sin terminal | Botón “Volver”: detiene el proceso y vuelve al estado “No se encontró”. |
| Un solo usuario | El botón ejecuta directo, sin diálogo. |
| Varios usuarios | `NetUserChooserDialog` para elegir o editar. |
| Menú contextual | Ítem “Ver cuenta AD” solo si hay al menos un usuario válido. |
| Búsqueda | Acción secundaria solo si el texto no es IP y cumple la regla alfanumérica. |
| Fixtures | Se actualizan los usuarios demo a alfanuméricos. |
| `Topbar` / `QuickActionsBar` | No se tocan. |

---

## 3. Arquitectura y flujo

### 3.1 Ejecución (Electron main)

`electron/systemTools.cjs` agrega:

```js
const NET_USER_TIMEOUT_MS = 12000;
const USERNAME_PATTERN = /^[A-Za-z0-9]{1,64}$/;

function sanitizeDomainUser(raw) {
  if (typeof raw !== 'string') throw new Error('Usuario inválido');
  const user = raw.trim();
  if (!USERNAME_PATTERN.test(user)) {
    throw new Error(
      'Usuario inválido: usá solo letras y números, sin dominio ni símbolos'
    );
  }
  return user;
}

function getNetUserArgs(raw) {
  return { exe: 'net.exe', args: ['user', sanitizeDomainUser(raw), '/domain'] };
}
```

`executeGenericCommand(cmd, toolName, onData, onDone, options)` se extiende con `{ spawnImpl = spawn, timeoutMs }`:

- Arranca un timer al lanzar el proceso.
- Al vencer: emite `\n[timeout] El dominio no respondió en ${timeoutMs / 1000} s. Verificá VPN o conexión al DC.\n`, llama `proc.kill()` y `onDone(1)` una sola vez.
- Cancela el timer en `close` y en `error`.
- Sin `timeoutMs`, el comportamiento actual no cambia.

`executeNetUser(raw, onData, onDone, options)` valida, arma el comando y delega. Los errores de validación se emiten por `onData` y terminan con `onDone(1)`. Se exportan `sanitizeDomainUser`, `getNetUserArgs` y `executeNetUser` desde `systemTools.cjs`.

La regex vive duplicada a propósito en `electron/systemTools.cjs` (CommonJS) y `src/lib/usernames.ts` (renderer): no hay módulo compartido entre ambos mundos en este proyecto.

`electron/main.cjs` agrega la rama en `cmda:cmd-start`:

```js
} else if (command === 'netuser') {
  activeDiagnosticProcess = systemTools.executeNetUser(target, onData, onDone);
}
```

### 3.2 Renderer

- `src/services/electronClient.ts`: `DiagnosticCommandType` pasa a `'ping' | 'nbtstat' | 'tracert' | 'arp' | 'netuser'`. Se agrega simulación de navegador con salida de ejemplo que incluye “Miembro de grupos globales”.
- `src/lib/usernames.ts` (nuevo): `USERNAME_PATTERN`, `isValidUsername(value)`, `splitUsernames(raw)` (separa por `|`, recorta y filtra válidos).
- `src/components/LivePingConsole.tsx`: se amplía el tipo de comando, se agregan `mode` y `targetLabel`, y se resalta el bloque de grupos globales.
- `src/components/NetUserChooserDialog.tsx` (nuevo).
- `src/components/TerminalIdentity.tsx`: botón de 24 px junto al Usuario NT.
- `src/components/OperatorContextMenu.tsx`: ítem condicionado.
- `src/App.tsx`: estados y handlers, incluida la vista de cuenta sin terminal.

### 3.3 Flujo con terminal

1. `TerminalIdentity` calcula `splitUsernames(terminal.userNt)`.
2. Sin usuarios válidos: botón deshabilitado con `title="El usuario NT contiene caracteres no permitidos o está vacío"`.
3. Un usuario válido: `onQueryAccount()` → `handleRunNetUser(user)`.
4. Varios: `onQueryAccount()` → abre `NetUserChooserDialog`; al confirmar, `handleRunNetUser(user)`.
5. `handleRunNetUser(user)` construye:

```ts
{
  id: `diag-${Date.now()}`,
  command: 'netuser',
  target: user,
  argsText: `net user ${user} /domain`,
  timestamp: new Date().toLocaleTimeString(),
}
```

y lo asigna a `activeDiagnostic` (detiene ping y diagnóstico previo, igual que `handleRunDiagnostic`).
6. `LivePingConsole` escribe el encabezado y transmite la salida. Copiar/Detener funcionan como hoy.

### 3.4 Flujo sin terminal

1. `searchTerminalUnified` no devuelve datos y `notFoundTerm` queda seteado.
2. Si `notFoundTerm` no es IP y `isValidUsername(notFoundTerm)`, el bloque “No se encontró” muestra la acción secundaria: `Consultar «<texto>» como cuenta AD`.
3. Al hacer clic, `App` setea `accountQuery = user` y `activeDiagnostic` con el comando `netuser` (y `isPinging = false`).
4. `<main>` deja de mostrar el bloque “No se encontró” y renderiza la vista de cuenta: botón “Volver” alineado a la derecha y debajo `<LivePingConsole mode="account" targetLabel={user} … />`; el encabezado de la consola identifica la cuenta.
5. La consola se suscribe por el mismo `activeCommand` que usa con terminal: encabezado de comando, streaming, Detener, Limpiar y Copiar.
6. “Volver” detiene el proceso, limpia `activeDiagnostic` y `accountQuery`, y devuelve al estado “No se encontró” con el texto original.
7. Si el operador busca otra cosa o limpia la búsqueda, la vista de cuenta se descarta igual.

---

## 4. Componentes

### 4.1 `TerminalIdentity`

Prop nueva: `onQueryAccount?: () => void`.

- Renderiza el botón solo si `terminal.userNt?.trim()` no está vacío.
- Deshabilitado si `splitUsernames(terminal.userNt).length === 0`.
- `aria-label="Consultar cuenta AD"`, `title` con el motivo cuando está deshabilitado.
- Ícono `Users`, `size="icon-xs"` (24 px).

### 4.2 `NetUserChooserDialog`

```ts
interface NetUserChooserDialogProps {
  open: boolean;
  users: string[];
  initialUser?: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (user: string) => void;
}
```

- Lista los `users` válidos como opciones (radio).
- Campo “Usuario” editable, `maxLength={64}`.
- “Consultar” deshabilitado si el valor no cumple `USERNAME_PATTERN`.
- Al abrir, resetea al `initialUser` o al primer usuario.
- Cancelar cierra sin ejecutar.

### 4.3 `LivePingConsole` en modo cuenta

Se reutiliza el componente existente. Props nuevas:

```ts
mode?: "terminal" | "account"; // default "terminal"
targetLabel?: string;          // usuario en modo cuenta; en terminal se usa ip
```

- **Modo terminal:** encabezado con el `ip`, comportamiento actual sin cambios.
- **Modo cuenta:** encabezado `Cuenta AD · <targetLabel>` con ícono `UserRound`; sin ping ni controles de ping.
- En ambos modos se mantienen Limpiar, Copiar Último, Copiar Logs, Detener y el scroll interno.
- `DiagnosticCommandEvent.command` incluye `'netuser'`.
- El bloque de grupos se resalta cuando una línea coincide con `/grupos globales|global group memberships/i`; las líneas siguientes que empiezan con `*` se mantienen resaltadas hasta una línea vacía.
- El texto de consola vacía se adapta al modo: en cuenta, “Consultá una cuenta para ver la salida de net user”.

### 4.4 `OperatorContextMenu`

- Prop nueva: `onQueryAccount?: () => void`.
- Ítem “Ver cuenta AD” con ícono `Users`, visible solo si `splitUsernames(terminal.userNt).length > 0`.
- Al hacer clic, cierra el menú y ejecuta el mismo handler que la identidad.

### 4.5 `App`: vista de cuenta sin terminal

- Estado `accountQuery: string | null`.
- `handleOpenAccount(user)`: valida, setea `accountQuery`, arma el `DiagnosticCommandEvent` de `netuser`, `isPinging = false` y limpia diagnósticos previos.
- `handleStopAccount()`: detiene el proceso y limpia `activeDiagnostic`, pero mantiene `accountQuery` y la salida visible para leerla o copiarla.
- `handleCloseAccount()`: detiene el proceso, limpia `activeDiagnostic` y `accountQuery`; vuelve al bloque “No se encontró”.
- En `<main>`, si no hay terminal y `accountQuery` existe, renderiza:

```tsx
<div className="space-y-2">
  <div className="flex items-center justify-end">
    <Button variant="outline" size="sm" onClick={handleCloseAccount}>Volver</Button>
  </div>
  <LivePingConsole
    mode="account"
    targetLabel={accountQuery}
    ip=""
    isPinging={false}
    activeCommand={activeDiagnostic}
    onTogglePing={() => {}}
    onStopCommand={handleStopAccount}
  />
</div>
```

- La acción “Consultar «texto» como cuenta AD” solo aparece si `notFoundTerm` no es IP y `isValidUsername(notFoundTerm)`.
- Si se limpia la búsqueda o se busca otra terminal, `accountQuery` se resetea.

---

## 5. Seguridad

- Sin shell: `spawn` recibe ejecutable y argumentos por separado.
- Validación estricta alfanumérica en renderer y main.
- No se piden, pasan ni almacenan credenciales; `net user /domain` usa el contexto Kerberos del operador.
- El canal IPC existente sigue disponible solo dentro de la app ya desbloqueada por el security gate.

---

## 6. Errores y límites

| Situación | Comportamiento |
|---|---|
| Usuario con símbolos o vacío | Validación en UI; en main, `onData` con el mensaje y `onDone(1)`. |
| Cuenta inexistente | Salida cruda de Windows + nota de verificación. |
| Sin permiso de lectura (error 5) | Salida cruda + “Tu cuenta no puede leer este objeto de AD”. |
| DC/VPN inaccesible | Timeout a los 12 s con mensaje específico. |
| Proceso detenido | `kill()` y `onDone` correspondiente. |
| Otro dominio/bosque | No soportado: `net user` solo consulta el dominio primario. |
| Grupos anidados | No aparecen: solo grupos globales directos. |

---

## 7. Pruebas

### 7.1 Unitarias (`src/services/systemTools.test.ts`)

- `sanitizeDomainUser` acepta `jperez`, `OPERADOR01`; rechaza `operador.demo01`, `juan-perez`, `juan perez`, `CORREO\\jperez`, `''` y 65 caracteres.
- `getNetUserArgs('jperez')` devuelve `{ exe: 'net.exe', args: ['user', 'jperez', '/domain'] }`.
- `executeNetUser` con `spawnImpl` falso y timers falsos: al vencer 12 s emite el mensaje, llama `kill()` y `onDone(1)` una sola vez.

### 7.2 IPC (`src/services/electronClient.test.ts`)

- Sin `electronAPI`, `subscribeToDiagnosticCommand('netuser', 'jperez', …)` emite la simulación y termina en 0.
- La simulación contiene “grupos globales”.

### 7.3 Componentes

- `NetUserChooserDialog`: lista usuarios, permite editar, deshabilita inválidos y emite el elegido.
- `TerminalIdentity`: botón visible/deshabilitado según usuarios válidos; un usuario ejecuta, varios abre chooser.
- `OperatorContextMenu`: ítem presente solo con usuario válido.
- `LivePingConsole`: modo terminal sin cambios; modo cuenta con encabezado `Cuenta AD · usuario`, salida y resalte de grupos; texto vacío adaptado.
- `App`: “No se encontró” con `jperez` ofrece la acción; con IP o con símbolos no; al confirmar renderiza la consola en modo cuenta y llama `startCommand` con `{ command: 'netuser', target: 'jperez' }`; “Detener” corta el proceso sin cerrar la vista; “Volver” detiene y restaura el estado anterior.

### 7.4 Fixtures

Actualizar a alfanumérico:

- `terminalService.ts`: `operadordemo01 | operadordemo02`, `operadordemo03`, `operadordemo04`, `adminsoporte`, `soportedemo`.
- `App.test.tsx`, `AppInitialState.test.tsx` y `ActivityPanel.test.tsx`: mismos reemplazos en los mocks.

### 7.5 Manual

1. Terminal con un usuario válido: botón habilitado, ejecuta en consola, muestra grupos.
2. Terminal con dos usuarios: abre chooser y ejecuta el elegido.
3. Terminal sin usuario: botón deshabilitado, sin ítem en el menú contextual.
4. Usuario con punto en la ficha: botón deshabilitado con motivo.
5. Buscar `jperez` (sin terminal): aparece la acción, se abre la consola en modo cuenta, muestra salida, copia y “Volver” detiene el proceso.
6. Buscar una IP o un texto con guion: no aparece la acción.
7. Sin VPN: timeout a los 12 s con mensaje.
8. Usuario inexistente: salida de Windows y nota.

---

## 8. Criterios de aceptación

1. `net user` se ejecuta sin shell y solo con usuarios `^[A-Za-z0-9]{1,64}$`.
2. Con un usuario válido en la ficha, el botón ejecuta en la consola y la salida incluye grupos globales.
3. Con varios, el chooser permite elegir y ejecutar.
4. Sin usuario válido, no hay botón habilitado ni ítem de menú.
5. El clic derecho muestra “Ver cuenta AD” solo cuando corresponde.
6. El estado “No se encontró” ofrece consultar como cuenta AD solo para texto no-IP y alfanumérico.
7. La consola sin terminal muestra la salida cruda, copia y “Volver” detiene el proceso.
8. Un timeout de 12 s no deja procesos colgados.
9. `Topbar.tsx` y `QuickActionsBar.tsx` no se modifican.
10. La suite completa y el build pasan.

---

## 9. Archivos afectados

**Nuevos:** `src/lib/usernames.ts`, `src/components/NetUserChooserDialog.tsx` y sus tests.

**Modificados:** `electron/systemTools.cjs`, `electron/main.cjs`, `src/services/electronClient.ts`, `src/components/LivePingConsole.tsx`, `src/components/TerminalIdentity.tsx`, `src/components/OperatorContextMenu.tsx`, `src/App.tsx`, `src/services/terminalService.ts` (fixtures), tests de `App`, `AppInitialState`, `ActivityPanel`, `TerminalIdentity`, `OperatorContextMenu`, `LivePingConsole`, `systemTools`, `electronClient`.

---

## 10. Riesgos

- **Cuentas reales con punto o guion:** la regla estricta las rechaza. Si aparecen en producción, se relaja en `USERNAME_PATTERN` y `usernames.ts` en un solo cambio.
- **Latencia del DC:** el timeout de 12 s puede cortar consultas lentas por VPN; el mensaje indica el motivo.
- **Reutilización de la consola:** el modo cuenta comparte logs, copiado y detención con el modo terminal; el riesgo es que el encabezado o el texto vacío queden específicos de ping si no se parametrizan.
- **Grupos anidados:** el resultado puede interpretarse como “no pertenece” cuando en realidad pertenece a un grupo anidado; queda documentado.
