# Fase 2 — Superficies, densidad y semántica de color · Implementation Plan

> **Estado (2026-11-03):** ejecutado completo (T0-T9) en `feat/fase-2-superficies`. Resultado medido: paleta fija 95 → 0, sombras propias 15 → 0, radios pelados 9 → 0, `z-50` 5 → 4; ratchet en 0/0/0/4; `--strict` en 0 con `EXCEPTIONS` vacío; suite 361/361; build verde. Los desvíos y la evidencia están registrados en §Fase 2 de `docs/ui-slop-audit-2026-11-02.md`.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** reemplazar el markup propio por las primitivas ya instaladas (`Card`, `Alert`, `Input`, `Collapsible`, `Empty`, `Skeleton`, `Field`) y mapear los 95 colores fijos de la app a tokens semánticos, bajando el ratchet de contrato sin tocar la tipografía ni la estructura de navegación.

**Architecture:** Fase 2 trabaja sobre componentes de producto existentes, uno por task, con dos reglas fijas: (a) toda superficie, alerta, input o estado vacío nuevo usa la primitiva de `src/components/ui/`; (b) ningún color literal sobrevive, se mapea a `--success`, `--warning`, `--destructive`, `--primary`, `--link` (nuevo), `--info` o `--console-*`. El ratchet de `designContract.test.ts` se baja en cada task, nunca se sube.

**Tech Stack:** React 19 · Vite 6 · TypeScript 5.7 · Tailwind 4 · `radix-ui@1.8.1` · shadcn 4.23.0 (pin) · Vitest 3 + Testing Library · Electron 34.

**Prerrequisito:** `main` en `c6341e6` (Fase 0 y Fase 1 mergeadas). Estado: 27 primitivas en `ui/`, guard 10/10, suite 341/341, build verde, ratchet 95/18/9/5, contraste con 5 excepciones documentadas.

---

## Estado de partida (medido)

| Hecho | Valor | Evidencia |
|---|---|---|
| Paleta fija en app | **95** clases (11 más en `ui/**`) | `designContract.test.ts` |
| Sombras propias | **18** | ídem |
| Radios fuera de escala | **9** (todos `rounded` pelado) | ídem |
| `z-50` manuales | **5** | ídem |
| Consola | altura fija 384 px, 4 botones de igual peso | `LivePingConsole.tsx:328-330` |
| Barra | 11 controles, 4 split buttons | `QuickActionsBar.tsx:150-519` |
| Superficies tipo card a mano | **6** | audit §7.1, `DesignContract` no las cuenta |
| Feedback | `actionFeedback` se pasa y no se renderiza | `QuickActionsBar.tsx:71` |
| Paleta | `--info` sigue inventado, sin `--link` para texto en oscuro | `index.css` |

---

## File Structure

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `src/index.css` | modificar | Token `--link` y su mapping; retiro de `--info` al final del mapeo |
| `src/components/TerminalDetailsGrid.tsx` | modificar | `Card` en la grilla de datos |
| `src/components/LivePingConsole.tsx` | modificar | `Card` + `Collapsible` + colores semánticos |
| `src/components/ActivityPanel.tsx` | modificar | `Card` contenedor de la tabla |
| `src/components/InfoModal.tsx` | modificar | `Card` para el bloque de capacidades |
| `src/components/OperatorContextMenu.tsx` | modificar | `Card`/superficie de menú + colores |
| `src/components/SubnetScannerDrawer.tsx` | modificar | `Card` de host + `Input` + colores |
| `src/components/Topbar.tsx` | modificar | `link` en vez de `blue-*`; badge de conexión con tokens |
| `src/components/QuickActionsBar.tsx` | modificar | 2 acciones + menú "Más" + `Alert` inline + colores |
| `src/components/SettingsModal.tsx` | modificar | `Switch`/`ToggleGroup` + colores + `Progress` |
| `src/components/ActivityDialogs.tsx` | modificar | `FieldGroup`/`Field` + a11y |
| `src/components/NetUserChooserDialog.tsx` | modificar | `Field` + `RadioGroup` no aplica: `ToggleGroup`/radios dentro de `Field` |
| `src/App.tsx` | modificar | `Empty` + `Skeleton` |
| `src/components/TerminalIdentity.tsx` | modificar | colores de acciones |
| `src/test/designContract.test.ts` | modificar | bajar el baseline en cada task |
| `src/components/ui/*.tsx` | modificar | colores literales dentro de primitivas (`alert`, `sonner`) |

**Fuera de alcance:** tipografía 18/14/12/11 (Fase 5), migrar el buscador a `Command`, drawer a `Sheet`, menú a `ContextMenu` (Fase 3), agenda/estados vacíos de producto distintos a los dos de `App.tsx`.

---

### Task 0: Rama y baseline

**Files:** ninguno.

- [ ] **Step 1: Verificar limpio y crear rama**

```bash
git status --porcelain
git switch -c feat/fase-2-superficies
```

- [ ] **Step 2: Anotar el punto de partida**

```bash
npx vitest run
npm run build
npm run audit:contrast
```
Expected: 341 tests · build verde · contraste exit 0. Anotar los tres; son la línea base.

---

### Task 1: Token `--link` para texto de acento

**Files:**
- Modify: `src/index.css`
- Test: `src/test/shadcnConfig.test.ts` (una aserción)

El `--primary` oscuro del sitio (`oklch(0.424 …)`) no sirve como texto: 2.03:1 sobre card, y es una de las 5 excepciones documentadas. Los 35 usos de `text-blue-*` necesitan un token que funcione en ambos temas. `--sidebar-primary` ya tiene esos valores (5.26 claro / 4.76 oscuro), pero el nombre no dice nada; se expone como `--link`.

- [ ] **Step 1: Agregar el token**

En `:root` de `src/index.css`, junto a los demás semánticos:

```css
  /* Texto de acento: enlaces, acciones remotas, iconos interactivos */
  --link: oklch(0.546 0.245 262.881);
```

En `.dark`:

```css
  --link: oklch(0.623 0.214 259.815);
```

En `@theme inline`:

```css
  --color-link: var(--link);
```

- [ ] **Step 2: Test que lo fija**

En `src/test/shadcnConfig.test.ts`:

```ts
  it("expone el token link en ambos temas", () => {
    const css = fs.readFileSync(path.resolve(root, "src/index.css"), "utf-8");
    expect(css.match(/--link:\s*oklch\(/g)?.length).toBe(2);
    expect(css).toContain("--color-link: var(--link);");
  });
```

- [ ] **Step 3: Correr**

Run: `npx vitest run src/test/shadcnConfig.test.ts`
Expected: 11/11.

- [ ] **Step 4: Commit**

```bash
git add src/index.css src/test/shadcnConfig.test.ts
git commit -m "feat(theme): token link para texto de acento en ambos temas"
```

---

### Task 2: `Card` en las seis superficies

**Files:**
- Modify: `TerminalDetailsGrid.tsx:46`, `LivePingConsole.tsx:226`, `ActivityPanel.tsx:188`, `InfoModal.tsx:95`, `OperatorContextMenu.tsx:79`, `SubnetScannerDrawer.tsx:269`
- Test: `src/test/CardSurfaces.test.tsx` (crear)

- [ ] **Step 1: Test que falla**

```tsx
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { TerminalDetailsGrid } from "@/components/TerminalDetailsGrid";
import { TerminalData } from "@/types/terminal";
import { getAllTerminals } from "@/services/terminalService";

const terminal = getAllTerminals()[0] as TerminalData;

describe("superficies con Card", () => {
  it("la grilla de datos usa la primitiva Card", () => {
    const { container } = render(<TerminalDetailsGrid terminal={terminal} />);
    expect(container.querySelectorAll('[data-slot="card"]').length).toBe(1);
    expect(container.querySelector('[data-slot="card-title"]')).not.toBeNull();
  });
});
```

- [ ] **Step 2: Correr y ver el rojo**

Run: `npx vitest run src/test/CardSurfaces.test.tsx`
Expected: FAIL (`0` cards).

- [ ] **Step 3: Reemplazar la superficie en `TerminalDetailsGrid.tsx`**

Antes (líneas 42-53):

```tsx
  return (
    <section
      data-testid="terminal-details"
      aria-labelledby="terminal-details-title"
      className="rounded-lg border border-border bg-card px-3 py-2.5"
    >
      <h2
        id="terminal-details-title"
        className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
      >
        Datos del equipo
      </h2>
```

Después:

```tsx
  return (
    <Card
      data-testid="terminal-details"
      aria-labelledby="terminal-details-title"
      className="px-3 py-2.5"
    >
      <h2
        id="terminal-details-title"
        className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
      >
        Datos del equipo
      </h2>
```

`Card` renderiza un `div` con `data-slot="card"`; acepta `data-testid` y `aria-labelledby` porque el resto de props se spreadea. Agregar `import { Card } from "@/components/ui/card";`.

- [ ] **Step 4: Repetir en las otras cinco superficies**

Mismo patrón: reemplazar el `div`/`section` con `className="rounded-lg border border-border bg-card …"` por `Card` conservando `className` de padding y los atributos (`data-testid`, `data-slot`, `role`, `aria-*`).

| Archivo | Línea | Atributos a conservar |
|---|---|---|
| `LivePingConsole.tsx` | 226 | ninguno extra |
| `ActivityPanel.tsx` | 188 | ninguno extra |
| `InfoModal.tsx` | 95 | ninguno extra |
| `OperatorContextMenu.tsx` | 79 | `style` inline, `ref` |
| `SubnetScannerDrawer.tsx` | 269 | `key`, `group` |

En `OperatorContextMenu` el `Card` debe ir con `ref` y `style`: `Card` no reenvía `ref`, así que se envuelve en un `div` con `ref` y `style` y el `Card` va adentro. Verificar con `npm run build` que no queda ningún `rounded-lg border border-border bg-card` en `src/`:

```powershell
Select-String -Path src\components\*.tsx,src\App.tsx -Pattern 'rounded-lg border border-border bg-card'
```
Expected: sin resultados.

- [ ] **Step 5: Suite y build**

```bash
npx vitest run
npm run build
```
Expected: 342 tests (341 + el nuevo) · build verde.

- [ ] **Step 6: Commit**

```bash
git add src/components src/test/CardSurfaces.test.tsx
git commit -m "refactor(ui): Card en las seis superficies hechas a mano"
```

---

### Task 3: `Alert` inline y muerte del toast "Acción disparada"

**Files:**
- Modify: `QuickActionsBar.tsx:71,108-111`; `App.tsx:643-656` (pasar el feedback)
- Test: `src/components/QuickActionsBar.test.tsx` (agregar un caso)

- [ ] **Step 1: Test que falla**

En `QuickActionsBar.test.tsx`, un caso nuevo:

```tsx
  it("muestra el feedback inline cuando recibe actionFeedback", () => {
    render(
      <QuickActionsBar
        terminal={mockTerminal}
        isPinging={false}
        onLaunchVnc={vi.fn()}
        onLaunchMsra={vi.fn()}
        onTogglePing={vi.fn()}
        actionFeedback={{ type: "success", message: "VNC iniciado hacia 10.0.0.5" }}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("VNC iniciado");
  });
```

- [ ] **Step 2: Rojo**

Run: `npx vitest run src/components/QuickActionsBar.test.tsx -t "feedback inline"`
Expected: FAIL (`Unable to find role="status"`).

- [ ] **Step 3: Renderizarlo**

En `QuickActionsBar.tsx`, dentro del contenedor raíz y después de la barra:

```tsx
      {actionFeedback && (
        <div role="status" aria-live="polite" className="w-full">
          <Alert
            variant={
              actionFeedback.type === "error"
                ? "destructive"
                : actionFeedback.type === "warning"
                  ? "warning"
                  : actionFeedback.type === "success"
                    ? "success"
                    : "default"
            }
          >
            <AlertTitle>{actionFeedback.type === "error" ? "Error" : "Listo"}</AlertTitle>
            <AlertDescription>{actionFeedback.message}</AlertDescription>
          </Alert>
        </div>
      )}
```

Agregar `import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";`.

- [ ] **Step 4: Matar el toast de relleno**

En `handleAction`, borrar el `toast.info(...)` y dejar solo `callback()`:

```tsx
  const handleAction = (_label: string, callback: () => void): void => {
    callback();
  };
```

Si `toast` queda sin uso en el archivo, borrar el import.

- [ ] **Step 5: Verde y suite**

```bash
npx vitest run src/components/QuickActionsBar.test.tsx
npm test
```
Expected: el caso nuevo pasa; suite verde (343).

- [ ] **Step 6: Commit**

```bash
git add src/components/QuickActionsBar.tsx src/components/QuickActionsBar.test.tsx
git commit -m "feat(ui): feedback inline con Alert y sin toast duplicado"
```

---

### Task 4: `Input` en el filtro del drawer

**Files:**
- Modify: `SubnetScannerDrawer.tsx:219-225`
- Test: `src/test/SubnetScannerDrawer.test.tsx` (agregar aserción)

- [ ] **Step 1: Test**

```tsx
  it("el filtro usa la primitiva Input", () => {
    render(
      <SubnetScannerDrawer
        isOpen
        onClose={vi.fn()}
        targetIp="10.0.0.5"
        onSelectTerminal={vi.fn()}
      />,
    );
    expect(screen.getByPlaceholderText(/Filtrar equipos/i)).toHaveAttribute(
      "data-slot",
      "input",
    );
  });
```

- [ ] **Step 2: Rojo**

Run: `npx vitest run src/test/SubnetScannerDrawer.test.tsx -t "primitiva Input"`
Expected: FAIL (el `<input>` propio no tiene `data-slot="input"`).

- [ ] **Step 3: Reemplazar el `<input>`**

Antes:

```tsx
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Filtrar equipos detectados..."
              className="w-full h-8 pl-8 pr-3 text-xs rounded-md bg-muted/60 border border-input text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-ring"
            />
```

Después:

```tsx
            <Input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Filtrar equipos detectados..."
              className="h-8 pl-8 pr-3 text-xs bg-muted/60 font-mono"
            />
```

Import: `import { Input } from "@/components/ui/input";`.

- [ ] **Step 4: Verde**

```bash
npx vitest run src/test/SubnetScannerDrawer.test.tsx
npm test
```
Expected: verde (344).

- [ ] **Step 5: Commit**

```bash
git add src/components/SubnetScannerDrawer.tsx src/test/SubnetScannerDrawer.test.tsx
git commit -m "refactor(ui): Input en el filtro del escaner de subred"
```

---

### Task 5: Consola colapsable

**Files:**
- Modify: `LivePingConsole.tsx` (viewport + header)
- Test: `src/test/LivePingConsole.test.tsx` (agregar dos casos)

- [ ] **Step 1: Tests**

```tsx
  it("arranca colapsada y no renderiza el viewport", () => {
    render(
      <LivePingConsole ip="10.0.0.5" isPinging={false} onTogglePing={vi.fn()} />,
    );
    expect(screen.queryByTestId("terminal-scroll-container")).toBeNull();
    expect(screen.getByRole("button", { name: /consola/i })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("se expande al hacer click en el encabezado", () => {
    render(
      <LivePingConsole ip="10.0.0.5" isPinging={false} onTogglePing={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /consola/i }));
    expect(screen.getByTestId("terminal-scroll-container")).toBeInTheDocument();
  });
```

Import `fireEvent` si el archivo no lo tiene.

- [ ] **Step 2: Rojo**

Run: `npx vitest run src/test/LivePingConsole.test.tsx -t "colapsada"`
Expected: FAIL (el viewport existe siempre).

- [ ] **Step 3: Envolver en `Collapsible`**

En el componente, agregar estado y el trigger en la cabecera:

```tsx
  const [isOpen, setIsOpen] = useState(false);
```

El contenedor raíz pasa a:

```tsx
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className={`w-full rounded-lg border border-border bg-card overflow-hidden ${
        fill ? "flex h-full min-h-0 flex-col" : "shrink-0"
      }`}
    >
```

La cabecera actual se envuelve:

```tsx
      <CollapsibleTrigger asChild>
        <button
          type="button"
          aria-label="Consola"
          className="flex w-full items-center justify-between px-3 py-2 border-b border-border bg-muted/40 text-left cursor-pointer"
        >
          {/* contenido actual del header: icono, label y controles */}
        </button>
      </CollapsibleTrigger>
```

Los botones internos del header (Detener / Limpiar / Copiar) siguen funcionando: están dentro del trigger pero llaman `stopPropagation` en su `onClick`.

Y el viewport:

```tsx
      <CollapsibleContent>
        <div
          ref={scrollContainerRef}
          data-testid="terminal-scroll-container"
          className={`${
            fill ? "flex-1 min-h-0" : "h-[clamp(24rem,55vh,48rem)] min-h-[24rem]"
          } overflow-y-auto overflow-x-auto p-3.5 bg-console-bg font-mono text-[11.5px] leading-relaxed text-console-muted select-text`}
        >
```

- [ ] **Step 4: `stopPropagation` en los controles del header**

Cada botón del header (Detener, Reintentar, Limpiar, Copiar) recibe:

```tsx
              onClick={(event) => {
                event.stopPropagation();
                handleStop();
              }}
```

Sin esto, cualquier click en un control también abre/cierra la consola.

- [ ] **Step 5: Verde y suite**

```bash
npx vitest run src/test/LivePingConsole.test.tsx
npm test
```
Expected: verde (346).

- [ ] **Step 6: Commit**

```bash
git add src/components/LivePingConsole.tsx src/test/LivePingConsole.test.tsx
git commit -m "feat(console): consola colapsable con Collapsible"
```

---

### Task 5b: Barra de dos acciones + menú "Más"

**Files:**
- Modify: `QuickActionsBar.tsx:150-520`
- Test: `src/components/QuickActionsBar.test.tsx` (agregar dos casos)

Hoy la barra expone 11 controles con el mismo peso. La corrección es dejar dos acciones visibles (Conectar y Ping) y mover el resto a un `Popover` etiquetado "Más". No se instala nada nuevo: `popover` ya está en `src/components/ui/`.

- [ ] **Step 1: Tests**

```tsx
  it("expone solo las dos acciones primarias", () => {
    render(
      <QuickActionsBar
        terminal={mockTerminal}
        isPinging={false}
        onLaunchVnc={vi.fn()}
        onLaunchMsra={vi.fn()}
        onTogglePing={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /conectar/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^ping$/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /escanear subred/i })).toBeNull();
  });

  it("el menú Mas contiene las acciones secundarias", () => {
    render(
      <QuickActionsBar
        terminal={mockTerminal}
        isPinging={false}
        onOpenSubnetScanner={vi.fn()}
        onLaunchVnc={vi.fn()}
        onLaunchMsra={vi.fn()}
        onTogglePing={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /más/i }));
    expect(
      screen.getByRole("button", { name: /escanear subred/i }),
    ).toBeInTheDocument();
  });
```

- [ ] **Step 2: Rojo**

Run: `npx vitest run src/components/QuickActionsBar.test.tsx -t "dos acciones"`
Expected: FAIL (hoy "Escanear Subred" está siempre visible).

- [ ] **Step 3: Reestructurar el render**

La barra queda:

```tsx
    <div className="w-full flex flex-col gap-1">
      <div className="flex items-center gap-1.5 w-full">
        {/* 1. Conectar: primaria */}
        <div className="relative flex items-center flex-1 grow" ref={dropdownRef}>
          {/* el split button actual, sin cambios */}
        </div>

        {/* 2. Ping: primaria */}
        <div className="flex rounded-md flex-1 grow">
          {/* el split button de ping actual, sin cambios */}
        </div>

        {/* 3. Todo lo demás, en un solo menú */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5" aria-label="Más acciones">
              <MoreHorizontal className="h-3.5 w-3.5" />
              <span className="text-xs">Más</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64 p-1">
            <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground">
              Diagnóstico
            </div>
            {/* nbtstat / tracert / arp como Button ghost full-width */}
            <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground">
              Enlaces del sitio
            </div>
            {/* .250 y .231, cada uno con su variante -t */}
            <Separator className="my-1" />
            {/* Escanear subred y refrescar uptime */}
          </PopoverContent>
        </Popover>

        {/* 4. Uptime como chip de estado, sin botón de refresco aparte */}
      </div>
      {/* feedback inline de Task 3 */}
    </div>
```

Los handlers existentes (`onRunDiagnostic`, `onLaunchSitePing`, `onOpenSubnetScanner`, `onRefreshUptime`) se conectan tal cual dentro del `PopoverContent`; no cambia ningún callback. Los atajos `F2`/`F4` siguen dibujados como `Kbd` en los dos botones primarios.

- [ ] **Step 4: Verde**

```bash
npx vitest run src/components/QuickActionsBar.test.tsx
npm test
```
Expected: verde (los dos casos nuevos + los existentes ajustados si asertaban botones que ahora están en el menú).

- [ ] **Step 5: Commit**

```bash
git add src/components/QuickActionsBar.tsx src/components/QuickActionsBar.test.tsx
git commit -m "refactor(ui): dos acciones primarias y el resto en menu Mas"
```

---

### Task 6: Mapeo de colores, por componente

**Files:** `Topbar.tsx`, `QuickActionsBar.tsx`, `LivePingConsole.tsx`, `OperatorContextMenu.tsx`, `SubnetScannerDrawer.tsx`, `SettingsModal.tsx`, `TerminalIdentity.tsx`, `NetworkAdCard.tsx`, `HardwareCard.tsx`, `ThemeToggle.tsx`, `ui/alert.tsx`, `ui/sonner.tsx`.

Tabla de equivalencias (única fuente):

| Hoy | Token | Uso |
|---|---|---|
| `text-blue-600 dark:text-blue-400`, `text-blue-500` | `text-link` | enlaces, acciones remotas |
| `bg-blue-500`, `bg-emerald-500`, `bg-amber-500` (puntos de estado) | `bg-success` / `bg-warning` / `bg-destructive` | puntos |
| `text-emerald-500/600/400` | `text-success` | alcanzable, copiado |
| `text-amber-500/600/400` | `text-warning` | sin acceso, degradado |
| `text-red-400`, `text-destructive` | `text-destructive` | error, detenido |
| `text-cyan-300/400/500` | `text-info` | diagnóstico en consola |
| `bg-emerald-500/15`, `bg-amber-500/15` | `bg-success/15`, `bg-warning/15` | tintes |
| `text-emerald-600` sobre `bg-emerald-500/15` | `text-success` sobre `bg-success/15` | badges (contraste AA en ambos) |

- [ ] **Step 1: Aplicar por archivo y contar**

Orden: `Topbar` (18), `QuickActionsBar` (21), `LivePingConsole` (11), `OperatorContextMenu` (10), `SubnetScannerDrawer` (10), `SettingsModal` (10), `NetworkAdCard` (7), `HardwareCard` (3), `ThemeToggle` (3), `App` (2), `ui/alert` (8), `ui/sonner` (3).

Para cada archivo:

```powershell
Select-String -Path src\components\Topbar.tsx -Pattern '(?:text|bg|border)-(?:blue|emerald|amber|cyan|red|slate|zinc|green|purple|pink)-\d{3}'
```

Reemplazar cada coincidencia según la tabla, sin cambiar estructura ni tamaños. Al terminar el archivo:

```powershell
npx vitest run <test del componente>
```

- [ ] **Step 2: Verificar que no queda ninguna**

```powershell
Select-String -Path src\App.tsx,src\components\*.tsx -Pattern '(?:text|bg|border|ring)-(?:blue|emerald|amber|cyan|red|slate|zinc|green|purple|pink)-\d{2,3}'
```
Expected: sin resultados en app. En `ui/**` sólo las que la tabla no cubra.

- [ ] **Step 3: Bajar el ratchet**

Medir y actualizar `BASELINE` en `src/test/designContract.test.ts`:

```powershell
$files = Get-ChildItem src -Recurse -File -Include *.tsx | Where-Object { $_.FullName -notmatch '\\ui\\|\.test\.' }
($files | ForEach-Object { ([regex]::Matches((Get-Content $_.FullName -Raw), '\b(?:text|bg|border|ring)-(?:blue|emerald|amber|cyan|red|slate|zinc|green|purple|pink)-\d{2,3}\b')).Count } | Measure-Object -Sum).Sum
```

Poner ese número (esperado **0**, o el residuo justificado) en `palette`.

- [ ] **Step 4: Contraste sin excepciones**

```bash
npm run audit:contrast
node scripts/check-contrast.mjs --strict
```
Objetivo de la fase: `--strict` sale **0**. Si sigue fallando, la causa está en una de las 5 excepciones de `EXCEPTIONS`: resolverla (chips `bg-muted` a `bg-card`, `destructive` sólido, `text-primary` a `text-link`) y **borrar la entrada** de la lista en el mismo commit.

- [ ] **Step 5: Commit**

```bash
git add src
git commit -m "refactor(theme): mapear la paleta fija a tokens semanticos"
```

---

### Task 7: `Empty` y `Skeleton` en `App.tsx`

**Files:**
- Modify: `App.tsx:672-741`
- Test: `src/test/AppInitialState.test.tsx` (ajustar/agregar)

- [ ] **Step 1: Test**

```tsx
  it("el estado inicial usa la primitiva Empty", () => {
    render(<App />);
    expect(screen.getByText(/Buscar una terminal/i).closest('[data-slot="empty"]')).not.toBeNull();
  });
```

- [ ] **Step 2: Rojo**

Run: `npx vitest run src/test/AppInitialState.test.tsx -t "primitiva Empty"`
Expected: FAIL.

- [ ] **Step 3: Reemplazar los dos bloques**

El bloque de carga (`App.tsx:672-678`):

```tsx
          {isLoading ? (
            <div className="flex-1 w-full min-h-80 flex flex-col items-center justify-center gap-3 p-6">
              <Skeleton className="h-7 w-7 rounded-full" />
              <Skeleton className="h-3 w-64" />
            </div>
          ) : !terminal && accountQuery ? (
```

El bloque "no encontrada" y el inicial:

```tsx
          ) : notFoundTerm ? (
            <Empty className="flex-1 border border-dashed">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <SearchX aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>No se encontró la terminal “{notFoundTerm}”</EmptyTitle>
                <EmptyDescription>
                  No existe un registro técnico para este equipo o dirección IP
                  en la base corporativa.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button variant="outline" size="sm" onClick={handleClearSearch}>
                  <RotateCcw data-icon="inline-start" />
                  Limpiar búsqueda
                </Button>
              </EmptyContent>
            </Empty>
          ) : !terminal ? (
            <Empty className="flex-1 border border-dashed">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Search aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>Buscar una terminal para comenzar</EmptyTitle>
                <EmptyDescription>
                  Ingresá el Hostname o IP en la barra superior para consultar el
                  inventario técnico.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
```

Imports: `Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle` desde `@/components/ui/empty`; `Skeleton` desde `@/components/ui/skeleton`.

- [ ] **Step 4: Verde y suite**

```bash
npx vitest run src/test/AppInitialState.test.tsx
npm test
```
Expected: verde.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/test/AppInitialState.test.tsx
git commit -m "refactor(app): estados vacios con Empty y carga con Skeleton"
```

---

### Task 8: `Field` en los formularios, con accesibilidad

**Files:**
- Modify: `ActivityDialogs.tsx` (3 diálogos), `NetUserChooserDialog.tsx`
- Test: `src/test/ActivityDialogs.test.tsx` (agregar)

- [ ] **Step 1: Test de accesibilidad**

```tsx
  it("el campo de título está cableado con label y descripción", () => {
    render(<NewAlertDialog open onOpenChange={vi.fn()} onSubmit={vi.fn()} />);
    const input = screen.getByLabelText("Título");
    expect(input).toHaveAttribute("aria-invalid", "false");
    expect(input).toHaveAttribute("aria-describedby", "new-alert-title-help");
  });
```

- [ ] **Step 2: Rojo**

Run: `npx vitest run src/test/ActivityDialogs.test.tsx -t "cableado"`
Expected: FAIL (no hay `aria-describedby`).

- [ ] **Step 3: Reemplazar el formulario**

En `NewAlertDialog`, el `<form>` pasa a:

```tsx
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <FieldGroup>
            <Field data-invalid={title.length > 0 && !valid}>
              <FieldLabel htmlFor="new-alert-title">Título</FieldLabel>
              <Input
                id="new-alert-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                aria-invalid={title.length > 0 && !valid}
                aria-describedby="new-alert-title-help"
                autoFocus
              />
              <FieldDescription id="new-alert-title-help">
                Título breve del incidente.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="new-alert-description">Descripción</FieldLabel>
              <Textarea
                id="new-alert-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
                className="resize-none"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="new-alert-operator">Operador</FieldLabel>
              <Input
                id="new-alert-operator"
                value={operator}
                onChange={(event) => setOperator(event.target.value)}
                className="font-mono"
              />
            </Field>
          </FieldGroup>
        </form>
```

Repetir el patrón en `RequestResetDialog`, `CloseAlertDialog` y `NetUserChooserDialog` (este último con sus radios dentro de un `Field`, y `FieldLabel` para el grupo).

- [ ] **Step 4: Verde**

```bash
npx vitest run src/test/ActivityDialogs.test.tsx src/test/NetUserFlow.test.tsx
npm test
```
Expected: verde.

- [ ] **Step 5: Commit**

```bash
git add src/components/ActivityDialogs.tsx src/components/NetUserChooserDialog.tsx src/test
git commit -m "refactor(forms): Field con label, descripcion y aria-invalid"
```

---

### Task 9: Cierre

**Files:** `docs/ui-slop-audit-2026-11-02.md`, este plan.

- [ ] **Step 1: Verificación completa**

```bash
npx vitest run
npm run build
npm run audit:contrast
node scripts/check-contrast.mjs --strict
```
Expected: suite verde · build verde · **ambos** comandos de contraste exit 0 (sin excepciones).

- [ ] **Step 2: Medir el ratchet final**

Anotar `palette`, `shadow`, `rounded`, `zIndex` reales. Objetivo: `palette` 0–5, `shadow` ≤ 6 (las 7 de `ui/**` no cuentan), `rounded` ≤ 3.

- [ ] **Step 3: Registrar**

En `docs/ui-slop-audit-2026-11-02.md`, bajo `### Fase 2`, agregar:

```markdown
> **Estado (2026-11-03):** ejecutada. Card en 6 superficies · feedback inline · consola colapsable · paleta 95 → N · `--strict` en 0 · ratchet N/M/K.
```

- [ ] **Step 4: Commit**

```bash
git add docs
git commit -m "docs(audit): registrar ejecucion de la fase 2"
```

---

## Criterios de aceptación

- [ ] `node scripts/check-contrast.mjs --strict` → exit 0 y `EXCEPTIONS` vacío.
- [ ] `npm test` y `npm run build` verdes.
- [ ] Cero `(text|bg|border|ring)-(blue|emerald|amber|cyan|red)-\d{3}` en `src/App.tsx` y `src/components/*.tsx`.
- [ ] Cero `rounded-lg border border-border bg-card` en app.
- [ ] La consola arranca colapsada y conserva el viewport oscuro.
- [ ] Los formularios tienen `FieldLabel` + `aria-describedby`.
- [ ] Ratchet solo bajó.

## Hand-offs a Fase 3

| Pendiente | Por qué |
|---|---|
| Buscador a `Command` + `Popover` | Fase 3 |
| Drawer a `Sheet`, menú a `ContextMenu`, 44 `title=` a `Tooltip` | Fase 3 |
| `Sheet`/`AlertDialog` con `Title` del consumidor | Al adoptarlos |
| `toggle-group` orientation y `command` `data-checked` | Al usarlos |
| `cn-*` utilities ausentes en 4.23.0 | Antes del `eject` (T9 de Fase 1, pendiente) |
| Tipografía 18/14/12/11 | Fase 5 |
