# Fase 0 — Dependencias e instalables · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** dejar el repo sobre Radix declarado (`style: radix-vega`), con `radix-ui` unificado, el CLI de shadcn fuera de producción y las 14 primitivas nuevas instaladas, sin tocar ni un componente de producto.

**Architecture:** La Fase 0 no modifica UI: solo configura el proyecto para que el registry resuelva (hoy devuelve 404), unifica la librería de primitivas y agrega los archivos que consumirán las Fases 2 y 3. El único cambio de CSS es el import de la fuente mono, para que la dependencia instalada no quede muerta.

**Tech Stack:** React 19 · Vite 6 · TypeScript 5.7 · Tailwind 4 · shadcn CLI (`shadcn@4.22.1` instalado, se invoca `@latest`) · Vitest 3 · Electron 34.

**Referencia:** `docs/ui-slop-audit-2026-11-02.md` §5 (Fase 0), §7.3 (por qué el style), §7.5 (skill oficial) y §8.2 (valores del preset).

---

## Estado inicial (verificado el 2026-11-03)

| Hecho | Valor actual | Evidencia |
|---|---|---|
| `components.json` → `style` | `"default"` (v1, sin prefijo) | `shadcn view combobox` → 404 contra `/r/styles/default/combobox.json` |
| Paquete Radix | solo scoped: `@radix-ui/react-dialog`, `react-label`, `react-separator`, `react-slot` | `package.json` |
| `radix-ui` unificado | **no instalado** (los ítems del registry lo importan) | `node_modules/radix-ui` no existe |
| Base UI | ausente (lockfile sin menciones) | `node_modules/@base-ui` es carpeta vacía |
| `shadcn` | en `dependencies` (viaja al instalador: 33,3 MB / 4.741 archivos) | `package.json` + asar |
| `next-themes` | declarado y **sin uso** | `grep next-themes src/` → 0 |
| Primitivas en `src/components/ui/` | **12** | `Get-ChildItem src/components/ui` |
| Geist Mono | declarada en CSS, **no instalada** | `package.json` sin `@fontsource-variable/geist-mono` |
| Rama | `main`, con 3 archivos sin trackear | `git status` |

---

## File Structure

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `src/test/shadcnConfig.test.ts` | **crear** | Guard ejecutable: base Radix declarada, sin Base UI, `radix-ui` presente, CLI fuera de producción |
| `components.json` | modificar | `"style": "radix-vega"` |
| `package.json` / `package-lock.json` | modificar | `radix-ui` entra; `shadcn` pasa a dev; `next-themes` sale; `@fontsource-variable/geist-mono` entra |
| `src/index.css` | modificar (2 líneas) | `@import` del mono + `--font-mono` con la familia real |
| `docs/shadcn-preset-decode.json` | **crear** | Salida cruda de `preset decode --json` (UTF-8, diffeable) |
| `docs/shadcn-preset-decode.md` | **crear** | Procedencia y lectura humana del preset |
| `src/components/ui/*.tsx` | **crear (14)** | `command`, `popover`, `context-menu`, `sheet`, `tooltip`, `switch`, `toggle-group`, `progress`, `collapsible`, `alert-dialog`, `empty`, `skeleton`, `field`, `input-group` |
| `docs/ui-slop-audit-2026-11-02.md` | modificar (§5) | Registrar que la Fase 0 se ejecutó |

**Fuera de alcance:** tokens del tema (Fase 1), reemplazo de `Card`/`Alert`/`Input` (Fase 2), migración de buscador/drawer/menú (Fase 3), borrado de componentes muertos (Fase 4).

---

### Task 0: Rama y baseline

**Files:**
- Modify: ninguno (solo git)

- [ ] **Step 1: Verificar que el árbol no tenga cambios de producto**

Run: `git status --porcelain`
Expected: solo `?? docs/ui-slop-audit-2026-11-02.md`, `?? docs/ui-slop-audit-2026-11-02/`, `?? skills-lock.json`. Si aparece un archivo modificado de `src/` o `electron/`, parar y reportar.

- [ ] **Step 2: Crear la rama**

```bash
git switch -c chore/fase-0-dependencias
```

- [ ] **Step 3: Commitear el baseline de la auditoría**

```bash
git add docs/ui-slop-audit-2026-11-02.md docs/ui-slop-audit-2026-11-02
git commit -m "docs(audit): ui-slop audit 2026-11-02 con capturas y plan por fases"
```

---

### Task 1: Guard de base Radix (test que falla primero)

**Files:**
- Create: `src/test/shadcnConfig.test.ts`

- [ ] **Step 1: Escribir el test**

```ts
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const readJson = (file: string) =>
  JSON.parse(fs.readFileSync(path.resolve(root, file), "utf-8"));

function allDeps(): Record<string, string> {
  const pkg = readJson("package.json");
  return { ...pkg.dependencies, ...pkg.devDependencies };
}

describe("Configuración shadcn: base Radix declarada", () => {
  it("components.json declara un style con prefijo radix-", () => {
    const config = readJson("components.json");
    expect(config.style).toMatch(/^radix-/);
  });

  it("no hay dependencias de Base UI", () => {
    const offending = Object.keys(allDeps()).filter((dep) => dep.includes("base-ui"));
    expect(offending).toEqual([]);
  });

  it("el paquete unificado radix-ui está instalado", () => {
    expect(allDeps()["radix-ui"]).toBeTruthy();
  });

  it("el CLI de shadcn está en devDependencies y no en producción", () => {
    const pkg = readJson("package.json");
    expect(pkg.dependencies?.shadcn).toBeUndefined();
    expect(pkg.devDependencies?.shadcn).toBeTruthy();
  });

  it("next-themes ya no está declarado", () => {
    expect(allDeps()["next-themes"]).toBeUndefined();
  });
});
```

- [ ] **Step 2: Correrlo para verlo fallar**

Run: `npx vitest run src/test/shadcnConfig.test.ts`
Expected: **4 failed | 1 passed**. La aserción “no hay dependencias de Base UI” **ya pasa en el baseline**: el commit `d77753c` retiró Base UI de `package.json`, así que funciona como guard de regresión, no como defecto pendiente. Los 4 rojos son: `expected 'default' to match /^radix-/`, `expected undefined to be truthy` (radix-ui), `expected '^4.22.1' to be undefined` (shadcn en dependencies) y `expected '^0.4.6' to be undefined` (next-themes).

- [ ] **Step 3: Commit del test en rojo**

```bash
git add src/test/shadcnConfig.test.ts
git commit -m "test(shadcn): guard de base radix, radix-ui y CLI fuera de produccion (rojo)"
```

---

### Task 2: Inspeccionar el preset y declarar el style

**Files:**
- Create: `docs/shadcn-preset-decode.json`, `docs/shadcn-preset-decode.md`
- Modify: `components.json`

- [ ] **Step 1: Decodificar el preset con la CLI (nunca a mano)**

Run: `npx shadcn@latest preset decode b5XRZYXrNg`
Expected: JSON o tabla con `style`, `baseColor`, `theme`, `iconLibrary`, `font`, `radius`. Si el comando no existe o falla, correr `npx shadcn@latest preset --help` y reportar la salida antes de seguir; los valores de §8.2 del audit siguen siendo válidos como fuente.

- [ ] **Step 2: Guardar la evidencia en JSON UTF-8**

`*>` de PowerShell 5.1 escribe UTF-16LE y mezcla stderr (Git lo trata como binario y el preámbulo parece un error). Capturar así:

```powershell
cmd /c "npx --yes shadcn@latest preset decode b5XRZYXrNg --json > docs\shadcn-preset-decode.json 2>nul"
```

Verificar: primer byte `123` (`{`), sin BOM, `JSON.parse` OK y sin `NativeCommandError` en el archivo. Después crear `docs/shadcn-preset-decode.md` con la procedencia (comando, versión del CLI, fecha, valores y la aclaración de que `style: vega` + base `radix` = `radix-vega`).

- [ ] **Step 3: Confirmar qué detecta hoy el CLI en el proyecto**

Run: `npx shadcn@latest preset resolve --json`
Expected: JSON con el preset detectado o un error de resolución por `style: "default"`. **No bloquea**: es la foto del estado inicial. Pegar la salida en el reporte de la tarea.

- [ ] **Step 4: Cambiar el style**

`components.json`, línea 4:

```json
  "style": "radix-vega",
```

queda:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "radix-vega",
  "rsc": false,
```

- [ ] **Step 5: Verificar que el CLI ahora resuelve**

Run: `npx shadcn@latest info --json`
Expected: incluye `"base": "radix"` y `"style": "radix-vega"`. Si devuelve 404 o un style vacío, parar: el style no es válido para este CLI.

- [ ] **Step 6: Correr el guard**

Run: `npx vitest run src/test/shadcnConfig.test.ts`
Expected: **3 failed | 2 passed** (pasan “style con prefijo radix-” y el guard de Base UI).

- [ ] **Step 7: Commit**

```bash
git add components.json docs/shadcn-preset-decode.json docs/shadcn-preset-decode.md
git commit -m "chore(shadcn): declarar base radix explicita con style radix-vega"
```

---

### Task 3: Migrar al paquete unificado `radix-ui`

**Files:**
- Modify: `src/components/ui/badge.tsx`, `button.tsx`, `dialog.tsx`, `label.tsx`, `separator.tsx` (imports)
- Modify: `package.json`, `package-lock.json`

- [ ] **Step 1: Ver los imports actuales**

Run: `Select-String -Path src\components\ui\*.tsx -Pattern '@radix-ui/'`
Expected: **5 archivos**, no 4: `badge.tsx` y `button.tsx` (`react-slot`), `dialog.tsx` (`react-dialog`), `label.tsx` (`react-label`), `separator.tsx` (`react-separator`).

- [ ] **Step 2: Correr la migración oficial**

Run: `npx shadcn@latest migrate radix`
Expected: reescribe los imports a `from "radix-ui"` y actualiza `package.json` (sale `@radix-ui/*`, entra `radix-ui`). Si el comando no existe en `@latest`, usar el binario pinneado: `npx shadcn@4.22.1 migrate radix`.

- [ ] **Step 3: Verificar que `radix-ui` quedó instalado**

```powershell
node -e "const p=require('./package.json');const d={...p.dependencies,...p.devDependencies};console.log({radixUi:d['radix-ui'],scoped:Object.keys(d).filter(k=>k.startsWith('@radix-ui/'))})"
```

Expected: `radixUi` con una **versión semver** (`^1.…`), `scoped: []`. Dos casos a corregir:
- Si `radixUi` es `undefined`: correr `npm i radix-ui` y repetir.
- Si `radixUi` es exactamente `"latest"`: el CLI con `add` inyecta ese tag flotante. Fijarlo con `npm i radix-ui` (reescribe a `^x.y.z`) y volver a verificar. Un `latest` en `dependencies` rompe la reproducibilidad del release.
- Si `scoped` no está vacío: el CLI solo *lista* los paquetes scoped como “pueden removerse”, no los saca. Correr `npm uninstall @radix-ui/react-dialog @radix-ui/react-label @radix-ui/react-separator @radix-ui/react-slot`; siguen resolviendo como transitivas de `radix-ui`, con las mismas versiones.

> **Secuencia obligatoria:** Task 3 cierra antes de Task 5. Con `radix-ui` ausente, un `add` deja archivos que importan un paquete no instalado y el build rompe.

- [ ] **Step 4: Verificar los imports reescritos**

Run: `Select-String -Path src\components\ui\*.tsx -Pattern 'from "radix-ui"'`
Expected: **5 archivos**, cero `@radix-ui/*` restantes. `Slot` llega como **namespace**, no como componente: el paquete declara `export { reactSlot as Slot }`, así que `button.tsx` y `badge.tsx` quedan con `import { Slot as SlotPrimitive } from "radix-ui"` y usan `<SlotPrimitive.Slot>`. Un `import { Slot }` plano compila pero renderiza un elemento inválido en cada `asChild`: no "corregirlo" a la forma literal.

- [ ] **Step 5: Compilar**

Run: `npm run build`
Expected: `tsc` sin errores y `vite build` con `dist/assets/index-*.js` y `index-*.css`. Si falla por un nombre exportado distinto (p. ej. `Slot`), leer el error, ajustar el import a lo que exporta `radix-ui` y volver a compilar.

- [ ] **Step 6: Correr el guard**

Run: `npx vitest run src/test/shadcnConfig.test.ts`
Expected: **2 failed | 3 passed** (pasan “style”, Base UI y `radix-ui`).

- [ ] **Step 7: Commit**

```bash
git add src/components/ui package.json package-lock.json
git commit -m "refactor(ui): migrar primitivas al paquete unificado radix-ui"
```

---

### Task 4: Fuente mono y limpieza de dependencias

**Files:**
- Modify: `src/index.css` (2 líneas)
- Modify: `package.json`, `package-lock.json`

- [ ] **Step 1: Instalar Geist Mono**

Run: `npm i @fontsource-variable/geist-mono`
Expected: instala 1 paquete nuevo. El `postinstall` (`scripts/patch-esbuild.cjs`) corre sin error. Si npm reporta vulnerabilidades, no bloquea.

- [ ] **Step 2: Importarla en el CSS**

`src/index.css`, líneas 4-5:

```css
@import "@fontsource-variable/geist";
@import "@fontsource-variable/roboto-slab";
```

quedan:

```css
@import "@fontsource-variable/geist";
@import "@fontsource-variable/geist-mono";
@import "@fontsource-variable/roboto-slab";
```

- [ ] **Step 3: Apuntar el token a la familia real**

`src/index.css`, línea 13:

```css
  --font-mono: "Geist Mono", "Cascadia Mono", Consolas, ui-monospace, SFMono-Regular, monospace;
```

queda:

```css
  --font-mono: "Geist Mono Variable", "Cascadia Mono", Consolas, ui-monospace, SFMono-Regular, monospace;
```

- [ ] **Step 4: Mover el CLI a devDependencies y sacar `next-themes`**

```bash
npm i -D shadcn
npm uninstall next-themes
```

Expected: `package.json` con `"shadcn"` en `devDependencies` y sin `next-themes`. `npm i -D shadcn` puede reescribir la versión; si cambia de `^4.22.1` a otra, aceptarla y anotarla.

- [ ] **Step 5: Compilar y confirmar que la fuente se empaqueta**

Run: `npm run build`
Expected: build verde y **al menos un** archivo `dist/assets/geist-mono-*.woff2`.

```powershell
Get-ChildItem dist\assets -Filter *geist-mono* | Select-Object Name,Length
```

Expected: 1..6 archivos (subset por alfabeto). Si no hay ninguno, el `@import` no entró: revisar que esté antes de `@theme`.

- [ ] **Step 6: Correr el guard**

Run: `npx vitest run src/test/shadcnConfig.test.ts`
Expected: **0 failed | 5 passed**.

- [ ] **Step 7: Commit**

```bash
git add src/index.css package.json package-lock.json
git commit -m "chore(deps): geist mono instalada, shadcn a devDependencies y next-themes fuera"
```

---

### Task 5: Instalar las 10 primitivas de interacción

**Files:**
- Create: `src/components/ui/command.tsx`, `popover.tsx`, `context-menu.tsx`, `sheet.tsx`, `tooltip.tsx`, `switch.tsx`, `toggle-group.tsx`, `progress.tsx`, `collapsible.tsx`, `alert-dialog.tsx`

- [ ] **Step 1: Dry-run y revisión de colisiones**

**Precondición:** `node -e "const p=require('./package.json');console.log(p.dependencies['radix-ui'])"` debe devolver una versión semver (no `undefined` ni `latest`). Si no, volver a Task 3.

Run: `npx shadcn@latest add command popover context-menu sheet tooltip switch toggle-group progress collapsible alert-dialog --dry-run`
Expected: lista de archivos nuevos bajo `src/components/ui/`.

**GATE:** si la lista incluye algún archivo que ya existe (`dialog.tsx`, `button.tsx`, `input.tsx`, `label.tsx`, `separator.tsx`, `card.tsx`, `badge.tsx`, `table.tsx`, `textarea.tsx`, `alert.tsx`, `kbd.tsx`, `sonner.tsx`), **no ejecutes el add**. Corré `npx shadcn@latest add <item> --diff <archivo>` sobre ese archivo, pegá el diff en el reporte y esperá decisión: sobrescribir cambiaría la API que usa la app.

- [ ] **Step 2: Instalar sin flags interactivos**

Run: `npx shadcn@latest add command popover context-menu sheet tooltip switch toggle-group progress collapsible alert-dialog`
Expected: crea los 10 archivos y agrega las dependencias que falten (`cmdk` por `command`; `radix-ui` ya está). **`input-group` puede aparecer acá** porque `command` lo declara como registryDependency: si se crea, la cuenta final sigue siendo 26 y el Task 6 lo reporta como “already exists”. No usar `-y` ni `--overwrite`.

- [ ] **Step 3: Verificar los 10 archivos**

```powershell
$expected = 'command','popover','context-menu','sheet','tooltip','switch','toggle-group','progress','collapsible','alert-dialog'
foreach ($f in $expected) { "{0,-16} {1}" -f $f, (Test-Path "src/components/ui/$f.tsx") }
```

Expected: `True` en las 10 líneas.

- [ ] **Step 4: Compilar**

Run: `npm run build`
Expected: build verde. Si aparece un error de import faltante, es una registryDependency que no entró: instalarla (`npx shadcn@latest add <item>`) y recompilar.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui package.json package-lock.json
git commit -m "feat(ui): primitivas de interaccion desde el registry radix-vega"
```

---

### Task 6: Instalar las 4 primitivas de composición

**Files:**
- Create: `src/components/ui/empty.tsx`, `skeleton.tsx`, `field.tsx`, `input-group.tsx` (si `input-group` no vino con `command`, se agrega acá)

- [ ] **Step 1: Verificar disponibilidad antes de instalar**

Run: `npx shadcn@latest view empty skeleton field input-group`
Expected: ficha de cada ítem (nombre, dependencias, archivos). Si alguno no existe en este registry, anotarlo, sacarlo del comando y reportar: su reemplazo queda pendiente para la Fase 2.

- [ ] **Step 2: Instalar**

Run: `npx shadcn@latest add empty skeleton field input-group`
Expected: crea los que falten; para `input-group` puede responder “already exists” si vino como dependencia de `command`. Eso es correcto.

- [ ] **Step 3: Verificar el inventario final**

```powershell
(Get-ChildItem src\components\ui -Filter *.tsx).Count
```

Expected: **26** (12 previos + 14 nuevos). Si el número es menor, listar qué falta:

```powershell
Get-ChildItem src\components\ui -Filter *.tsx | Select-Object -ExpandProperty Name | Sort-Object
```

- [ ] **Step 4: Compilar y correr toda la suite**

Run: `npm run build`
Expected: verde.

Run: `npm test`
Expected: toda la suite en verde, incluido `src/test/shadcnConfig.test.ts` y `ShadcnPreset.test.tsx`. Si `ShadcnPreset.test.tsx` falla por un `data-slot` que cambió en un archivo sobrescrito, es señal de una colisión del Task 5: reportar antes de tocar el test.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui package.json package-lock.json
git commit -m "feat(ui): empty, skeleton, field e input-group desde el registry"
```

---

### Task 7: Leer y verificar cada archivo instalado

**Files:**
- Modify: los archivos nuevos que lo necesiten (solo imports)

La skill oficial (workflow, paso 7) exige leer lo que el registry escribe: no garantiza que llegue correcto.

- [ ] **Step 1: Buscar restos del entorno del registry**

Run: `Select-String -Path src\components\ui\*.tsx -Pattern 'IconPlaceholder|@/app/|/registry/' -List`
Expected: **sin resultados**. Si hay, reemplazar cada `IconPlaceholder lucide="X"` por el componente de `lucide-react` que corresponda (`SearchIcon` → `Search`, `XIcon` → `X`, `CheckIcon` → `Check`, `ChevronDownIcon` → `ChevronDown`) y borrar cualquier ruta `@/app/…`.

- [ ] **Step 2: Buscar Base UI**

Run: `Select-String -Path src\components\ui\*.tsx -Pattern '@base-ui' -List`
Expected: **sin resultados**. Si aparece, el ítem se sirvió desde la base equivocada: revertir ese archivo y reportar.

- [ ] **Step 3: Confirmar la primitiva correcta por archivo**

```powershell
Select-String -Path src\components\ui\*.tsx -Pattern 'from "radix-ui"' | Select-Object Filename
```

Expected: al menos `sheet.tsx` (Dialog), `context-menu.tsx` (ContextMenu), `tooltip.tsx` (Tooltip), `switch.tsx` (Switch), `toggle-group.tsx` (ToggleGroup), `progress.tsx` (Progress), `collapsible.tsx` (Collapsible), `alert-dialog.tsx` (AlertDialog), `popover.tsx` (Popover).

- [ ] **Step 4: Confirmar `data-slot` y `cn` en cada archivo nuevo**

```powershell
foreach ($f in Get-ChildItem src\components\ui -Filter *.tsx) {
  $t = Get-Content $f.FullName -Raw
  "{0,-18} data-slot:{1} cn:{2}" -f $f.Name, ($t -match 'data-slot='), ($t -match 'cn\(')
}
```

Expected: `data-slot: True` en todos; `cn: True` en todos menos `skeleton.tsx` (que puede no necesitar clases condicionales).

- [ ] **Step 5: Anotar el resultado en el reporte de la tarea**

Tabla a entregar: archivo → primitiva importada → `data-slot` sí/no → ajustes hechos. Si no hubo ajustes, decirlo explícitamente.

- [ ] **Step 6: Commit (solo si hubo cambios)**

```bash
git add src/components/ui
git commit -m "fix(ui): corregir imports y placeholders de los componentes instalados"
```

---

### Task 8: Cierre de fase

**Files:**
- Modify: `docs/ui-slop-audit-2026-11-02.md` (§5, Fase 0)

- [ ] **Step 1: Verificación completa**

```bash
npm test
npm run build
npm run audit:contrast
```

Expected: tests verdes · build verde · contraste con **0 fallas de texto** y **3 de borde** (1.26/1.32), igual que antes de la fase.

- [ ] **Step 2: Verificar el árbol de dependencias final**

```powershell
node -e "const p=require('./package.json');const d={...p.dependencies,...p.devDependencies};console.log({radixUi:d['radix-ui'],baseUi:Object.keys(d).filter(k=>k.includes('base-ui')),shadcnDep:p.dependencies.shadcn,shadcnDev:p.devDependencies.shadcn,nextThemes:d['next-themes'],mono:d['@fontsource-variable/geist-mono'],cmdk:d.cmdk})"
```

Expected: `radixUi` con versión · `baseUi: []` · `shadcnDep: undefined` · `shadcnDev` con versión · `nextThemes: undefined` · `mono` con versión · `cmdk` con versión (lo trajo `command`).

- [ ] **Step 3: Registrar la ejecución en el audit**

En `docs/ui-slop-audit-2026-11-02.md`, debajo del título de la Fase 0, agregar:
```markdown
> **Estado (2026-11-03):** ejecutada. `style: radix-vega` · `radix-ui` instalado · `shadcn` en devDependencies · 14 primitivas nuevas · guard `src/test/shadcnConfig.test.ts` en verde.

Y en `docs/shadcn-preset-decode.md`, separar la fila `CLI` en `CLI (pin del repo)` y `CLI (captura)` (hoy la tabla muestra solo el pin 4.22.1 y la captura corrió con 4.23.0; el footnote lo aclara, la tabla no).
```

- [ ] **Step 4: Commit final**

```bash
git add docs/ui-slop-audit-2026-11-02.md
git commit -m "docs(audit): registrar ejecucion de la fase 0"
```

- [ ] **Step 5: Reporte de cierre**

Entregar: salida de `git log --oneline main..HEAD`, conteo de `ui/*.tsx` (26), y la tabla del Task 7 Step 5.

---

## Criterios de aceptación

- [ ] `npx shadcn@latest info --json` devuelve `base: radix` y `style: radix-vega`.
- [ ] `npx shadcn@latest add <cualquiera> --dry-run` resuelve (ya no hay 404).
- [ ] `npm test` verde, incluido `src/test/shadcnConfig.test.ts` (5/5; 4 llegan en rojo y el de Base UI es guard de regresión ya verde).
- [ ] `npm run build` verde y `dist/assets/geist-mono-*.woff2` presente.
- [ ] `src/components/ui/` tiene **26** archivos.
- [ ] `package.json`: sin `@base-ui*`, sin `next-themes`, `radix-ui` presente, `shadcn` solo en dev.
- [ ] Ningún archivo de `src/components/*.tsx` (código de producto) fue modificado.

## Rollback

```bash
git switch main
git branch -D chore/fase-0-dependencias
```

Si ya se mergeó: `git revert --no-commit <sha-del-merge> && git commit -m "revert: fase 0"`.

## Riesgos conocidos

| Riesgo | Síntoma | Mitigación |
|---|---|---|
| `add` sobrescribe `dialog.tsx` | La app deja de compilar por props que ya no existen | GATE del Task 5 Step 1: dry-run + diff antes de instalar |
| `migrate radix` no cubre algún import | `tsc` falla tras la migración | Task 3 Step 5: compilar antes de seguir |
| El registry sirve `IconPlaceholder` | Import roto a `@/app/(create)/…` | Task 7 Step 1: reemplazo por lucide |
| `shadcn add` falla por style inválido | 404 en `/r/styles/…` | Task 2 Step 5: `info --json` antes de instalar |
| `npm i -D shadcn` cambia la versión del CLI | Comportamiento distinto al verificado (4.22.1) | Anotar la versión resultante; si rompe, `npm i -D shadcn@4.22.1` |
