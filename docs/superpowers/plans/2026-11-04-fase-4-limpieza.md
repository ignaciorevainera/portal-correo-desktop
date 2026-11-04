# Fase 4 — Limpieza y deuda de accesibilidad · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** borrar los tres componentes muertos que sostienen tests (`Sidebar`, `HardwareCard`, `NetworkAdCard`), retirar la infraestructura de tooltips que quedó sin consumidores tras la reversión, y cerrar la deuda chica de accesibilidad detectada en las reviews de Fase 3 (menú sin nombre accesible, `activeValue` colgado al borrar una fila, ids inválidos y dos props muertas).

**Architecture:** trabajo de sustracción, un bloque por task: primero los componentes que no importa nadie y sus tests, después la infraestructura de tooltips, y al final dos ajustes puntuales en `Topbar` y `OperatorContextMenu`. No se toca ningún token, primitiva de `src/components/ui/**` (salvo borrar `tooltip.tsx`, que queda sin importadores), ni comportamiento visible salvo los dos fixes de accesibilidad.

**Tech Stack:** React 19 · Vite 6 · TypeScript 5.7 · Tailwind 4 · radix-ui 1.8.1 · Vitest 3 + Testing Library · Electron 34.

**Prerrequisito:** `main` en `f910d92`. Estado medido: **393** tests en 64 archivos, build verde, `audit:contrast` y `--strict` en exit 0, ratchet **0/0/0/1**.

**Fuera de alcance:** Fase 5 (escala tipográfica 18/14/12/11, overlines, iconos en cuadrado teñido, skeletons de producto) · sign-off de los cuatro tokens del preset y de `--info` · contraste de bordes no-texto (1,26–1,32:1) · migrar el desplegable de conexión remota de `QuickActionsBar` a `Popover` (deuda declarada, no de esta fase).

---

## Estado de partida (medido)

| Hecho | Valor | Evidencia |
|---|---|---|
| Componentes sin import en la app | **3**: `Sidebar` (107 líneas), `HardwareCard` (151), `NetworkAdCard` (139) | `Select-String` sobre `App.tsx` y `components/*.tsx` |
| Tests que los sostienen | **4 archivos**: `Sidebar.test.tsx`, `TerminalCards.test.tsx` (colocado), `CardsContrastCopy.test.tsx`, y `ShadcnPreset.test.tsx` que los renderiza | grep de imports |
| `TooltipProvider` | montado en `main.tsx:19-21`, sin consumidores | tras la reversión de tooltips |
| `ui/tooltip.tsx` | sin importadores fuera de `main.tsx` y su test | grep `ui/tooltip` |
| `onDirectPing` | declarado en `Topbar` y pasado desde `App.tsx:620`, nunca usado | `Topbar.tsx:58,74` |
| `onFocusSearch` | en la interfaz del menú, nunca pasado por `App` | `OperatorContextMenu.tsx` |
| Menú contextual | `role="menu"` sin nombre accesible | `OperatorContextMenu.tsx:52,64` |
| Id de opción | interpola el valor crudo (`terminal-search-option-PC A`) | `Topbar.tsx:327,390` |
| Borrar fila activa | no resetea `activeValue` → `aria-activedescendant` colgado | `Topbar.tsx:429-434` |

---

## File Structure

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `src/components/Sidebar.tsx` | borrar | navegación lateral muerta |
| `src/test/Sidebar.test.tsx` | borrar | sostenía el componente muerto |
| `src/components/HardwareCard.tsx` | borrar | tarjeta de hardware muerta |
| `src/components/NetworkAdCard.tsx` | borrar | tarjeta de red muerta |
| `src/components/TerminalCards.test.tsx` | borrar | test colocado de ambas tarjetas |
| `src/test/CardsContrastCopy.test.tsx` | borrar | test de ambas tarjetas |
| `src/test/ShadcnPreset.test.tsx` | modificar | deja de renderizar las tarjetas; conserva las aserciones de slots de Topbar/QuickActionsBar |
| `src/main.tsx` | modificar | sin `TooltipProvider` |
| `src/test/TooltipProvider.test.tsx` | borrar | guard de una infraestructura que ya no existe |
| `src/components/ui/tooltip.tsx` | borrar | primitiva sin importadores |
| `src/components/Topbar.tsx` | modificar | ids válidos, reset al borrar, sin `onDirectPing` |
| `src/App.tsx` | modificar | sin `handleDirectPing` ni su prop |
| `src/components/OperatorContextMenu.tsx` | modificar | `aria-label` del menú, sin `onFocusSearch` |
| `src/test/OperatorContextMenu.test.tsx` | modificar | nombre accesible + navegación con flechas |
| `src/test/TopbarSearchNavigation.test.tsx` | modificar | ids válidos + reset del activo |
| `DESIGN.md` | modificar | estándares de menú y cierre de deudas |
| `docs/ui-slop-audit-2026-11-02.md` | modificar | estado de Fase 4 |

---

### Task 0: Rama y baseline

**Files:** ninguno.

- [ ] **Step 1: Verificar limpio y crear rama**

```bash
git status --porcelain
git switch -c feat/fase-4-limpieza
```

Expected: sólo `M electron/main.cjs` (ajeno; no se toca). La rama nace de `f910d92`.

- [ ] **Step 2: Anotar el punto de partida**

```bash
npx vitest run
npm run build
node scripts/check-contrast.mjs --strict
```

Expected: **393** tests · build verde · `--strict` exit 0 (`Texto: 0 · UI: 3 · Tokens ausentes: 0`).

---

### Task 1: Borrar `Sidebar`

**Files:**
- Delete: `src/components/Sidebar.tsx`, `src/test/Sidebar.test.tsx`

`ActiveTab` sólo se usa dentro de `Sidebar.tsx` (verificado: no hay otro import). Nada más lo referencia.

- [ ] **Step 1: Confirmar que nadie lo importa**

```powershell
Select-String -Path src\App.tsx,src\components\*.tsx,src\test\*.tsx -Pattern 'from ["''].*Sidebar["'']' | Where-Object { $_.Filename -ne 'Sidebar.test.tsx' }
```

Expected: sin resultados.

- [ ] **Step 2: Borrar**

```bash
git rm src/components/Sidebar.tsx src/test/Sidebar.test.tsx
```

- [ ] **Step 3: Verificar que compila y la suite no lo menciona**

```bash
npx tsc --noEmit
npx vitest run
```

Expected: `tsc` exit 0; suite verde con **3 tests menos** (los de `Sidebar.test.tsx`).

- [ ] **Step 4: Commit**

```bash
git commit -m "chore(ui): borrar Sidebar muerto y su test"
```

---

### Task 2: Borrar `HardwareCard`, `NetworkAdCard` y sus tests

**Files:**
- Delete: `src/components/HardwareCard.tsx`, `src/components/NetworkAdCard.tsx`, `src/components/TerminalCards.test.tsx`, `src/test/CardsContrastCopy.test.tsx`
- Modify: `src/test/ShadcnPreset.test.tsx`

`ShadcnPreset.test.tsx` los renderiza sólo para contar slots; hay que reemplazar ese bloque, sin borrar la cobertura de `Card` que ya existe en el test de catálogo del mismo archivo.

- [ ] **Step 1: Borrar los componentes y sus dos tests**

```bash
git rm src/components/HardwareCard.tsx src/components/NetworkAdCard.tsx src/components/TerminalCards.test.tsx src/test/CardsContrastCopy.test.tsx
```

- [ ] **Step 2: Adaptar `ShadcnPreset.test.tsx`**

Quitar los imports:

```tsx
import { HardwareCard } from "@/components/HardwareCard";
import { NetworkAdCard } from "@/components/NetworkAdCard";
```

Reemplazar el test entero (el nombre y el cuerpo) por:

```tsx
  it("verifica que Topbar y QuickActionsBar utilizan primitivas shadcn (data-slot)", () => {
    const mockTerminal = getAllTerminals()[0];
    const { container } = render(
      <ThemeProvider>
        <Topbar onSelectTerminal={vi.fn()} />
        <QuickActionsBar
          terminal={mockTerminal}
          isPinging={false}
          onLaunchVnc={vi.fn()}
          onLaunchMsra={vi.fn()}
          onTogglePing={vi.fn()}
        />
      </ThemeProvider>,
    );

    expect(
      container.querySelectorAll('[data-slot="button"]').length,
    ).toBeGreaterThanOrEqual(5);
    expect(
      container.querySelectorAll('[data-slot="badge"]').length,
    ).toBeGreaterThanOrEqual(2);
    expect(
      container.querySelectorAll('[data-slot="input-group-control"]').length,
    ).toBeGreaterThanOrEqual(1);
  });
```

La aserción de `[data-slot="card"]` se retira de **este** test porque ya no hay cards en el árbol; `Card` sigue cubierta por el test de catálogo de arriba en el mismo archivo (el que renderiza `CardTitle`/`CardDescription`). No tocar ese test de catálogo.

- [ ] **Step 3: Verde**

```bash
npx vitest run src/test/ShadcnPreset.test.tsx
npx tsc --noEmit
npx vitest run
```

Expected: `ShadcnPreset` verde; suite con **4 tests menos** (2 de `TerminalCards`, 2 de `CardsContrastCopy`).

- [ ] **Step 4: Commit**

```bash
git add src/test/ShadcnPreset.test.tsx
git commit -m "chore(ui): borrar HardwareCard y NetworkAdCard con sus tests"
```

---

### Task 3: Retirar la infraestructura de tooltips

**Files:**
- Modify: `src/main.tsx`
- Delete: `src/test/TooltipProvider.test.tsx`, `src/components/ui/tooltip.tsx`

Después de la reversión de tooltips no queda ningún `<Tooltip>` en la app; el provider y la primitiva quedan muertos.

- [ ] **Step 1: Confirmar que `ui/tooltip` no tiene importadores**

```powershell
Select-String -Path src -Recurse -Include *.tsx,*.ts -Pattern 'ui/tooltip' | Where-Object { $_.Path -notmatch 'tooltip\.tsx$|TooltipProvider\.test' }
```

Expected: sin resultados fuera de los dos archivos que se borran.

- [ ] **Step 2: Quitar el provider de `main.tsx`**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

window.addEventListener('error', (event) => {
  console.error('[Global Window Error]', event.error || event.message);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('[Unhandled Promise Rejection]', event.reason);
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
```

Es decir: borrar el import de `TooltipProvider` y las dos etiquetas que envuelven `<App />`.

- [ ] **Step 3: Borrar el guard y la primitiva**

```bash
git rm src/test/TooltipProvider.test.tsx src/components/ui/tooltip.tsx
```

- [ ] **Step 4: Verde**

```bash
npx tsc --noEmit
npx vitest run
npm run build
```

Expected: suite con **2 tests menos**; build verde; ningún archivo importa `TooltipProvider` (TypeScript lo confirma).

- [ ] **Step 5: Commit**

```bash
git add src/main.tsx
git commit -m "chore(ui): retirar TooltipProvider y la primitiva de tooltip sin uso"
```

---

### Task 4: Deuda de `Topbar` (ids, reset y `onDirectPing`)

**Files:**
- Modify: `src/components/Topbar.tsx`, `src/App.tsx`
- Test: `src/test/TopbarSearchNavigation.test.tsx`

Tres deudas de la review de Fase 3: el id de opción interpola el valor crudo (un valor con espacios produce un IDREF inválido), borrar la fila activa deja `aria-activedescendant` colgado, y `onDirectPing` es una prop nunca usada.

- [ ] **Step 1: Tests que fallan**

```tsx
it("usa ids válidos y limpia la opción activa al borrar una fila", async () => {
  localStorage.setItem(
    RECENT_KEY,
    JSON.stringify(["PC A", "SUC10-PC01"]),
  );

  render(
    <ThemeProvider>
      <Topbar onSelectTerminal={vi.fn()} onSelectAccount={vi.fn()} />
    </ThemeProvider>,
  );

  const input = screen.getByRole("combobox", { name: /buscar terminal/i });
  fireEvent.focus(input);
  fireEvent.click(input);

  const listbox = await screen.findByRole("listbox");
  const options = within(listbox).getAllByRole("option");

  for (const option of options) {
    expect(option.id).toMatch(/^terminal-search-option-[a-z0-9-]+$/i);
    expect(option.id).not.toContain(" ");
  }

  fireEvent.keyDown(input, { key: "ArrowDown" });
  const activeId = input.getAttribute("aria-activedescendant");
  expect(activeId).toBe(options[0].id);

  fireEvent.click(
    screen.getByRole("button", { name: /quitar PC A del historial/i }),
  );

  expect(input).not.toHaveAttribute("aria-activedescendant");
});
```

- [ ] **Step 2: Rojo**

Run: `npx vitest run src/test/TopbarSearchNavigation.test.tsx -t "ids válidos"`
Expected: FAIL — el id sale con espacio y el activo queda colgado.

- [ ] **Step 3: Slug del id**

En `Topbar.tsx`, agregar junto a `NO_ACTIVE_VALUE`:

```tsx
// El id de la opción alimenta `aria-activedescendant`: no admite espacios ni
// caracteres fuera de IDREF, por eso el valor se normaliza.
const toOptionId = (value: string): string =>
  `terminal-search-option-${value.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
```

Y usar `toOptionId(...)` en los dos lugares que hoy interpolan el valor crudo:

```tsx
aria-activedescendant={
  isOpen && activeValue ? toOptionId(activeValue) : undefined
}
```

```tsx
ref={(node) => {
  node?.setAttribute("id", toOptionId(item.value));
}}
```

- [ ] **Step 4: Resetear el activo al borrar una fila**

En el `onClick` del botón "Quitar … del historial":

```tsx
onClick={(event) => {
  event.stopPropagation();
  setRecentSearches(removeRecentSearch(item.value));
  setActiveValue("");
}}
```

- [ ] **Step 5: Quitar `onDirectPing`**

En `Topbar.tsx`: borrar `onDirectPing?: (pc: string) => void;` de la interfaz y `onDirectPing,` del destructuring.
En `App.tsx`: borrar la prop `onDirectPing={handleDirectPing}` y el handler completo:

```tsx
const handleDirectPing = (pc: string): void => {
  setSelectedPc(pc);
  setPingMode("standard");
  setIsPinging(true);
};
```

Verificar que no quede ninguna referencia:

```powershell
Select-String -Path src -Recurse -Include *.tsx,*.ts -Pattern 'onDirectPing|handleDirectPing'
```

Expected: sin resultados.

- [ ] **Step 6: Verde**

```bash
npx vitest run src/test/TopbarSearchNavigation.test.tsx src/components/Topbar.test.tsx src/test/AppTerminalLayout.test.tsx
npm test
npm run build
```

- [ ] **Step 7: Commit**

```bash
git add src/components/Topbar.tsx src/App.tsx src/test/TopbarSearchNavigation.test.tsx
git commit -m "fix(search): ids validos, reset del activo y sin prop muerta"
```

---

### Task 5: Nombre accesible del menú contextual y limpieza de `onFocusSearch`

**Files:**
- Modify: `src/components/OperatorContextMenu.tsx`
- Test: `src/test/OperatorContextMenu.test.tsx`

El `ContextMenuContent` tiene label visible pero ningún nombre accesible; además `onFocusSearch` es una prop que `App` nunca pasa (renderiza una acción inalcanzable).

- [ ] **Step 1: Tests que fallan**

Agregar al archivo (usa el helper de render que ya existe en él):

```tsx
it("expone un nombre accesible y navega con flechas", async () => {
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
        onQueryAccount={vi.fn()}
      />
    </ContextMenu>,
  );

  fireEvent.contextMenu(screen.getByTestId("menu-surface"));

  const menu = await screen.findByRole("menu", {
    name: /acciones del operador/i,
  });
  expect(menu).toBeInTheDocument();

  // Radix enfoca el primer ítem al abrir; la flecha baja mueve el foco al segundo.
  const items = screen.getAllByRole("menuitem");
  expect(items[0]).toHaveFocus();
  fireEvent.keyDown(document.activeElement!, { key: "ArrowDown" });
  expect(items[1]).toHaveFocus();
});
```

- [ ] **Step 2: Rojo**

Run: `npx vitest run src/test/OperatorContextMenu.test.tsx -t "nombre accesible"`
Expected: FAIL — el menú no tiene nombre y las flechas no mueven foco.

- [ ] **Step 3: Agregar el `aria-label` en las dos ramas**

```tsx
<ContextMenuContent className="w-56" aria-label="Acciones del operador">
```

- [ ] **Step 4: Borrar `onFocusSearch`**

En `OperatorContextMenu.tsx`: quitar `onFocusSearch?: () => void;` de la interfaz, `onFocusSearch,` del destructuring y el bloque completo del `ContextMenuItem` "Buscar otra terminal" (incluido el ícono `Search` si queda sin uso). En los tests del menú, quitar `onFocusSearch={vi.fn()}` de las props.

Verificar:

```powershell
Select-String -Path src -Recurse -Include *.tsx,*.ts -Pattern 'onFocusSearch'
```

Expected: sin resultados.

- [ ] **Step 5: Verde**

```bash
npx vitest run src/test/OperatorContextMenu.test.tsx src/test/AppTerminalLayout.test.tsx
npm test
```

- [ ] **Step 6: Commit**

```bash
git add src/components/OperatorContextMenu.tsx src/test/OperatorContextMenu.test.tsx
git commit -m "fix(menu): nombre accesible, flechas y sin prop muerta"
```

---

### Task 6: Documentar y cerrar la fase

**Files:**
- Modify: `DESIGN.md`, `docs/ui-slop-audit-2026-11-02.md`

- [ ] **Step 1: `DESIGN.md`**

En «Ayuda contextual», borrar el párrafo que dice que `TooltipProvider`/`ui/tooltip` siguen instalados, y dejarlo así:

```markdown
La infraestructura de tooltips se retiró por completo: no hay `TooltipProvider`,
ni `src/components/ui/tooltip.tsx`, ni consumidores.
```

En «Overlays y controles», agregar al bullet del menú contextual:

```markdown
El menú lleva `aria-label="Acciones del operador"` para tener nombre accesible
además del label visible, y Radix resuelve flechas, Escape y foco.
```

Y borrar la frase de deuda que quede sobre `Sidebar`/`HardwareCard`/`NetworkAdCard` (ya no existen).

- [ ] **Step 2: Audit**

Bajo `### Fase 4 · Limpieza`, agregar:

```markdown
> **Estado (2026-11-04):** ejecutada en `feat/fase-4-limpieza`. Se borraron `Sidebar`
> (107 líneas), `HardwareCard` (151) y `NetworkAdCard` (139) con sus 4 archivos de
> test; `ShadcnPreset` dejó de renderizarlos y conserva la cobertura de `Card` en
> el test de catálogo. Se retiró la infraestructura de tooltips (`TooltipProvider`,
> `ui/tooltip.tsx` y su guard). Se corrigieron tres deudas de Fase 3: ids válidos
> y reset de `aria-activedescendant` en el buscador, `onDirectPing`/`onFocusSearch`
> eliminadas y `aria-label` en el menú contextual. Suite N/N, build verde,
> `--strict` 0, ratchet 0/0/0/1.
```

Reemplazar `N/N` por el conteo real medido al cerrar.

- [ ] **Step 3: Verificación completa**

```bash
npx vitest run
npm run build
npm run audit:contrast
node scripts/check-contrast.mjs --strict
npx vitest run src/test/designContract.test.ts
```

Expected: suite verde (≈**388**: 393 − 3 − 4 − 2 + 2 tests nuevos + 2 del menú, ajustar al real) · build verde · ambos comandos de contraste exit 0 · ratchet **0/0/0/1** sin cambios.

Medir el ratchet para confirmar:

```powershell
$files = Get-ChildItem src -Recurse -File -Include *.tsx | Where-Object { $_.FullName -notmatch '\\ui\\' -and $_.FullName -notmatch '\.test\.' }
($files | ForEach-Object { ([regex]::Matches((Get-Content $_.FullName -Raw), '\bz-50\b')).Count } | Measure-Object -Sum).Sum
```

Expected: `1` (el desplegable de conexión remota, deuda declarada).

- [ ] **Step 4: Commit**

```bash
git add DESIGN.md docs/ui-slop-audit-2026-11-02.md
git commit -m "docs(design): cierre de la fase 4 de limpieza"
```

---

## Criterios de aceptación

- [ ] `Sidebar`, `HardwareCard` y `NetworkAdCard` no existen y ningún test los importa.
- [ ] No hay `TooltipProvider`, `ui/tooltip.tsx` ni importadores de tooltips.
- [ ] `onDirectPing`, `handleDirectPing` y `onFocusSearch` no aparecen en `src`.
- [ ] El menú contextual tiene `aria-label` y un test de flechas; el buscador normaliza ids y limpia `aria-activedescendant` al borrar una fila.
- [ ] `npm test`, `npm run build`, `npm run audit:contrast` y `--strict` verdes; ratchet **0/0/0/1**.
- [ ] `shadcn` sigue fuera de `package.json` y el tema inlinado sin cambios en `src/index.css`.

## Hand-offs a Fase 5

| Pendiente | Por qué |
|---|---|
| Escala tipográfica 18/14/12/11 y overlines | Fase 5 |
| Iconos en cuadrado teñido y skeletons de producto | Fase 5 |
| Sign-off de tokens del preset y `--info` | Producto |
| Contraste de bordes no-texto (1,26–1,32:1) | Producto / Fase 5 |
| Desplegable de conexión remota de `QuickActionsBar` a `Popover` | Deuda declarada |
| `ScrollArea` en consola/desplegables | Opcional |
