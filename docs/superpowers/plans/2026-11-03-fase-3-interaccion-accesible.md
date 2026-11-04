# Fase 3 — Interacción accesible · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** reemplazar los cuatro overlays hechos a mano (buscador, menú contextual, drawer de subred, cierre de alerta) y los controles con estado manual (modo de ping, barras de progreso, 24 `title=` nativos) por las primitivas Radix ya instaladas, sin cambiar el tema ni el flujo del operador.

**Architecture:** cada task cambia un componente y sus tests, en orden de dependencia: primero la infraestructura de tooltips (`Hint`), después el buscador (`Command` + `Popover` + `InputGroup`), el menú (`ContextMenu`), el drawer (`Sheet`) con su `Progress`, los ajustes (`Progress` + `Switch` + `ToggleGroup`), el cierre de alerta (`AlertDialog`) y al final el `eject` del CLI. Ninguna task toca tokens, tipografía ni navegación; el ratchet de `designContract.test.ts` se mantiene en **0/0/0/4** y `--strict` sigue en 0.

**Tech Stack:** React 19 · Vite 6 · TypeScript 5.7 · Tailwind 4 · `radix-ui@1.8.1` · `cmdk` (vía `ui/command`) · shadcn 4.23.0 (pin, devDependency) · Vitest 3 + Testing Library · Electron 34.

**Prerrequisito:** `main` en `8dbd0a3`. Estado medido: 368 tests verdes, build verde, `audit:contrast` y `--strict` en exit 0, ratchet 0/0/0/4, 27 primitivas en `src/components/ui/`, `DESIGN.md` en la raíz.

**Fuera de alcance:** `ScrollArea` (el audit lo marca opcional) · `Sidebar`/`HardwareCard`/`NetworkAdCard` (Fase 4) · escala tipográfica (Fase 5) · `--info` y los tokens oscurecidos (pendiente de sign-off de producto) · `Base UI` (prohibido).

---

## Estado de partida (medido)

| Hecho | Valor | Evidencia |
|---|---|---|
| Suite | **368** tests en 64 archivos | `npx vitest run` |
| Ratchet | paleta 0 · sombras 0 · radios pelados 0 · `z-50` 4 | `src/test/designContract.test.ts` |
| `title=` nativos en componentes | **24** (13 en `Topbar`+`QuickActionsBar`+`LivePingConsole`, 5 en `SubnetScannerDrawer`, 6 en `Topbar`) | `Select-String -Pattern '\btitle=\{?"'` |
| Buscador | listbox propio de 103 líneas, `aria-selected` ausente, fila activa sin fondo en claro | `Topbar.tsx:243-386` |
| Menú contextual | `div fixed z-50` + `mousedown` fuera + `Escape` a mano, sin `role="menu"` | `OperatorContextMenu.tsx:45-84` |
| Drawer | `aside` con backdrop propio, sin focus trap ni `aria-modal` | `SubnetScannerDrawer.tsx:148-160` |
| Cierre de alerta | `Dialog` (no `AlertDialog`) con formulario | `ActivityDialogs.tsx:276-323` |
| Modo de ping | 2 `Button` con `variant` manual | `SettingsModal.tsx:440-463` |
| Barras de progreso | `div` + `style={{ width }}` en 2 lugares | `SettingsModal.tsx:277-282`, `SubnetScannerDrawer.tsx:209-216` |
| Checkboxes | `<input type="checkbox">` nativo teñido con `accent-link` | `SettingsModal.tsx:391-407`, `414-431` |

---

## File Structure

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `src/components/Hint.tsx` | crear | `Tooltip` de una línea: `label` + un único hijo interactivo |
| `src/test/Hint.test.tsx` | crear | Contrato de `aria-describedby` y contenido del tooltip |
| `src/components/Topbar.tsx` | modificar | `InputGroup` + `Popover` + `Command` para el buscador; `title=` → `Hint` |
| `src/components/QuickActionsBar.tsx` | modificar | `title=` → `Hint` |
| `src/components/LivePingConsole.tsx` | modificar | `title=` → `Hint` |
| `src/components/OperatorContextMenu.tsx` | modificar | pasa a `ContextMenuContent` sin posicionamiento propio |
| `src/App.tsx` | modificar | `ContextMenu` + `ContextMenuTrigger asChild` sobre `<main>`; se borra el estado `contextMenu` |
| `src/components/SubnetScannerDrawer.tsx` | modificar | `Sheet` + `Progress`; `title=` → `Hint` |
| `src/components/SettingsModal.tsx` | modificar | `Progress` de descarga · `Switch` en los 2 checks · `ToggleGroup` del modo de ping |
| `src/components/ActivityDialogs.tsx` | modificar | `CloseAlertDialog` pasa a `AlertDialog` |
| `src/test/TopbarSearchNavigation.test.tsx` | modificar | semántica de `listbox`/`option` y navegación |
| `src/test/OperatorContextMenu.test.tsx` | modificar | menú Radix (roles, teclado, `aria-label`s) |
| `src/test/SubnetScannerDrawer.test.tsx` | modificar | drawer como `dialog` con `SheetTitle` |
| `src/test/SettingsModal.test.tsx` | modificar | `Switch` y `ToggleGroup` |
| `src/test/ActivityDialogs.test.tsx` | modificar | `AlertDialog` de cierre |
| `src/test/AppTerminalLayout.test.tsx` | modificar | menú contextual dentro de `<main>`, no en el buscador |
| `src/test/shadcnConfig.test.ts` | modificar | tras `eject`, sin dependencia `shadcn` |
| `src/test/ShadcnPreset.test.tsx` | modificar | tras `eject`, sin `@import "shadcn/tailwind.css"` |
| `DESIGN.md` | modificar | estándares de overlays, tooltips y controles |
| `docs/ui-slop-audit-2026-11-02.md` | modificar | estado de Fase 3 |

---

### Task 0: Rama y baseline

**Files:** ninguno.

- [ ] **Step 1: Verificar limpio y crear rama**

```bash
git status --porcelain
git switch -c feat/fase-3-interaccion
```

Expected: sólo `M electron/main.cjs` (ajeno; no se toca). La rama nace de `8dbd0a3`.

- [ ] **Step 2: Anotar el punto de partida**

```bash
npx vitest run
npm run build
node scripts/check-contrast.mjs --strict
```

Expected: **368** tests · build verde · contraste exit 0 con `Texto: 0 · UI: 3 · Tokens ausentes: 0`. Anotar los tres: son la línea base.

---

### Task 1: `Hint` (Tooltip) y barrido de los 24 `title=`

**Files:**
- Create: `src/components/Hint.tsx`
- Test: `src/test/Hint.test.tsx`
- Modify: `src/components/Topbar.tsx`, `src/components/QuickActionsBar.tsx`, `src/components/LivePingConsole.tsx`, `src/components/SubnetScannerDrawer.tsx`

`main.tsx` ya monta `<TooltipProvider delayDuration={0}>`, así que `Hint` no necesita provider propio.

- [ ] **Step 1: Test que falla**

```tsx
// src/test/Hint.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Hint } from "../components/Hint";

function renderHint(): HTMLButtonElement {
  render(
    <TooltipProvider delayDuration={0}>
      <Hint label="Copiar logs completos">
        <button type="button" aria-label="Copiar logs">Copiar</button>
      </Hint>
    </TooltipProvider>,
  );
  return screen.getByRole("button", { name: "Copiar logs" });
}

describe("Hint", () => {
  it("no reemplaza el nombre accesible y agrega la ayuda como descripción", async () => {
    const button = renderHint();
    expect(button).toHaveAccessibleName("Copiar logs");

    fireEvent.focus(button);
    const tooltip = await screen.findByRole("tooltip");
    expect(tooltip).toHaveTextContent("Copiar logs completos");
    expect(button).toHaveAttribute(
      "aria-describedby",
      tooltip.getAttribute("id") ?? "",
    );
  });

  it("cierra el tooltip al salir con el foco", async () => {
    const button = renderHint();
    fireEvent.focus(button);
    await screen.findByRole("tooltip");
    fireEvent.blur(button);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });
});
```

- [ ] **Step 2: Rojo**

Run: `npx vitest run src/test/Hint.test.tsx`
Expected: FAIL — no existe `../components/Hint`.

- [ ] **Step 3: Implementar `Hint`**

```tsx
// src/components/Hint.tsx
import React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface HintProps {
  /** Texto de ayuda; nunca reemplaza al `aria-label` del hijo. */
  label: string;
  children: React.ReactElement;
}

/**
 * Tooltip de una línea para controles que hoy usan `title=`.
 * El `aria-label` del hijo se conserva como nombre accesible y Radix agrega
 * el contenido como `aria-describedby`.
 */
export function Hint({ label, children }: HintProps): React.JSX.Element {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
```

- [ ] **Step 4: Verde**

Run: `npx vitest run src/test/Hint.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Reemplazar los `title=` de botones por `Hint`**

Regla: **sólo** se convierten `title` de elementos interactivos (`Button`, `<button>`). Se **conservan** los `title` de superficies informativas (`div` del chip de uptime, `Badge` de conexión, `Card` de host), porque un tooltip necesita un trigger enfocable.

Archivos y reemplazos (quitar el `title=` del hijo y envolver):

```tsx
// Antes
<Button … title="Copiar logs completos al portapapeles">…</Button>

// Después
<Hint label="Copiar logs completos al portapapeles">
  <Button …>…</Button>
</Hint>
```

Lista exacta (24):

| Archivo | Línea aprox. | Texto del `title` |
|---|---|---|
| `LivePingConsole.tsx` | 325 | `Volver a ejecutar net user` |
| `LivePingConsole.tsx` | 342 | `Limpiar pantalla de logs` |
| `LivePingConsole.tsx` | 360 | `Copiar únicamente el último comando y su respuesta al portapapeles` |
| `LivePingConsole.tsx` | 382 | `Copiar logs completos al portapapeles` |
| `QuickActionsBar.tsx` | 161 | `Conectar automáticamente según puertos disponibles (Atajo F2)` |
| `QuickActionsBar.tsx` | 179 | `Opciones manuales y estado de puertos` |
| `QuickActionsBar.tsx` | 294 | `Iniciar Ping estándar (4 paquetes) (Atajo F4)` |
| `QuickActionsBar.tsx` | 321 | `Ejecutar Ping infinito / continuo (-t)` |
| `QuickActionsBar.tsx` | 400 | `Más acciones` |
| `QuickActionsBar.tsx` | 489 | `Escanear toda la subred de esta terminal` |
| `QuickActionsBar.tsx` | 505 | `Refrescar tiempo de actividad` |
| `SubnetScannerDrawer.tsx` | 304 | `Conexión remota rápida (VNC / MSRA)` |
| `SubnetScannerDrawer.tsx` | 332 | `Pausar escaneo de subred` |
| `SubnetScannerDrawer.tsx` | 344 | `Reiniciar escaneo desde el inicio` |
| `SubnetScannerDrawer.tsx` | 354 | `Reanudar escaneo de subred` |
| `SubnetScannerDrawer.tsx` | 366 | `Volver a escanear toda la subred` |
| `Topbar.tsx` | 275 | `Buscar terminal, IP o usuario (o Enter)` |
| `Topbar.tsx` | 374 | `Quitar del historial` |
| `Topbar.tsx` | 362 | `Lanzar VNC Viewer a <item>` |
| `Topbar.tsx` | 420 | `Ir a Portal MDA (Inventario de Terminales en la red corporativa)` |
| `Topbar.tsx` | 434 | `Configuración y Actualizaciones (Atajo F10)` |
| `Topbar.tsx` | 447 | `Información y características del aplicativo` |
| `Topbar.tsx` | 465 | `Minimizar a barra de tareas` |
| `Topbar.tsx` | 478 | `Ocultar en bandeja del sistema (Turn Off)` |

Import en cada archivo: `import { Hint } from "./Hint";` (o `@/components/Hint`).

Cuidado con los `title` interpolados: `title={`Lanzar VNC Viewer a ${item.value}`}` pasa a `<Hint label={`Lanzar VNC Viewer a ${item.value}`}>`.

- [ ] **Step 6: Verificar que no quedan `title=` en interactivos**

```powershell
Select-String -Path src\components\*.tsx -Pattern 'title=' | Where-Object { $_.Filename -notmatch 'test' }
```

Expected: sólo quedan informativos y los dos que migran más adelante:
- `QuickActionsBar.tsx` chip de uptime (superficie informativa, se conserva).
- `Topbar.tsx` badge de conexión (superficie informativa, se conserva).
- `Topbar.tsx` botón de VNC por fila: lo reemplaza el bloque nuevo de Task 2 (que lo envuelve en `Hint`).
- `SubnetScannerDrawer.tsx` botón "Consultar terminal": lo envuelve `Hint` el código nuevo de Task 4.

- [ ] **Step 7: Suite y commit**

```bash
npx vitest run src/test/Hint.test.tsx src/test/TopbarSearchNavigation.test.tsx src/test/QuickActionsBar.test.tsx src/test/LivePingConsole.test.tsx
npm test
git add src/components/Hint.tsx src/test/Hint.test.tsx src/components/Topbar.tsx src/components/QuickActionsBar.tsx src/components/LivePingConsole.tsx src/components/SubnetScannerDrawer.tsx
git commit -m "feat(ui): tooltips en lugar de title en los controles"
```

---

### Task 2: Buscador con `InputGroup` + `Popover` + `Command`

**Files:**
- Modify: `src/components/Topbar.tsx:243-386`
- Test: `src/test/TopbarSearchNavigation.test.tsx` (adaptar y ampliar)

El listbox propio se reemplaza por `InputGroup` (input + botón + `Kbd`), `Popover` (panel anclado al input, sin robar foco) y `Command` en modo controlado (roles `listbox`/`option`, `aria-selected`, teclado de cmdk). La navegación con flechas sigue siendo nuestra porque el input vive fuera del `Command`.

- [ ] **Step 1: Test que falla (semántica de opciones)**

```tsx
// agregar a src/test/TopbarSearchNavigation.test.tsx
// (si el archivo no lo tiene, agregar `within` al import de @testing-library/react)
it("expone el historial como listbox con opción activa y aria-selected", async () => {
  render(
    <Topbar onSelectTerminal={vi.fn()} onSelectAccount={vi.fn()} />,
  );

  const input = screen.getByRole("combobox", { name: /buscar terminal/i });
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: "" } });

  const listbox = await screen.findByRole("listbox");
  expect(listbox).toBeInTheDocument();

  const options = within(listbox).getAllByRole("option");
  expect(options.length).toBeGreaterThan(0);

  fireEvent.keyDown(input, { key: "ArrowDown" });
  const active = within(listbox).getAllByRole("option")[0];
  expect(active).toHaveAttribute("aria-selected", "true");
  expect(active).toHaveAttribute("data-selected", "true");
});
```

- [ ] **Step 2: Rojo**

Run: `npx vitest run src/test/TopbarSearchNavigation.test.tsx -t "listbox"`
Expected: FAIL — no hay `role="listbox"` ni `role="combobox"`.

- [ ] **Step 3: Reescribir el bloque del buscador**

Reemplazar el bloque `{/* Buscador Rápido Centralizado */}` completo (desde `<div className="relative flex-1 max-w-md app-no-drag">` hasta el cierre antes de `{/* Indicadores de Estado… */}`) por:

```tsx
{/* Buscador Rápido Centralizado */}
<div className="relative flex-1 max-w-md app-no-drag">
  <Popover open={isOpen} onOpenChange={setIsOpen}>
    <PopoverAnchor asChild>
      <InputGroup className="h-10 border-input bg-muted/70">
        <InputGroupAddon>
          <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        </InputGroupAddon>
        <InputGroupInput
          ref={inputRef}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveValue("");
            setIsOpen(true);
          }}
          onFocus={() => {
            if (recentSearches.length > 0 || query.trim()) {
              setIsOpen(true);
            }
          }}
          onKeyDown={handleKeyDownInput}
          placeholder="Buscar terminal, IP o usuario"
          aria-label="Buscar terminal, IP o usuario"
          aria-expanded={isOpen}
          aria-controls="terminal-search-list"
          className="font-mono text-xs md:text-sm"
        />
        <InputGroupAddon align="inline-end">
          <span className="hidden items-center gap-1 md:flex">
            <Kbd>Ctrl</Kbd>+<Kbd>F</Kbd>
          </span>
          <InputGroupButton
            size="icon-xs"
            onClick={() => query.trim() && handleSubmit(query.trim())}
            disabled={!query.trim()}
            aria-label="Buscar terminal, IP o usuario"
          >
            <Search className="h-4 w-4" />
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </PopoverAnchor>

    <PopoverContent
      align="start"
      sideOffset={4}
      className="w-[var(--radix-popover-trigger-width)] p-0"
      onOpenAutoFocus={(event) => event.preventDefault()}
    >
      <Command
        shouldFilter={false}
        value={activeValue}
        onValueChange={setActiveValue}
        className="rounded-none bg-transparent p-1"
      >
        <CommandList id="terminal-search-list">
          <CommandEmpty>Sin coincidencias en el historial.</CommandEmpty>
          <CommandGroup
            heading={
              query.trim()
                ? `Coincidencias (${filteredMatches.length})`
                : "Búsquedas recientes"
            }
          >
            {filteredMatches.map((item) => {
              const isAccount = item.kind === "account";
              return (
                <div
                  key={item.value}
                  className="flex items-center gap-1 rounded-sm px-1"
                >
                  <CommandItem
                    value={item.value}
                    onSelect={() => handleActivate(item)}
                    className="flex min-w-0 flex-1 items-center gap-2 px-1.5 py-1.5 data-[selected=true]:bg-muted"
                  >
                    {isAccount ? (
                      <UserRound className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    ) : (
                      <Monitor className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    )}
                    <span className="truncate font-mono text-xs font-semibold">
                      {item.value}
                    </span>
                    <span className="ml-auto text-[10px] text-muted-foreground">
                      {isAccount ? "cuenta" : "equipo"}
                    </span>
                  </CommandItem>

                  <div className="flex shrink-0 items-center gap-1">
                    {!isAccount && onDirectVnc && (
                      <Hint label={`Lanzar VNC Viewer a ${item.value}`}>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={(event) => {
                            event.stopPropagation();
                            setRecentSearches(
                              saveRecentSearch(item.value, "terminal"),
                            );
                            onDirectVnc(item.value);
                            setIsOpen(false);
                          }}
                          aria-label={`Conectar VNC a ${item.value}`}
                          className="bg-primary/10 text-link hover:bg-primary/20"
                        >
                          <MonitorPlay className="h-3 w-3" />
                        </Button>
                      </Hint>
                    )}
                    <Hint label="Quitar del historial">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={(event) => {
                          event.stopPropagation();
                          setRecentSearches(removeRecentSearch(item.value));
                        }}
                        aria-label={`Quitar ${item.value} del historial`}
                        className="h-5 w-5 text-muted-foreground opacity-60 hover:text-destructive hover:opacity-100"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Hint>
                  </div>
                </div>
              );
            })}
          </CommandGroup>
        </CommandList>
      </Command>
    </PopoverContent>
  </Popover>
</div>
```

Notas de implementación:
- `PopoverContent` trae `bg-popover` y `shadow-md` de la primitiva: no se agrega elevación propia.
- `CommandItem` **no** envuelve a los botones de acción: quedan como hermanos dentro del `div`, así no hay interactivos anidados dentro de una `option`.
- `onDirectPing` no se usa en esta UI (queda como prop heredada; no tocar).

- [ ] **Step 4: Reemplazar la navegación manual por `Command` controlado**

En el cuerpo del componente, reemplazar `selectedIndex` por `activeValue`:

```tsx
const [activeValue, setActiveValue] = useState<string>("");
```

Y la nueva navegación:

```tsx
const handleKeyDownInput = (
  event: React.KeyboardEvent<HTMLInputElement>,
): void => {
  if (!isOpen || filteredMatches.length === 0) {
    if (event.key === "Enter" && query.trim()) {
      event.preventDefault();
      handleSubmit(query.trim());
    }
    return;
  }

  const currentIndex = filteredMatches.findIndex(
    (item) => item.value === activeValue,
  );

  if (event.key === "ArrowDown") {
    event.preventDefault();
    const next = (currentIndex + 1) % filteredMatches.length;
    setActiveValue(filteredMatches[next].value);
    return;
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();
    const previous =
      currentIndex <= 0 ? filteredMatches.length - 1 : currentIndex - 1;
    setActiveValue(filteredMatches[previous].value);
    return;
  }

  if (event.key === "Enter") {
    event.preventDefault();
    const active = filteredMatches.find((item) => item.value === activeValue);
    if (active) {
      handleActivate(active);
    } else if (query.trim()) {
      handleSubmit(query.trim());
    }
  }
};
```

Eliminar además:
- `const [selectedIndex, setSelectedIndex] = useState<number>(-1);` y todo `setSelectedIndex(...)` (incluido el de `commitSearch`).
- `const dropdownRef = useRef<HTMLDivElement>(null);` y el `useEffect` de click-outside (lo reemplaza el `Popover`).
- `onMouseEnter={() => setSelectedIndex(index)}` (cmdk maneja el hover).

`commitSearch` queda:

```tsx
const commitSearch = (value: string, kind: RecentSearch["kind"]): void => {
  const clean = value.trim();
  if (!clean) return;

  setRecentSearches(saveRecentSearch(clean, kind));
  if (kind === "account") {
    onSelectAccount?.(clean);
  } else {
    onSelectTerminal(clean);
  }
  setQuery("");
  setActiveValue("");
  setIsOpen(false);
};
```

- [ ] **Step 5: Imports nuevos**

```tsx
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
```

Quitar `Input` del import de `@/components/ui/input` si queda sin uso.

- [ ] **Step 6: Verde y adaptación de tests existentes**

```bash
npx vitest run src/test/TopbarSearchNavigation.test.tsx src/test/AppTerminalLayout.test.tsx src/test/AppInitialState.test.tsx
```

Expected: el test nuevo pasa. Los existentes que hacían `getByPlaceholderText(/buscar terminal/i)` y `fireEvent.change` deben seguir funcionando; si alguno usaba el listbox por clase o `textContent` de un `<li>`, se adapta a `getByRole("option", { name: /<valor>/i })` — nunca se borra una aserción, se reescribe sobre la nueva semántica.

- [ ] **Step 7: Suite y commit**

```bash
npm test
git add src/components/Topbar.tsx src/test/TopbarSearchNavigation.test.tsx src/test/AppTerminalLayout.test.tsx src/test/AppInitialState.test.tsx
git commit -m "refactor(search): buscador con Popover, Command e InputGroup"
```

---

### Task 3: Menú contextual con `ContextMenu`

**Files:**
- Modify: `src/components/OperatorContextMenu.tsx` (contenido del menú, sin posicionamiento)
- Modify: `src/App.tsx` (`ContextMenu` + `ContextMenuTrigger asChild` sobre `<main>`; se borra el estado `contextMenu`)
- Test: `src/test/OperatorContextMenu.test.tsx`, `src/test/AppTerminalLayout.test.tsx`

Radix `ContextMenu` posiciona en el puntero y maneja foco, flechas y `Escape`. El menú se ancla a `<main>` (no al documento) para que el buscador y los inputs conserven el menú nativo.

- [ ] **Step 1: Test que falla**

```tsx
// reemplazar el cuerpo de src/test/OperatorContextMenu.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import {
  ContextMenu,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { OperatorContextMenu } from "../components/OperatorContextMenu";
import { getAllTerminals } from "../services/terminalService";

function renderMenu(): void {
  const terminal = getAllTerminals()[0];
  render(
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <main data-testid="menu-surface">contenido</main>
      </ContextMenuTrigger>
      <OperatorContextMenu
        terminal={terminal}
        isPinging={false}
        onLaunchVnc={vi.fn()}
        onTogglePing={vi.fn()}
        onLaunchMsra={vi.fn()}
        onOpenPortalMda={vi.fn()}
        onFocusSearch={vi.fn()}
        onQueryAccount={vi.fn()}
      />
    </ContextMenu>,
  );
  fireEvent.contextMenu(screen.getByTestId("menu-surface"));
}

describe("OperatorContextMenu", () => {
  it("se abre como menu con las acciones del operador", async () => {
    renderMenu();

    const menu = await screen.findByRole("menu");
    expect(menu).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: /conectar vnc viewer/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: /copiar ip/i }),
    ).toBeInTheDocument();
  });

  it("ejecuta la acción y cierra el menú", async () => {
    const onLaunchVnc = vi.fn();
    const terminal = getAllTerminals()[0];
    render(
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <main data-testid="menu-surface">contenido</main>
        </ContextMenuTrigger>
        <OperatorContextMenu
          terminal={terminal}
          isPinging={false}
          onLaunchVnc={onLaunchVnc}
          onTogglePing={vi.fn()}
          onLaunchMsra={vi.fn()}
          onOpenPortalMda={vi.fn()}
        />
      </ContextMenu>,
    );

    fireEvent.contextMenu(screen.getByTestId("menu-surface"));
    fireEvent.click(
      await screen.findByRole("menuitem", { name: /conectar vnc viewer/i }),
    );

    expect(onLaunchVnc).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).toBeNull();
  });
});
```

- [ ] **Step 2: Rojo**

Run: `npx vitest run src/test/OperatorContextMenu.test.tsx`
Expected: FAIL — `OperatorContextMenu` exige `x`, `y`, `onClose` y no renderiza `role="menu"`.

- [ ] **Step 3: Reescribir `OperatorContextMenu` como contenido**

Nuevo archivo completo (sin `useRef`, sin `useEffect`, sin `x`/`y`/`onClose`; Radix cierra solo):

```tsx
import React from "react";
import { TerminalData } from "../types/terminal";
import {
  MonitorPlay,
  Activity,
  HelpCircle,
  Copy,
  ExternalLink,
  Search,
  Users,
} from "lucide-react";
import { Kbd } from "@/components/ui/kbd";
import { splitUsernames } from "@/lib/usernames";
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
} from "@/components/ui/context-menu";

interface OperatorContextMenuProps {
  terminal?: TerminalData | null;
  isPinging: boolean;
  onLaunchVnc: () => void;
  onTogglePing: () => void;
  onLaunchMsra: () => void;
  onOpenPortalMda: () => void;
  onFocusSearch?: () => void;
  onQueryAccount?: () => void;
}

export function OperatorContextMenu({
  terminal,
  isPinging,
  onLaunchVnc,
  onTogglePing,
  onLaunchMsra,
  onOpenPortalMda,
  onFocusSearch,
  onQueryAccount,
}: OperatorContextMenuProps): React.JSX.Element {
  const copyText = async (text: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // sin portapapeles disponible: el menú se cierra igual
    }
  };

  if (!terminal) {
    return (
      <ContextMenuContent className="w-56">
        <ContextMenuItem onSelect={onOpenPortalMda} aria-label="Abrir Portal MDA">
          <ExternalLink className="h-3.5 w-3.5 text-link" />
          Abrir Portal MDA
        </ContextMenuItem>
      </ContextMenuContent>
    );
  }

  const accountCount = splitUsernames(terminal.userNt).length;

  return (
    <ContextMenuContent className="w-56">
      <ContextMenuLabel>Acciones · {terminal.pc}</ContextMenuLabel>
      <ContextMenuSeparator />

      <ContextMenuItem onSelect={onLaunchVnc} aria-label="Conectar VNC Viewer">
        <MonitorPlay className="h-3.5 w-3.5 text-link" />
        Conectar VNC
        <ContextMenuShortcut>F2</ContextMenuShortcut>
      </ContextMenuItem>
      <ContextMenuItem onSelect={onLaunchMsra} aria-label="Asistencia MSRA">
        <HelpCircle className="h-3.5 w-3.5 text-link" />
        Asistencia MSRA
        <ContextMenuShortcut>F3</ContextMenuShortcut>
      </ContextMenuItem>
      <ContextMenuItem
        onSelect={onTogglePing}
        aria-label={isPinging ? "Detener Ping" : "Iniciar Ping"}
      >
        <Activity
          className={`h-3.5 w-3.5 ${isPinging ? "text-destructive" : "text-success"}`}
        />
        {isPinging ? "Detener Ping" : "Iniciar Ping"}
        <ContextMenuShortcut>F4</ContextMenuShortcut>
      </ContextMenuItem>

      <ContextMenuSeparator />
      <ContextMenuItem
        onSelect={() => void copyText(terminal.ip)}
        aria-label="Copiar IP"
      >
        <Copy className="h-3.5 w-3.5 text-muted-foreground" />
        Copiar IP
      </ContextMenuItem>
      <ContextMenuItem
        onSelect={() => void copyText(terminal.pc)}
        aria-label="Copiar Hostname"
      >
        <Copy className="h-3.5 w-3.5 text-muted-foreground" />
        Copiar Hostname
      </ContextMenuItem>
      {accountCount > 0 && onQueryAccount && (
        <ContextMenuItem onSelect={onQueryAccount} aria-label="Ver cuenta AD">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          Ver cuenta AD
        </ContextMenuItem>
      )}

      <ContextMenuSeparator />
      <ContextMenuItem onSelect={onOpenPortalMda} aria-label="Abrir Portal MDA">
        <ExternalLink className="h-3.5 w-3.5 text-link" />
        Abrir Portal MDA
      </ContextMenuItem>
      {onFocusSearch && (
        <ContextMenuItem onSelect={onFocusSearch} aria-label="Buscar otra terminal">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          Buscar Terminal
          <ContextMenuShortcut>Ctrl+F</ContextMenuShortcut>
        </ContextMenuItem>
      )}
    </ContextMenuContent>
  );
}
```

`Kbd` deja de usarse dentro de las filas (`ContextMenuShortcut` lo reemplaza): quitar el import si queda sin uso.

- [ ] **Step 4: Envolver `<main>` en `App.tsx`**

Borrar el estado:

```tsx
const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
```

Borrar el handler del `div` raíz completo (las 9 líneas del `onContextMenu={(e) => { … }}` que hoy hacen `e.preventDefault()` y `setContextMenu({ x, y })`), y envolver el `<main>`. La edición es de tres inserciones y ningún cambio dentro del `<main>`:

1. Insertar `<ContextMenu>` y `<ContextMenuTrigger asChild>` **inmediatamente antes** de la línea que abre `<main`.
2. Insertar `</ContextMenuTrigger>` **inmediatamente después** de la línea que cierra `</main>`.
3. Insertar el bloque `<OperatorContextMenu … />` y cerrar `</ContextMenu>` después de ese `</ContextMenuTrigger>`.

El resultado queda así (las líneas marcadas `(+)` son las únicas nuevas; el contenido entre `<main>` y `</main>` no se toca):

```tsx
(+) <ContextMenu>
(+)   <ContextMenuTrigger asChild>
        <main
          ref={mainRef}
          className={
            isAccountView
              ? "flex-1 min-h-0 p-3.5 overflow-hidden flex flex-col"
              : cn(
                  "flex-1 p-3.5 overflow-y-auto space-y-4",
                  !terminal || isLoading ? "flex flex-col" : "block",
                )
          }
        >
          {/* todo el contenido actual de <main> queda igual */}
        </main>
(+)   </ContextMenuTrigger>
(+)
(+)   <OperatorContextMenu
(+)     terminal={terminal}
(+)     isPinging={isPinging}
(+)     onLaunchVnc={() => handleLaunchVnc()}
(+)     onTogglePing={handleTogglePing}
(+)     onLaunchMsra={() => handleLaunchMsra()}
(+)     onOpenPortalMda={() =>
(+)       openExternalUrl("https://mda.correo.local/inventario-terminales")
(+)     }
(+)     onQueryAccount={handleQueryAccount}
(+)   />
(+) </ContextMenu>
```

Imports en `App.tsx`:

```tsx
import {
  ContextMenu,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
```

- [ ] **Step 5: Verde**

```bash
npx vitest run src/test/OperatorContextMenu.test.tsx src/test/AppTerminalLayout.test.tsx
```

Expected: PASS. `AppTerminalLayout` ya dispara `contextMenu` sobre `terminal-identity` (dentro de `<main>`) y verifica que **no** se abre en el buscador; ambas aserciones deben seguir verdes sin cambios.

- [ ] **Step 6: Suite y commit**

```bash
npm test
git add src/components/OperatorContextMenu.tsx src/App.tsx src/test/OperatorContextMenu.test.tsx src/test/AppTerminalLayout.test.tsx
git commit -m "refactor(menu): menu contextual con ContextMenu de Radix"
```

---

### Task 4: Drawer de subred con `Sheet` y `Progress`

**Files:**
- Modify: `src/components/SubnetScannerDrawer.tsx`
- Test: `src/test/SubnetScannerDrawer.test.tsx`

- [ ] **Step 1: Tests que fallan**

```tsx
// agregar a src/test/SubnetScannerDrawer.test.tsx
it("se expone como dialog con título y descripción accesibles", () => {
  vi.spyOn(electronClient, "startSubnetScanner").mockImplementation(
    () => vi.fn(),
  );

  render(
    <SubnetScannerDrawer
      isOpen
      onClose={vi.fn()}
      targetIp="192.0.2.50"
      onSelectTerminal={vi.fn()}
      onLaunchRemote={vi.fn()}
    />,
  );

  const dialog = screen.getByRole("dialog");
  expect(dialog).toHaveAccessibleName("Escáner de Subred");
  expect(screen.getByPlaceholderText(/filtrar equipos/i)).toBeInTheDocument();
});

it("la barra de progreso expone aria-valuenow", () => {
  vi.spyOn(electronClient, "startSubnetScanner").mockImplementation(
    (_targetIp, _onHostFound, onProgress) => {
      onProgress({ scanned: 3, total: 10 });
      return vi.fn();
    },
  );

  render(
    <SubnetScannerDrawer
      isOpen
      onClose={vi.fn()}
      targetIp="192.0.2.50"
      onSelectTerminal={vi.fn()}
      onLaunchRemote={vi.fn()}
    />,
  );

  const bar = screen.getByRole("progressbar", {
    name: /progreso del escaneo/i,
  });
  expect(bar).toHaveAttribute("aria-valuenow", "30");
});
```

- [ ] **Step 2: Rojo**

Run: `npx vitest run src/test/SubnetScannerDrawer.test.tsx -t "dialog"`
Expected: FAIL — el drawer es un `aside` sin `role="dialog"`.

- [ ] **Step 3: Reemplazar el contenedor por `Sheet`**

El archivo completo cambia sólo el `return` (la lógica de escaneo no se toca). Reemplazar desde `return (` hasta el cierre por:

```tsx
return (
  <Sheet
    open={isOpen}
    onOpenChange={(open) => {
      if (!open) onClose();
    }}
  >
    <SheetContent
      side="right"
      showCloseButton={false}
      className="w-80 gap-0 p-0 sm:max-w-none md:w-96"
    >
      <SheetHeader className="h-12 shrink-0 flex-row items-center justify-between gap-2 border-b border-border bg-muted/40 px-3.5">
        <div className="flex items-center gap-2">
          <div className="rounded-md bg-primary/10 p-1 text-link">
            <Network className="h-3.5 w-3.5" aria-hidden="true" />
          </div>
          <div>
            <SheetTitle className="text-xs font-bold tracking-tight">
              Escáner de Subred
            </SheetTitle>
            <SheetDescription className="font-mono text-[10px] text-muted-foreground">
              {subnetPrefix}
            </SheetDescription>
          </div>
        </div>
        <SheetClose asChild>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Cerrar panel de escáner"
            className="h-6 w-6 rounded-md text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </SheetClose>
      </SheetHeader>

      {/* Progreso */}
      <div className="shrink-0 space-y-2 border-b border-border/80 bg-muted/20 p-3">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-[11px] font-medium text-foreground">
            {isScanning ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin text-link" />
                Escaneando hosts...
              </>
            ) : isPaused ? (
              <span className="flex items-center gap-1 font-medium text-warning">
                <Pause className="h-3 w-3" /> Escaneo en pausa
              </span>
            ) : (
              <span className="flex items-center gap-1 font-medium text-success">
                <CheckCircle2 className="h-3 w-3" /> Escaneo finalizado
              </span>
            )}
          </span>
          <span className="font-mono text-[11px] font-semibold text-muted-foreground">
            {progress.scanned} / {progress.total} ({percentage}%)
          </span>
        </div>

        <Progress
          value={percentage}
          aria-label="Progreso del escaneo de subred"
          className={`h-1.5 [&_[data-slot=progress-indicator]]:transition-all ${
            isScanning
              ? ""
              : isPaused
                ? "[&_[data-slot=progress-indicator]]:bg-warning"
                : "[&_[data-slot=progress-indicator]]:bg-success"
          }`}
        />

        <div className="relative pt-1">
          <Search
            className="pointer-events-none absolute left-2.5 top-3.5 h-3.5 w-3.5 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="text"
            value={filterQuery}
            onChange={(event) => setFilterQuery(event.target.value)}
            placeholder="Filtrar equipos detectados..."
            aria-label="Filtrar equipos detectados"
            className="h-8 bg-muted/60 pl-8 pr-3 font-mono text-xs"
          />
        </div>
      </div>

      {/* Lista de equipos detectados */}
      <div className="flex-1 space-y-1.5 overflow-y-auto p-3">
        {filteredHosts.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center p-4 text-center text-muted-foreground">
            {isScanning ? (
              <>
                <Radio className="mb-2 h-8 w-8 animate-pulse text-link/40" />
                <p className="text-xs font-medium">
                  Detectando respuestas ICMP/SMB...
                </p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Los equipos activos irán apareciendo en tiempo real
                </p>
              </>
            ) : isPaused ? (
              <>
                <Pause className="mb-2 h-8 w-8 text-warning/40" />
                <p className="text-xs font-medium text-foreground">
                  Escaneo en pausa
                </p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Presiona Reanudar para continuar detectando equipos
                </p>
              </>
            ) : (
              <>
                <Laptop className="mb-2 h-8 w-8 text-muted-foreground/30" />
                <p className="text-xs font-medium">
                  No se encontraron equipos activos
                </p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Verifica conectividad o segmento de red
                </p>
              </>
            )}
          </div>
        ) : (
          filteredHosts.map((host) => {
            const hostname = host.hostname ? host.hostname.trim() : null;
            const displayName = hostname || host.ip;
            const lookupTarget = hostname || host.ip;
            const isConnectingThis =
              connectingIp === lookupTarget || connectingIp === host.ip;

            return (
              <Card
                key={host.ip}
                className="group flex-row items-stretch gap-0 overflow-hidden border-border/80 p-0 transition-all hover:border-border hover:bg-muted/30"
              >
                <Hint label={`Consultar terminal ${displayName}`}>
                  <button
                    type="button"
                    onClick={() => onSelectTerminal(lookupTarget)}
                    aria-label={`Consultar terminal ${displayName}`}
                    className="flex min-w-0 flex-1 cursor-pointer flex-col justify-center p-2.5 text-left transition-colors hover:bg-muted/50 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 shrink-0 rounded-full bg-success" />
                      <span className="truncate font-mono text-xs font-bold text-foreground">
                        {displayName}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 font-mono text-[10px] text-muted-foreground">
                      {hostname && <span>{host.ip}</span>}
                      {host.latency !== null && (
                        <span className="text-muted-foreground">
                          {host.latency}ms
                        </span>
                      )}
                    </div>
                  </button>
                </Hint>

                <div className="my-1 w-px self-stretch bg-border/60" />

                <Hint label="Conexión remota rápida (VNC / MSRA)">
                  <button
                    type="button"
                    onClick={(event) => handleRemoteClick(event, lookupTarget)}
                    disabled={isConnectingThis}
                    aria-label={`Conexión remota rápida con ${displayName}`}
                    className="flex w-10 shrink-0 cursor-pointer items-center justify-center text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50"
                  >
                    {isConnectingThis ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : (
                      <Monitor className="h-4 w-4" />
                    )}
                  </button>
                </Hint>
              </Card>
            );
          })
        )}
      </div>

      {/* Footer con controles del escaneo */}
      <div className="flex shrink-0 items-center justify-between border-t border-border/80 bg-muted/20 p-2.5 text-[11px] text-muted-foreground">
        <span className="font-mono text-[10px]">
          {hosts.length} {hosts.length === 1 ? "equipo" : "equipos"}
        </span>
        <div className="flex items-center gap-1.5">
          {isScanning ? (
            <Hint label="Pausar escaneo de subred">
              <Button
                size="sm"
                variant="outline"
                className="h-7 cursor-pointer border-warning/30 px-2.5 text-xs text-warning hover:bg-warning/10"
                onClick={handlePause}
                aria-label="Pausar escaneo"
              >
                <Pause className="mr-1 h-3 w-3" /> Pausar
              </Button>
            </Hint>
          ) : isPaused ? (
            <>
              <Hint label="Reiniciar escaneo desde el inicio">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 cursor-pointer px-2 text-xs text-muted-foreground hover:text-foreground"
                  onClick={handleRestart}
                  aria-label="Reiniciar escaneo"
                >
                  <RotateCw className="mr-1 h-3 w-3" /> Reiniciar
                </Button>
              </Hint>
              <Hint label="Reanudar escaneo de subred">
                <Button
                  size="sm"
                  variant="default"
                  className="h-7 cursor-pointer px-2.5 text-xs font-medium"
                  onClick={handleResume}
                  aria-label="Reanudar escaneo"
                >
                  <Play className="mr-1 h-3 w-3" /> Reanudar
                </Button>
              </Hint>
            </>
          ) : (
            <Hint label="Volver a escanear toda la subred">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 cursor-pointer px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={handleRestart}
                aria-label="Escanear nuevamente"
              >
                <RotateCw className="mr-1 h-3 w-3" /> Escanear de nuevo
              </Button>
            </Hint>
          )}
        </div>
      </div>
    </SheetContent>
  </Sheet>
);
```

Imports a agregar:

```tsx
import { Progress } from "@/components/ui/progress";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
```

- [ ] **Step 4: Quitar el contenedor viejo**

Borrar:
- `<div className="fixed inset-0 z-50 flex justify-end select-none">`
- el backdrop `<div className="fixed inset-0 bg-black/50 …" onClick={onClose} aria-hidden="true" />`
- el `<aside aria-label="Escáner de Subred" …>` y su header propio (que ahora es `SheetHeader`).
- el `Button` "Cerrar panel" redundante del header viejo (ya está el `SheetClose`).

El `Sheet` trae overlay con su propio `bg-black/80`, foco atrapado y `Escape`.

- [ ] **Step 5: `title=` del host a `Hint`**

En la fila de host, el botón de conexión remota usa `title="Conexión remota rápida (VNC / MSRA)"`: envolver ese `<button>` en `<Hint label="Conexión remota rápida (VNC / MSRA)">` y quitar el `title`.

- [ ] **Step 6: Verde**

```bash
npx vitest run src/test/SubnetScannerDrawer.test.tsx src/test/EmptyFieldsAndDrawerPolish.test.tsx src/test/AppTerminalLayout.test.tsx
```

Expected: PASS. Adaptar cualquier test que dependiera del `aside` o del backdrop propio: el drawer ahora es `role="dialog"` con nombre "Escáner de Subred"; las aserciones de texto, botones y placeholders se mantienen.

- [ ] **Step 7: Suite y commit**

```bash
npm test
git add src/components/SubnetScannerDrawer.tsx src/test/SubnetScannerDrawer.test.tsx
git commit -m "refactor(drawer): escaner de subred con Sheet y Progress"
```

---

### Task 5: Ajustes — `Progress`, `Switch` y `ToggleGroup`

**Files:**
- Modify: `src/components/SettingsModal.tsx:277-282` (descarga), `:391-431` (checks), `:440-463` (modo de ping)
- Test: `src/test/SettingsModal.test.tsx`

- [ ] **Step 1: Tests que fallan**

```tsx
// agregar a src/test/SettingsModal.test.tsx
function renderSettings(): void {
  render(
    <SettingsModal
      isOpen
      onClose={vi.fn()}
      currentVersion="1.0.0"
    />,
  );
}

it("las preferencias booleanas usan switches accesibles", () => {
  renderSettings();

  const minimize = screen.getByRole("switch", {
    name: /minimizar a la bandeja al cerrar/i,
  });
  expect(minimize).toHaveAttribute("data-state", "checked");

  const hotkey = screen.getByRole("switch", {
    name: /atajo global ctrl \+ espacio/i,
  });
  fireEvent.click(hotkey);
  expect(hotkey).toHaveAttribute("data-state", "unchecked");
});

it("el modo de ping es un grupo de opciones excluyentes", () => {
  renderSettings();

  const group = screen.getByRole("radiogroup", {
    name: /modo de ping predeterminado/i,
  });
  const standard = within(group).getByRole("radio", {
    name: /estándar \(4 paquetes\)/i,
  });
  const infinite = within(group).getByRole("radio", {
    name: /continuo \(-t\)/i,
  });

  expect(standard).toHaveAttribute("aria-checked", "true");
  fireEvent.click(infinite);
  expect(infinite).toHaveAttribute("aria-checked", "true");
  expect(standard).toHaveAttribute("aria-checked", "false");
});
```

Nota: los dos `<Switch>` arrancan en `data-state="checked"` porque sus `useState` leen `localStorage` y el `beforeEach` del archivo ya hace `localStorage.clear()`; si el valor por defecto fuera el opuesto, ajustar la expectativa al valor real del estado inicial (leer el `useState` de `SettingsModal.tsx:66-78`), no cambiar el componente.

- [ ] **Step 2: Rojo**

Run: `npx vitest run src/test/SettingsModal.test.tsx -t "switch"`
Expected: FAIL — hoy son `checkbox` nativos, no hay `progressbar` con nombre ni `radio`.

- [ ] **Step 3: `Progress` en la descarga**

```tsx
<Progress
  value={downloadProgress.percent}
  aria-label="Progreso de la descarga de la actualización"
  className="h-2"
/>
```

Se elimina el `div` con `style={{ width }}` y su track `bg-muted`.

- [ ] **Step 4: `Switch` en las dos preferencias booleanas**

Reemplazar cada `<label>` con `<input type="checkbox">` por:

```tsx
<div className="flex items-start justify-between gap-3">
  <div className="space-y-0.5">
    <Label htmlFor="minimize-to-tray" className="text-xs font-medium text-foreground">
      Minimizar a la bandeja al cerrar
    </Label>
    <p className="text-[11px] text-muted-foreground">
      Mantiene la aplicación en segundo plano en el área de notificación de
      Windows para reapertura instantánea.
    </p>
  </div>
  <Switch
    id="minimize-to-tray"
    checked={minimizeToTray}
    onCheckedChange={setMinimizeToTray}
    aria-label="Minimizar a la bandeja al cerrar"
  />
</div>
```

Repetir con `id="global-hotkey"`, `checked={globalHotkeyEnabled}`, `onCheckedChange={setGlobalHotkeyEnabled}`, label "Atajo Global Ctrl + Espacio" y la misma descripción actual. Import: `import { Switch } from "@/components/ui/switch";` (y `Label` si no estaba).

- [ ] **Step 5: `ToggleGroup` en el modo de ping**

```tsx
<ToggleGroup
  type="single"
  value={defaultPingMode}
  onValueChange={(value) => {
    if (value === "standard" || value === "infinite") setDefaultPingMode(value);
  }}
  variant="outline"
  size="sm"
  aria-label="Modo de ping predeterminado"
  className="pt-1"
>
  <ToggleGroupItem value="standard" aria-label="Estándar (4 paquetes)" className="text-xs">
    Estándar (4 paquetes)
  </ToggleGroupItem>
  <ToggleGroupItem value="infinite" aria-label="Continuo (-t)" className="text-xs">
    Continuo (-t)
  </ToggleGroupItem>
</ToggleGroup>
```

Import: `import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";`

- [ ] **Step 6: Verde**

```bash
npx vitest run src/test/SettingsModal.test.tsx
```

Expected: PASS. Si un test previo buscaba `getByRole("checkbox")` para estas dos preferencias, se reescribe a `getByRole("switch")`; si buscaba los dos `<Button>` del modo de ping, se reescribe a `getByRole("radio")` dentro del `radiogroup`. No se borra ninguna aserción de comportamiento.

Verificación estática:

```powershell
Select-String -Path src\components\SettingsModal.tsx -Pattern 'style=\{\{\s*width'
```

Expected: sin resultados (la barra ya es `Progress`).

- [ ] **Step 7: Commit**

```bash
npm test
git add src/components/SettingsModal.tsx src/test/SettingsModal.test.tsx
git commit -m "refactor(settings): Switch, ToggleGroup y Progress en ajustes"
```

---

### Task 6: Cierre de alerta con `AlertDialog`

**Files:**
- Modify: `src/components/ActivityDialogs.tsx:248-324`
- Test: `src/test/ActivityDialogs.test.tsx`

- [ ] **Step 1: Test que falla**

```tsx
it("el cierre de alerta usa el diálogo de confirmación", async () => {
  const onConfirm = vi.fn();
  render(
    <CloseAlertDialog
      open
      alertTitle="Disco lleno"
      onOpenChange={vi.fn()}
      onConfirm={onConfirm}
    />,
  );

  const dialog = screen.getByRole("alertdialog");
  expect(dialog).toHaveAccessibleName("Cerrar alerta");

  const confirm = screen.getByRole("button", { name: /confirmar cierre/i });
  expect(confirm).toBeDisabled();

  fireEvent.change(screen.getByLabelText("Resolución"), {
    target: { value: "Se liberó espacio" },
  });
  fireEvent.click(confirm);
  expect(onConfirm).toHaveBeenCalledWith("Se liberó espacio");
});
```

- [ ] **Step 2: Rojo**

Run: `npx vitest run src/test/ActivityDialogs.test.tsx -t "diálogo de confirmación"`
Expected: FAIL — hoy es `role="dialog"`.

- [ ] **Step 3: Migrar el componente**

En `CloseAlertDialog`, cambiar imports y JSX:

```tsx
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
```

```tsx
return (
  <AlertDialog open={open} onOpenChange={handleOpenChange}>
    <AlertDialogContent className="max-w-md">
      <AlertDialogHeader>
        <AlertDialogTitle>Cerrar alerta</AlertDialogTitle>
        <AlertDialogDescription>{alertTitle}</AlertDialogDescription>
      </AlertDialogHeader>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <FieldGroup className="gap-3">
          <Field className="gap-1.5">
            <FieldLabel htmlFor={CLOSE_RESOLUTION_ID}>Resolución</FieldLabel>
            <Textarea
              id={CLOSE_RESOLUTION_ID}
              value={resolution}
              onChange={(event) => setResolution(event.target.value)}
              placeholder="Cómo se resolvió la alerta"
              rows={3}
              className="resize-none text-sm"
              autoFocus
            />
          </Field>
        </FieldGroup>
      </form>

      <AlertDialogFooter className="gap-2">
        <AlertDialogCancel>Cancelar</AlertDialogCancel>
        <Button type="button" size="sm" disabled={!valid} onClick={submit}>
          Confirmar cierre
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);
```

Nota deliberada: **no** se usa `AlertDialogAction` para el botón de confirmar, porque Radix lo cierra antes de validar; el `submit()` manual conserva la validación y llama `onOpenChange(false)`. `AlertDialogCancel` sí cierra solo (y `handleOpenChange(false)` limpia `resolution`).

- [ ] **Step 4: Verde**

```bash
npx vitest run src/test/ActivityDialogs.test.tsx src/test/NetUserFlow.test.tsx
```

Expected: PASS. Adaptar los tests de `RequestResetDialog`/`NewAlertDialog` sólo si compartían el import de `Dialog` en el mismo módulo (siguen usándolo).

- [ ] **Step 5: Commit**

```bash
npm test
git add src/components/ActivityDialogs.tsx src/test/ActivityDialogs.test.tsx
git commit -m "refactor(alerts): cierre de alerta con AlertDialog"
```

---

### Task 7: `eject` del CLI (T9 pendiente de Fase 1)

**Files:**
- Modify: `src/index.css`, `package.json`, `components.json` (lo que toque el CLI)
- Test: `src/test/ShadcnPreset.test.tsx`, `src/test/shadcnConfig.test.ts`

`shadcn eject` inlina `shadcn/tailwind.css`, elimina la dependencia `shadcn` y deja el tema en el repo. Hoy `ShadcnPreset.test.tsx` falla si desaparece `@import "shadcn/tailwind.css"`, y `shadcnConfig.test.ts` verifica la devDependency.

- [ ] **Step 1: Ejecutar el eject**

```bash
npx shadcn@4.23.0 eject --yes
git status --short
```

Expected: cambios en `src/index.css`, `package.json`, `package-lock.json` y probablemente `components.json`. **No** debe aparecer `@base-ui` ni `@radix-ui/*` scoped.

- [ ] **Step 2: Verificar que el tema no cambió**

```bash
git diff -U0 src/index.css | Select-String -Pattern '^\+.*--(background|foreground|primary|success|warning|info|destructive|link|console)' 
```

Expected: **sin resultados** (los valores de los tokens no cambian; sólo se inlina CSS base). Si aparece cualquier token semántico modificado, **abortar** revirtiendo sólo lo que tocó el eject:

```bash
git checkout -- src/index.css package.json package-lock.json components.json
git status --porcelain | Select-String -Pattern '^\?\?'   # archivos nuevos del eject
```

y borrar **sólo** esos archivos nuevos listados (nunca `git clean -fd` sobre todo el repo: `electron/main.cjs` tiene cambios ajenos sin stagear).

- [ ] **Step 3: Actualizar los dos guards**

`src/test/ShadcnPreset.test.tsx`: reemplazar la aserción del `@import "shadcn/tailwind.css"` por la marca que deje el eject (leer `src/index.css` y buscar el comentario o el bloque inlinado; si no deja marca, eliminar sólo esa aserción y dejar las de tokens).

`src/test/shadcnConfig.test.ts`: quitar la aserción que exige `shadcn` en `devDependencies` y, en su lugar, afirmar que **no** está (el CLI ya no viaja), manteniendo las de `style: "radix-vega"`.

- [ ] **Step 4: Verificar build y contraste**

```bash
npm run build
node scripts/check-contrast.mjs --strict
npx vitest run src/test/ShadcnPreset.test.tsx src/test/shadcnConfig.test.ts src/test/designContract.test.ts
```

Expected: build verde · `--strict` exit 0 con `Texto: 0 · UI: 3 · Tokens ausentes: 0` · los tres tests verdes.

- [ ] **Step 5: Commit**

```bash
npm test
git add src/index.css package.json package-lock.json components.json src/test/ShadcnPreset.test.tsx src/test/shadcnConfig.test.ts
git commit -m "build(styles): eject del CLI shadcn e inline del tema"
```

---

### Task 8: Cierre de la fase

**Files:**
- Modify: `DESIGN.md`, `docs/ui-slop-audit-2026-11-02.md`

- [ ] **Step 1: Verificación completa**

```bash
npx vitest run
npm run build
npm run audit:contrast
node scripts/check-contrast.mjs --strict
npx vitest run src/test/designContract.test.ts
```

Expected: suite verde (≈368 + los tests nuevos) · build verde · ambos comandos de contraste exit 0 · ratchet **0/0/0/4** sin cambios.

- [ ] **Step 2: Medir y anotar**

```powershell
$files = Get-ChildItem src -Recurse -File -Include *.tsx | Where-Object { $_.FullName -notmatch '\\ui\\' -and $_.FullName -notmatch '\.test\.' }
($files | ForEach-Object { ([regex]::Matches((Get-Content $_.FullName -Raw), '\b(?:text|bg|border|ring)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b')).Count } | Measure-Object -Sum).Sum
($files | ForEach-Object { ([regex]::Matches((Get-Content $_.FullName -Raw), '\bshadow-(?:2xs|xs|sm|md|lg|xl|2xl)\b')).Count } | Measure-Object -Sum).Sum
($files | ForEach-Object { ([regex]::Matches((Get-Content $_.FullName -Raw), '\bz-50\b')).Count } | Measure-Object -Sum).Sum
```

Expected: `0` · `0` · **1** (sólo queda el desplegable de conexión remota de `QuickActionsBar`, que no es un overlay Radix y se migra en Fase 4). Con ese número, bajar `BASELINE.zIndex` en `src/test/designContract.test.ts` a **1** y actualizar el comentario; el ratchet queda **0/0/0/1**.

- [ ] **Step 3: Actualizar `DESIGN.md`**

Agregar bajo "Color y elevación" una sección nueva:

```markdown
## Overlays y controles

- **Buscador**: `InputGroup` + `Popover` + `Command`. El input vive en la barra
  superior; el panel se ancla con `PopoverAnchor` y no roba foco. Las filas son
  `CommandItem` (rol `option`) y las acciones por fila (VNC, quitar del
  historial) son botones hermanos, nunca hijos de la opción.
- **Menú contextual**: `ContextMenu` sobre `<main>`. No se usa un `div` con
  `position: fixed` ni `z-50` manual; Radix resuelve posición, foco, flechas y
  `Escape`. Los inputs y el buscador quedan fuera del trigger para conservar el
  menú nativo del sistema.
- **Drawer**: `Sheet` con `SheetTitle`/`SheetDescription` obligatorios. Las
  barras de progreso son `Progress` con `aria-valuenow`; nunca `div` con
  `style={{ width }}`.
- **Diálogos destructivos**: `AlertDialog`. La acción que valida un formulario
  usa un `Button` propio (no `AlertDialogAction`), porque Radix cierra antes de
  validar.
- **Ayuda contextual**: `Hint` (Tooltip) en lugar de `title=`. El `aria-label`
  del control se conserva como nombre accesible; el tooltip agrega la
  descripción. Los `title` de superficies informativas (chip de uptime, badge de
  conexión) se quedan como están.
- **Sets de 2–7 opciones**: `ToggleGroup`, no botones con `variant` manual.
- **Booleanos de configuración**: `Switch` con `aria-label`, no `input
  type="checkbox"` teñido con `accent-*`.
```

- [ ] **Step 4: Registrar en el audit**

Bajo `### Fase 3 · Interacción accesible`, agregar:

```markdown
> **Estado (2026-11-04):** ejecutada en `feat/fase-3-interaccion` (T0-T7). Buscador con `InputGroup` + `Popover` + `Command` (filas `option`, `aria-selected`, acciones hermanas) · menú contextual con `ContextMenu` · drawer con `Sheet` y progreso `Progress` · ajustes con `Switch`/`ToggleGroup`/`Progress` · cierre de alerta con `AlertDialog` · 24 `title=` → `Hint` (Tooltip) · `eject` del CLI con el tema inlinado (o bloqueado, con motivo). Ratchet 0/0/0/4, `--strict` 0, suite N/N.
```

- [ ] **Step 5: Commit**

```bash
git add DESIGN.md docs/ui-slop-audit-2026-11-02.md
git commit -m "docs(design): estandares de overlays y estado de la fase 3"
```

---

## Criterios de aceptación

- [ ] `node scripts/check-contrast.mjs --strict` → exit 0 con `EXCEPTIONS` vacío.
- [ ] `npm test` y `npm run build` verdes.
- [ ] Cero `title=` en botones interactivos (`Button`/`button`) de `src/components/*.tsx`.
- [ ] Cero overlays con `position: fixed` + `z-50` manual en app (`Topbar`, `OperatorContextMenu`, `SubnetScannerDrawer`).
- [ ] El buscador expone `role="combobox"`, `role="listbox"` y `option` con `aria-selected`.
- [ ] El menú contextual expone `role="menu"`/`menuitem` y funciona con teclado.
- [ ] El drawer expone `role="dialog"` con nombre "Escáner de Subred".
- [ ] Cero `div` con `style={{ width: … }}` para progreso; las dos barras son `Progress` con `aria-valuenow`.
- [ ] El cierre de alerta es `role="alertdialog"` y sigue validando antes de confirmar.
- [ ] `components.json` conserva `"style": "radix-vega"` y no aparece `@base-ui-components/react`.
- [ ] Ratchet sólo bajó (queda **0/0/0/1**).

## Hand-offs a Fase 4

| Pendiente | Por qué |
|---|---|
| Borrar `Sidebar`, `HardwareCard`, `NetworkAdCard` | Fase 4 |
| `ScrollArea` en consola y desplegables | Cosmético, opcional |
| `onDirectPing` sin uso en `Topbar` | Prop heredada; decidir si se cablea o se elimina en Fase 4 |
| Tokens del preset oscurecidos + `--info` | Sign-off de producto |
| Escala tipográfica 18/14/12/11 | Fase 5 |
