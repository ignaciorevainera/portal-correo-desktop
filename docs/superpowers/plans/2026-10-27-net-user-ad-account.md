# Consulta de cuenta AD con `net user` — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ejecutar `net user <usuario> /domain` desde la app y mostrar la salida en la consola integrada, con entradas desde la ficha de terminal y desde el estado “No se encontró”, validando usuarios alfanuméricos.

**Architecture:** Se agrega el comando `netuser` al canal de diagnóstico existente (`cmda:cmd-start`), con `spawn('net.exe', …)` sin shell y timeout de 12 s. `LivePingConsole` gana un modo `account` para reutilizarse sin terminal. La identidad y el menú contextual disparan el comando en la ficha; el buscador ofrece consultar el texto como cuenta AD y muestra la misma consola en modo cuenta.

**Tech Stack:** Electron 34 (main/preload CJS), React 19, TypeScript 5.7, Vite 6, Tailwind v4, shadcn/ui + Radix, Vitest 3 + Testing Library.

---

## Contexto

- Spec: `docs/superpowers/specs/2026-10-27-net-user-ad-account-design.md`.
- Rama actual: `feat/terminal-layout-activity`.
- **No se tocan** `src/components/Topbar.tsx` ni `src/components/QuickActionsBar.tsx`.
- Regla estricta: `^[A-Za-z0-9]{1,64}$`. Sin dominio, puntos, guiones ni espacios.
- Los comandos corren en la PC del operador, no en la terminal remota.
- La consola es la única superficie de salida, con o sin terminal.

---

## Estructura de archivos

| Archivo | Responsabilidad |
|---|---|
| `src/lib/usernames.ts` | Regex, validación, split y detección de IP. |
| `electron/systemTools.cjs` | Validación, args, ejecución y timeout de `net user`. |
| `electron/main.cjs` | Rama `netuser` en `cmda:cmd-start`. |
| `src/services/electronClient.ts` | Tipo de comando y simulación de navegador. |
| `src/components/LivePingConsole.tsx` | Modo `account`, encabezado, texto vacío y resalte de grupos. |
| `src/components/TerminalIdentity.tsx` | Botón “Cuenta AD” junto al Usuario NT. |
| `src/components/OperatorContextMenu.tsx` | Ítem condicionado “Ver cuenta AD”. |
| `src/components/NetUserChooserDialog.tsx` | Selección/edición de usuario cuando hay varios. |
| `src/App.tsx` | Estados, handlers, vista de cuenta y acción del buscador. |
| `src/services/terminalService.ts` | Fixtures demo alfanuméricos. |

---

## Task 1: Utilidades de usuario

**Files:**
- Create: `src/lib/usernames.ts`
- Test: `src/lib/usernames.test.ts`

- [ ] **Step 1: Escribir el test que falla**

```ts
import { describe, expect, it } from "vitest";
import {
  isIpAddress,
  isValidUsername,
  splitUsernames,
} from "./usernames";

describe("usernames", () => {
  it("accepts only alphanumeric usernames up to 64 chars", () => {
    expect(isValidUsername("jperez")).toBe(true);
    expect(isValidUsername("OPERADOR01")).toBe(true);
    expect(isValidUsername("a".repeat(64))).toBe(true);
    expect(isValidUsername("a".repeat(65))).toBe(false);
    expect(isValidUsername("operador.demo01")).toBe(false);
    expect(isValidUsername("juan-perez")).toBe(false);
    expect(isValidUsername("CORREO\\jperez")).toBe(false);
    expect(isValidUsername("   ")).toBe(false);
    expect(isValidUsername(null)).toBe(false);
  });

  it("splits the NT field and drops invalid entries", () => {
    expect(
      splitUsernames("jperez | mgomez | operador.demo01 | "),
    ).toEqual(["jperez", "mgomez"]);
    expect(splitUsernames("")).toEqual([]);
    expect(splitUsernames(undefined)).toEqual([]);
  });

  it("detects IPv4 addresses", () => {
    expect(isIpAddress("192.0.2.101")).toBe(true);
    expect(isIpAddress("jperez")).toBe(false);
    expect(isIpAddress("192.0.2")).toBe(false);
  });
});
```

- [ ] **Step 2: Correr el test y verlo fallar**

Run: `npx vitest run src/lib/usernames.test.ts`
Expected: FAIL con `Failed to resolve import "./usernames"`.

- [ ] **Step 3: Implementar**

```ts
export const USERNAME_PATTERN = /^[A-Za-z0-9]{1,64}$/;

export function isIpAddress(value: string | null | undefined): boolean {
  if (typeof value !== "string") return false;
  return /^(?:\d{1,3}\.){3}\d{1,3}$/.test(value.trim());
}

export function isValidUsername(value: string | null | undefined): boolean {
  if (typeof value !== "string") return false;
  return USERNAME_PATTERN.test(value.trim());
}

export function splitUsernames(raw: string | null | undefined): string[] {
  if (!raw) return [];

  const unique = new Set<string>();
  for (const part of raw.split("|")) {
    const candidate = part.trim();
    if (isValidUsername(candidate)) unique.add(candidate);
  }
  return [...unique];
}
```

- [ ] **Step 4: Correr el test y verlo pasar**

Run: `npx vitest run src/lib/usernames.test.ts`
Expected: `3 passed`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/usernames.ts src/lib/usernames.test.ts
git commit -m "feat(users): utilidades de validación de usuarios alfanuméricos"
```

---

## Task 2: Ejecución de `net user` en el main

**Files:**
- Modify: `electron/systemTools.cjs` (constantes, `executeGenericCommand`, nuevas funciones, exports)
- Test: `src/services/systemTools.test.ts`

- [ ] **Step 1: Escribir el test que falla**

Agregar al import existente de `../../electron/systemTools.cjs`:

```ts
  sanitizeDomainUser,
  getNetUserArgs,
  executeNetUser,
```

y al final del archivo, antes del cierre del `describe` principal:

```ts
  describe('net user /domain', () => {
    it('accepts only alphanumeric users', () => {
      expect(sanitizeDomainUser('jperez')).toBe('jperez');
      expect(sanitizeDomainUser('OPERADOR01')).toBe('OPERADOR01');

      expect(() => sanitizeDomainUser('operador.demo01')).toThrow(
        'Usuario inválido',
      );
      expect(() => sanitizeDomainUser('juan-perez')).toThrow('Usuario inválido');
      expect(() => sanitizeDomainUser('CORREO\\jperez')).toThrow(
        'Usuario inválido',
      );
      expect(() => sanitizeDomainUser('')).toThrow('Usuario inválido');
    });

    it('builds net.exe with the exact argument list', () => {
      expect(getNetUserArgs('jperez')).toEqual({
        exe: 'net.exe',
        args: ['user', 'jperez', '/domain'],
      });
    });

    it('kills the process and reports a domain timeout', () => {
      vi.useFakeTimers();

      const child = new EventEmitter() as EventEmitter & {
        stdout: EventEmitter;
        stderr: EventEmitter;
        kill: ReturnType<typeof vi.fn>;
      };
      child.stdout = new EventEmitter();
      child.stderr = new EventEmitter();
      child.kill = vi.fn();

      const onData = vi.fn();
      const onDone = vi.fn();

      executeNetUser('jperez', onData, onDone, {
        spawnImpl: () => child,
        timeoutMs: 12000,
      });

      vi.advanceTimersByTime(12000);

      expect(child.kill).toHaveBeenCalledTimes(1);
      expect(onDone).toHaveBeenCalledWith(1);
      expect(onData.mock.calls.flat().join('')).toContain('VPN');

      vi.useRealTimers();
    });
  });
```

Agregar el import de `EventEmitter` al inicio del archivo:

```ts
import { EventEmitter } from 'node:events';
```

- [ ] **Step 2: Correr el test y verlo fallar**

Run: `npx vitest run src/services/systemTools.test.ts`
Expected: FAIL porque `sanitizeDomainUser`, `getNetUserArgs` y `executeNetUser` no existen.

- [ ] **Step 3: Implementar en `systemTools.cjs`**

Agregar antes de `executeGenericCommand`:

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

function getNetUserArgs(rawUser) {
  return {
    exe: 'net.exe',
    args: ['user', sanitizeDomainUser(rawUser), '/domain'],
  };
}
```

Reemplazar `executeGenericCommand` completa por:

```js
function executeGenericCommand(cmd, toolName, onData, onDone, options = {}) {
  const { spawnImpl = spawn, timeoutMs = 0, timeoutMessage = '' } = options;
  try {
    const proc = spawnImpl(cmd.exe, cmd.args, { windowsHide: true });
    let stdoutBuffer = '';
    let settled = false;
    let timeoutId = null;

    const emit = (text) => {
      if (text && onData) onData(text);
    };

    const flushBuffer = () => {
      if (stdoutBuffer) {
        emit(stdoutBuffer);
        stdoutBuffer = '';
      }
    };

    const finish = (code) => {
      if (settled) return;
      settled = true;
      if (timeoutId) clearTimeout(timeoutId);
      flushBuffer();
      if (onDone) onDone(code);
    };

    if (timeoutMs > 0) {
      timeoutId = setTimeout(() => {
        if (settled) return;
        emit(
          timeoutMessage ||
            `\n[timeout] El comando ${toolName} no respondió a tiempo.\n`
        );
        try {
          proc.kill();
        } catch {}
        finish(1);
      }, timeoutMs);
    }

    if (proc.stdout) {
      proc.stdout.on('data', (data) => {
        const decoded = decodeSubprocessOutput(data);
        stdoutBuffer += decoded;
        const lastNewline = stdoutBuffer.lastIndexOf('\n');
        if (lastNewline !== -1) {
          const toEmit = stdoutBuffer.slice(0, lastNewline + 1);
          stdoutBuffer = stdoutBuffer.slice(lastNewline + 1);
          emit(toEmit);
        }
      });
    }

    if (proc.stderr) {
      proc.stderr.on('data', (data) => {
        emit(decodeSubprocessOutput(data));
      });
    }

    proc.on('error', (err) => {
      emit(`Error de subproceso ${toolName}: ${err.message}\n`);
      finish(1);
    });

    proc.on('close', (code) => {
      finish(code);
    });

    return proc;
  } catch (err) {
    if (onData) onData(`Error al iniciar ${toolName}: ${err.message}\n`);
    if (onDone) onDone(1);
    return null;
  }
}
```

Agregar después de `executeArp`:

```js
function executeNetUser(rawUser, onData, onDone, options = {}) {
  try {
    const cmd = getNetUserArgs(rawUser);
    return executeGenericCommand(cmd, 'net user', onData, onDone, {
      spawnImpl: options.spawnImpl,
      timeoutMs: options.timeoutMs ?? NET_USER_TIMEOUT_MS,
      timeoutMessage:
        options.timeoutMessage ??
        '\n[timeout] El dominio no respondió en 12 s. Verificá VPN o conexión al DC.\n',
    });
  } catch (err) {
    if (onData) onData(`Error: ${err.message}\n`);
    if (onDone) onDone(1);
    return null;
  }
}
```

Agregar a `module.exports`:

```js
  sanitizeDomainUser,
  getNetUserArgs,
  executeNetUser,
  NET_USER_TIMEOUT_MS,
```

- [ ] **Step 4: Correr el test y verlo pasar**

Run: `npx vitest run src/services/systemTools.test.ts`
Expected: todos los tests pasan, incluidos los 3 nuevos.

- [ ] **Step 5: Commit**

```bash
git add electron/systemTools.cjs src/services/systemTools.test.ts
git commit -m "feat(electron): ejecutar net user /domain con timeout y validación"
```

---

## Task 3: IPC y bridge del renderer

**Files:**
- Modify: `electron/main.cjs:500-509`
- Modify: `src/services/electronClient.ts:286,320-352`
- Test: `src/services/electronClient.test.ts`

- [ ] **Step 1: Escribir el test que falla**

Agregar dentro del `describe` de `electronClient.test.ts`:

```ts
  it('simulates net user output in the browser fallback', () => {
    vi.useFakeTimers();
    delete (global as any).window.electronAPI;

    const onData = vi.fn();
    const onEnd = vi.fn();

    subscribeToDiagnosticCommand('netuser', 'jperez', onData, onEnd);
    vi.advanceTimersByTime(600);

    const output = onData.mock.calls.flat().join('');
    expect(output).toContain('grupos globales');
    expect(onEnd).toHaveBeenCalledWith(0);

    vi.useRealTimers();
  });
```

- [ ] **Step 2: Correr el test y verlo fallar**

Run: `npx vitest run src/services/electronClient.test.ts`
Expected: FAIL porque `'netuser'` no es un `DiagnosticCommandType` y no hay simulación.

- [ ] **Step 3: Agregar la rama en `main.cjs`**

En `cmda:cmd-start`, después de la rama `arp`:

```js
  } else if (command === 'netuser') {
    activeDiagnosticProcess = systemTools.executeNetUser(target, onData, onDone);
```

- [ ] **Step 4: Extender `electronClient.ts`**

Cambiar la línea 286:

```ts
export type DiagnosticCommandType = 'ping' | 'nbtstat' | 'tracert' | 'arp' | 'netuser';
```

Agregar la simulación antes del `else` final de `subscribeToDiagnosticCommand`:

```ts
  } else if (command === 'netuser') {
    onData(
      `\nInformación de la cuenta para ${target}\n\n` +
        `Nombre de usuario: ${target}\n` +
        `Nombre completo:\n` +
        `Cuenta activa: Sí\n\n` +
        `Miembro de grupos globales  *GRUPO-SOPORTE  *GRUPO-OPERADORES\n` +
        `El comando se completó correctamente.\n`,
    );
    timer = setTimeout(() => {
      onEnd(0);
    }, 500);
  } else {
```

- [ ] **Step 5: Correr el test y verlo pasar**

Run: `npx vitest run src/services/electronClient.test.ts`
Expected: todos pasan, incluido el nuevo.

- [ ] **Step 6: Commit**

```bash
git add electron/main.cjs src/services/electronClient.ts src/services/electronClient.test.ts
git commit -m "feat(ipc): comando netuser y simulación de navegador"
```

---

## Task 4: Modo cuenta en `LivePingConsole`

**Files:**
- Modify: `src/components/LivePingConsole.tsx:18-26,193-306`
- Test: `src/test/LivePingConsole.test.tsx`

- [ ] **Step 1: Escribir el test que falla**

Agregar al final del `describe`:

```tsx
  it('renders account mode header and highlights global groups', () => {
    let push: ((text: string) => void) | null = null;

    vi.spyOn(electronClient, 'subscribeToDiagnosticCommand').mockImplementation(
      (_command, _target, onData) => {
        push = onData;
        return () => {};
      },
    );

    render(
      <LivePingConsole
        mode="account"
        targetLabel="jperez"
        ip=""
        isPinging={false}
        activeCommand={{
          id: 'diag-1',
          command: 'netuser',
          target: 'jperez',
          argsText: 'net user jperez /domain',
          timestamp: '10:00:00',
        }}
        onTogglePing={vi.fn()}
      />,
    );

    expect(screen.getByText(/Cuenta AD · jperez/)).toBeInTheDocument();

    act(() => {
      push?.(
        'Miembro de grupos globales  *GRUPO-SOPORTE  *GRUPO-OPERADORES\n',
      );
    });

    const groupLine = screen.getByText(/Miembro de grupos globales/);
    expect(groupLine).toHaveClass('text-cyan-300');
  });
```

- [ ] **Step 2: Correr el test y verlo fallar**

Run: `npx vitest run src/test/LivePingConsole.test.tsx`
Expected: FAIL porque `mode` y `targetLabel` no existen y el encabezado muestra la IP vacía.

- [ ] **Step 3: Extender props, tipo y encabezado**

En `DiagnosticCommandEvent` cambiar:

```ts
  command: "ping" | "nbtstat" | "tracert" | "arp";
```

por:

```ts
  command: "ping" | "nbtstat" | "tracert" | "arp" | "netuser";
```

Agregar a la interfaz `LivePingConsoleProps`:

```ts
  mode?: "terminal" | "account";
  targetLabel?: string;
```

En la desestructuración:

```ts
  mode = "terminal",
  targetLabel,
```

Antes del `return`, definir:

```tsx
  const isAccountMode = mode === "account";
  const HeaderIcon = isAccountMode ? UserRound : Activity;
  const headerLabel = isAccountMode
    ? `Cuenta AD · ${targetLabel ?? ""}`
    : ip;
```

Importar `UserRound` desde `lucide-react`.

Reemplazar el bloque del encabezado:

```tsx
        <div className="flex items-center gap-2">
          <Activity className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
          <span className="font-mono text-xs font-bold text-foreground dark:text-zinc-100">
            {ip}
          </span>
        </div>
```

por:

```tsx
        <div className="flex items-center gap-2">
          <HeaderIcon className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
          <span className="font-mono text-xs font-bold text-foreground dark:text-zinc-100">
            {headerLabel}
          </span>
        </div>
```

- [ ] **Step 4: Texto vacío y resaltado de grupos**

Reemplazar el texto vacío:

```tsx
            Selecciona una acción (Ping, Ping -t, Nbtstat, Tracert, ARP) en la
            barra superior para iniciar diagnóstico.
```

por:

```tsx
            {isAccountMode
              ? "Consultá una cuenta para ver la salida de net user."
              : "Selecciona una acción (Ping, Ping -t, Nbtstat, Tracert, ARP) en la barra superior para iniciar diagnóstico."}
```

Reemplazar el `map` de logs por:

```tsx
        {logs.map((line, idx) => {
          const isGroupHeader = /grupos globales|global group memberships/i.test(
            line,
          );
          if (isGroupHeader) insideGlobalGroups = true;

          const isGroupItem = insideGlobalGroups && /^\s*\*/.test(line);
          if (insideGlobalGroups && line.trim() === "") {
            insideGlobalGroups = false;
          }

          const tone = isGroupHeader
            ? "text-cyan-300 font-semibold"
            : isGroupItem
              ? "text-cyan-300"
              : line.startsWith("[") && line.includes(">")
                ? "text-cyan-400 font-bold"
                : line.includes("Iniciando") || line.includes("Ejecutando")
                  ? "text-amber-400 font-semibold"
                  : line.includes("finalizado")
                    ? "text-emerald-400 font-semibold"
                    : line.includes("Error") ||
                        line.includes("cerrado") ||
                        line.includes("inaccesible")
                      ? "text-red-400 font-semibold"
                      : "text-[#E5E5E5]";

          return (
            <div
              key={idx}
              className={`whitespace-pre font-mono ${tone}`}
            >
              {line}
            </div>
          );
        })}
```

Declarar `let insideGlobalGroups = false;` justo antes del `return` del componente (junto a `isAccountMode`). Se recalcula en cada render y no se comparte entre renders.

- [ ] **Step 5: Nota de error para `net user`**

Reemplazar el callback `onEnd` del efecto de diagnóstico:

```tsx
      (code: number) => {
        setLogs((prev) => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] Proceso ${activeCommand.command} finalizado (código: ${code}).\n`,
        ]);
      },
```

por:

```tsx
      (code: number) => {
        setLogs((prev) => {
          const next = [
            ...prev,
            `[${new Date().toLocaleTimeString()}] Proceso ${activeCommand.command} finalizado (código: ${code}).\n`,
          ];
          if (activeCommand.command === "netuser" && code !== 0) {
            next.push(
              "[net user] No se pudo consultar la cuenta. Verificá que exista, que sea del dominio actual y que tu cuenta tenga permiso de lectura.\n",
            );
          }
          return next;
        });
      },
```

- [ ] **Step 6: Correr el test y verlo pasar**

Run: `npx vitest run src/test/LivePingConsole.test.tsx`
Expected: todos pasan, incluido el nuevo.

- [ ] **Step 7: Commit**

```bash
git add src/components/LivePingConsole.tsx src/test/LivePingConsole.test.tsx
git commit -m "feat(console): modo cuenta AD y resaltado de grupos globales"
```

---

## Task 5: Botón en identidad y menú contextual

**Files:**
- Modify: `src/components/TerminalIdentity.tsx`
- Modify: `src/components/OperatorContextMenu.tsx`
- Modify: `src/services/terminalService.ts:14,25,41,52,69,80`
- Modify: `src/services/terminalService.test.ts:26`
- Test: `src/components/TerminalIdentity.test.tsx`, `src/test/OperatorContextMenu.test.tsx`

- [ ] **Step 1: Actualizar los fixtures demo**

En `terminalService.ts` reemplazar:

```ts
    userNt: 'operador.demo01 | operador.demo02',
```

por:

```ts
    userNt: 'operadordemo01 | operadordemo02',
```

`operador.demo03` → `operadordemo03`; `operador.demo04` → `operadordemo04`; `admin.soporte` → `adminsoporte` (dos ocurrencias); `soporte.demo` → `soportedemo`.

En `terminalService.test.ts`:

```ts
    expect(term?.userNt).toBe('operadordemo04');
```

- [ ] **Step 2: Escribir los tests que fallan**

Agregar a `TerminalIdentity.test.tsx`:

```tsx
  it("renders the account button for valid users and calls the handler", () => {
    const onQueryAccount = vi.fn();
    render(
      <TerminalIdentity
        terminal={{ ...terminal, userNt: "jperez" }}
        onQueryAccount={onQueryAccount}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Consultar cuenta AD" }),
    );
    expect(onQueryAccount).toHaveBeenCalledTimes(1);
  });

  it("disables the account button when the NT user has invalid characters", () => {
    render(
      <TerminalIdentity
        terminal={{ ...terminal, userNt: "operador.demo01" }}
        onQueryAccount={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Consultar cuenta AD" }),
    ).toBeDisabled();
  });

  it("does not render the account button without a user", () => {
    render(
      <TerminalIdentity
        terminal={{ ...terminal, userNt: "" }}
        onQueryAccount={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Consultar cuenta AD" }),
    ).not.toBeInTheDocument();
  });
```

En `OperatorContextMenu.test.tsx`, agregar:

```tsx
  it("shows the account action only for valid NT users", () => {
    const onQueryAccount = vi.fn();

    const { rerender } = render(
      <OperatorContextMenu
        x={10}
        y={10}
        terminal={{ ...terminal, userNt: "jperez" }}
        isPinging={false}
        onClose={vi.fn()}
        onLaunchVnc={vi.fn()}
        onTogglePing={vi.fn()}
        onLaunchMsra={vi.fn()}
        onOpenPortalMda={vi.fn()}
        onQueryAccount={onQueryAccount}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /ver cuenta ad/i }));
    expect(onQueryAccount).toHaveBeenCalledTimes(1);

    rerender(
      <OperatorContextMenu
        x={10}
        y={10}
        terminal={{ ...terminal, userNt: "operador.demo01" }}
        isPinging={false}
        onClose={vi.fn()}
        onLaunchVnc={vi.fn()}
        onTogglePing={vi.fn()}
        onLaunchMsra={vi.fn()}
        onOpenPortalMda={vi.fn()}
        onQueryAccount={onQueryAccount}
      />,
    );

    expect(
      screen.queryByRole("button", { name: /ver cuenta ad/i }),
    ).not.toBeInTheDocument();
  });
```

- [ ] **Step 3: Correr los tests y verlos fallar**

Run: `npx vitest run src/components/TerminalIdentity.test.tsx src/test/OperatorContextMenu.test.tsx`
Expected: FAIL por props/íconos faltantes y por fixtures con puntos.

- [ ] **Step 4: Implementar el botón en `TerminalIdentity`**

Agregar imports:

```tsx
import { MapPin, User, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { splitUsernames } from "@/lib/usernames";
```

Agregar prop:

```tsx
export function TerminalIdentity({
  terminal,
  onQueryAccount,
}: {
  terminal: TerminalData;
  onQueryAccount?: () => void;
}): React.JSX.Element {
```

Dentro del componente:

```tsx
  const validUsers = splitUsernames(terminal.userNt);
```

En el bloque del usuario NT, después del `<span>` del nombre:

```tsx
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <User className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate font-mono">
            {terminal.userNt?.trim() || "Sin sesión"}
          </span>
          {terminal.userNt?.trim() && (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label="Consultar cuenta AD"
              title={
                validUsers.length === 0
                  ? "El usuario NT contiene caracteres no permitidos"
                  : "Consultar cuenta AD"
              }
              disabled={validUsers.length === 0}
              onClick={() => onQueryAccount?.()}
              className="text-muted-foreground hover:text-foreground"
            >
              <Users className="h-3.5 w-3.5" />
            </Button>
          )}
        </span>
```

- [ ] **Step 5: Implementar el ítem en `OperatorContextMenu`**

Agregar imports:

```tsx
import { Users } from "lucide-react";
import { splitUsernames } from "@/lib/usernames";
```

Agregar a la interfaz:

```tsx
  onQueryAccount?: () => void;
```

Desestructurar `onQueryAccount`.

Dentro del bloque `terminal ? (`, después de los botones de copiar Hostname y antes del `Separator`:

```tsx
            {splitUsernames(terminal.userNt).length > 0 && onQueryAccount && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  onQueryAccount();
                  onClose();
                }}
                aria-label="Ver cuenta AD"
                className="w-full justify-start gap-2 px-2.5 h-8 text-xs font-medium cursor-pointer"
              >
                <Users className="h-3.5 w-3.5 text-muted-foreground" /> Ver cuenta AD
              </Button>
            )}
```

- [ ] **Step 6: Correr los tests y verlos pasar**

Run: `npx vitest run src/components/TerminalIdentity.test.tsx src/test/OperatorContextMenu.test.tsx src/services/terminalService.test.ts`
Expected: todos pasan.

- [ ] **Step 7: Commit**

```bash
git add src/components/TerminalIdentity.tsx src/components/OperatorContextMenu.tsx src/services/terminalService.ts src/services/terminalService.test.ts src/components/TerminalIdentity.test.tsx src/test/OperatorContextMenu.test.tsx
git commit -m "feat(ui): accesos a consulta de cuenta AD desde identidad y menú contextual"
```

---

## Task 6: Diálogo de selección de usuario

**Files:**
- Create: `src/components/NetUserChooserDialog.tsx`
- Test: `src/components/NetUserChooserDialog.test.tsx`

- [ ] **Step 1: Escribir el test que falla**

```tsx
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NetUserChooserDialog } from "./NetUserChooserDialog";

describe("NetUserChooserDialog", () => {
  it("selects one of the suggested users and submits it", () => {
    const onSubmit = vi.fn();

    render(
      <NetUserChooserDialog
        open
        users={["jperez", "mgomez"]}
        onOpenChange={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.click(screen.getByLabelText("mgomez"));
    fireEvent.click(screen.getByRole("button", { name: "Consultar" }));

    expect(onSubmit).toHaveBeenCalledWith("mgomez");
  });

  it("allows typing another alphanumeric user", () => {
    const onSubmit = vi.fn();

    render(
      <NetUserChooserDialog
        open
        users={[]}
        onOpenChange={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText(/usuario/i), {
      target: { value: "jperez" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Consultar" }));

    expect(onSubmit).toHaveBeenCalledWith("jperez");
  });

  it("disables submit for invalid characters", () => {
    render(
      <NetUserChooserDialog
        open
        users={[]}
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText(/usuario/i), {
      target: { value: "operador.demo01" },
    });

    expect(screen.getByRole("button", { name: "Consultar" })).toBeDisabled();
    expect(
      screen.getByText(/solo letras y números/i),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Correr el test y verlo fallar**

Run: `npx vitest run src/components/NetUserChooserDialog.test.tsx`
Expected: FAIL con `Failed to resolve import`.

- [ ] **Step 3: Implementar**

```tsx
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isValidUsername } from "@/lib/usernames";

interface NetUserChooserDialogProps {
  open: boolean;
  users: string[];
  initialUser?: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (user: string) => void;
}

export function NetUserChooserDialog({
  open,
  users,
  initialUser,
  onOpenChange,
  onSubmit,
}: NetUserChooserDialogProps): React.JSX.Element {
  const [value, setValue] = useState("");

  useEffect(() => {
    if (open) {
      setValue(initialUser ?? users[0] ?? "");
    }
  }, [open, initialUser, users]);

  const valid = isValidUsername(value);

  const submit = (): void => {
    if (!valid) return;
    onSubmit(value.trim());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Consultar cuenta AD</DialogTitle>
          <DialogDescription>
            Elegí un usuario de la ficha o escribí otro del dominio.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          {users.length > 0 && (
            <div className="space-y-1.5">
              {users.map((user) => (
                <label
                  key={user}
                  className="flex items-center gap-2 text-sm"
                >
                  <input
                    type="radio"
                    name="net-user"
                    value={user}
                    checked={value === user}
                    onChange={() => setValue(user)}
                    className="accent-primary"
                  />
                  <span className="font-mono">{user}</span>
                </label>
              ))}
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="net-user-input" className="text-xs">
              Usuario
            </Label>
            <Input
              id="net-user-input"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              maxLength={64}
              placeholder="Solo letras y números"
              className="h-9 font-mono text-sm"
              autoFocus
            />
            {!valid && value.length > 0 && (
              <p className="text-xs text-destructive">
                Usá solo letras y números, sin dominio ni símbolos.
              </p>
            )}
          </div>
        </form>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button type="button" size="sm" disabled={!valid} onClick={submit}>
            Consultar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: Correr el test y verlo pasar**

Run: `npx vitest run src/components/NetUserChooserDialog.test.tsx`
Expected: `3 passed`.

- [ ] **Step 5: Commit**

```bash
git add src/components/NetUserChooserDialog.tsx src/components/NetUserChooserDialog.test.tsx
git commit -m "feat(ui): diálogo para elegir cuenta AD"
```

---

## Task 7: Integración en `App`

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/LivePingConsole.tsx` (solo si falta algún prop del modo cuenta)
- Test: `src/test/NetUserFlow.test.tsx`
- Modify: `src/App.test.tsx:146`, `src/test/AppInitialState.test.tsx:63`, `src/test/AppTerminalLayout.test.tsx:16`

- [ ] **Step 1: Actualizar mocks con usuarios válidos**

En `App.test.tsx`: `userNt: 'operador.demo01'` → `userNt: 'operadordemo01'`.
En `AppInitialState.test.tsx` y `AppTerminalLayout.test.tsx`: `soporte.central` → `soportecentral`.

- [ ] **Step 2: Escribir el test que falla**

```tsx
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../App";

const terminal = {
  pc: "WS-CORP-100",
  ip: "192.0.2.100",
  mac: "00:00:5E:00:53:99",
  os: "Windows 11 Enterprise",
  servicePack: "22631.3007",
  cpuModel: "Intel Core i7",
  ram: "16.384 MB",
  antivirusVersion: "Endpoint Protection 14.3",
  ieVersion: "N/A (Edge)",
  userNt: "jperez",
  architecture: "x64-based PC",
  surveyDate: "25/10/2026",
  uptimeText: "3 day(s)",
  location: "Sede Central",
  costCenter: "CC 100",
  alerts: [],
  resetHistory: [],
};

function mockApi(searchResult: unknown) {
  const startCommand = vi.fn();
  const stopCommand = vi.fn();

  (window as any).electronAPI = {
    checkStatus: vi
      .fn()
      .mockResolvedValue({ connected: true, mode: "sql", server: "srv" }),
    searchTerminal: vi.fn().mockResolvedValue(searchResult),
    ping: vi.fn(),
    stopPing: vi.fn(),
    onPingData: vi.fn().mockReturnValue(() => {}),
    onPingEnd: vi.fn().mockReturnValue(() => {}),
    startCommand,
    stopCommand,
    onCommandData: vi.fn().mockReturnValue(() => {}),
    onCommandEnd: vi.fn().mockReturnValue(() => {}),
  };

  return { startCommand, stopCommand };
}

async function search(query: string) {
  const input = screen.getByPlaceholderText(/buscar terminal o ip/i);
  fireEvent.change(input, { target: { value: query } });
  fireEvent.keyDown(input, { key: "Enter", code: "Enter" });
}

describe("Net user flow", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("runs net user in the console from the identity button", async () => {
    const { startCommand } = mockApi({ source: "sql", data: terminal });
    render(<App />);
    await search("WS-CORP-100");

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Consultar cuenta AD" }),
      ).toBeInTheDocument(),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Consultar cuenta AD" }),
    );

    await waitFor(() =>
      expect(startCommand).toHaveBeenCalledWith(
        expect.objectContaining({ command: "netuser", target: "jperez" }),
      ),
    );
  });

  it("opens the chooser when the terminal has several users", async () => {
    const { startCommand } = mockApi({
      source: "sql",
      data: { ...terminal, userNt: "jperez | mgomez" },
    });
    render(<App />);
    await search("WS-CORP-100");

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Consultar cuenta AD" }),
      ).toBeInTheDocument(),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Consultar cuenta AD" }),
    );

    fireEvent.click(screen.getByLabelText("mgomez"));
    fireEvent.click(screen.getByRole("button", { name: "Consultar" }));

    await waitFor(() =>
      expect(startCommand).toHaveBeenCalledWith(
        expect.objectContaining({ command: "netuser", target: "mgomez" }),
      ),
    );
  });

  it("offers the account query from the not-found state", async () => {
    const { startCommand } = mockApi({ source: "sql", data: null });
    render(<App />);
    await search("jperez");

    const action = await screen.findByRole("button", {
      name: /consultar «jperez» como cuenta ad/i,
    });
    fireEvent.click(action);

    expect(
      await screen.findByText(/Cuenta AD · jperez/),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(startCommand).toHaveBeenCalledWith(
        expect.objectContaining({ command: "netuser", target: "jperez" }),
      ),
    );
  });

  it("does not offer the account query for invalid or IP text", async () => {
    mockApi({ source: "sql", data: null });
    render(<App />);

    await search("operador.demo01");
    expect(
      screen.queryByRole("button", { name: /como cuenta ad/i }),
    ).not.toBeInTheDocument();

    await search("192.0.2.50");
    expect(
      screen.queryByRole("button", { name: /como cuenta ad/i }),
    ).not.toBeInTheDocument();
  });

  it("stops the command and returns when pressing Volver", async () => {
    const { stopCommand } = mockApi({ source: "sql", data: null });
    render(<App />);
    await search("jperez");

    fireEvent.click(
      await screen.findByRole("button", {
        name: /consultar «jperez» como cuenta ad/i,
      }),
    );

    fireEvent.click(await screen.findByRole("button", { name: "Volver" }));

    expect(stopCommand).toHaveBeenCalled();
    expect(screen.queryByText(/Cuenta AD · jperez/)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Correr el test y verlo fallar**

Run: `npx vitest run src/test/NetUserFlow.test.tsx`
Expected: FAIL porque no existe el botón, ni la acción, ni la vista de cuenta.

- [ ] **Step 4: Imports y estado en `App.tsx`**

Cambiar el import de React:

```tsx
import React, { useState, useEffect, useRef, useMemo } from "react";
```

Agregar imports:

```tsx
import { NetUserChooserDialog } from "./components/NetUserChooserDialog";
import {
  isIpAddress,
  isValidUsername,
  splitUsernames,
} from "./lib/usernames";
```

Agregar estados junto a los existentes:

```tsx
  const [isAccountChooserOpen, setIsAccountChooserOpen] = useState(false);
  const [accountQuery, setAccountQuery] = useState<string | null>(null);
```

Después de `const allTerminals = getAllTerminals();`:

```tsx
  const accountUsers = useMemo(
    () => splitUsernames(terminal?.userNt),
    [terminal?.userNt],
  );
```

- [ ] **Step 5: Handlers**

Agregar antes de `handleLaunchSmartRemote`:

```tsx
  const runNetUser = (user: string): void => {
    const cleanUser = user.trim();
    if (!isValidUsername(cleanUser)) return;
    setIsPinging(false);
    stopDiagnosticCommand().catch(() => {});
    setActiveDiagnostic({
      id: `diag-${Date.now()}`,
      command: "netuser",
      target: cleanUser,
      argsText: `net user ${cleanUser} /domain`,
      timestamp: new Date().toLocaleTimeString(),
    });
  };

  const handleQueryAccount = (): void => {
    if (accountUsers.length === 1) {
      runNetUser(accountUsers[0]);
    } else if (accountUsers.length > 1) {
      setIsAccountChooserOpen(true);
    }
  };

  const handleOpenAccount = (user: string): void => {
    const cleanUser = user.trim();
    if (!isValidUsername(cleanUser)) return;
    setAccountQuery(cleanUser);
    runNetUser(cleanUser);
  };

  const handleStopAccount = (): void => {
    stopDiagnosticCommand().catch(() => {});
    setActiveDiagnostic(null);
  };

  const handleCloseAccount = (): void => {
    handleStopAccount();
    setAccountQuery(null);
  };
```

- [ ] **Step 6: Resetear la vista de cuenta al buscar o limpiar**

En `handleSelectTerminal`, después de `setIsProbingRemote(false);`:

```tsx
    setAccountQuery(null);
    setIsAccountChooserOpen(false);
```

En `handleClearSearch`, junto a los demás resets:

```tsx
    setAccountQuery(null);
    setIsAccountChooserOpen(false);
```

- [ ] **Step 7: Render de la vista de cuenta**

Reemplazar exactamente:

```tsx
          ) : notFoundTerm ? (
```

por:

```tsx
          ) : !terminal && accountQuery ? (
            <div className="space-y-2">
              <div className="flex items-center justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCloseAccount}
                >
                  Volver
                </Button>
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
          ) : notFoundTerm ? (
```

El resto de las ramas (`notFoundTerm`, `!terminal`, terminal activo) queda igual.

- [ ] **Step 8: Acción en el estado “No se encontró”**

Dentro del bloque de `notFoundTerm`, antes del botón “Limpiar búsqueda”, agregar:

```tsx
              {!isIpAddress(notFoundTerm) && isValidUsername(notFoundTerm) && (
                <Button
                  type="button"
                  variant="secondary"
                  size="xs"
                  onClick={() => handleOpenAccount(notFoundTerm)}
                  className="text-xs gap-1.5 h-7 px-3"
                >
                  Consultar «{notFoundTerm}» como cuenta AD
                </Button>
              )}
```

- [ ] **Step 9: Pasar props y renderizar el chooser**

En `<TerminalIdentity … />`:

```tsx
              <TerminalIdentity
                terminal={terminal}
                onQueryAccount={handleQueryAccount}
              />
```

En `<OperatorContextMenu … />`:

```tsx
            onQueryAccount={handleQueryAccount}
```

Antes de `<Toaster />`, agregar:

```tsx
        <NetUserChooserDialog
          open={isAccountChooserOpen}
          users={accountUsers}
          initialUser={accountUsers[0]}
          onOpenChange={setIsAccountChooserOpen}
          onSubmit={(user) => {
            setIsAccountChooserOpen(false);
            runNetUser(user);
          }}
        />
```

- [ ] **Step 10: Correr el test y verlo pasar**

Run: `npx vitest run src/test/NetUserFlow.test.tsx`
Expected: `5 passed`.

- [ ] **Step 11: Correr los tests de App existentes**

Run: `npx vitest run src/App.test.tsx src/test/AppInitialState.test.tsx src/test/AppTerminalLayout.test.tsx`
Expected: todos pasan.

- [ ] **Step 12: Commit**

```bash
git add src/App.tsx src/test/NetUserFlow.test.tsx src/App.test.tsx src/test/AppInitialState.test.tsx src/test/AppTerminalLayout.test.tsx
git commit -m "feat(app): consulta de cuenta AD desde ficha y buscador"
```

---

## Task 8: Verificación final

**Files:** ninguno.

- [ ] **Step 1: Suite completa**

Run: `npm test`
Expected: todos los archivos pasan, sin fallas.

- [ ] **Step 2: Gate de contraste**

Run: `npm run audit:contrast`
Expected: `Texto: 0 par(es) bajo 4.5:1` y exit 0.

- [ ] **Step 3: Build de producción**

Run: `npm run build`
Expected: `✓ built in ...` sin errores de `tsc`.

- [ ] **Step 4: Prueba manual**

Run: `npm run electron:dev`

1. Terminal con `userNt = jperez`: botón “Cuenta AD” habilitado; al hacer clic, la consola muestra `> net user jperez /domain` y la salida con grupos globales resaltados.
2. Terminal con `jperez | mgomez`: se abre el chooser; al elegir `mgomez`, ejecuta esa cuenta.
3. Terminal sin usuario: sin botón y sin ítem en el menú contextual.
4. Terminal con un `userNt` que no cumpla la regla (por ejemplo, si la base trae un punto): botón deshabilitado con el motivo.
5. Buscar `jperez` (sin resultado): aparece “Consultar «jperez» como cuenta AD”; al hacer clic se ve la consola en modo cuenta, con “Volver” y “Detener”.
6. Buscar `operador.demo01` o una IP: no aparece la acción.
7. Desconectar VPN y consultar: a los 12 s aparece el mensaje de timeout.
8. Consultar un usuario inexistente: salida de Windows y nota de verificación.
9. “Detener” corta el proceso sin cerrar la vista; “Volver” cierra y vuelve al estado anterior.

- [ ] **Step 5: Commit final (si hubo ajustes)**

```bash
git add -u
git commit -m "chore(ui): ajustes de verificación de consulta AD"
```

---

## Cobertura del spec

| Requisito | Tarea |
|---|---|
| Validación alfanumérica | 1, 2, 5, 6 |
| `net user /domain` sin shell + timeout | 2 |
| Comando `netuser` en IPC | 3 |
| Consola reutilizada con modo cuenta | 4, 7 |
| Botón en identidad | 5 |
| Ítem en menú contextual condicionado | 5 |
| Chooser para varios usuarios | 6, 7 |
| Acción desde “No se encontró” | 7 |
| Detener/Volver | 4, 7 |
| Fixtures alfanuméricos | 5, 7 |
| Sin tocar Topbar/QuickActionsBar | Todas |

## Fuera de alcance

- Buscar terminales por nombre de usuario (requiere SP/consulta nueva).
- Grupos anidados (solo grupos globales directos).
- Consultar dominios/bosques distintos al primario.
