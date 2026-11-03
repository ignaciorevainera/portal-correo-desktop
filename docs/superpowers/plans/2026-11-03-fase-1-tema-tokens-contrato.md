# Fase 1 — Tema, tokens y contrato · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** alinear `src/index.css` con el tema del sitio principal (preset `b5XRZYXrNg`, style `radix-vega`), tokenizar la consola, montar el `TooltipProvider` que falta y dejar un test de contrato que impida que los vicios vuelvan a crecer.

**Architecture:** Fase 1 toca tres cosas y ninguna más: la hoja de tokens (`index.css`), el punto de entrada (`main.tsx`, solo el provider) y dos primitivas recién instaladas que hoy no respetan el sistema (`alert-dialog`, `sheet`). No se rediseña ninguna pantalla: los componentes de producto solo reciben los tokens nuevos, no cambios de estructura.

**Tech Stack:** React 19 · Vite 6 · TypeScript 5.7 · Tailwind 4 (`@theme inline`) · shadcn CLI 4.23.0 (pin exacto) · Radix unificado `radix-ui@1.8.1` · Vitest 3 + Testing Library · Electron 34.

**Prerrequisito:** la Fase 0 mergeada en `main` (o encadenar: `git switch -c feat/fase-1-tema chore/fase-0-dependencias`). Estado medido al escribir esto: `ui/` con 27 archivos, guard 6/6, suite 329/329, build verde, `style: radix-vega`, `radix-ui@1.8.1`, `shadcn@4.23.0` en devDependencies.

---

## Estado de partida (verificado)

| Hecho | Valor | Evidencia |
|---|---|---|
| Preset del sitio | `b5XRZYXrNg` → style `vega`, baseColor `neutral`, theme `blue`, font `geist`, fontHeading `roboto-slab`, radius `small` | `docs/shadcn-preset-decode.json` |
| Tokens propios vs sitio | 11 valores distintos, 20 ausentes (`category-*`, `office-type-*`), 1 inventado (`--info`) | `docs/ui-slop-audit-2026-11-02.md` §8.3 |
| `--font-mono` | `"Geist Mono Variable"` ya instalada y empaquetada | `dist/assets/geist-mono-*.woff2` |
| Consola | `bg-[#0C0C0C]`, `text-[#CCCCCC]`, `text-[#E5E5E5]` a mano | `LivePingConsole.tsx:330` |
| `TooltipProvider` | no montado en ningún lado | `grep -r TooltipProvider src/` → 0 |
| Overlays | `alert-dialog`/`sheet` usan `bg-black/10` + `bg-popover ring-1`; `dialog` local usa `bg-black/60` + `bg-card border` | `alert-dialog.tsx:37,59`, `sheet.tsx:40`, `dialog.tsx:19,37` |
| Sombras en app | 18 en código propio, 7 en primitivas | audit §8.3 / §9 |
| Paleta fija en app | 106 usos | audit §3 S1 |

---

## File Structure

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `src/index.css` | modificar | Tokens del sitio, `--console-*`, capas base/components, scrollbars |
| `src/main.tsx` | modificar | Montar `TooltipProvider` una vez, dentro del `ErrorBoundary` |
| `src/components/console` no existe; `src/components/LivePingConsole.tsx` | modificar 3 clases | Consumir `--console-*` en lugar de hex |
| `src/components/ui/alert-dialog.tsx`, `sheet.tsx` | modificar | Reconciliar overlay y superficie con el `dialog` local; i18n |
| `src/components/ui/command.tsx` | modificar 2 strings | Defaults en español |
| `src/components/ui/skeleton.tsx` | modificar 1 clase | `motion-safe:animate-pulse` |
| `src/components/ui/toggle-group.tsx` | modificar 1 prop | Reenviar `orientation` a Radix |
| `src/test/shadcnConfig.test.ts` | modificar | Endurecer guard (style exacto, `radix-ui` en prod, `cmdk`, mono) |
| `src/test/designContract.test.ts` | **crear** | Ratchet de patrones prohibidos |
| `src/test/TooltipProvider.test.tsx` | **crear** | Provider montado y funcionando |
| `package.json` | modificar | `@fontsource-variable/*` a devDependencies |
| `docs/ui-slop-audit-2026-11-02.md`, plan Fase 0 | modificar | Estado tras Fase 1 |

**Fuera de alcance (Fase 2):** reemplazar `Card`/`Alert`/`Input`, migrar buscador/drawer/menú/consola a primitivas, mapear los 106 colores, tipografía 18/14/12/11, `Field` en formularios, `Empty`/`Skeleton` en pantallas.

---

### Task 0: Rama y baseline

**Files:** ninguno.

- [ ] **Step 1: Verificar árbol limpio**

Run: `git status --porcelain`
Expected: vacío.

- [ ] **Step 2: Crear rama desde el estado con Fase 0**

```bash
git switch main
git merge --ff-only chore/fase-0-dependencias
git switch -c feat/fase-1-tema
```
Si `main` ya trae Fase 0, solo el último comando. Si no se puede hacer fast-forward, parar y reportar.

- [ ] **Step 3: Registrar el punto de partida**

```bash
npx vitest run src/test/shadcnConfig.test.ts
npm test
npm run build
```
Expected: guard 6/6 · 329 tests · build verde. Anotar los tres números: son la línea base de la fase.

---

### Task 1: Aplicar el preset del sitio con la CLI

**Files:**
- Modify: `src/index.css`, `package.json` (si `apply` ajusta algo), `components.json` (si `apply` lo reescribe)

- [ ] **Step 1: Inspeccionar el preset antes de aplicarlo**

Run: `npx shadcn@latest preset resolve --json`
Expected: JSON con `code: "b5XRZYXrNg"` y `values.style: "vega"`. Si devuelve `null`, parar: `components.json` no está declarando el preset.

- [ ] **Step 2: Aplicar solo tema y fuentes**

Run: `npx shadcn@latest apply b5XRZYXrNg --only theme,font`
Expected: reescribe el bloque de tokens de `src/index.css` y, si corresponde, `components.json` y las fuentes. No reinstala componentes.

- [ ] **Step 3: Revisar el diff antes de seguir**

Run: `git diff --stat` y `git diff src/index.css`
Expected: cambios **solo** en `:root`, `.dark`, `@theme inline` y los `@import` de fuentes. Si toca `@layer base`, `.app-drag-region`, `h1..h4` o `body`, revisar línea por línea y restaurar lo que no sea token.

- [ ] **Step 4: Si `apply` falla o no produce diff, completar a mano**

Aplicar estos cambios exactos en `:root` (los 11 desvíos y los 20 tokens ausentes). Si un token ya coincide, no tocarlo.

```css
  /* desvíos a corregir en :root */
  --muted-foreground: oklch(0.556 0 0);        /* estaba 0.505 */
  --destructive: oklch(0.577 0.245 27.325);    /* estaba 0.52 */
  --success: oklch(0.508 0.118 165.612);       /* estaba 0.5 0.13 155 */
  --warning: oklch(0.549 0.163 48.998);        /* estaba 0.55 0.14 75 */
  --sidebar-accent: oklch(0.9 0 0);            /* estaba 0.97 */
  --sidebar-accent-foreground: oklch(0.145 0 0); /* estaba 0.205 */

  /* tokens que faltan (claro) */
  --category-aplicaciones: oklch(0.541 0.281 293.009);
  --category-hardware: oklch(0.588 0.158 241.966);
  --category-conectividad: oklch(0.627 0.194 149.214);
  --category-instalaciones: oklch(0.646 0.222 41.116);
  --category-electoral: oklch(0.577 0.245 27.325);
  --category-externos: oklch(0.592 0.249 0.584);
  --category-otros: oklch(0.439 0 0);
  --office-type-administracion: oklch(0.446 0.043 257.281);
  --office-type-agencia: oklch(0.546 0.245 262.881);
  --office-type-cdd: oklch(0.541 0.281 293.009);
  --office-type-cdp: oklch(0.511 0.262 276.966);
  --office-type-ctp: oklch(0.52 0.105 223.128);
  --office-type-correo-colaborativo: oklch(0.511 0.096 186.391);
  --office-type-especiales: oklch(0.518 0.253 323.949);
  --office-type-estafeta: oklch(0.549 0.163 48.998);
  --office-type-general: oklch(0.444 0.011 73.639);
  --office-type-sucursal-automatizada: oklch(0.508 0.118 165.612);
  --office-type-sucursal-no-automatizada: oklch(0.522 0.157 131.589);
  --office-type-telegrafia: oklch(0.514 0.222 16.935);
  --office-type-unidad-postal: oklch(0.546 0.249 0.584);
```

Y en `.dark`:

```css
  --primary: oklch(0.424 0.199 265.638);          /* estaba 0.707 0.165 254.624 */
  --primary-foreground: oklch(0.97 0.014 254.604); /* estaba 0.145 0 0 */
  --success: oklch(0.765 0.177 163.223);
  --warning: oklch(0.828 0.189 84.429);
  --sidebar-accent: oklch(0.3 0 0);

  --category-aplicaciones: oklch(0.702 0.183 293.541);
  --category-hardware: oklch(0.746 0.16 232.661);
  --category-conectividad: oklch(0.792 0.209 151.711);
  --category-instalaciones: oklch(0.75 0.183 55.934);
  --category-electoral: oklch(0.704 0.191 22.216);
  --category-externos: oklch(0.718 0.202 349.761);
  --category-otros: oklch(0.708 0 0);
  --office-type-administracion: oklch(0.704 0.04 256.788);
  --office-type-agencia: oklch(0.707 0.165 254.624);
  --office-type-cdd: oklch(0.702 0.183 293.541);
  --office-type-cdp: oklch(0.673 0.182 276.935);
  --office-type-ctp: oklch(0.789 0.154 211.53);
  --office-type-correo-colaborativo: oklch(0.777 0.152 181.912);
  --office-type-especiales: oklch(0.74 0.238 322.16);
  --office-type-estafeta: oklch(0.828 0.189 84.429);
  --office-type-general: oklch(0.869 0.005 56.366);
  --office-type-sucursal-automatizada: oklch(0.765 0.177 163.223);
  --office-type-sucursal-no-automatizada: oklch(0.841 0.238 128.85);
  --office-type-telegrafia: oklch(0.712 0.194 13.428);
  --office-type-unidad-postal: oklch(0.718 0.202 349.761);
```

Y en `@theme inline`, para que Tailwind emita las utilidades:

```css
  --color-category-aplicaciones: var(--category-aplicaciones);
  --color-category-hardware: var(--category-hardware);
  --color-category-conectividad: var(--category-conectividad);
  --color-category-instalaciones: var(--category-instalaciones);
  --color-category-electoral: var(--category-electoral);
  --color-category-externos: var(--category-externos);
  --color-category-otros: var(--category-otros);
  --color-office-type-administracion: var(--office-type-administracion);
  --color-office-type-agencia: var(--office-type-agencia);
  --color-office-type-cdd: var(--office-type-cdd);
  --color-office-type-cdp: var(--office-type-cdp);
  --color-office-type-ctp: var(--office-type-ctp);
  --color-office-type-correo-colaborativo: var(--office-type-correo-colaborativo);
  --color-office-type-especiales: var(--office-type-especiales);
  --color-office-type-estafeta: var(--office-type-estafeta);
  --color-office-type-general: var(--office-type-general);
  --color-office-type-sucursal-automatizada: var(--office-type-sucursal-automatizada);
  --color-office-type-sucursal-no-automatizada: var(--office-type-sucursal-no-automatizada);
  --color-office-type-telegrafia: var(--office-type-telegrafia);
  --color-office-type-unidad-postal: var(--office-type-unidad-postal);
```

- [ ] **Step 5: Verificar los tokens contra el sitio**

```powershell
Select-String -Path src\index.css -Pattern '--muted-foreground: oklch\(0\.556 0 0\)|--destructive: oklch\(0\.577 0\.245 27\.325\)|--success: oklch\(0\.508 0\.118 165\.612\)|--warning: oklch\(0\.549 0\.163 48\.998\)'
```
Expected: **4 coincidencias**. Si falta alguna, el token quedó en el valor viejo: corregirlo y repetir.

- [ ] **Step 6: Compilar y medir contraste**

```bash
npm run build
npm run audit:contrast
```
Expected: build verde · texto 0 fallas · bordes 3 fallas (1.26/1.26/1.32). Si aparece una falla **nueva** de texto, es el efecto previsto de §8.4 (labels sobre `muted`, botón `destructive/10`, primario oscuro como texto): no se parchea acá, se resuelve en Task 3 con las excepciones y en Fase 2 con el mapeo.

- [ ] **Step 7: Commit**

```bash
git add src/index.css components.json package.json
git commit -m "feat(theme): heredar los tokens del preset b5XRZYXrNg"
```

---

### Task 2: Tokens de consola (viewport oscuro, cromo temático)

**Files:**
- Modify: `src/index.css`
- Modify: `src/components/LivePingConsole.tsx` (3 clases)

- [ ] **Step 1: Definir el juego `--console-*`**

En `:root` de `src/index.css`, antes de `--radius`:

```css
  /* Superficie de log: oscura en ambos temas, nunca sigue al tema */
  --console-bg: oklch(0.16 0 0);
  --console-fg: oklch(0.9 0 0);
  --console-muted: oklch(0.72 0 0);
```

Y en `@theme inline`:

```css
  --color-console-bg: var(--console-bg);
  --color-console-fg: var(--console-fg);
  --color-console-muted: var(--console-muted);
```

No agregar estas variables en `.dark`: si aparecen duplicadas, la regla de "sin variante" se rompe.

- [ ] **Step 2: Reemplazar los hex en la consola**

`src/components/LivePingConsole.tsx:330`, reemplazar la cadena de clases por (misma estructura, solo cambian los colores):

```tsx
        } overflow-y-auto overflow-x-auto p-3.5 bg-console-bg font-mono text-[11.5px] leading-relaxed text-console-fg select-text scrollbar-thin`}
```

Y en el coloreado por línea (`LivePingConsole.tsx:350-364`), cambiar sólo el color por defecto:

```tsx
                        : "text-console-fg";
```

Los colores de estado (`text-cyan-300`, `text-amber-400`, `text-emerald-400`, `text-red-400`) **no se tocan en esta fase**: se mapean en Fase 2 junto con el resto de la paleta.

- [ ] **Step 3: Verificar que el hex desapareció y el CSS lo emite**

```powershell
Select-String -Path src\components\LivePingConsole.tsx -Pattern '#0C0C0C|#CCCCCC|#E5E5E5'
npm run build
Select-String -Path dist\assets\*.css -Pattern 'console-bg'
```
Expected: primer comando sin resultados; build verde; el CSS compilado contiene `--console-bg`.

- [ ] **Step 4: Ver los dos temas**

Run: `npx vite preview --port 5199` (en segundo plano) y capturar con Edge headless en claro y oscuro como en Fase 0, o abrir la app Electron y cambiar de tema.
Expected: el viewport del log se ve igual de oscuro en ambos temas; el header de la consola cambia con el tema.

- [ ] **Step 5: Commit**

```bash
git add src/index.css src/components/LivePingConsole.tsx
git commit -m "feat(console): tokens propios para el viewport de log"
```

---

### Task 3: Capas base, scrollbars y reduced motion

**Files:**
- Modify: `src/index.css`
- Modify: `src/components/ui/skeleton.tsx` (1 clase)

- [ ] **Step 1: Extender `@layer base`**

Después de `html { @apply font-sans; }`, dentro del mismo bloque:

```css
  html.theme-transition,
  html.theme-transition *,
  html.theme-transition *::before,
  html.theme-transition *::after {
    transition-property: background-color, border-color, color, fill, stroke;
    transition-duration: 200ms;
    transition-timing-function: ease;
  }

  @media (prefers-reduced-motion: reduce) {
    html.theme-transition,
    html.theme-transition *,
    html.theme-transition *::before,
    html.theme-transition *::after {
      transition: none;
    }
  }
```

- [ ] **Step 2: Scrollbars globales, sin tocar el sheen**

Al final del archivo:

```css
* {
  scrollbar-width: thin;
  scrollbar-color: color-mix(in oklab, var(--foreground) 22%, transparent) transparent;
}

*::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

*::-webkit-scrollbar-track {
  background: transparent;
}

*::-webkit-scrollbar-thumb {
  background-color: color-mix(in oklab, var(--foreground) 22%, transparent);
  border-radius: 9999px;
}

*::-webkit-scrollbar-thumb:hover {
  background-color: color-mix(in oklab, var(--foreground) 35%, transparent);
}

.no-scrollbar {
  scrollbar-width: none;
}

.no-scrollbar::-webkit-scrollbar {
  display: none;
}

.scrollbar-slim {
  scrollbar-gutter: stable;
}
```

**No** copiar el bloque `@layer components` del sitio con el sheen (`linear-gradient`): la restricción de producto lo prohíbe.

- [ ] **Step 3: Respetar reduced motion en el Skeleton**

`src/components/ui/skeleton.tsx:8`: cambiar `animate-pulse` por `motion-safe:animate-pulse`.

- [ ] **Step 4: Verificar que las utilidades nuevas existen y el sheen no**

```powershell
npm run build
Select-String -Path dist\assets\*.css -Pattern 'scrollbar-gutter|theme-transition'
Select-String -Path src\index.css -Pattern 'linear-gradient'
```
Expected: build verde; el CSS contiene `scrollbar-gutter: stable` y `theme-transition`; el tercer comando no devuelve nada.

- [ ] **Step 5: Commit**

```bash
git add src/index.css src/components/ui/skeleton.tsx
git commit -m "feat(theme): transicion de tema, scrollbars globales y motion-safe"
```

---

### Task 4: Reconciliar overlays e i18n de las primitivas nuevas

**Files:**
- Modify: `src/components/ui/alert-dialog.tsx`, `src/components/ui/sheet.tsx`, `src/components/ui/command.tsx`, `src/components/ui/toggle-group.tsx`

- [ ] **Step 1: Igualar el overlay al `dialog` local**

En `alert-dialog.tsx:37` y `sheet.tsx:40`, cambiar `bg-black/10` por `bg-black/60` (el valor que ya usa `dialog.tsx:19`).

En `alert-dialog.tsx:59`, cambiar la superficie del contenido para que coincida con el diálogo local:

```
bg-popover ... ring-1 ring-foreground/10
```
por:

```
bg-card border border-border
```

- [ ] **Step 2: Reenviar `orientation` a Radix**

`src/components/ui/toggle-group.tsx`, en el `ToggleGroupPrimitive.Root`, agregar la prop:

```tsx
      orientation={orientation}
```

- [ ] **Step 3: Defaults en español**

- `command.tsx:35-36`: `title = "Paleta de comandos"`, `description = "Buscar un comando para ejecutar…"`.
- `sheet.tsx:80`: `<span className="sr-only">Cerrar</span>`.

- [ ] **Step 4: Verificar build y suite**

```bash
npm run build
npm test
```
Expected: build verde · 329 tests verdes. Si un test dependía del texto "Close" o de `bg-popover`, falla acá: actualizarlo en el mismo commit.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui
git commit -m "fix(ui): overlays consistentes, orientation y textos en espanol"
```

---

### Task 5: Montar `TooltipProvider`

**Files:**
- Modify: `src/main.tsx`
- Test: `src/test/TooltipProvider.test.tsx` (crear)

- [ ] **Step 1: Escribir el test que falla**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import fs from "node:fs";
import path from "node:path";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

describe("TooltipProvider", () => {
  it("permite renderizar un Tooltip completo", () => {
    render(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>Copiar</TooltipTrigger>
          <TooltipContent>Copiar IP</TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    );
    expect(screen.getByText("Copiar")).toBeInTheDocument();
  });

  it("main.tsx envuelve App con TooltipProvider", () => {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), "src/main.tsx"),
      "utf-8",
    );
    expect(source).toMatch(/TooltipProvider[\s\S]*<App \/>/);
  });
});
```

- [ ] **Step 2: Correrlo y ver el rojo**

Run: `npx vitest run src/test/TooltipProvider.test.tsx`
Expected: el segundo test falla (`main.tsx` no tiene provider). El primero pasa: el provider funciona cuando existe.

- [ ] **Step 3: Montarlo en `main.tsx`**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { TooltipProvider } from './components/ui/tooltip';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <TooltipProvider delayDuration={0}>
        <App />
      </TooltipProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
```

Los listeners de `window.error`/`unhandledrejection` que ya están en el archivo se conservan tal cual: el bloque de arriba reemplaza solo el `createRoot(...)`.

- [ ] **Step 4: Verde**

Run: `npx vitest run src/test/TooltipProvider.test.tsx`
Expected: 2/2.

- [ ] **Step 5: Commit**

```bash
git add src/main.tsx src/test/TooltipProvider.test.tsx
git commit -m "feat(ui): montar TooltipProvider en el punto de entrada"
```

---

### Task 6: Endurecer el guard de configuración

**Files:**
- Modify: `src/test/shadcnConfig.test.ts`

- [ ] **Step 1: Agregar las aserciones que faltan**

Dentro del `describe` existente:

```ts
  it("el style es exactamente radix-vega", () => {
    const config = readJson("components.json");
    expect(config.style).toBe("radix-vega");
  });

  it("radix-ui vive en dependencies, no en devDependencies", () => {
    const pkg = readJson("package.json");
    expect(pkg.dependencies["radix-ui"]).toBeTruthy();
    expect(pkg.devDependencies?.["radix-ui"]).toBeUndefined();
  });

  it("no queda ningún paquete @radix-ui/* declarado", () => {
    const offending = Object.keys(allDeps()).filter((dep) =>
      dep.startsWith("@radix-ui/"),
    );
    expect(offending).toEqual([]);
  });

  it("cmdk y la fuente mono siguen declaradas", () => {
    const deps = allDeps();
    expect(deps["cmdk"]).toBeTruthy();
    expect(deps["@fontsource-variable/geist-mono"]).toBeTruthy();
  });
```

- [ ] **Step 2: Correr el guard**

Run: `npx vitest run src/test/shadcnConfig.test.ts`
Expected: **10/10**. Si alguna falla, el defecto es real (dependencia mal ubicada o token ausente): corregir `package.json`, no el test.

- [ ] **Step 3: Commit**

```bash
git add src/test/shadcnConfig.test.ts
git commit -m "test(shadcn): guard de estilo exacto, dependencias y fuentes"
```

---

### Task 7: Test de contrato con ratchet

**Files:**
- Create: `src/test/designContract.test.ts`

El test congela los conteos actuales y falla si crecen. No se puede exigir cero todavía: las 106 clases de paleta y las 18 sombras propias son trabajo de Fase 2. Un ratchet deja el número bajar y nunca subir.

- [ ] **Step 1: Escribir el test con el baseline real**

```ts
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const SRC = path.resolve(process.cwd(), "src");
const UI = path.join(SRC, "components", "ui");

function readAll(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) readAll(full, out);
    else if (/\.tsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

const appFiles = readAll(path.join(SRC, "components"))
  .concat(readAll(path.join(SRC, "context")), readAll(path.join(SRC, "hooks")))
  .filter((file) => !file.startsWith(UI) && !file.endsWith(".test.tsx"))
  .concat([path.join(SRC, "App.tsx")]);

function count(pattern: RegExp): number {
  return appFiles.reduce((total, file) => {
    const matches = fs.readFileSync(file, "utf-8").match(pattern);
    return total + (matches ? matches.length : 0);
  }, 0);
}

// Ratchet: bajar estos numeros a medida que Fase 2 limpia. Nunca subirlos.
const BASELINE = {
  palette: 106,   // bg/text/blue-600, emerald-500, etc.
  shadow: 18,     // sombras en codigo propio (las de ui/** no cuentan)
  rounded: 8,     // rounded-[...] o rounded pelado
};

describe("contrato de diseno", () => {
  it("no crece la paleta fija fuera de tokens", () => {
    const found = count(
      /\b(?:text|bg|border|ring)-(?:blue|emerald|amber|cyan|red|slate|zinc|green|purple|pink)-\d{2,3}\b/g,
    );
    expect(found).toBeLessThanOrEqual(BASELINE.palette);
  });

  it("no crece la elevacion propia", () => {
    const found = count(/\bshadow-(?:2xs|xs|sm|md|lg|xl|2xl)\b/g);
    expect(found).toBeLessThanOrEqual(BASELINE.shadow);
  });

  it("no crece el uso de radios arbitrarios", () => {
    const found = count(/\brounded-\[|\brounded\b(?!-)/g);
    expect(found).toBeLessThanOrEqual(BASELINE.rounded);
  });

  it("no hay degradados ni Base UI", () => {
    const found = count(/\bbg-gradient-|\b@base-ui\b/g);
    expect(found).toBe(0);
  });

  it("no hay overlays resueltos con z-index manual en codigo propio", () => {
    const found = count(/\bz-50\b/g);
    expect(found).toBeLessThanOrEqual(5);
  });
});
```

- [ ] **Step 2: Correrlo y ajustar el baseline a la realidad**

Run: `npx vitest run src/test/designContract.test.ts`
Expected: puede fallar por conteos distintos a los anotados. En ese caso, contar con:

```powershell
Select-String -Path src\App.tsx,src\components\*.tsx,src\context\*.tsx,src\hooks\*.ts -Pattern 'text-(blue|emerald|amber|cyan|red|slate|zinc|green|purple|pink)-\d{3}' -AllMatches | ForEach-Object { $_.Matches.Count } | Measure-Object -Sum
```

y fijar el número real en `BASELINE`. El test debe quedar **verde** al terminar la tarea: el baseline representa la deuda actual, no una meta.

- [ ] **Step 3: Commit**

```bash
git add src/test/designContract.test.ts
git commit -m "test(design): ratchet de paleta, sombras y radios"
```

---

### Task 8: Fuentes a devDependencies

**Files:**
- Modify: `package.json`, `package-lock.json`

- [ ] **Step 1: Mover las tres fuentes**

```bash
npm i -D @fontsource-variable/geist @fontsource-variable/geist-mono @fontsource-variable/roboto-slab
```
Expected: las tres quedan en `devDependencies`; el lock no cambia de versión.

- [ ] **Step 2: Verificar que el build sigue emitiendo los woff2**

```powershell
Get-ChildItem dist\assets -Filter *.woff2 | Measure-Object
npm run build
Get-ChildItem dist\assets -Filter *.woff2 | Measure-Object
```
Expected: el **mismo conteo** antes y después del build; build verde. Si baja, el `@import` de esa familia dejó de resolver.

- [ ] **Step 3: Verificar el ahorro de empaquetado**

```powershell
node -e "const p=require('./package.json');console.log({prod:Object.keys(p.dependencies).filter(k=>k.includes('fontsource')),dev:Object.keys(p.devDependencies).filter(k=>k.includes('fontsource'))})"
```
Expected: `prod: []`, `dev:` con las tres.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(deps): fuentes a devDependencies, son de build"
```

---

### Task 9: `eject` del preset (opcional, con gate)

**Files:**
- Modify: `src/index.css`, `src/test/ShadcnPreset.test.tsx`, `package.json`

Solo ejecutar si Tasks 1-4 están verdes y la suite completa pasa. `eject` inlinea 16 KB de CSS y elimina la dependencia del CLI; si se hace antes, se congela una copia sin las utilidades que necesitan las primitivas.

- [ ] **Step 1: Confirmar qué hace y a quién rompe**

```powershell
Select-String -Path src\test\ShadcnPreset.test.tsx -Pattern 'shadcn/tailwind.css'
```
Expected: una aserción en la línea ~47 que exige el `@import`. Es la que hay que reescribir.

- [ ] **Step 2: Reescribir la aserción**

En `src/test/ShadcnPreset.test.tsx`, reemplazar la expectativa por:

```tsx
    expect(cssContent).toMatch(/ejected from shadcn@/);
    expect(cssContent).toContain("@custom-variant data-open");
```

- [ ] **Step 3: Correr el eject**

```bash
npx shadcn@latest eject
```
Expected: inlinea `shadcn/tailwind.css` en `src/index.css`, agrega el banner `/* ejected from shadcn@4.23.0 */` y saca `shadcn` de `package.json`.

- [ ] **Step 4: Verificar que las animaciones siguen compilando**

```powershell
npm run build
Select-String -Path dist\assets\*.css -Pattern 'data-state=open' | Select-Object -First 3
npm test
```
Expected: build verde; el CSS contiene reglas con `[data-state=open]`; suite verde (los dos tests de `ShadcnPreset` incluidos).

- [ ] **Step 5: Commit**

```bash
git add src/index.css src/test/ShadcnPreset.test.tsx package.json package-lock.json
git commit -m "chore(theme): eject del preset e inline de las utilidades"
```

Si el `eject` falla o deja el build roto, revertir el commit y dejar la tarea para Fase 3: no es bloqueante.

---

### Task 10: Cierre de fase

**Files:**
- Modify: `docs/ui-slop-audit-2026-11-02.md` (§5 Fase 1), plan Fase 0

- [ ] **Step 1: Verificación completa**

```bash
npx vitest run
npm run build
npm run audit:contrast
```
Expected: suite verde (329 + los tests nuevos) · build verde · contraste **sin fallas de texto** y **3 de borde** (1.26/1.26/1.32). Si aparece una falla de texto, la causa está en §8.4 del audit: decidir entre excepción documentada o cambio de superficie, y anotarla.

- [ ] **Step 2: Probar los dos temas con la app real**

Run: `npm run electron:dev`
Expected: cambio de tema con transición de 200 ms; consola oscura en ambos temas; header de la consola sigue el tema; scrollbars de 6 px en toda la app.

- [ ] **Step 3: Registrar el estado**

En `docs/ui-slop-audit-2026-11-02.md`, bajo `### Fase 1`, agregar:

```markdown
> **Estado (2026-11-03):** ejecutada. Tokens del preset heredados (0 desvíos, 20 tokens nuevos) · `--console-*` fijas · capas y scrollbars del sitio · `TooltipProvider` montado · guard 10/10 · ratchet de contrato activo.
```

Y en este plan, bajo el título:

```markdown
> **Estado (2026-11-03):** ejecutada. Suite y build verdes; contraste sin cambios.
```

- [ ] **Step 4: Commit**

```bash
git add docs
git commit -m "docs(audit): registrar ejecucion de la fase 1"
```

---

## Criterios de aceptación

- [ ] `npm run audit:contrast` → 0 fallas de texto, 3 de borde.
- [ ] `index.css` no tiene hex de consola: `Select-String -Path src/**/*.tsx -Pattern '#0C0C0C'` vacío.
- [ ] `grep -r "linear-gradient" src/` → vacío.
- [ ] `main.tsx` monta `TooltipProvider` y `src/test/TooltipProvider.test.tsx` está verde.
- [ ] Guard `shadcnConfig.test.ts` en 10/10.
- [ ] `designContract.test.ts` verde con baseline real.
- [ ] `npm test` y `npm run build` verdes.
- [ ] Cero cambios en `src/components/*.tsx` fuera de `LivePingConsole.tsx` (y solo colores).

## Hand-offs a Fase 2 (no ejecutar acá)

| Pendiente | Por qué |
|---|---|
| Mapear los 106 colores fijos a `--success`/`--warning`/`--destructive`/`category-*`/`office-type-*` | El baseline del ratchet solo puede bajar; este es el trabajo que lo baja |
| `Sheet`/`AlertDialog` necesitan `Title` del consumidor | Radix avisa en dev si falta |
| `Field` + `aria-invalid`/`aria-describedby` | `field.tsx` no cablea nada; receta en el plan de Fase 0 §Task 7 |
| `Label` local fija `text-xs`/`text-foreground` y bloquea el color de inválido de `Field` | Al adoptar formularios |
| `command.tsx` indicator keyea en `data-checked`; cmdk emite `data-selected` | Al adoptar la paleta de comandos |
| `cn-*` utilities (`cn-menu-target`, etc.) no existen en 4.23.0 | Si Fase 3 suma menús |
| Tipografía 18/14/12/11 y overlines | Fase 5 |
| Sombras propias y `Card`/`Alert`/`Input` en 6 puntos | Fase 2 |
