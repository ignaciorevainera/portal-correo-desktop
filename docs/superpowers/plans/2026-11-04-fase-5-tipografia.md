# Fase 5 — Tipografía, overlines y adornos · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** fijar una escala tipográfica de cuatro pasos (18/14/12/11), eliminar los 44 tamaños arbitrarios en `px`, normalizar las overlines a un máximo de cinco, unificar los cuadrados teñidos de iconos, dar acción al estado vacío inicial y mostrar skeletons mientras el escáner de subred busca hosts.

**Architecture:** primero se define la escala en `src/index.css` (`text-micro` como cuarto paso, más la utilidad `overline-label`) y se reemplazan los tamaños arbitrarios; luego se normalizan overlines y se extrae `IconWell` para los cuatro cuadrados teñidos; al final los dos adornos de estado (acción del vacío y skeletons del escáner). El contrato de diseño gana dos reglas medibles: cero tamaños arbitrarios y cinco overlines como máximo.

**Tech Stack:** React 19 · Vite 6 · TypeScript 5.7 · Tailwind 4 · radix-ui 1.8.1 · Vitest 3 + Testing Library · Electron 34.

**Prerrequisito:** `main` en `5e2eb16`. Estado medido: **390** tests en 60 archivos, build verde, `audit:contrast` y `--strict` en exit 0, ratchet **0/0/0/1**.

**Fuera de alcance:** cambiar la familia tipográfica o los pesos · rediseñar densidad/espaciado · `ScrollArea` · tokens del preset y contraste de bordes (sign-off de producto) · cualquier primitiva de `src/components/ui/**`.

---

## Estado de partida (medido)

| Hecho | Valor | Evidencia |
|---|---|---|
| Tamaños arbitrarios `text-[Npx]` | **44** en 7 archivos | QuickActionsBar 16 · SubnetScannerDrawer 9 · SettingsModal 8 · LivePingConsole 6 · InfoModal 3 · BlockedScreen 1 · ErrorBoundary 1 |
| Distribución | 9px ×1 · 10px ×13 · 11px ×29 · 11.5px ×1 | grep `text-\[` |
| Overlines (`uppercase tracking-wider`) | **6** | InfoModal 1 · QuickActionsBar 1 · SettingsModal 3 · TerminalDetailsGrid 1 |
| Cuadrados teñidos de icono | **4** patrones distintos | InfoModal:64 · SettingsModal:170 · SubnetScannerDrawer:171 · Topbar:280 |
| Estado vacío inicial | sin acción (`EmptyContent` ausente) | `App.tsx` bloque "Buscar una terminal para comenzar" |
| Escáner sin hosts | texto + `Radio` pulsante, sin skeleton | `SubnetScannerDrawer.tsx:249-258` |

---

## File Structure

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `src/index.css` | modificar | `--text-micro` (4º paso) y utilidad `overline-label` |
| `src/components/IconWell.tsx` | crear | cuadrado teñido de icono, tamaños `sm`/`md` |
| `src/test/IconWell.test.tsx` | crear | contrato del cuadrado |
| `src/components/QuickActionsBar.tsx` | modificar | 16 tamaños arbitrarios + 1 overline |
| `src/components/SubnetScannerDrawer.tsx` | modificar | 9 tamaños + cuadrado + skeletons del escaneo |
| `src/components/SettingsModal.tsx` | modificar | 8 tamaños + 3 overlines + cuadrado |
| `src/components/LivePingConsole.tsx` | modificar | 6 tamaños (incluye el viewport del log) |
| `src/components/InfoModal.tsx` | modificar | 3 tamaños + 1 overline que se retira + cuadrado |
| `src/components/BlockedScreen.tsx` | modificar | 1 tamaño |
| `src/components/ErrorBoundary.tsx` | modificar | 1 tamaño |
| `src/components/TerminalDetailsGrid.tsx` | modificar | 1 overline |
| `src/components/Topbar.tsx` | modificar | cuadrado del logo |
| `src/App.tsx` | modificar | acción del estado vacío inicial |
| `src/test/designContract.test.ts` | modificar | contrato tipográfico |
| `src/test/AppInitialState.test.tsx` | modificar | test de la acción del vacío |
| `src/test/SubnetScannerDrawer.test.tsx` | modificar | test de skeletons |
| `DESIGN.md` | modificar | sección "Tipografía" |
| `docs/ui-slop-audit-2026-11-02.md` | modificar | estado de Fase 5 |

---

### Task 0: Rama y baseline

**Files:** ninguno.

- [ ] **Step 1: Verificar limpio y crear rama**

```bash
git status --porcelain
git switch -c feat/fase-5-tipografia
```

Expected: sólo `M electron/main.cjs` (ajeno; no se toca). La rama nace de `5e2eb16`.

- [ ] **Step 2: Anotar el punto de partida**

```bash
npx vitest run
npm run build
node scripts/check-contrast.mjs --strict
```

Expected: **390** tests · build verde · `--strict` exit 0 (`Texto: 0 · UI: 3 · Tokens ausentes: 0`).

---

### Task 1: Escala tipográfica y retiro de tamaños arbitrarios

**Files:**
- Modify: `src/index.css`
- Modify: `QuickActionsBar.tsx`, `SubnetScannerDrawer.tsx`, `SettingsModal.tsx`, `LivePingConsole.tsx`, `InfoModal.tsx`, `BlockedScreen.tsx`, `ErrorBoundary.tsx`
- Test: `src/test/designContract.test.ts`

La escala queda: **18** (`text-lg`), **14** (`text-sm`), **12** (`text-xs`) y **11** (`text-micro`, nuevo). `text-[9px]`, `text-[10px]`, `text-[11px]` y `text-[11.5px]` desaparecen.

- [ ] **Step 1: Test de contrato que falla**

Agregar a `src/test/designContract.test.ts`, después del test de radios:

```ts
  it("no usa tamaños de fuente arbitrarios", () => {
    expect(count(/text-\[\d+(?:\.\d+)?px\]/g)).toBe(0);
  });
```

- [ ] **Step 2: Rojo**

Run: `npx vitest run src/test/designContract.test.ts -t "tamaños de fuente"`
Expected: FAIL con un conteo de 44.

- [ ] **Step 3: Definir `text-micro` en `src/index.css`**

Antes de `:root` (después del bloque `@theme inline` que termina con las variables de radio/tipografía), agregar un bloque propio:

```css
/* Escala tipográfica del producto: 18 / 14 / 12 / 11 px.
   `text-micro` es el cuarto paso y el piso permitido. */
@theme {
  --text-micro: 0.6875rem;
  --text-micro--line-height: 1.4;
}
```

`text-lg`/`text-sm`/`text-xs` ya son 18/14/12 en Tailwind 4; no se redefinen.

- [ ] **Step 4: Reemplazar los 44 tamaños**

En cada archivo, reemplazo global de las cuatro cadenas exactas:

| Antes | Después |
|---|---|
| `text-[9px]` | `text-micro` |
| `text-[10px]` | `text-micro` |
| `text-[11px]` | `text-micro` |
| `text-[11.5px]` | `text-micro` |

Archivos y cantidad esperada: `QuickActionsBar.tsx` 16 · `SubnetScannerDrawer.tsx` 9 · `SettingsModal.tsx` 8 · `LivePingConsole.tsx` 6 · `InfoModal.tsx` 3 · `BlockedScreen.tsx` 1 · `ErrorBoundary.tsx` 1.

No tocar ningún tamaño en `src/components/ui/**`. El viewport de la consola (`LivePingConsole.tsx:404`) pasa de 11.5 a 11; conserva `leading-relaxed`, `font-mono` y `bg-console-bg`.

- [ ] **Step 5: Verificar**

```powershell
Select-String -Path src\App.tsx,src\components\*.tsx -Pattern 'text-\[\d+(\.\d+)?px\]' | Where-Object { $_.Filename -notmatch 'test' } | Measure-Object | Select-Object Count
```

Expected: `0`.

- [ ] **Step 6: Verde y commit**

```bash
npx vitest run src/test/designContract.test.ts src/test/LivePingConsole.test.tsx src/test/QuickActionsBar.test.tsx src/test/SettingsModal.test.tsx src/test/SubnetScannerDrawer.test.tsx
npm test
git add src/index.css src/test/designContract.test.ts src/components/QuickActionsBar.tsx src/components/SubnetScannerDrawer.tsx src/components/SettingsModal.tsx src/components/LivePingConsole.tsx src/components/InfoModal.tsx src/components/BlockedScreen.tsx src/components/ErrorBoundary.tsx
git commit -m "feat(type): escala 18/14/12/11 y fin de los tamanos arbitrarios"
```

---

### Task 2: Overlines normalizadas (máximo cinco)

**Files:**
- Modify: `src/index.css`, `QuickActionsBar.tsx:419`, `SettingsModal.tsx:188,321,388`, `TerminalDetailsGrid.tsx:53`, `InfoModal.tsx:93`
- Test: `src/test/designContract.test.ts`

Hoy hay 6 overlines. Se define una utilidad única y se retira la de `InfoModal` (su label pasa a texto normal): quedan 5.

- [ ] **Step 1: Test de contrato que falla**

Agregar después del test de tamaños:

```ts
  it("usa una sola utilidad de overline y no más de cinco", () => {
    expect(count(/\buppercase\b/g)).toBe(0);
    expect(count(/\boverline-label\b/g)).toBeLessThanOrEqual(5);
  });
```

- [ ] **Step 2: Rojo**

Run: `npx vitest run src/test/designContract.test.ts -t "overline"`
Expected: FAIL — hoy hay 6 `uppercase` y cero `overline-label`.

- [ ] **Step 3: Definir la utilidad**

Al final de `src/index.css`, junto a las demás `@utility`:

```css
/* Etiqueta de sección: 11 px, mayúsculas y tracking corto. Máximo 5 por app. */
@utility overline-label {
  font-size: var(--text-micro);
  line-height: 1.4;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
```

- [ ] **Step 4: Aplicarla en las cinco que quedan**

```tsx
// QuickActionsBar.tsx:419
className="overline-label px-2 py-1 text-muted-foreground"

// SettingsModal.tsx:188, 321 y 388
className="overline-label text-foreground"

// TerminalDetailsGrid.tsx:53
className="overline-label text-muted-foreground"
```

- [ ] **Step 5: Retirar la de `InfoModal`**

`InfoModal.tsx:93` deja de ser overline (pasa a label normal, sin mayúsculas):

```tsx
<span className="text-micro font-semibold text-muted-foreground block">
  Capacidades Principales
</span>
```

- [ ] **Step 6: Verificar**

```powershell
Select-String -Path src\App.tsx,src\components\*.tsx -Pattern '\buppercase\b' | Where-Object { $_.Filename -notmatch 'test' } | Measure-Object | Select-Object Count
Select-String -Path src\App.tsx,src\components\*.tsx -Pattern 'overline-label' | Where-Object { $_.Filename -notmatch 'test' } | Measure-Object | Select-Object Count
```

Expected: `0` y `5`.

- [ ] **Step 7: Verde y commit**

```bash
npx vitest run src/test/designContract.test.ts src/test/InfoModal.test.tsx
npm test
git add src/index.css src/test/designContract.test.ts src/components/QuickActionsBar.tsx src/components/SettingsModal.tsx src/components/TerminalDetailsGrid.tsx src/components/InfoModal.tsx
git commit -m "feat(type): una utilidad de overline y maximo cinco"
```

---

### Task 3: `IconWell` para los cuadrados teñidos

**Files:**
- Create: `src/components/IconWell.tsx`
- Test: `src/test/IconWell.test.tsx`
- Modify: `InfoModal.tsx:64`, `SettingsModal.tsx:170`, `SubnetScannerDrawer.tsx:171`, `Topbar.tsx:280`

- [ ] **Step 1: Test que falla**

```tsx
// src/test/IconWell.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Cpu } from "lucide-react";
import { IconWell } from "../components/IconWell";

describe("IconWell", () => {
  it("envuelve el icono con el tinte y el radio del tamaño pedido", () => {
    render(
      <IconWell size="sm" data-testid="well">
        <Cpu aria-hidden="true" />
      </IconWell>,
    );

    const well = screen.getByTestId("well");
    expect(well.className).toContain("bg-primary/10");
    expect(well.className).toContain("text-link");
    expect(well.className).toContain("rounded-md");
    expect(well.className).toContain("p-1");
    expect(well.querySelector("svg")).not.toBeNull();
  });

  it("usa el tamaño md por defecto y acepta clases extra", () => {
    render(
      <IconWell data-testid="well" className="border border-primary/20">
        <Cpu aria-hidden="true" />
      </IconWell>,
    );

    const well = screen.getByTestId("well");
    expect(well.className).toContain("rounded-lg");
    expect(well.className).toContain("p-2");
    expect(well.className).toContain("border-primary/20");
  });
});
```

- [ ] **Step 2: Rojo**

Run: `npx vitest run src/test/IconWell.test.tsx`
Expected: FAIL — no existe `../components/IconWell`.

- [ ] **Step 3: Implementar**

```tsx
// src/components/IconWell.tsx
import React from "react";
import { cn } from "@/lib/utils";

interface IconWellProps {
  size?: "sm" | "md";
  className?: string;
  children: React.ReactNode;
}

/**
 * Cuadrado teñido para el icono de una sección.
 * Un solo tinte y un solo radio por tamaño en toda la aplicación.
 */
export function IconWell({
  size = "md",
  className,
  children,
  ...props
}: IconWellProps & React.ComponentProps<"div">): React.JSX.Element {
  return (
    <div
      className={cn(
        "shrink-0 bg-primary/10 text-link",
        size === "sm" ? "rounded-md p-1" : "rounded-lg p-2",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 4: Reemplazar los cuatro cuadrados**

```tsx
// InfoModal.tsx:64 — antes: <div className="p-2 rounded-lg bg-primary/10 text-link border border-primary/20 shrink-0">
<IconWell className="border border-primary/20">

// SettingsModal.tsx:170 — antes: <div className="p-2 rounded-lg bg-primary/10 text-link">
<IconWell>

// SubnetScannerDrawer.tsx:171 — antes: <div className="rounded-md bg-primary/10 p-1 text-link">
<IconWell size="sm">

// Topbar.tsx:280 — antes: <div className="p-1.5 rounded-md bg-primary/10 text-link pointer-events-none">
<IconWell size="sm" className="p-1.5 pointer-events-none">
```

Cerrar cada bloque con `</IconWell>` y agregar `import { IconWell } from "./IconWell";` en los cuatro archivos. El contenido interno (iconos, `img` del logo) no cambia.

- [ ] **Step 5: Verde y commit**

```bash
npx vitest run src/test/IconWell.test.tsx src/test/InfoModal.test.tsx src/test/SettingsModal.test.tsx src/test/SubnetScannerDrawer.test.tsx src/components/Topbar.test.tsx
npm test
git add src/components/IconWell.tsx src/test/IconWell.test.tsx src/components/InfoModal.tsx src/components/SettingsModal.tsx src/components/SubnetScannerDrawer.tsx src/components/Topbar.tsx
git commit -m "refactor(ui): IconWell unico para los cuadrados teñidos"
```

---

### Task 4: Acción en el estado vacío inicial

**Files:**
- Modify: `src/App.tsx` (bloque "Buscar una terminal para comenzar")
- Test: `src/test/AppInitialState.test.tsx`

- [ ] **Step 1: Test que falla**

```tsx
  it("enfoca el buscador desde la acción del estado vacío", async () => {
    (global as any).window.electronAPI = {
      checkStatus: vi
        .fn()
        .mockResolvedValue({ connected: true, mode: "sql", server: "srv" }),
      searchTerminal: vi.fn(),
      ping: vi.fn(),
      stopPing: vi.fn(),
      onPingData: vi.fn().mockReturnValue(() => {}),
      onPingEnd: vi.fn().mockReturnValue(() => {}),
    };

    render(<App />);

    fireEvent.click(
      await screen.findByRole("button", { name: "Buscar terminal" }),
    );

    expect(
      screen.getByRole("combobox", { name: /buscar terminal/i }),
    ).toHaveFocus();
  });
```

- [ ] **Step 2: Rojo**

Run: `npx vitest run src/test/AppInitialState.test.tsx -t "estado vacío"`
Expected: FAIL — no existe un botón "Buscar terminal" (el input es `combobox`, no botón).

- [ ] **Step 3: Agregar la acción**

En el `Empty` inicial, después de `</EmptyHeader>`:

```tsx
<EmptyContent>
  <Button
    variant="outline"
    size="sm"
    onClick={() => {
      window.dispatchEvent(new CustomEvent("pcd:app-autofocus-search"));
    }}
  >
    <Search data-icon="inline-start" aria-hidden="true" />
    Buscar terminal
  </Button>
</EmptyContent>
```

`Topbar` ya escucha `pcd:app-autofocus-search` y enfoca/selecciona el input (`Topbar.tsx:84-101`), así que no hace falta prop nueva.

- [ ] **Step 4: Verde y commit**

```bash
npx vitest run src/test/AppInitialState.test.tsx src/test/AppTerminalLayout.test.tsx
npm test
git add src/App.tsx src/test/AppInitialState.test.tsx
git commit -m "feat(empty): accion para enfocar el buscador desde el estado inicial"
```

---

### Task 5: Skeletons mientras el escáner busca hosts

**Files:**
- Modify: `src/components/SubnetScannerDrawer.tsx` (`:249-258`)
- Test: `src/test/SubnetScannerDrawer.test.tsx`

- [ ] **Step 1: Test que falla**

```tsx
  it("muestra skeletons mientras escanea y ninguno al terminar", async () => {
    let finish: ((result: { aborted: boolean; totalFound: number }) => void) | null = null;
    vi.spyOn(electronClient, "startSubnetScanner").mockImplementation(
      (_targetIp, _onHostFound, _onProgress, onDone) => {
        finish = onDone;
        return () => {};
      },
    );

    const { unmount } = render(
      <SubnetScannerDrawer
        isOpen
        onClose={vi.fn()}
        targetIp="192.0.2.50"
        onSelectTerminal={vi.fn()}
        onLaunchRemote={vi.fn()}
      />,
    );

    expect(
      document.querySelectorAll('[data-slot="skeleton"]').length,
    ).toBeGreaterThanOrEqual(3);

    act(() => {
      finish?.({ aborted: false, totalFound: 0 });
    });

    await waitFor(() =>
      expect(
        document.querySelectorAll('[data-slot="skeleton"]').length,
      ).toBe(0),
    );
    unmount();
  });
```

Si el mock del archivo firma `onDone` de otra forma, ajustarlo a la firma real leída en `src/services/electronClient.ts`; no cambiar el componente para el test.

- [ ] **Step 2: Rojo**

Run: `npx vitest run src/test/SubnetScannerDrawer.test.tsx -t "skeletons"`
Expected: FAIL — hoy no hay skeletons en el drawer.

- [ ] **Step 3: Reemplazar el estado "escaneando"**

En `SubnetScannerDrawer.tsx`, dentro de `{isScanning ? ( … ) :`, reemplazar el bloque del `Radio` por:

```tsx
              {isScanning ? (
                <div className="w-full space-y-2" aria-hidden="true">
                  {[0, 1, 2].map((row) => (
                    <div
                      key={row}
                      className="flex items-center gap-2 rounded-md border border-border/60 p-3"
                    >
                      <Skeleton className="h-2 w-2 rounded-full" />
                      <Skeleton className="h-3 w-28" />
                      <Skeleton className="ml-auto h-3 w-12" />
                    </div>
                  ))}
                  <p role="status" className="sr-only">
                    Detectando respuestas ICMP/SMB...
                  </p>
                </div>
              ) : isPaused ? (
```

Import: `import { Skeleton } from "@/components/ui/skeleton";`. Quitar el import de `Radio` si queda sin uso (verificar con `Select-String -Path src/components/SubnetScannerDrawer.tsx -Pattern 'Radio'`).

- [ ] **Step 4: Verde y commit**

```bash
npx vitest run src/test/SubnetScannerDrawer.test.tsx src/test/EmptyFieldsAndDrawerPolish.test.tsx
npm test
git add src/components/SubnetScannerDrawer.tsx src/test/SubnetScannerDrawer.test.tsx
git commit -m "feat(drawer): skeletons mientras se escanea la subred"
```

---

### Task 6: Documentar y cerrar la fase

**Files:**
- Modify: `DESIGN.md`, `docs/ui-slop-audit-2026-11-02.md`

- [ ] **Step 1: `DESIGN.md` — nueva sección Tipografía**

Antes de "Ayuda contextual":

```markdown
## Tipografía

Cuatro pasos, sin tamaños arbitrarios: **18** (`text-lg`, títulos), **14**
(`text-sm`, cuerpo), **12** (`text-xs`, metadatos) y **11** (`text-micro`, piso
para chips, ayudas y códigos). No se usa `text-[Npx]`; el contrato lo prohíbe.

Las etiquetas de sección usan `overline-label` (11 px, mayúsculas, tracking
corto) y hay como máximo **cinco** en toda la app. Los iconos de sección van en
`IconWell` (`sm`/`md`), no en `div` con tinte escrito a mano.
```

- [ ] **Step 2: Audit**

Bajo `### Fase 5 · Tipografía y adornos`, agregar:

```markdown
> **Estado (2026-11-04):** ejecutada en `feat/fase-5-tipografia`. Escala fijada en
> 18/14/12/11 con `text-micro`; 44 tamaños arbitrarios eliminados (0 restantes).
> Overlines unificadas en `overline-label` y recortadas de 6 a 5. Cuadrados de
> icono unificados en `IconWell` (4 usos). El estado vacío inicial ganó la acción
> "Buscar terminal" (enfoca el buscador) y el escáner muestra skeletons mientras
> busca. Contrato: 0 tamaños arbitrarios y ≤5 overlines. Suite 394/394, build verde,
> `--strict` 0, ratchet 0/0/0/1.
```

Si el conteo difiere, anotar el real en el audit junto al esperado (394).

- [ ] **Step 3: Verificación completa**

```bash
npx vitest run
npm run build
npm run audit:contrast
node scripts/check-contrast.mjs --strict
npx vitest run src/test/designContract.test.ts
```

Expected: suite verde (**394**: 390 + 2 de `IconWell` + 1 del vacío + 1 de skeletons) · build verde · ambos contrastes exit 0 · ratchet **0/0/0/1**.

- [ ] **Step 4: Commit**

```bash
git add DESIGN.md docs/ui-slop-audit-2026-11-02.md
git commit -m "docs(design): escala tipografica y cierre de la fase 5"
```

---

## Criterios de aceptación

- [ ] Cero `text-[\d+(\.\d+)?px]` en `src/App.tsx` y `src/components/*.tsx`.
- [ ] `text-micro` existe en `src/index.css` y se usa en los 44 reemplazos.
- [ ] Cero `uppercase` manual y exactamente 5 `overline-label`.
- [ ] `IconWell` es el único patrón de cuadrado teñido (4 usos, ningún `div` con `bg-primary/10` + padding suelto).
- [ ] El estado vacío inicial enfoca el buscador con un clic.
- [ ] El escáner muestra ≥3 skeletons mientras escanea y ninguno al terminar.
- [ ] `npm test`, `npm run build`, `npm run audit:contrast` y `--strict` verdes; ratchet **0/0/0/1**.
- [ ] `DESIGN.md` documenta la escala y el límite de overlines.

## Hand-offs

| Pendiente | Por qué |
|---|---|
| Sign-off de tokens del preset y `--info` | Producto |
| Contraste de bordes no-texto (1,26–1,32:1) | Producto |
| `Card`/`Alert` sin uso en app (sólo catálogo) | Decidir keep/remove |
| Consolidar tests duplicados de `QuickActionsBar` | Limpieza |
| `manualChunks` para el bundle de ~563 kB | Performance (preexistente) |
