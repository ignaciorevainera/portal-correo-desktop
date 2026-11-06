# Interfaz compacta 425 px · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** permitir que la ventana baje a ~425 px de ancho conservando el alto actual (600–800 px), con las acciones primarias visibles, las secundarias en una segunda fila de `QuickActionsBar`, la consola con alto adaptado al viewport y los diálogos dentro del ancho.

**Architecture:** cambios en 7 archivos de UI más 1 archivo del proceso principal. No hay componentes nuevos ni librerías nuevas. La ventana es frameless, así que el ancho mínimo solo depende de `BrowserWindow`. Todo lo demás es Tailwind 4 con variantes `max-sm` (ancho < 640 px) y `max-md` (ancho < 768 px; sólo la barra de acciones) y `order` de flexbox para forzar dos filas. La consola pasa de altura fija mínima 384 px a `h-[50vh]` (mitad del alto de la ventana). La consola existente ya tiene colapso, scroll interno y copiar logs: no se reemplaza.

**Tech Stack:** Electron 34 · React 19 · Vite 6 · TypeScript 5.7 · Tailwind 4 · Vitest 3 · Testing Library.

**Prerrequisito medido:** HEAD `f256b90` (`chore(release): 1.1.0`), árbol de trabajo limpio, 63 archivos de test y 418 tests verdes, `npx tsc --noEmit` exit 0.

**Fuera de alcance:** rediseño visual, tokens de color, tipografía, `ActivityPanel`, `SubnetScannerDrawer` (ya entra en 320 px), menú contextual nativo, atajos de teclado, comportamiento del atajo global y de la bandeja.

**Reglas de ejecución:**

1. Un task = un commit. No mezclar tasks.
2. TDD: el test se escribe y se ve fallar antes del cambio.
3. Clases Tailwind literales. Nunca construir nombres de clase por concatenación: el JIT no las genera.
4. No tocar `src/index.css` ni `DESIGN.md` en este plan.
5. `max-sm` = `@media (width < 40rem)`, o sea < 640 px. Cubre 425 px y 600 px.
6. Al final de cada fase correr el checkpoint y **pausar** para revisión del operador.

---

## File Structure

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `electron/main.cjs` | modificar | bajar `minWidth` a 420; alto intacto |
| `src/test/windowSizing.test.ts` | crear | contrato estático del tamaño de ventana |
| `src/components/LivePingConsole.tsx` | modificar | altura de consola por `vh` |
| `src/test/LivePingConsole.test.tsx` | modificar | actualizar expectativa de altura |
| `src/components/Topbar.tsx` | modificar | identidad compacta y buscador que puede encogerse |
| `src/components/Topbar.test.tsx` | modificar | cubrir clases compactas |
| `src/components/QuickActionsBar.tsx` | modificar | orden de filas en ancho compacto |
| `src/test/QuickActionsBar.test.tsx` | modificar | cubrir orden de secundarias |
| `src/components/InfoModal.tsx` | modificar | margen de viewport en diálogo |
| `src/test/InfoModal.test.tsx` | modificar | cubrir ancho de diálogo |
| `src/components/SettingsModal.tsx` | modificar | margen de viewport en diálogo |
| `src/test/SettingsModal.test.tsx` | modificar | cubrir ancho de diálogo |
| `src/components/TerminalDetailsGrid.tsx` | modificar | grilla de 2 columnas desde 425 px |
| `src/components/TerminalDetailsGrid.test.tsx` | modificar | cubrir grilla compacta |

---

# Fase 1 — Ventana y consola

Objetivo de fase: poder redimensionar a 425 px y que la consola no ocupe más que el alto disponible.

## Task 1: Ancho mínimo de ventana

**Files:**
- Create: `src/test/windowSizing.test.ts`
- Modify: `electron/main.cjs:272-278`

- [ ] **Step 1: Escribir el test que falla**

Crear `src/test/windowSizing.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const MAIN = path.resolve(process.cwd(), 'electron/main.cjs');
const source = fs.readFileSync(MAIN, 'utf-8');

describe('tamaño de ventana', () => {
  it('permite el ancho compacto de 425 px', () => {
    expect(source).toMatch(/minWidth:\s*420/);
  });

  it('mantiene el alto y el ancho máximo actuales', () => {
    expect(source).toMatch(/minHeight:\s*600/);
    expect(source).toMatch(/maxHeight:\s*800/);
    expect(source).toMatch(/maxWidth:\s*1200/);
  });

  it('sigue siendo redimensionable', () => {
    expect(source).toMatch(/resizable:\s*true/);
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx vitest run src/test/windowSizing.test.ts`
Expected: FAIL. El primer caso falla porque el archivo tiene `minWidth: 900`.

- [ ] **Step 3: Implementar**

En `electron/main.cjs`, reemplazar el bloque de tamaño dentro de `new BrowserWindow({...})`:

```js
    width: 1020,
    height: 680,
    minWidth: 420,
    minHeight: 600,
    maxWidth: 1200,
    maxHeight: 800,
    resizable: true,
```

Sólo cambia `minWidth: 900` → `minWidth: 420`.

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npx vitest run src/test/windowSizing.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add electron/main.cjs src/test/windowSizing.test.ts
git commit -m "feat(window): allow compact 420px minimum width"
```

## Task 2: Alto adaptativo de la consola

**Files:**
- Modify: `src/components/LivePingConsole.tsx:401-407`
- Modify: `src/test/LivePingConsole.test.tsx:313-315`

- [ ] **Step 1: Actualizar el test para que falle**

En `src/test/LivePingConsole.test.tsx`, reemplazar el bloque de expectativa de altura:

```tsx
    // La consola ocupa siempre la mitad del alto de la ventana
    const terminalBox = container.querySelector('[data-testid="terminal-scroll-container"]');
    expect(terminalBox?.className).toContain('h-[50vh]');
    expect(terminalBox?.className).not.toContain('min-h-[24rem]');
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx vitest run src/test/LivePingConsole.test.tsx -t "renders contiguous console without section title and with adaptive height"`
Expected: FAIL. La clase todavía es `h-[clamp(24rem,55vh,48rem)]`.

- [ ] **Step 3: Implementar**

En `src/components/LivePingConsole.tsx`, reemplazar el comentario y la clase:

```tsx
          {/* Pantalla Contigua estilo Windows Terminal: bg-console-bg, altura fija al 50% del alto de la ventana, auto-scroll interno por línea */}
          <div
            ref={scrollContainerRef}
            data-testid="terminal-scroll-container"
            className={`${
              fill ? "flex-1 min-h-0" : "h-[50vh]"
            } overflow-y-auto overflow-x-auto p-3 bg-console-bg font-mono text-micro leading-relaxed text-console-muted select-text`}
          >
```

Se elimina `min-h-[24rem]`: la consola mide siempre el 50% del alto de la ventana (300 px con ventana de 600 px, 400 px con 800 px).

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npx vitest run src/test/LivePingConsole.test.tsx`
Expected: PASS, todos los casos del archivo.

- [ ] **Step 5: Commit**

```bash
git add src/components/LivePingConsole.tsx src/test/LivePingConsole.test.tsx
git commit -m "fix(console): adapt console height to viewport height"
```

## Checkpoint 1 (pausa de revisión)

Run: `npx vitest run src/test/windowSizing.test.ts src/test/LivePingConsole.test.tsx && npx tsc --noEmit`
Expected: todo PASS, `tsc` exit 0.

Revisión manual:

1. Run: `npm run electron:dev`
2. Redimensionar a 425×600 y a 425×800.
3. Verificar: ventana baja de 900 a ~425 sin salto; consola mide ~216 px a 600 de alto y ~288 px a 800; scroll interno de la consola funciona; no hay scroll horizontal en la consola; el ping sigue escribiendo líneas.
4. Confirmar que `minHeight` 600 y `maxHeight` 800 siguen iguales.

Pausar para aprobación antes de la Fase 2.

---

## Task 2b: Cabecera de consola compacta (agregado en ejecución)

La revisión de calidad de Task 2 detectó que a 425 px la cabecera de la consola (título + 4 botones con texto) se recortaba dentro de la Card `overflow-hidden`.

**Files:**
- Modify: `src/components/LivePingConsole.tsx`
- Modify: `src/test/LivePingConsole.test.tsx`

Cambios: título con `truncate`, contenedor de acciones con `shrink-0`, y `max-sm:hidden` en los cinco labels (Detener, Re-ejecutar, Limpiar, Copiar Último, Copiar Logs). Los iconos y `aria-label` no cambian, así que el nombre accesible se conserva.

Commit: `fix(console): icon-only header actions on compact width` y `test(console): cover all compact header actions`.

---

# Fase 2 — Topbar compacto

Objetivo de fase: header de una sola fila a 425 px, sin botones cortados y con buscador usable.

## Task 3: Identidad compacta y buscador encogible

**Files:**
- Modify: `src/components/Topbar.tsx:283-297`
- Modify: `src/components/Topbar.test.tsx`

- [ ] **Step 1: Escribir el test que falla**

Agregar este caso a `src/components/Topbar.test.tsx`, después del test `renders search input, brand and compact layout`:

```tsx
  it("compacta la identidad y el buscador por debajo de 640 px", () => {
    const { container } = render(
      <ThemeProvider>
        <Topbar onSelectTerminal={vi.fn()} />
      </ThemeProvider>,
    );

    const title = screen.getByRole("heading", {
      name: /portal correo desktop/i,
    });
    expect(title.className).toContain("max-sm:sr-only");

    const searchWrapper = container.querySelector("div.max-w-md");
    expect(searchWrapper?.className).toContain("min-w-0");

    expect(container.querySelector("header")?.className).toContain("h-14");
    expect(container.querySelector("header")?.className).toContain("px-3.5");
  });
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx vitest run src/components/Topbar.test.tsx -t "compacta la identidad"`
Expected: FAIL. No existe `max-sm:sr-only` ni `min-w-0` en el wrapper.

- [ ] **Step 3: Implementar**

En `src/components/Topbar.tsx`, agregar `max-sm:sr-only` al `h1`:

```tsx
          <h1 className="text-sm font-bold font-heading tracking-tight text-foreground whitespace-nowrap pointer-events-none max-sm:sr-only">
            Portal Correo Desktop
          </h1>
```

Y agregar `min-w-0` al wrapper del buscador:

```tsx
        {/* Buscador Rápido Centralizado */}
        <div className="relative flex-1 min-w-0 max-w-md app-no-drag">
```

No cambiar padding ni alto del header: `h-14` y `px-3.5` se mantienen para conservar el gutter con `QuickActionsBar` y `<main>`.

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npx vitest run src/components/Topbar.test.tsx`
Expected: PASS, incluido el caso nuevo.

- [ ] **Step 5: Commit**

```bash
git add src/components/Topbar.tsx src/components/Topbar.test.tsx
git commit -m "feat(topbar): compact brand and shrinkable search under 640px"
```

## Checkpoint 2 (pausa de revisión)

Run: `npx vitest run src/components/Topbar.test.tsx src/test/TopbarSearchNavigation.test.tsx src/test/AppTerminalLayout.test.tsx`
Expected: todos PASS.

Revisión manual a 425×600:

1. El header muestra logo, buscador y los 5 botones (Ajustes, Info, Tema, Minimizar, Bandeja) sin cortes ni scroll horizontal.
2. El buscador recibe texto y el popover de resultados no se sale de la ventana.
3. Ctrl+F sigue enfocando el buscador.
4. El título de la app ya no se ve, pero sigue anunciado por lector de pantalla (`sr-only`).

Pausar para aprobación antes de la Fase 3.

---

# Fase 3 — QuickActionsBar en dos filas

Objetivo de fase: acciones primarias en la fila 1; sitio `.250`, `.231` y uptime en la fila 2, siempre a un clic.

## Task 4: Orden compacto de acciones

**Files:**
- Modify: `src/components/QuickActionsBar.tsx:150-152, 285, 394-405, 333, 361, 523-524`
- Modify: `src/test/QuickActionsBar.test.tsx`

- [ ] **Step 1: Escribir el test que falla**

Agregar este caso al final de `describe('QuickActionsBar & Shortcut Keys')` en `src/test/QuickActionsBar.test.tsx`:

```tsx
  it("agrupa y llena la segunda fila de acciones por debajo de 768 px", () => {
    const { container } = render(
      <QuickActionsBar
        terminal={terminal}
        isPinging={false}
        onLaunchVnc={vi.fn()}
        onLaunchMsra={vi.fn()}
        onTogglePing={vi.fn()}
        onLaunchPingInfinite={vi.fn()}
        onLaunchSitePing={vi.fn()}
      />
    );

    const remote = screen.getByRole("button", {
      name: /conexión remota inteligente/i,
    });
    expect(remote.closest("div.relative")?.className).toContain(
      "max-md:order-1",
    );

    const ping = screen.getByRole("button", { name: /^iniciar ping$/i });
    expect(ping.parentElement?.className).toContain("max-md:order-2");

    expect(
      screen.getByRole("button", { name: /más acciones/i }).className,
    ).toContain("max-md:order-3");

    const secondary = screen.getByTestId("secondary-actions");
    expect(secondary.className).toContain("contents");
    expect(secondary.className).toContain("max-md:flex");
    expect(secondary.className).toContain("max-md:basis-full");
    expect(secondary.className).toContain("max-md:order-4");

    const router = screen.getByRole("button", {
      name: /hacer ping al router \.250/i,
    });
    const server = screen.getByRole("button", {
      name: /hacer ping al servidor \.231/i,
    });
    const uptime = container.querySelector('[title^="Uptime:"]');
    expect(uptime).not.toBeNull();
    expect(secondary.contains(uptime!)).toBe(true);
    expect(uptime?.className).toContain("sm:order-last");

    for (const group of [router.parentElement, server.parentElement, uptime]) {
      expect(group?.className).toContain("max-md:flex-1");
    }
    expect(router.className).toContain("max-md:flex-1");
    expect(server.className).toContain("max-md:flex-1");
    expect(
      screen.getByRole("button", { name: /ping continuo -t router \.250/i })
        .className,
    ).not.toContain("max-md:flex-1");

    expect(container.querySelector('[class*="flex-wrap"]')).not.toBeNull();
  });
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx vitest run src/test/QuickActionsBar.test.tsx -t "segunda fila"`
Expected: FAIL. Ninguna clase `max-md:order-*` existe todavía.

- [ ] **Step 3: Implementar**

En `src/components/QuickActionsBar.tsx`:

Wrapper del split button remoto (línea 150):

```tsx
        <div
          className="relative flex items-center min-w-45 flex-1 grow max-md:order-1"
          ref={dropdownRef}
        >
```

Wrapper del ping (línea 285):

```tsx
        <div className="flex rounded-md flex-1 min-w-27.5 grow max-md:order-2">
```

Spacer de corte de fila: ya no se usa. La fila secundaria es un grupo real que fuerza el salto y reparte el ancho:

```tsx
        {/* Secundarias: fila propia en compacto, inline en escritorio */}
        <div
          data-testid="secondary-actions"
          className="contents max-md:order-4 max-md:flex max-md:basis-full max-md:items-center max-md:gap-1"
        >
          {siteTargets.isValid && onLaunchSitePing && (
            <>
              <div className="flex rounded-md shrink-0 max-md:flex-1">…par .250…</div>
              <div className="flex rounded-md shrink-0 max-md:flex-1">…par .231…</div>
            </>
          )}
          <div
            className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50 border border-border/80 text-xs h-8 shrink-0 max-md:flex-1 max-md:justify-center sm:order-last"
            title={`Uptime: ${terminal.uptimeText || "N/D"}`}
            aria-busy={isRefreshingUptime}
          >
```

`contents` hace que en escritorio los hijos participen directo de la fila; `sm:order-last` mantiene el uptime después de "Más". En compacto el wrapper pasa a `flex basis-full`, siempre crea la segunda fila y sus hijos se reparten en partes iguales. Si no hay enlaces de sitio, el uptime solo llena la fila. Los botones primarios de cada par llevan `max-md:flex-1`; el compañero `-t` queda fijo.

Botón "Más" (línea 401):

```tsx
              className="h-8 px-2.5 text-xs font-semibold bg-muted text-foreground border-border hover:bg-muted/80 cursor-pointer gap-1 shrink-0 max-md:order-3"
```

Los wrappers de `.250` y `.231` van dentro del grupo secundario con `max-md:flex-1` y sin `order` propio; su botón primario también lleva `max-md:flex-1` y el `-t` queda fijo.

Resultado esperado a 425 px: fila 1 = remoto (~180 px) + ping (~110 px) + Más (~64 px) = ~366 px dentro de 397 disponibles. Fila 2 = grupo con tres partes iguales (~130 px cada una) o uptime solo ocupando toda la fila si la terminal no tiene IPv4 válida. La agrupación aplica hasta 767 px (`max-md`); desde 768 px el grupo es `display:contents` y el orden visual queda remoto, ping, `.250`, `.231`, Más, uptime en una sola fila.

- [ ] **Step 4: Correr los tests y verificar que pasan**

Run: `npx vitest run src/test/QuickActionsBar.test.tsx src/test/QuickActionsBarSite.test.tsx`
Expected: PASS. Si el test de sitio falla porque los botones ya no están en el popover "Más", no cambiar el componente: el test abre "Más" pero consulta botones inline; verificar que el selector siga encontrando un único elemento.

- [ ] **Step 5: Commit**

```bash
git add src/components/QuickActionsBar.tsx src/test/QuickActionsBar.test.tsx
git commit -m "feat(actions): two-row compact layout under 640px"
```

## Checkpoint 3 (pausa de revisión)

Run: `npx vitest run src/test/QuickActionsBar.test.tsx src/test/QuickActionsBarSite.test.tsx`
Expected: todos PASS.

Revisión manual a 425×600:

1. Fila 1: Conexión Remota, Ping (con `-t` al lado) y Más.
2. Fila 2: `.250`, `.231` y uptime.
3. Hover/click de cada acción sigue funcionando; el dropdown de conexión y el popover Más caben dentro de la ventana.
4. La barra ocupa dos filas, no tres, y no tapa la consola.

Pausar para aprobación antes de la Fase 4.

---

# Fase 4 — Diálogos y grilla de detalles

Objetivo de fase: diálogos con margen a 425 px y datos del equipo en dos columnas para reducir scroll vertical.

## Task 5: Margen de viewport en diálogos

**Files:**
- Modify: `src/components/InfoModal.tsx:70`
- Modify: `src/components/SettingsModal.tsx:214`
- Modify: `src/test/InfoModal.test.tsx`
- Modify: `src/test/SettingsModal.test.tsx`

- [ ] **Step 1: Escribir los tests que fallan**

En `src/test/InfoModal.test.tsx`, dentro del test `renders minimal header with brand logo, title and app version`, agregar:

```tsx
    expect(screen.getByRole("dialog").className).toContain(
      "max-sm:max-w-[calc(100vw-1.5rem)]",
    );
```

En `src/test/SettingsModal.test.tsx`, dentro del test `renders settings dialog when open with single-scroll sections and system version`, agregar:

```tsx
    expect(screen.getByRole("dialog").className).toContain(
      "max-sm:max-w-[calc(100vw-1.5rem)]",
    );
```

- [ ] **Step 2: Correr los tests y verificar que fallan**

Run: `npx vitest run src/test/InfoModal.test.tsx src/test/SettingsModal.test.tsx`
Expected: FAIL en ambos casos nuevos; la clase no existe.

- [ ] **Step 3: Implementar**

`src/components/InfoModal.tsx` línea 70:

```tsx
      <DialogContent className="max-w-md max-sm:max-w-[calc(100vw-1.5rem)] p-0 overflow-hidden border border-border/80">
```

`src/components/SettingsModal.tsx` línea 214:

```tsx
      <DialogContent className="sm:max-w-155 max-sm:max-w-[calc(100vw-1.5rem)] max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden bg-card text-card-foreground border-border">
```

- [ ] **Step 4: Correr los tests y verificar que pasan**

Run: `npx vitest run src/test/InfoModal.test.tsx src/test/SettingsModal.test.tsx`
Expected: PASS en ambos archivos.

- [ ] **Step 5: Commit**

```bash
git add src/components/InfoModal.tsx src/components/SettingsModal.tsx src/test/InfoModal.test.tsx src/test/SettingsModal.test.tsx
git commit -m "feat(dialogs): keep viewport gutter on compact width"
```

## Task 6: Grilla de detalles en dos columnas

**Files:**
- Modify: `src/components/TerminalDetailsGrid.tsx:58`
- Modify: `src/components/TerminalDetailsGrid.test.tsx`

- [ ] **Step 1: Escribir el test que falla**

En `src/components/TerminalDetailsGrid.test.tsx`, dentro del test `renders the remaining technical fields in a labelled grid`, agregar:

```tsx
    const grid = screen.getByText("Dirección MAC").closest("dl");
    expect(grid?.className).toContain("grid-cols-2");
    expect(grid?.className).not.toContain("grid-cols-1");
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx vitest run src/components/TerminalDetailsGrid.test.tsx -t "labelled grid"`
Expected: FAIL. La clase base es `grid-cols-1`.

- [ ] **Step 3: Implementar**

`src/components/TerminalDetailsGrid.tsx` línea 58:

```tsx
      <dl className="mt-2 grid grid-cols-2 gap-x-4 sm:gap-x-8 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-3">
```

Dos columnas desde 425 px; el gap horizontal baja a 1rem en compacto. `sm:grid-cols-2` se mantiene explícito para no depender del orden de variantes; `lg:grid-cols-3` sigue igual.

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npx vitest run src/components/TerminalDetailsGrid.test.tsx`
Expected: PASS, incluidos los casos de "No informado" y copiar MAC.

- [ ] **Step 5: Commit**

```bash
git add src/components/TerminalDetailsGrid.tsx src/components/TerminalDetailsGrid.test.tsx
git commit -m "feat(details): two-column compact grid"
```

## Checkpoint 4 (pausa de revisión)

Run: `npx vitest run src/test/InfoModal.test.tsx src/test/SettingsModal.test.tsx src/components/TerminalDetailsGrid.test.tsx`
Expected: todos PASS.

Revisión manual a 425×600:

1. Abrir Ajustes (F10): el diálogo deja margen, hace scroll interno y los switches siguen clicables.
2. Abrir Info: entra con margen; el botón Portal MDA sigue abriendo el navegador.
3. Datos del equipo en 2 columnas; valores largos truncan sin desbordar; botón copiar MAC presente.

Pausar para aprobación antes de la Fase 5.

---

## Task 5b: Margen de viewport en el primitivo de diálogo (agregado en ejecución)

Motivo: la revisión de calidad de Task 5 detectó que ActivityDialogs (3 diálogos), NetUserChooserDialog y CommandDialog seguían pegados a los bordes a 425 px porque usan el primitivo compartido `DialogContent`. Se corrige una sola vez, no por componente.

**Files:**
- Create: `src/test/dialogPrimitive.test.tsx`
- Modify: `src/components/ui/dialog.tsx:37`

- [ ] **Step 1: Test que falla**

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Dialog, DialogContent, DialogTitle } from "../components/ui/dialog";

describe("DialogContent compacto", () => {
  it("mantiene un margen de viewport bajo 640 px", () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Prueba</DialogTitle>
          Contenido
        </DialogContent>
      </Dialog>,
    );

    expect(screen.getByRole("dialog").className).toContain(
      "max-sm:max-w-[calc(100%-1.5rem)]",
    );
  });
});
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `npx vitest run src/test/dialogPrimitive.test.tsx`
Expected: FAIL, clase ausente.

- [ ] **Step 3: Implementar**

En `src/components/ui/dialog.tsx`, `DialogContent`, insertar `max-sm:max-w-[calc(100%-1.5rem)]` justo después de `max-w-lg`. Usar `100%`, no `100vw`.

- [ ] **Step 4: Verificar**

Run: `npx vitest run src/test/dialogPrimitive.test.tsx src/test/InfoModal.test.tsx src/test/SettingsModal.test.tsx src/components/ActivityDialogs.test.tsx src/components/NetUserChooserDialog.test.tsx src/test/NetUserFlow.test.tsx`
Expected: PASS. `npx tsc --noEmit` exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/dialog.tsx src/test/dialogPrimitive.test.tsx
git commit -m "feat(dialog): keep viewport gutter on compact width"
```

Nota: InfoModal y SettingsModal conservan su propia clase `max-sm:max-w-[calc(100vw-1.5rem)]` (mergeada después, gana). Deduplicarlas a favor del primitivo queda como follow-up opcional: no cambia comportamiento porque Radix oculta el scrollbar mientras el diálogo está abierto, pero deja dos fuentes de verdad. `AlertDialogContent` no se toca: su tope por defecto es `max-w-xs` (320 px), nunca pegado a 425 px.

## Task 6b: endurecer aserción de grilla (agregado en ejecución)

La revisión de calidad de Task 6 detectó que `toContain("grid-cols-2")` también pasaba con `sm:grid-cols-2`, así que borrar la clase base dejaba la suite verde. Se reemplaza por comparación de tokens:

```tsx
    const grid = screen.getByText("Dirección MAC").closest("dl");
    expect(grid).not.toBeNull();
    expect(grid!.className.split(/\s+/)).toContain("grid-cols-2");
    expect(grid!.className.split(/\s+/)).not.toContain("grid-cols-1");
```

Commit: `test(details): assert grid columns by class token`.

---

# Fase 5 — Verificación final

Objetivo de fase: confirmar que la app compacta funciona sin regresiones y cerrar.

## Task 7: Verificación completa y matriz de tamaños

**Files:** ninguno. Sólo comandos y revisión.

- [ ] **Step 1: Suite completa**

Run: `npx vitest run`
Expected: todos los archivos PASS; 0 fallos. Duración aproximada 2 min.

- [ ] **Step 2: Tipos**

Run: `npx tsc --noEmit`
Expected: exit 0, sin salida de error.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: exit 0; `tsc` + `vite build`; artefactos en `dist/`.

- [ ] **Step 4: Matriz manual**

Run: `npm run electron:dev`. Probar cada combinación:

| Tamaño | Verificar |
|---|---|
| 1020×680 | layout actual intacto: una fila de acciones, dos columnas de detalles (`lg` = 1024) |
| 640×680 | transición: título visible, acciones en dos filas (la barra completa mide ~690 px y solo hay ~612 px disponibles; uptime queda solo en la fila 2) |
| 600×680 | título oculto, header en una fila, acciones en dos filas |
| 425×600 | sin scroll horizontal; consola ~216 px; detalles en 2 columnas; diálogos con margen |
| 425×800 | consola ~288 px; no aparece hueco vacío debajo de detalles |
| 425×600 con ping `-t` | consola no tapa la barra; scroll vertical llega al final |

- [ ] **Step 5: Commit de cierre (sólo si quedó algún ajuste)**

```bash
git add -A
git commit -m "chore(ui): verify compact 425px layout"
```

Si no hubo ajustes, no crear commit vacío.

## Checkpoint 5 (final)

Reportar: salida de `npx vitest run`, `tsc`, `npm run build`, y el resultado de cada fila de la matriz. Pausar para aprobación final del operador.

---

## Riesgos conocidos

| Riesgo | Mitigación |
|---|---|
| Tailwind no genera clases dinámicas | todas las clases de este plan son literales |
| `order` no aplica si cambia el contenedor a grid | el contenedor de `QuickActionsBar` es `flex`; no cambiarlo |
| Consola demasiado chata en ventanas de 600 px | altura fija al 50% del alto de ventana y colapso manual ya existente |
| Popover "Más" recortado por overflow | `PopoverContent` usa portal Radix; no lo recorta `main` |
| Tests de clase frágiles | ya es el estilo del repo (`Topbar.test.tsx`, `LivePingConsole.test.tsx`) |
| Electron ignora `minWidth` por DPI | probar a 100 % y 125 % de escala de Windows en Checkpoint 1 |
| Orden de tabulación distinto del visual en compacto | aceptado: el DOM no se mueve para no alterar el orden de escritorio; queda comentado en `QuickActionsBar.tsx` |
| Barra de acciones en 640–719 px | el uptime queda solo en la segunda fila; es el layout ancho actual, no una regresión de esta rama |
| `ActivityPanel` (solo admin) a 425 px | tabla con scroll horizontal dentro del primitivo Table; fuera de alcance, follow-up |

---

## Correcciones posteriores (feedback de producto)

Después del cierre se ajustaron tres puntos detectados al usar la ventana compacta:

| Cambio | Archivo | Commit |
|---|---|---|
| Consola más baja: `clamp(9rem,30vh,40rem)`; luego ajustada a `h-[50vh]` por feedback de producto | `LivePingConsole.tsx` | `f50c9ca`, `757cbb2` |
| Copiar Último (`Copy`/`Check`) vs Copiar Logs (`ClipboardList`/`CheckCheck`) distinguibles sin label; aviso `role="status"` para lectores de pantalla | `LivePingConsole.tsx` | `f50c9ca`, `c0235f8` |
| Segunda fila llena el ancho: grupo `.250`/`.231`/uptime con `max-md:flex-1` (agrupado hasta 767 px) | `QuickActionsBar.tsx` | `06a240c`, `b83329a`, `bce4d1f`, `49349fd` |
| Menú compacto de Ajustes, Información y Tema bajo 640 px | `Topbar.tsx`, `ThemeToggle.tsx`, `ui/dropdown-menu.tsx` | `8bf483a`, `7cf9d17`, `7b47a63` |
| Hover neutral (`focus:bg-muted`) en los ítems del menú compacto | `ui/dropdown-menu.tsx` | `3df1a2c` |
| Loading de búsqueda con primitiva `Spinner` y leyenda "Consultando..." | `App.tsx`, `ui/spinner.tsx` | `6f6dfa1` |

Nota de altura: `h-[50vh]` da 300 px en ventana de 600 y 400 px en 800. El ping estándar completo entra o usa scroll interno; el auto-scroll fija la cola y "Copiar Logs" sigue disponible.
