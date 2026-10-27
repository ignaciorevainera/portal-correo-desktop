# Ficha de terminal reordenada y panel unificado de actividad — Implementation Plan

> **REVISIÓN 2 (aplicada durante la ejecución):** por indicación del usuario se ajustan tres puntos y las tareas 5–8 quedan supersedidas por esta revisión:
> 1. **Tabla única ordenada por fecha descendente**, sin importar el tipo. Se agrega `parseActivityDate()` (ISO, `DD/MM/YYYY` y `es-AR`) y `buildActivityRows()` ordena por timestamp; fechas inválidas van al final.
> 2. **Reset sin cambios de lógica:** se elimina `requestResetOnTerminal()` y toda escritura en `resetHistory`. El diálogo solo confirma con el mensaje de cola existente (`CMDA_solicitud_De_Reset`); no hay aprobación ni fila nueva.
> 3. **Normalización total:** sin valores hardcodeados en componentes nuevos. Se usan `--success`/`--warning`/`--info` + `StatusBadge`, escala Tailwind (`text-xs`/`text-sm`/`text-base`/`text-lg`), anchos `w-20`/`w-24`, y constantes en `src/lib/constants.ts`.
>
> La **Tarea 5** pasa a ser “Constantes compartidas y `StatusBadge`” (ya no toca `terminalService`). La **Tarea 7** ordena por fecha y usa `StatusBadge`. La **Tarea 8** usa un handler de reset que solo muestra el mensaje original.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reordenar la vista de terminal a `identidad → consola → grilla de datos → actividad unificada`, reemplazando las 4 cards y los dos paneles separados por una ficha de identidad, una grilla legible y una única tabla compacta de alertas + reseteos con dos CTAs.

**Architecture:** `App.tsx` compone cuatro bloques nuevos sobre la barra de acciones existente. La identidad y la grilla son componentes de presentación puros; la actividad se resuelve con un modelo `ActivityRow` normalizado (alertas + reseteos) ordenado por fecha, que alimenta una tabla shadcn y tres diálogos Radix para alta/cierre/reseteo. Los estados usan tokens semánticos vía `StatusBadge`; los tokens de contraste y la fuente mono se corrigen en `index.css` sin tocar `Topbar.tsx` ni `QuickActionsBar.tsx`.

**Tech Stack:** React 19, TypeScript 5.7, Vite 6, Tailwind CSS v4 (`@theme inline`), shadcn/ui + Radix (`dialog`, `label`, `separator`), lucide-react, Vitest 3 + Testing Library (jsdom).

---

## Contexto y decisiones

El pedido original y la auditoría (`docs/ui-ux-audit-2026-10-27.md`) dejan estos límites y decisiones. **No reabrir estas decisiones durante la ejecución.**

| Tema | Decisión |
|---|---|
| `Topbar.tsx` y `QuickActionsBar.tsx` | **No se tocan.** Son barras fijas, siempre juntas (top y quick). Su deuda de contraste/tipografía queda congelada. |
| Consola (`LivePingConsole`) | **No se toca su orden ni su tamaño.** El ping es automático y los comandos se ejecutan ahí; queda entre identidad y grilla. |
| Identidad | Va inmediatamente después de `QuickActionsBar`: hostname, IP, sede y usuario NT. |
| Datos del equipo | Van después de la consola, en grilla label/valor de 3 columnas, sin las 4 cards actuales. |
| Alertas + reseteos | **Una sola tabla** con columna `Tipo`, ordenada por **fecha descendente** (la solicitud más reciente primero, sea alerta o reseteo). Encabezado con dos CTAs: `Nueva alerta` y `Pedir reset`. |
| Tabs | **No se agregan.** |
| Reset | **No se modifica la lógica original.** No hay aprobación, no se agrega una fila nueva al historial y no se toca `terminalService`. El diálogo solo confirma con el mismo mensaje de cola que hoy (`CMDA_solicitud_De_Reset`); la tabla muestra el `resetHistory` existente. |
| Contraste | Se corrigen solo dos tokens (`--muted-foreground`, `--destructive`) y la fuente mono. Los bordes de 1,26:1 quedan documentados como deuda (decisión estética, no bloquea AA de texto). |
| Normalización | Cero valores hardcodeados en componentes nuevos: escala tipográfica Tailwind (`text-xs`/`text-sm`/`text-base`/`text-lg`), tokens semánticos de estado (`--success`, `--warning`, `--info`), anchos en escala (`w-20`, `w-24`), constantes compartidas y primitivas shadcn. |
| Foco de diálogos | Radix maneja foco y Escape; no se implementa foco manual. |
| Datos | Todo sigue sobre `mockTerminals`; no hay cambios de backend. |

**Supuesto verificable:** el operador usa esta pantalla de 1020×680 con mouse y teclado; 24 px es el mínimo aceptable para iconos y 32 px para acciones de fila.

**Rama de trabajo:** el working tree ya tiene 11 archivos modificados sin commitear. Antes de empezar, crear una rama desde el estado actual y commitear ese baseline para que los pasos de commit del plan sean diffs limpios.

---

## Estructura de archivos

| Archivo | Responsabilidad |
|---|---|
| `src/index.css` | Tokens de contraste y stack mono determinista. |
| `package.json` | Script `audit:contrast` y gate en `release:check`. |
| `src/hooks/useCopyToClipboard.ts` | Copiar con feedback temporal y limpieza de timer. |
| `src/components/CopyValueButton.tsx` | Botón de copiado de 24 px, reutilizable. |
| `src/components/TerminalIdentity.tsx` | Hostname, IP, sede, usuario; primer bloque tras la quick bar. |
| `src/components/TerminalDetailsGrid.tsx` | Grilla de 3 columnas con los datos restantes. |
| `src/components/ui/table.tsx` | Primitiva `Table` de shadcn (no estaba instalada). |
| `src/lib/constants.ts` | Operador y motivo por defecto, y mensaje de cola de reset, en un solo lugar. |
| `src/components/StatusBadge.tsx` | Badge de estado normalizado por tono semántico. |
| `src/components/ActivityDialogs.tsx` | `NewAlertDialog`, `RequestResetDialog`, `CloseAlertDialog`. |
| `src/components/ActivityPanel.tsx` | Modelo `ActivityRow`, orden por fecha, tabla unificada, CTAs y estado vacío. |
| `src/App.tsx` | Orden final, handler de reset con la lógica original, contexto solo fuera de editables. |
| `src/components/TerminalTechnicalCard.tsx` | **Se elimina** (reemplazado por identidad + grilla). |
| `src/components/AlertsPanel.tsx` | **Se elimina** (reemplazado por `ActivityPanel`). |
| `src/components/ResetUptimePanel.tsx` | **Se elimina** (reemplazado por `ActivityPanel` + diálogo). |

Tests nuevos: `src/hooks/useCopyToClipboard.test.ts`, `src/components/TerminalIdentity.test.tsx`, `src/components/TerminalDetailsGrid.test.tsx`, `src/components/StatusBadge.test.tsx`, `src/components/ActivityDialogs.test.tsx`, `src/components/ActivityPanel.test.tsx`, `src/test/AppTerminalLayout.test.tsx`.

---

## Task 1: Tokens de contraste y fuente mono

**Files:**
- Modify: `src/index.css:9-70,89-110,133-135`
- Modify: `package.json:9-14`
- Test: `scripts/check-contrast.mjs` (ya existe, es el gate)

- [ ] **Step 1: Confirmar que el gate falla hoy**

Run: `node scripts/check-contrast.mjs; echo "exit=$LASTEXITCODE"`
Expected: `Texto: 2 par(es) bajo 4.5:1 · UI: 3 borde(s) bajo 3:1.` y `exit=1`.

- [ ] **Step 2: Corregir los tokens y el stack mono**

En `src/index.css`, reemplazar:

```css
  --muted-foreground: oklch(0.556 0 0);
```

por:

```css
  --muted-foreground: oklch(0.505 0 0);
```

Reemplazar:

```css
  --destructive: oklch(0.577 0.245 27.325);
```

por:

```css
  --destructive: oklch(0.52 0.245 27.325);
```

Agregar los tokens semánticos de estado en `:root` (después de `--destructive`):

```css
  --success: oklch(0.5 0.13 155);
  --warning: oklch(0.55 0.14 75);
  --info: oklch(0.52 0.16 255);
```

y en `.dark` (después de su `--destructive`):

```css
  --success: oklch(0.72 0.14 155);
  --warning: oklch(0.78 0.14 75);
  --info: oklch(0.72 0.12 255);
```

En `@theme inline`, junto a `--color-destructive`, agregar:

```css
  --color-success: var(--success);
  --color-warning: var(--warning);
  --color-info: var(--info);
```

Reemplazar la línea 13:

```css
  --font-mono: var(--font-mono, "Geist Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace);
```

por:

```css
  --font-mono: "Geist Mono", "Cascadia Mono", Consolas, ui-monospace, SFMono-Regular, monospace;
```

Y eliminar el bloque duplicado de las líneas 133-135:

```css
code, pre, .font-mono {
  font-family: var(--font-mono);
}
```

por nada (Tailwind ya aplica `font-mono` y su preflight cubre `code`/`pre`).

- [ ] **Step 3: Verificar el gate**

Run: `node scripts/check-contrast.mjs; echo "exit=$LASTEXITCODE"`
Expected: `Texto: 0 par(es) bajo 4.5:1 · UI: 2 borde(s) bajo 3:1.` y `exit=0`.

- [ ] **Step 4: Cablear el gate en `release:check`**

En `package.json`, dentro de `scripts`, agregar:

```json
    "audit:contrast": "node scripts/check-contrast.mjs",
```

y cambiar:

```json
    "release:check": "vitest run src/test/securityAudit.test.ts && npm run build",
```

por:

```json
    "release:check": "vitest run src/test/securityAudit.test.ts && npm run audit:contrast && npm run build",
```

- [ ] **Step 5: Compilar para confirmar el CSS**

Run: `npm run build`
Expected: `✓ built in ...` sin errores de `tsc`.

- [ ] **Step 6: Commit**

```bash
git add src/index.css package.json
git commit -m "fix(ui): corregir contraste de tokens y stack mono determinista"
```

---

## Task 2: Hook de portapapeles y botón de copiado de 24 px

**Files:**
- Create: `src/hooks/useCopyToClipboard.ts`
- Create: `src/components/CopyValueButton.tsx`
- Test: `src/hooks/useCopyToClipboard.test.ts`

- [ ] **Step 1: Escribir el test que falla**

```ts
import { renderHook, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCopyToClipboard } from "./useCopyToClipboard";

describe("useCopyToClipboard", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("marks the key as copied and clears it after the reset window", async () => {
    const { result } = renderHook(() => useCopyToClipboard());

    await act(async () => {
      await result.current.copy("ip", "192.0.2.101");
    });
    expect(result.current.copiedKey).toBe("ip");

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.copiedKey).toBeNull();
  });

  it("ignores empty values", async () => {
    const { result } = renderHook(() => useCopyToClipboard());
    let copied = true;

    await act(async () => {
      copied = await result.current.copy("ip", "   ");
    });

    expect(copied).toBe(false);
    expect(result.current.copiedKey).toBeNull();
  });
});
```

- [ ] **Step 2: Correr el test y verlo fallar**

Run: `npx vitest run src/hooks/useCopyToClipboard.test.ts`
Expected: FAIL con `Failed to resolve import "./useCopyToClipboard"`.

- [ ] **Step 3: Implementar el hook**

```ts
import { useCallback, useEffect, useRef, useState } from "react";

const DEFAULT_RESET_MS = 2000;

export function useCopyToClipboard(resetMs: number = DEFAULT_RESET_MS) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const copy = useCallback(
    async (key: string, text: string): Promise<boolean> => {
      if (!text || text.trim() === "") return false;

      try {
        await navigator.clipboard.writeText(text);
        setCopiedKey(key);
        if (timerRef.current !== null) {
          window.clearTimeout(timerRef.current);
        }
        timerRef.current = window.setTimeout(
          () => setCopiedKey(null),
          resetMs,
        );
        return true;
      } catch {
        return false;
      }
    },
    [resetMs],
  );

  return { copiedKey, copy };
}
```

- [ ] **Step 4: Correr el test y verlo pasar**

Run: `npx vitest run src/hooks/useCopyToClipboard.test.ts`
Expected: `2 passed`.

- [ ] **Step 5: Crear el botón reutilizable**

`src/components/CopyValueButton.tsx`:

```tsx
import React from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { cn } from "@/lib/utils";

interface CopyValueButtonProps {
  value: string;
  label: string;
  className?: string;
}

export function CopyValueButton({
  value,
  label,
  className,
}: CopyValueButtonProps): React.JSX.Element {
  const { copiedKey, copy } = useCopyToClipboard();
  const copied = copiedKey === "value";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      aria-label={label}
      title={label}
      onClick={() => {
        void copy("value", value);
      }}
      className={cn(
        "h-6 w-6 shrink-0 p-0 text-muted-foreground hover:text-foreground",
        className,
      )}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </Button>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useCopyToClipboard.ts src/hooks/useCopyToClipboard.test.ts src/components/CopyValueButton.tsx
git commit -m "feat(ui): hook de portapapeles y botón de copiado de 24px"
```

---

## Task 3: Bloque de identidad de la terminal

**Files:**
- Create: `src/components/TerminalIdentity.tsx`
- Test: `src/components/TerminalIdentity.test.tsx`

- [ ] **Step 1: Escribir el test que falla**

```tsx
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TerminalIdentity } from "./TerminalIdentity";
import { getAllTerminals } from "../services/terminalService";

describe("TerminalIdentity", () => {
  const terminal = getAllTerminals()[0];

  it("shows hostname, IP, sede and user as the identity block", () => {
    render(<TerminalIdentity terminal={terminal} />);

    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      terminal.pc,
    );
    expect(screen.getByText(terminal.ip)).toBeInTheDocument();
    expect(screen.getByText(terminal.location as string)).toBeInTheDocument();
    expect(screen.getByText(terminal.userNt)).toBeInTheDocument();
  });

  it("copies the IP from a 24px target", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<TerminalIdentity terminal={terminal} />);

    const button = screen.getByRole("button", { name: "Copiar IP" });
    expect(button).toHaveClass("h-6", "w-6");

    fireEvent.click(button);
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(terminal.ip));
  });

  it("falls back when the hostname is missing or equals the IP", () => {
    render(<TerminalIdentity terminal={{ ...terminal, pc: terminal.ip }} />);

    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "No especificado",
    );
  });
});
```

- [ ] **Step 2: Correr el test y verlo fallar**

Run: `npx vitest run src/components/TerminalIdentity.test.tsx`
Expected: FAIL con `Failed to resolve import "./TerminalIdentity"`.

- [ ] **Step 3: Implementar el componente**

```tsx
import React from "react";
import { MapPin, User } from "lucide-react";
import { TerminalData } from "../types/terminal";
import { CopyValueButton } from "./CopyValueButton";

export function TerminalIdentity({
  terminal,
}: {
  terminal: TerminalData;
}): React.JSX.Element {
  const hostname =
    terminal.pc?.trim() && terminal.pc !== terminal.ip
      ? terminal.pc
      : "No especificado";
  const hasHostname = hostname !== "No especificado";

  return (
    <section
      data-testid="terminal-identity"
      aria-labelledby="terminal-identity-title"
      className="space-y-1 px-0.5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1">
          <h2
            id="terminal-identity-title"
            className="truncate font-heading text-lg font-bold leading-tight text-foreground"
            title={hostname}
          >
            {hostname}
          </h2>
          {hasHostname && (
            <CopyValueButton value={terminal.pc} label="Copiar hostname" />
          )}
        </div>

        <div className="flex items-center gap-1">
          <span className="font-mono text-[13px] font-semibold tabular-nums text-foreground">
            {terminal.ip || "Sin IP"}
          </span>
          {terminal.ip && <CopyValueButton value={terminal.ip} label="Copiar IP" />}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">
            {terminal.location?.trim() || "Sede no especificada"}
          </span>
        </span>
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <User className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate font-mono text-xs">
            {terminal.userNt?.trim() || "Sin sesión"}
          </span>
        </span>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Correr el test y verlo pasar**

Run: `npx vitest run src/components/TerminalIdentity.test.tsx`
Expected: `3 passed`.

- [ ] **Step 5: Commit**

```bash
git add src/components/TerminalIdentity.tsx src/components/TerminalIdentity.test.tsx
git commit -m "feat(ui): bloque de identidad de terminal"
```

---

## Task 4: Grilla de datos restantes

**Files:**
- Create: `src/components/TerminalDetailsGrid.tsx`
- Test: `src/components/TerminalDetailsGrid.test.tsx`

- [ ] **Step 1: Escribir el test que falla**

```tsx
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TerminalDetailsGrid } from "./TerminalDetailsGrid";
import { getAllTerminals } from "../services/terminalService";
import { TerminalData } from "../types/terminal";

const emptyTerminal: TerminalData = {
  ...getAllTerminals()[0],
  mac: "",
  os: "",
  servicePack: "",
  cpuModel: "",
  ram: "",
  architecture: "",
  surveyDate: "",
  antivirusVersion: "",
  ieVersion: "",
  costCenter: "",
};

describe("TerminalDetailsGrid", () => {
  const terminal = getAllTerminals()[0];

  it("renders the remaining technical fields in a labelled grid", () => {
    render(<TerminalDetailsGrid terminal={terminal} />);

    expect(
      screen.getByRole("heading", { name: /datos del equipo/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Dirección MAC")).toBeInTheDocument();
    expect(screen.getByText(terminal.mac)).toBeInTheDocument();
    expect(screen.getByText(terminal.cpuModel)).toBeInTheDocument();
    expect(screen.getByText(terminal.antivirusVersion)).toBeInTheDocument();
    expect(screen.getByText(terminal.costCenter as string)).toBeInTheDocument();
  });

  it("falls back to 'No informado' for empty fields", () => {
    render(<TerminalDetailsGrid terminal={emptyTerminal} />);

    expect(screen.getAllByText("No informado").length).toBeGreaterThanOrEqual(6);
  });

  it("copies the MAC from a 24px target", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<TerminalDetailsGrid terminal={terminal} />);

    const button = screen.getByRole("button", { name: "Copiar MAC" });
    expect(button).toHaveClass("h-6", "w-6");

    fireEvent.click(button);
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(terminal.mac));
  });
});
```

- [ ] **Step 2: Correr el test y verlo fallar**

Run: `npx vitest run src/components/TerminalDetailsGrid.test.tsx`
Expected: FAIL con `Failed to resolve import "./TerminalDetailsGrid"`.

- [ ] **Step 3: Implementar el componente**

```tsx
import React from "react";
import { TerminalData } from "../types/terminal";
import { CopyValueButton } from "./CopyValueButton";
import { cn } from "@/lib/utils";

const FALLBACK = "No informado";

interface DetailField {
  label: string;
  value?: string;
  mono?: boolean;
  copyLabel?: string;
}

function buildFields(terminal: TerminalData): DetailField[] {
  return [
    {
      label: "Dirección MAC",
      value: terminal.mac,
      mono: true,
      copyLabel: "Copiar MAC",
    },
    { label: "Sistema operativo", value: terminal.os },
    { label: "Build / Service Pack", value: terminal.servicePack, mono: true },
    { label: "Procesador", value: terminal.cpuModel },
    { label: "Memoria RAM", value: terminal.ram, mono: true },
    { label: "Arquitectura", value: terminal.architecture },
    { label: "Último relevamiento", value: terminal.surveyDate, mono: true },
    { label: "Antivirus", value: terminal.antivirusVersion },
    { label: "Navegador", value: terminal.ieVersion },
    { label: "Centro de costo", value: terminal.costCenter },
  ];
}

export function TerminalDetailsGrid({
  terminal,
}: {
  terminal: TerminalData;
}): React.JSX.Element {
  const fields = buildFields(terminal);

  return (
    <section
      data-testid="terminal-details"
      aria-labelledby="terminal-details-title"
      className="rounded-lg border border-border bg-card px-3 py-2.5"
    >
      <h2
        id="terminal-details-title"
        className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
      >
        Datos del equipo
      </h2>

      <dl className="mt-2 grid grid-cols-1 gap-x-8 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {fields.map((field) => {
          const raw = field.value?.trim();
          const display = raw && raw.length > 0 ? raw : FALLBACK;
          const isEmpty = display === FALLBACK;

          return (
            <div key={field.label} className="min-w-0 space-y-0.5">
              <dt className="text-[11px] font-medium text-muted-foreground">
                {field.label}
              </dt>
              <dd
                className={cn(
                  "flex min-w-0 items-center gap-1 text-[13px] leading-snug text-foreground",
                  field.mono && !isEmpty && "font-mono tabular-nums",
                  isEmpty && "italic text-muted-foreground",
                )}
              >
                <span className="truncate" title={display}>
                  {display}
                </span>
                {!isEmpty && field.copyLabel && (
                  <CopyValueButton value={display} label={field.copyLabel} />
                )}
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
```

- [ ] **Step 4: Correr el test y verlo pasar**

Run: `npx vitest run src/components/TerminalDetailsGrid.test.tsx`
Expected: `3 passed`.

- [ ] **Step 5: Commit**

```bash
git add src/components/TerminalDetailsGrid.tsx src/components/TerminalDetailsGrid.test.tsx
git commit -m "feat(ui): grilla de datos restantes del equipo"
```

---

## Task 5: Constantes compartidas y `StatusBadge`

**Files:**
- Create: `src/lib/constants.ts`
- Create: `src/components/StatusBadge.tsx`
- Test: `src/components/StatusBadge.test.tsx`

- [ ] **Step 1: Escribir el test que falla**

```tsx
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusBadge } from "./StatusBadge";

describe("StatusBadge", () => {
  it("renders the label and the semantic dot for each tone", () => {
    const { container, rerender } = render(
      <StatusBadge tone="success">Cerrada</StatusBadge>,
    );

    expect(screen.getByText("Cerrada")).toBeInTheDocument();
    expect(container.querySelector('[aria-hidden="true"]')).toHaveClass(
      "bg-success",
    );

    rerender(<StatusBadge tone="warning">Activa</StatusBadge>);
    expect(container.querySelector('[aria-hidden="true"]')).toHaveClass(
      "bg-warning",
    );

    rerender(<StatusBadge tone="info">Pendiente</StatusBadge>);
    expect(container.querySelector('[aria-hidden="true"]')).toHaveClass(
      "bg-info",
    );

    rerender(<StatusBadge tone="neutral">Sin estado</StatusBadge>);
    expect(container.querySelector('[aria-hidden="true"]')).toHaveClass(
      "bg-muted-foreground",
    );
  });
});
```

- [ ] **Step 2: Correr el test y verlo fallar**

Run: `npx vitest run src/components/StatusBadge.test.tsx`
Expected: FAIL con `Failed to resolve import "./StatusBadge"`.

- [ ] **Step 3: Crear las constantes compartidas**

`src/lib/constants.ts`:

```ts
export const DEFAULT_OPERATOR = "OperadorActual";

export const DEFAULT_RESET_REASON =
  "Desbloqueo / Sincronización de cuenta AD";

export const RESET_QUEUE_MESSAGE =
  "Solicitud enviada a la cola (CMDA_solicitud_De_Reset)";
```

- [ ] **Step 4: Implementar `StatusBadge`**

`src/components/StatusBadge.tsx`:

```tsx
import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type StatusTone = "success" | "warning" | "info" | "neutral";

const TONE_DOT: Record<StatusTone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  info: "bg-info",
  neutral: "bg-muted-foreground",
};

export function StatusBadge({
  tone,
  children,
}: {
  tone: StatusTone;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <Badge
      variant="outline"
      className="h-5 gap-1.5 border-border px-1.5 text-xs font-medium text-foreground"
    >
      <span
        className={cn("h-1.5 w-1.5 rounded-full", TONE_DOT[tone])}
        aria-hidden="true"
      />
      {children}
    </Badge>
  );
}
```

- [ ] **Step 5: Correr el test y verlo pasar**

Run: `npx vitest run src/components/StatusBadge.test.tsx`
Expected: `1 passed`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/constants.ts src/components/StatusBadge.tsx src/components/StatusBadge.test.tsx
git commit -m "feat(ui): constantes compartidas y badge de estado normalizado"
```

---

## Task 6: Diálogos de alta, reset y cierre

**Files:**
- Create: `src/components/ActivityDialogs.tsx`
- Test: `src/components/ActivityDialogs.test.tsx`

- [ ] **Step 1: Escribir el test que falla**

```tsx
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  CloseAlertDialog,
  NewAlertDialog,
  RequestResetDialog,
} from "./ActivityDialogs";

describe("ActivityDialogs", () => {
  it("submits a new alert with title, description and operator", () => {
    const onSubmit = vi.fn();
    render(<NewAlertDialog open onOpenChange={vi.fn()} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/título/i), {
      target: { value: "Disco lleno" },
    });
    fireEvent.change(screen.getByLabelText(/descripción/i), {
      target: { value: "C: al 98%" },
    });
    fireEvent.click(screen.getByRole("button", { name: /registrar alerta/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      title: "Disco lleno",
      description: "C: al 98%",
      operator: "OperadorActual",
    });
  });

  it("submits a reset request with its reason", () => {
    const onSubmit = vi.fn();
    render(<RequestResetDialog open onOpenChange={vi.fn()} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/motivo/i), {
      target: { value: "Cuenta bloqueada" },
    });
    fireEvent.click(screen.getByRole("button", { name: /enviar solicitud/i }));

    expect(onSubmit).toHaveBeenCalledWith("Cuenta bloqueada");
  });

  it("submits the resolution when closing an alert", () => {
    const onConfirm = vi.fn();
    render(
      <CloseAlertDialog
        open
        alertTitle="Disco lleno"
        onOpenChange={vi.fn()}
        onConfirm={onConfirm}
      />,
    );

    fireEvent.change(screen.getByLabelText(/resolución/i), {
      target: { value: "Se liberó espacio" },
    });
    fireEvent.click(screen.getByRole("button", { name: /confirmar cierre/i }));

    expect(onConfirm).toHaveBeenCalledWith("Se liberó espacio");
  });
});
```

- [ ] **Step 2: Correr el test y verlo fallar**

Run: `npx vitest run src/components/ActivityDialogs.test.tsx`
Expected: FAIL con `Failed to resolve import "./ActivityDialogs"`.

- [ ] **Step 3: Implementar los tres diálogos**

```tsx
import React, { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";

const DEFAULT_OPERATOR = "OperadorActual";
const DEFAULT_RESET_REASON = "Desbloqueo / Sincronización de cuenta AD";

interface NewAlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (alert: {
    title: string;
    description: string;
    operator: string;
  }) => void;
}

export function NewAlertDialog({
  open,
  onOpenChange,
  onSubmit,
}: NewAlertDialogProps): React.JSX.Element {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [operator, setOperator] = useState(DEFAULT_OPERATOR);
  const valid =
    title.trim().length > 0 &&
    description.trim().length > 0 &&
    operator.trim().length > 0;

  const resetForm = (): void => {
    setTitle("");
    setDescription("");
    setOperator(DEFAULT_OPERATOR);
  };

  const handleOpenChange = (next: boolean): void => {
    if (!next) resetForm();
    onOpenChange(next);
  };

  const submit = (): void => {
    if (!valid) return;
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      operator: operator.trim(),
    });
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar nueva alerta</DialogTitle>
          <DialogDescription>
            Queda asociada a la terminal activa y al operador que la registra.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <div className="space-y-1">
            <Label htmlFor="new-alert-title" className="text-[11px]">
              Título
            </Label>
            <Input
              id="new-alert-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Título breve del incidente"
              className="h-9 text-xs"
              autoFocus
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="new-alert-description" className="text-[11px]">
              Descripción
            </Label>
            <Textarea
              id="new-alert-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Detalle de la falla o del pedido"
              rows={3}
              className="resize-none text-xs"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="new-alert-operator" className="text-[11px]">
              Operador
            </Label>
            <Input
              id="new-alert-operator"
              value={operator}
              onChange={(event) => setOperator(event.target.value)}
              className="h-9 font-mono text-xs"
            />
          </div>
        </form>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!valid}
            onClick={submit}
          >
            Registrar alerta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface RequestResetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (reason: string) => void;
}

export function RequestResetDialog({
  open,
  onOpenChange,
  onSubmit,
}: RequestResetDialogProps): React.JSX.Element {
  const [reason, setReason] = useState(DEFAULT_RESET_REASON);
  const valid = reason.trim().length > 0;

  const handleOpenChange = (next: boolean): void => {
    if (!next) setReason(DEFAULT_RESET_REASON);
    onOpenChange(next);
  };

  const submit = (): void => {
    if (!valid) return;
    onSubmit(reason.trim());
    setReason(DEFAULT_RESET_REASON);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Pedir reset de cuenta AD</DialogTitle>
          <DialogDescription>
            La solicitud queda en cola como pendiente de aprobación.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <div className="space-y-1">
            <Label htmlFor="reset-reason" className="text-[11px]">
              Motivo del reseteo
            </Label>
            <Textarea
              id="reset-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              className="resize-none text-xs"
              autoFocus
            />
          </div>
        </form>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!valid}
            onClick={submit}
          >
            Enviar solicitud
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface CloseAlertDialogProps {
  open: boolean;
  alertTitle: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: (resolution: string) => void;
}

export function CloseAlertDialog({
  open,
  alertTitle,
  onOpenChange,
  onConfirm,
}: CloseAlertDialogProps): React.JSX.Element {
  const [resolution, setResolution] = useState("");
  const valid = resolution.trim().length > 0;

  const handleOpenChange = (next: boolean): void => {
    if (!next) setResolution("");
    onOpenChange(next);
  };

  const submit = (): void => {
    if (!valid) return;
    onConfirm(resolution.trim());
    setResolution("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cerrar alerta</DialogTitle>
          <DialogDescription>{alertTitle}</DialogDescription>
        </DialogHeader>

        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <div className="space-y-1">
            <Label htmlFor="close-alert-resolution" className="text-[11px]">
              Resolución
            </Label>
            <Textarea
              id="close-alert-resolution"
              value={resolution}
              onChange={(event) => setResolution(event.target.value)}
              placeholder="Cómo se resolvió la alerta"
              rows={3}
              className="resize-none text-xs"
              autoFocus
            />
          </div>
        </form>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!valid}
            onClick={submit}
          >
            Confirmar cierre
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: Correr el test y verlo pasar**

Run: `npx vitest run src/components/ActivityDialogs.test.tsx`
Expected: `3 passed`.

- [ ] **Step 5: Commit**

```bash
git add src/components/ActivityDialogs.tsx src/components/ActivityDialogs.test.tsx
git commit -m "feat(ui): diálogos de nueva alerta, reset y cierre"
```

---

## Task 7: Tabla unificada de alertas y reseteos

**Files:**
- Create: `src/components/ui/table.tsx`
- Create: `src/components/ActivityPanel.tsx`
- Test: `src/components/ActivityPanel.test.tsx`

- [ ] **Step 1: Escribir el test que falla**

```tsx
import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ActivityPanel, buildActivityRows } from "./ActivityPanel";
import { TerminalData } from "../types/terminal";

const terminal: TerminalData = {
  pc: "SUC01-POS01",
  ip: "192.0.2.100",
  mac: "00:1A:2B:3C:4D:5E",
  os: "Windows 10 Pro",
  servicePack: "19045",
  cpuModel: "Intel Core i5-8500",
  ram: "16 GB",
  antivirusVersion: "Windows Defender",
  ieVersion: "11.0",
  userNt: "OPERADOR01",
  architecture: "x64",
  surveyDate: "2026-10-24",
  location: "Sucursal Central 01",
  costCenter: "CC-1044",
  uptimeText: "14 días",
  alerts: [
    {
      id: "al-1",
      title: "Falla térmica cooler",
      description: "Ruido excesivo y temperatura alta",
      date: "2026-10-24 14:30",
      operator: "JRevainera",
      active: true,
    },
    {
      id: "al-2",
      title: "Impresora térmica desconectada",
      description: "Se cambió el cable USB",
      date: "2026-10-20 09:15",
      operator: "MGomez",
      active: false,
      resolutionText: "Cable reemplazado",
    },
  ],
  resetHistory: [
    {
      id: "rs-1",
      date: "2026-10-22 11:00",
      operator: "admin.soporte",
      reason: "Desbloqueo de cuenta",
      result: "Pendiente de aprobación",
    },
  ],
};

function renderPanel(overrides: Partial<TerminalData> = {}) {
  const onAddAlert = vi.fn();
  const onCloseAlert = vi.fn();
  const onRequestReset = vi.fn();

  render(
    <ActivityPanel
      terminal={{ ...terminal, ...overrides }}
      onAddAlert={onAddAlert}
      onCloseAlert={onCloseAlert}
      onRequestReset={onRequestReset}
    />,
  );

  return { onAddAlert, onCloseAlert, onRequestReset };
}

describe("ActivityPanel", () => {
  it("normalizes alerts and resets into one row model", () => {
    const rows = buildActivityRows(terminal);

    expect(rows.map((row) => row.kind)).toEqual(["alert", "alert", "reset"]);
    expect(rows[0].status).toBe("Activa");
    expect(rows[1].status).toBe("Cerrada");
    expect(rows[2].status).toBe("Pendiente");
  });

  it("renders both kinds in a single table with the two header CTAs", () => {
    renderPanel();

    expect(
      screen.getByRole("heading", { name: /alertas y reseteos/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Falla térmica cooler")).toBeInTheDocument();
    expect(screen.getByText("Desbloqueo de cuenta")).toBeInTheDocument();
    expect(screen.getByText("Activa")).toBeInTheDocument();
    expect(screen.getByText("Pendiente")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /nueva alerta/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /pedir reset/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  it("expands a row with its detail using the keyboard-accessible button", () => {
    renderPanel();

    const rowButton = screen.getByRole("button", {
      name: /falla térmica cooler/i,
    });
    expect(rowButton).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(rowButton);

    expect(rowButton).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(/ruido excesivo/i)).toBeInTheDocument();
  });

  it("opens the new alert dialog and forwards the payload", () => {
    const { onAddAlert } = renderPanel();

    fireEvent.click(screen.getByRole("button", { name: /nueva alerta/i }));
    fireEvent.change(screen.getByLabelText(/título/i), {
      target: { value: "Sin red" },
    });
    fireEvent.change(screen.getByLabelText(/descripción/i), {
      target: { value: "No responde ping" },
    });
    fireEvent.click(screen.getByRole("button", { name: /registrar alerta/i }));

    expect(onAddAlert).toHaveBeenCalledWith({
      title: "Sin red",
      description: "No responde ping",
      operator: "OperadorActual",
    });
  });

  it("closes an active alert with a resolution", () => {
    const { onCloseAlert } = renderPanel();

    const row = screen.getByText("Falla térmica cooler").closest("tr");
    fireEvent.click(
      within(row as HTMLElement).getByRole("button", { name: "Cerrar" }),
    );

    fireEvent.change(screen.getByLabelText(/resolución/i), {
      target: { value: "Se limpió el cooler" },
    });
    fireEvent.click(screen.getByRole("button", { name: /confirmar cierre/i }));

    expect(onCloseAlert).toHaveBeenCalledWith("al-1", "Se limpió el cooler");
  });

  it("shows a compact empty state when there is no activity", () => {
    renderPanel({ alerts: [], resetHistory: [] });

    expect(
      screen.getByText(/sin alertas ni reseteos registrados/i),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Correr el test y verlo fallar**

Run: `npx vitest run src/components/ActivityPanel.test.tsx`
Expected: FAIL con `Failed to resolve import "./ActivityPanel"`.

- [ ] **Step 3: Crear la primitiva Table**

`src/components/ui/table.tsx`:

```tsx
import * as React from "react"
import { cn } from "cn"

function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div data-slot="table-container" className="relative w-full overflow-x-auto">
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("[&_tr]:border-b", className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b border-border/60 transition-colors hover:bg-muted/40 data-[state=selected]:bg-muted",
        className,
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "h-8 whitespace-nowrap px-2 text-left align-middle text-[11px] font-semibold text-muted-foreground",
        className,
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn("px-2 py-1.5 align-middle", className)}
      {...props}
    />
  )
}

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell }
```

- [ ] **Step 4: Implementar `ActivityPanel`**

```tsx
import React, { useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronRight,
  PlusCircle,
  RotateCcw,
  ShieldAlert,
  TriangleAlert,
} from "lucide-react";
import { TerminalAlert, TerminalData } from "../types/terminal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  CloseAlertDialog,
  NewAlertDialog,
  RequestResetDialog,
} from "./ActivityDialogs";

export type ActivityKind = "alert" | "reset";
export type ActivityStatus = "Activa" | "Cerrada" | "Pendiente" | "OK";

export interface ActivityRow {
  id: string;
  kind: ActivityKind;
  title: string;
  description: string;
  status: ActivityStatus;
  operator: string;
  date: string;
  resolution?: string;
}

export function buildActivityRows(terminal: TerminalData): ActivityRow[] {
  const alerts: ActivityRow[] = terminal.alerts.map((alert) => ({
    id: alert.id,
    kind: "alert",
    title: alert.title,
    description: alert.description,
    status: alert.active ? "Activa" : "Cerrada",
    operator: alert.operator,
    date: alert.date,
    resolution: alert.resolutionText,
  }));

  const resets: ActivityRow[] = terminal.resetHistory.map((reset) => ({
    id: reset.id,
    kind: "reset",
    title: reset.reason,
    description: reset.result,
    status: reset.result.toLowerCase().includes("pendiente")
      ? "Pendiente"
      : "OK",
    operator: reset.operator,
    date: reset.date,
  }));

  return [...alerts, ...resets];
}

const STATUS_DOT: Record<ActivityStatus, string> = {
  Activa: "bg-amber-600",
  Cerrada: "bg-emerald-600",
  Pendiente: "bg-blue-600",
  OK: "bg-emerald-600",
};

interface ActivityPanelProps {
  terminal: TerminalData;
  onAddAlert: (alert: {
    title: string;
    description: string;
    operator: string;
  }) => void;
  onCloseAlert: (alertId: string, resolution: string) => void;
  onRequestReset: (reason: string) => void;
}

export function ActivityPanel({
  terminal,
  onAddAlert,
  onCloseAlert,
  onRequestReset,
}: ActivityPanelProps): React.JSX.Element {
  const rows = useMemo(() => buildActivityRows(terminal), [terminal]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isNewAlertOpen, setIsNewAlertOpen] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [closingAlert, setClosingAlert] = useState<TerminalAlert | null>(null);

  const activeAlerts = terminal.alerts.filter((alert) => alert.active).length;

  return (
    <section
      data-testid="activity-panel"
      aria-labelledby="activity-panel-title"
      className="space-y-2"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
        <div className="min-w-0">
          <h2
            id="activity-panel-title"
            className="font-heading text-base font-semibold text-foreground"
          >
            Alertas y reseteos
          </h2>
          <p className="text-[11px] text-muted-foreground">
            {activeAlerts} activa(s) · {terminal.alerts.length} alerta(s) ·{" "}
            {terminal.resetHistory.length} reseteo(s)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => setIsNewAlertOpen(true)}
          >
            <PlusCircle className="h-3.5 w-3.5" />
            Nueva alerta
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => setIsResetOpen(true)}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Pedir reset
          </Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-3 text-xs text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          Sin alertas ni reseteos registrados.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[84px]">Tipo</TableHead>
                <TableHead className="w-[104px]">Estado</TableHead>
                <TableHead>Detalle</TableHead>
                <TableHead className="w-[110px]">Operador</TableHead>
                <TableHead className="w-[116px]">Fecha</TableHead>
                <TableHead className="w-[76px] text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {rows.map((row) => {
                const isExpanded = expandedId === row.id;
                const detailId = `activity-detail-${row.id}`;

                return (
                  <React.Fragment key={`${row.kind}-${row.id}`}>
                    <TableRow>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="h-5 gap-1 border-border px-1.5 text-[11px] font-medium text-foreground"
                        >
                          {row.kind === "alert" ? (
                            <TriangleAlert className="h-3 w-3 text-amber-600" />
                          ) : (
                            <ShieldAlert className="h-3 w-3 text-blue-600" />
                          )}
                          {row.kind === "alert" ? "Alerta" : "Reseteo"}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant="outline"
                          className="h-5 gap-1.5 border-border px-1.5 text-[11px] font-medium text-foreground"
                        >
                          <span
                            className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              STATUS_DOT[row.status],
                            )}
                            aria-hidden="true"
                          />
                          {row.status}
                        </Badge>
                      </TableCell>

                      <TableCell className="max-w-0">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedId(isExpanded ? null : row.id)
                          }
                          aria-expanded={isExpanded}
                          aria-controls={detailId}
                          className="flex w-full items-center gap-1.5 text-left"
                        >
                          <ChevronRight
                            className={cn(
                              "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform",
                              isExpanded && "rotate-90",
                            )}
                            aria-hidden="true"
                          />
                          <span className="truncate text-[13px] font-medium text-foreground">
                            {row.title}
                          </span>
                        </button>
                      </TableCell>

                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {row.operator}
                      </TableCell>

                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {row.date}
                      </TableCell>

                      <TableCell className="text-right">
                        {row.kind === "alert" && row.status === "Activa" ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="xs"
                            className="h-7 px-2 text-[11px]"
                            onClick={() => {
                              const alert = terminal.alerts.find(
                                (item) => item.id === row.id,
                              );
                              if (alert) setClosingAlert(alert);
                            }}
                          >
                            Cerrar
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>

                    {isExpanded && (
                      <TableRow className="hover:bg-transparent">
                        <TableCell
                          id={detailId}
                          colSpan={6}
                          className="bg-muted/30 px-3 py-2 text-[12px] leading-relaxed text-foreground"
                        >
                          <p>{row.description}</p>
                          {row.resolution && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              Resolución: {row.resolution}
                            </p>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <NewAlertDialog
        open={isNewAlertOpen}
        onOpenChange={setIsNewAlertOpen}
        onSubmit={onAddAlert}
      />
      <RequestResetDialog
        open={isResetOpen}
        onOpenChange={setIsResetOpen}
        onSubmit={onRequestReset}
      />
      <CloseAlertDialog
        open={closingAlert !== null}
        alertTitle={closingAlert?.title ?? ""}
        onOpenChange={(open) => {
          if (!open) setClosingAlert(null);
        }}
        onConfirm={(resolution) => {
          if (closingAlert) onCloseAlert(closingAlert.id, resolution);
          setClosingAlert(null);
        }}
      />
    </section>
  );
}
```

- [ ] **Step 5: Correr el test y verlo pasar**

Run: `npx vitest run src/components/ActivityPanel.test.tsx`
Expected: `6 passed`.

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/table.tsx src/components/ActivityPanel.tsx src/components/ActivityPanel.test.tsx
git commit -m "feat(ui): tabla unificada de alertas y reseteos"
```

---

## Task 8: Componer la vista en `App.tsx`

**Files:**
- Modify: `src/App.tsx:3-17,45-71,242-295,380-422,485-514`
- Test: `src/test/AppTerminalLayout.test.tsx`

- [ ] **Step 1: Escribir el test que falla**

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
  userNt: "soporte.central",
  architecture: "x64-based PC",
  surveyDate: "25/10/2026",
  uptimeText: "3 day(s), 2 hour(s)",
  location: "Sede Central",
  costCenter: "CC 100",
  alerts: [],
  resetHistory: [],
};

async function renderLoadedApp() {
  const { container } = render(<App />);
  const input = screen.getByPlaceholderText(/buscar terminal o ip/i);

  fireEvent.change(input, { target: { value: "WS-CORP-100" } });
  fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

  await waitFor(() =>
    expect(screen.getByTestId("terminal-identity")).toBeInTheDocument(),
  );

  return { container, input };
}

describe("App terminal layout", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    (window as any).electronAPI = {
      checkStatus: vi
        .fn()
        .mockResolvedValue({ connected: true, mode: "sql", server: "srv" }),
      searchTerminal: vi.fn().mockResolvedValue({ source: "sql", data: terminal }),
      ping: vi.fn(),
      stopPing: vi.fn(),
      onPingData: vi.fn().mockReturnValue(() => {}),
      onPingEnd: vi.fn().mockReturnValue(() => {}),
    };
  });

  it("orders identity, console, details and activity", async () => {
    await renderLoadedApp();

    const ordered = [
      screen.getByTestId("terminal-identity"),
      screen.getByTestId("terminal-scroll-container"),
      screen.getByTestId("terminal-details"),
      screen.getByTestId("activity-panel"),
    ];

    for (let index = 0; index < ordered.length - 1; index += 1) {
      const relation = ordered[index].compareDocumentPosition(ordered[index + 1]);
      expect(relation & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });

  it("does not hijack the native context menu inside the search input", async () => {
    const { input } = await renderLoadedApp();

    fireEvent.contextMenu(input);

    expect(screen.queryByText("Copiar IP")).not.toBeInTheDocument();
  });

  it("keeps the operator context menu outside editable fields", async () => {
    await renderLoadedApp();

    fireEvent.contextMenu(screen.getByTestId("terminal-identity"));

    expect(screen.getByText("Copiar IP")).toBeInTheDocument();
  });

  it("does not disable text selection globally", async () => {
    const { container } = await renderLoadedApp();

    expect(container.firstChild).not.toHaveClass("select-none");
  });
});
```

- [ ] **Step 2: Correr el test y verlo fallar**

Run: `npx vitest run src/test/AppTerminalLayout.test.tsx`
Expected: FAIL en `Unable to find an element by: [data-testid="terminal-identity"]`.

- [ ] **Step 3: Actualizar imports y handler en `App.tsx`**

Reemplazar el bloque completo de imports (líneas 1-43) por:

```tsx
import React, { useState, useEffect, useRef } from "react";
import { ThemeProvider } from "./context/ThemeContext";
import { Topbar } from "./components/Topbar";
import { TerminalIdentity } from "./components/TerminalIdentity";
import { TerminalDetailsGrid } from "./components/TerminalDetailsGrid";
import { ActivityPanel } from "./components/ActivityPanel";
import {
  QuickActionsBar,
  ActionFeedbackState,
} from "./components/QuickActionsBar";
import {
  LivePingConsole,
  DiagnosticCommandEvent,
} from "./components/LivePingConsole";
import { OperatorContextMenu } from "./components/OperatorContextMenu";
import { SubnetScannerDrawer } from "./components/SubnetScannerDrawer";
import { SettingsModal } from "./components/SettingsModal";
import {
  getAllTerminals,
  addAlertToTerminal,
  closeAlertOnTerminal,
  requestResetOnTerminal,
} from "./services/terminalService";
import {
  checkBackendStatus,
  searchTerminalUnified,
  launchVncClient,
  launchMsraClient,
  probeRemoteStatus,
  launchSmartRemoteClient,
  RemoteProbeResult,
  openExternalUrl,
  BackendStatus,
  subscribeToAutofocusSearch,
  stopDiagnosticCommand,
  DiagnosticCommandType,
} from "./services/electronClient";
import { TerminalData } from "./types/terminal";
import { Search, SearchX, RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { Kbd } from "@/components/ui/kbd";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
```

Agregar el handler antes de `handleLaunchSmartRemote` (después de `handleCloseAlert`):

```tsx
  const handleRequestReset = (reason: string): void => {
    if (!terminal) return;
    const created = requestResetOnTerminal(terminal.pc, reason);
    setTerminal((prev) =>
      prev
        ? { ...prev, resetHistory: [created, ...prev.resetHistory] }
        : null,
    );
    toast.success("Solicitud de reseteo registrada", { description: reason });
  };
```

- [ ] **Step 4: Corregir el contexto y la selección en el contenedor raíz**

En el `<div>` raíz (alrededor de la línea 383), reemplazar:

```tsx
        onContextMenu={(e) => {
          e.preventDefault();
          setContextMenu({ x: e.clientX, y: e.clientY });
        }}
        className="h-screen w-screen overflow-hidden bg-background text-foreground flex flex-col font-sans select-none antialiased"
```

por:

```tsx
        onContextMenu={(e) => {
          const target = e.target as HTMLElement | null;
          if (target?.closest("input, textarea, [contenteditable='true']")) {
            return;
          }
          e.preventDefault();
          setContextMenu({ x: e.clientX, y: e.clientY });
        }}
        className="h-screen w-screen overflow-hidden bg-background text-foreground flex flex-col font-sans antialiased"
```

- [ ] **Step 5: Reemplazar el contenido de `<main>` para la terminal activa**

Reemplazar el bloque desde `{/* 1° Card Unificada ... */}` hasta el cierre de `<AlertsPanel ... />` por:

```tsx
              {/* 1° Identidad: hostname, IP, sede y usuario */}
              <TerminalIdentity terminal={terminal} />

              {/* 2° Consola interna de diagnóstico (ping automático y comandos de la quick bar) */}
              <LivePingConsole
                ip={terminal.ip}
                isPinging={isPinging}
                pingMode={pingMode}
                activeCommand={activeDiagnostic}
                onTogglePing={handleTogglePing}
                onPingComplete={() => setIsPinging(false)}
                onStopCommand={() => {
                  setActiveDiagnostic(null);
                  stopDiagnosticCommand().catch(() => {});
                }}
              />

              {/* 3° Datos restantes del equipo en grilla */}
              <TerminalDetailsGrid terminal={terminal} />

              {/* 4° Alertas y reseteos unificados */}
              <ActivityPanel
                terminal={terminal}
                onAddAlert={handleAddAlert}
                onCloseAlert={handleCloseAlert}
                onRequestReset={handleRequestReset}
              />
```

- [ ] **Step 6: Correr el test nuevo y el de estado inicial**

Run: `npx vitest run src/test/AppTerminalLayout.test.tsx src/test/AppInitialState.test.tsx`
Expected: `6 passed` (4 + 2).

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx src/test/AppTerminalLayout.test.tsx
git commit -m "feat(app): reordenar identidad, consola, grilla y actividad"
```

---

## Task 9: Eliminar los paneles reemplazados y actualizar tests

**Files:**
- Delete: `src/components/TerminalTechnicalCard.tsx`
- Delete: `src/components/AlertsPanel.tsx`
- Delete: `src/components/ResetUptimePanel.tsx`
- Delete: `src/components/AlertsResetPanels.test.tsx`
- Delete: `src/test/AlertsTableReorder.test.tsx`
- Modify: `src/test/EmptyFieldsAndDrawerPolish.test.tsx`
- Modify: `src/test/TechnicalCardDrag.test.tsx`

- [ ] **Step 1: Confirmar que ya nadie los importa**

Run: `Get-ChildItem src -Recurse -Include *.tsx | Select-String -Pattern "TerminalTechnicalCard|AlertsPanel|ResetUptimePanel"`
Expected: solo coincidencias en los archivos que se eliminan/actualizan en esta tarea.

- [ ] **Step 2: Borrar los componentes y sus tests obsoletos**

```bash
git rm src/components/TerminalTechnicalCard.tsx src/components/AlertsPanel.tsx src/components/ResetUptimePanel.tsx
git rm src/components/AlertsResetPanels.test.tsx src/test/AlertsTableReorder.test.tsx
```

- [ ] **Step 3: Reescribir `EmptyFieldsAndDrawerPolish.test.tsx`**

```tsx
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TerminalIdentity } from '../components/TerminalIdentity';
import { TerminalDetailsGrid } from '../components/TerminalDetailsGrid';
import { SubnetScannerDrawer } from '../components/SubnetScannerDrawer';
import { TerminalData } from '../types/terminal';

const mockTerminalWithMissingFields: TerminalData = {
  pc: 'SUC99-TEST',
  ip: '192.0.2.200',
  mac: '',
  os: 'Windows 10',
  servicePack: '',
  cpuModel: '',
  ram: '',
  antivirusVersion: '',
  ieVersion: '',
  userNt: '',
  architecture: '',
  surveyDate: '',
  location: '',
  costCenter: '',
  alerts: [],
  resetHistory: [],
  uptimeText: '1 día',
};

describe('Terminal identity, details grid & SubnetScannerDrawer polish', () => {
  it('falls back gracefully for empty fields without blank values', () => {
    render(
      <>
        <TerminalIdentity terminal={mockTerminalWithMissingFields} />
        <TerminalDetailsGrid terminal={mockTerminalWithMissingFields} />
      </>,
    );

    expect(screen.getAllByText('No informado').length).toBeGreaterThanOrEqual(6);
    expect(screen.getAllByText('No especificado').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Sede no especificada')).toBeInTheDocument();
    expect(screen.getByText('Sin sesión')).toBeInTheDocument();
  });

  it('renders SubnetScannerDrawer with backdrop', () => {
    const { container } = render(
      <SubnetScannerDrawer
        isOpen={true}
        onClose={vi.fn()}
        targetIp="192.0.2.200"
        onSelectTerminal={vi.fn()}
        onLaunchVnc={vi.fn()}
      />,
    );

    expect(container.querySelector('aside')).not.toBeNull();
    expect(container.querySelector('.fixed.inset-0.z-50')).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Reescribir el segundo test de `TechnicalCardDrag.test.tsx`**

Mantener el test de la barra arrastrable y reemplazar el bloque `it('renders TerminalTechnicalCard ...')` por:

```tsx
  it('renders identity and details with one-click copy for IP and MAC', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(
      <>
        <TerminalIdentity terminal={terminal} />
        <TerminalDetailsGrid terminal={terminal} />
      </>,
    );

    expect(screen.getByText(terminal.os)).toBeInTheDocument();
    expect(screen.getByText(terminal.ram)).toBeInTheDocument();
    expect(screen.getByText(terminal.ip)).toBeInTheDocument();
    expect(screen.getByText(terminal.mac)).toBeInTheDocument();
    expect(screen.getByText(terminal.location as string)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Copiar IP' }));
    fireEvent.click(screen.getByRole('button', { name: 'Copiar MAC' }));

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith(terminal.ip);
      expect(writeTextMock).toHaveBeenCalledWith(terminal.mac);
    });
  });
```

y actualizar el import:

```tsx
import { TerminalIdentity } from '../components/TerminalIdentity';
import { TerminalDetailsGrid } from '../components/TerminalDetailsGrid';
```

- [ ] **Step 5: Correr toda la suite**

Run: `npm test`
Expected: todos los tests pasan; no debe quedar ningún `FAIL`.

- [ ] **Step 6: Commit**

```bash
git add src/test/EmptyFieldsAndDrawerPolish.test.tsx src/test/TechnicalCardDrag.test.tsx
git commit -m "refactor(ui): retirar ficha y paneles reemplazados por identidad, grilla y actividad"
```

---

## Task 10: Verificación final

**Files:** ninguno (solo verificación).

- [ ] **Step 1: Suite completa**

Run: `npm test`
Expected: `Test Files  ... passed` sin fallas.

- [ ] **Step 2: Gate de contraste**

Run: `npm run audit:contrast`
Expected: `Texto: 0 par(es) bajo 4.5:1` y exit 0.

- [ ] **Step 3: Build de producción**

Run: `npm run build`
Expected: `✓ built in ...`.

- [ ] **Step 4: Verificación manual en la app**

Run: `npm run electron:dev`

Comprobar en 1020×680:

1. Al buscar `WS-DEMO-002`: identidad arriba, consola completa, grilla de 3 columnas, tabla con una alerta activa.
2. `Nueva alerta` abre diálogo, registra y la fila aparece arriba con estado `Activa`.
3. `Pedir reset` abre diálogo, registra y la fila aparece como `Pendiente`.
4. `Cerrar` pide resolución y la fila pasa a `Cerrada` al confirmar.
5. Clic derecho dentro del buscador: aparece el menú nativo (pegable). Clic derecho en el fondo: menú de operador.
6. Los valores IP/MAC se copian desde botones de 24 px.
7. La consola sigue ejecutando Ping, `-t`, `Nbtstat`, `Tracert` y `ARP` desde la quick bar sin cambios.

- [ ] **Step 5: Commit final (si hubo ajustes)**

```bash
git add -u
git commit -m "chore(ui): ajustes de verificación final"
```

---

## Cobertura del pedido

| Requisito | Tarea |
|---|---|
| Identidad después de `QuickActionsBar` | 3, 8 |
| Consola intacta entre identidad y grilla | 8 |
| Grilla de datos restantes después de la consola | 4, 8 |
| Tabla única de alertas + reseteos | 7 |
| Dos CTAs en el header de la sección | 7 |
| Reset registrado en el historial | 5, 8 |
| Sin tabs | No hay tarea que los agregue |
| `Topbar.tsx` / `QuickActionsBar.tsx` intactos | No se tocan en ninguna tarea |
| Contraste AA en lo nuevo | 1, 7 |
| Targets de 24 px | 2, 3, 4 |
| Copiar/pegar en buscador | 8 |
| Compacto y legible | 3, 4, 7 |

## Fuera de alcance (deuda registrada, no ejecutar acá)

- Colapsar o redimensionar `LivePingConsole` (decisión del usuario).
- Quitar el toast duplicado de `QuickActionsBar` (archivo congelado).
- Borrar `HardwareCard`, `NetworkAdCard` y `Sidebar` (PR aparte).
- Subir bordes a 3:1 (decisión estética; el gate los reporta pero no falla).
- Recuperación del estado "terminal no encontrada" y skeletons de carga.
- Encoding del `SubnetScannerDrawer`.
