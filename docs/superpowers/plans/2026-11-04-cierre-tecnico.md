# Cierre técnico del audit · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** cerrar los pendientes que quedaron fuera de las seis fases: restaurar los tokens del preset por decisión de producto (aceptando menos AA y documentándolo), consolidar los tests duplicados del quick bar, dar salida al borde decorativo en el script de contraste, partir el bundle en chunks y dejar el árbol limpio.

**Architecture:** primero el cambio de tokens (afecta al gate de contraste) y su nueva política de excepciones medidas; después la limpieza de tests y del script; al final el bundle y el commit del fix pendiente de Electron. Nada de esto toca componentes de producto salvo el nombre de un test.

**Tech Stack:** React 19 · Vite 6 · TypeScript 5.7 · Tailwind 4 · Vitest 3 · Electron 34 · OKLCH tokens.

**Prerrequisito:** `main` en `db32ac8`. Estado medido: **399** tests en 62 archivos, build verde, `audit:contrast` y `--strict` en exit 0, ratchet **0/0/0/1**.

**Decisión de producto registrada (2026-11-04):** se **revierte** el oscurecimiento AA de los cuatro tokens del preset (`--muted-foreground`, `--destructive`, `--success`, `--warning`) y se acepta que los pares de texto sobre tintes queden por debajo de 4.5:1. `--info` se conserva como semántica de diagnóstico. Consecuencia: `--strict` deja de ser un gate verde y pasa a ser diagnóstico; los fallos se documentan en `EXCEPTIONS`.

---

## Estado de partida (medido)

| Hecho | Valor | Evidencia |
|---|---|---|
| Tokens tuneados por AA (light) | 4 | `src/index.css:746,750,753,756` |
| Pares de texto que fallarán al revertir | 5–6 (se miden) | los tints `destructive/10`, `/15`, `success/15`, `warning/15` y `muted` |
| `EXCEPTIONS` | vacío | `scripts/check-contrast.mjs` |
| Archivos de test de `QuickActionsBar` | **3** (dos con el mismo basename) | `src/test/QuickActionsBar.test.tsx` (447 líneas), `src/components/QuickActionsBar.test.tsx` (94, 3 tests), `src/components/QuickActionsBarSite.test.tsx` (168, 4 tests) |
| Bundle | 608,54 kB (JS) por `createCn` inlineado | build de Fase 5 |
| `electron/main.cjs` | modificado sin commit (guardas `isDestroyed`) | `git diff` de 10+/5− |

---

## File Structure

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `src/index.css` | modificar | volver a los valores del preset en 4 tokens y corregir sus comentarios |
| `scripts/check-contrast.mjs` | modificar | `EXCEPTIONS` medidas, veredicto "decorativo" para bordes |
| `src/test/QuickActionsBar.test.tsx` | modificar | absorbe los 3 tests del archivo colocado |
| `src/components/QuickActionsBar.test.tsx` | borrar | queda absorbido |
| `src/components/QuickActionsBarSite.test.tsx` | mover a `src/test/` | misma convención que el resto |
| `src/App.test.tsx` | modificar | título sin referencia al sidebar |
| `vite.config.ts` | modificar | `manualChunks` de vendor |
| `electron/main.cjs` | commitear | fix pendiente de guardas de ventana |
| `DESIGN.md`, `docs/ui-slop-audit-2026-11-02.md` | modificar | política de contraste y cierre |

---

### Task 0: Rama y baseline

**Files:** ninguno.

- [ ] **Step 1**

```bash
git status --porcelain
git switch -c chore/cierre-tecnico
```

Expected: sólo `M electron/main.cjs`. La rama nace de `db32ac8`.

- [ ] **Step 2**

```bash
npx vitest run
npm run build
node scripts/check-contrast.mjs --strict
```

Expected: **399** tests · build verde · `--strict` exit 0. Anotar los tres.

---

### Task 1: Revertir los tokens al preset

**Files:** `src/index.css`

- [ ] **Step 1: Volver a los valores originales**

Reemplazar el bloque de tokens de `:root` (líneas ~744-757) por:

```css
  --muted: oklch(0.97 0 0);
  /* Valor del preset corporativo: 4.34:1 sobre muted (bajo AA por decisión de producto). */
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.488 0.243 264.376);
  --accent-foreground: oklch(0.97 0.014 254.604);
  /* Valores del preset: sobre sus tintes quedan entre 3.99:1 y 4.63:1 (aceptado). */
  --destructive: oklch(0.577 0.245 27.325);
  --destructive-foreground: oklch(1 0 0);
  --success: oklch(0.508 0.118 165.612);
  --success-foreground: oklch(1 0 0);
  --warning: oklch(0.549 0.163 48.998);
  /* Sin tinte en la app: solo texto e iconos sobre card */
  --info: oklch(0.50 0.16 255);
```

No tocar `.dark`, `--link`, `--console-*` ni los `*-foreground`.

- [ ] **Step 2: Verificar que el script ahora falla (y cuánto)**

```bash
node scripts/check-contrast.mjs
```

Expected: sale con **exit 1** y lista las filas `FALLA`; anotar **etiqueta y ratio** de cada una (serán 5 o 6 pares de texto, más los 3 bordes).

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "revert(theme): volver a los tokens del preset y aceptar menos AA"
```

---

### Task 2: Nueva política de contraste (excepciones medidas)

**Files:** `scripts/check-contrast.mjs`

- [ ] **Step 1: Documentar la decisión en el encabezado**

Reemplazar el comentario de `EXCEPTIONS` por:

```js
// Decisión de producto (2026-11-04): se restauraron los valores del preset
// corporativo para --muted-foreground, --destructive, --success y --warning.
// Los pares de texto sobre tintes quedan bajo 4.5:1 y se documentan acá con el
// ratio medido; `--strict` deja de ser un gate verde y pasa a ser diagnóstico.
const EXCEPTIONS = [
```

- [ ] **Step 2: Cargar las excepciones medidas**

Para **cada** fila `FALLA` de tipo texto del paso anterior, agregar una entrada con la etiqueta exacta y el ratio medido (redondeado a dos decimales, el que imprime el script):

```js
  {
    label: "<etiqueta exacta que imprime el script>",
    ratio: <ratio medido>,
    reason: "Valor del preset restaurado por decisión de producto; AA no garantizado sobre tintes.",
  },
```

No agregar excepciones para los bordes (`kind: "ui"`): esos no bloquean el exit.

- [ ] **Step 3: Rebautizar el veredicto de los bordes**

En la construcción de `rows`, donde hoy se imprime `FALLA (${threshold}:1)`, distinguir por tipo:

```js
        : pass
          ? "ok"
          : pair.kind === "text"
            ? `FALLA (${threshold}:1)`
            : `decorativo (${value.toFixed(2)}:1, no bloqueante)`,
```

- [ ] **Step 4: Verificar los dos modos**

```bash
node scripts/check-contrast.mjs
node scripts/check-contrast.mjs --strict
```

Expected: el primero **exit 0** con todas las fallas documentadas y los bordes como "decorativo"; el segundo **exit 1** con los mismos pares de texto, porque `--strict` ignora excepciones a propósito. Anotar cuántos son.

- [ ] **Step 5: Commit**

```bash
git add scripts/check-contrast.mjs
git commit -m "chore(contrast): excepciones documentadas del preset y bordes decorativos"
```

---

### Task 3: Consolidar los tests de `QuickActionsBar`

**Files:**
- Modify: `src/test/QuickActionsBar.test.tsx`
- Delete: `src/components/QuickActionsBar.test.tsx`
- Move: `src/components/QuickActionsBarSite.test.tsx` → `src/test/QuickActionsBarSite.test.tsx`
- Modify: `src/App.test.tsx` (título)

Hay dos archivos con el mismo basename y un tercero fuera de la convención. Se consolidan sin perder ni un test.

- [ ] **Step 1: Absorber los 3 tests del archivo colocado**

Al final de `src/test/QuickActionsBar.test.tsx` (antes del `});` que cierra el `describe` raíz, o como describe hermano al final del archivo), agregar el bloque completo:

```tsx
describe('QuickActionsBar Polish: Subnet Scanner & Uptime Refresh', () => {
  const polishTerminal: TerminalData = {
    pc: 'PC-TEST-001',
    ip: '192.0.2.100',
    mac: '00:11:22:33:44:55',
    os: 'Windows 10',
    servicePack: '21H2',
    architecture: 'x64',
    surveyDate: '2026-10-26',
    cpuModel: 'Intel Core i5',
    ram: '8 GB',
    userNt: 'testuser',
    location: 'Buenos Aires',
    antivirusVersion: 'Defender 1.0',
    ieVersion: '11.0',
    uptimeText: '4 días, 6 horas',
    alerts: [],
    resetHistory: [],
  };

  it('renders "Escanear Subred" button and triggers callback on click', () => {
    const onOpenSubnet = vi.fn();
    render(
      <QuickActionsBar
        terminal={polishTerminal}
        isPinging={false}
        onLaunchVnc={vi.fn()}
        onLaunchMsra={vi.fn()}
        onTogglePing={vi.fn()}
        onOpenSubnetScanner={onOpenSubnet}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /más/i }));
    const scanBtn = screen.getByRole('button', { name: /escanear subred/i });
    expect(scanBtn).toBeInTheDocument();
    fireEvent.click(scanBtn);
    expect(onOpenSubnet).toHaveBeenCalledTimes(1);
  });

  it('renders display-only Uptime chip and refreshes from the Más menu', () => {
    const onRefreshUptime = vi.fn();
    render(
      <QuickActionsBar
        terminal={polishTerminal}
        isPinging={false}
        onLaunchVnc={vi.fn()}
        onLaunchMsra={vi.fn()}
        onTogglePing={vi.fn()}
        onRefreshUptime={onRefreshUptime}
        isRefreshingUptime={false}
      />,
    );

    expect(screen.getByText(polishTerminal.uptimeText)).toBeInTheDocument();
    expect(screen.getByTitle(/uptime:/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /más/i }));
    const refreshBtn = screen.getByRole('button', { name: /refrescar uptime/i });
    expect(refreshBtn).toBeInTheDocument();
    fireEvent.click(refreshBtn);
    expect(onRefreshUptime).toHaveBeenCalledTimes(1);
  });

  it('dispara la asistencia MSRA desde el desplegable de conexión remota', () => {
    const onLaunchMsra = vi.fn();
    render(
      <QuickActionsBar
        terminal={polishTerminal}
        isPinging={false}
        onLaunchVnc={vi.fn()}
        onLaunchMsra={onLaunchMsra}
        onTogglePing={vi.fn()}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: /opciones de conexión remota/i }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: /iniciar asistencia msra/i }),
    );

    expect(onLaunchMsra).toHaveBeenCalledTimes(1);
  });
});
```

Agregar `import { TerminalData } from '../types/terminal';` al encabezado si no está.

- [ ] **Step 2: Borrar el archivo colocado y mover el Site**

```bash
git rm src/components/QuickActionsBar.test.tsx
git mv src/components/QuickActionsBarSite.test.tsx src/test/QuickActionsBarSite.test.tsx
```

En el archivo movido, corregir los imports relativos:

```tsx
import { QuickActionsBar } from "../components/QuickActionsBar";
import { TerminalData } from "../types/terminal";
```

- [ ] **Step 3: Título de `App.test.tsx`**

Cambiar el nombre del test:

```tsx
  it('renderiza un layout de scroll único, dispara ping de 4 paquetes al cargar la terminal y no desplaza main a la sección de ping', async () => {
```

(sin la referencia al sidebar; el resto del test queda igual).

- [ ] **Step 4: Verde y commit**

```bash
npx vitest run src/test/QuickActionsBar.test.tsx src/test/QuickActionsBarSite.test.tsx src/App.test.tsx
npm test
git add src/test/QuickActionsBar.test.tsx src/test/QuickActionsBarSite.test.tsx src/App.test.tsx
git commit -m "test(quick-actions): consolidar los tres archivos en src/test"
```

Expected: la suite mantiene el mismo número de tests (399); si baja, se perdió una aserción y hay que recuperarla.

---

### Task 4: Partir el bundle en chunks

**Files:** `vite.config.ts`

- [ ] **Step 1: Agregar `manualChunks`**

```ts
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          radix: ['radix-ui'],
          cmdk: ['cmdk'],
        },
      },
    },
  },
```

- [ ] **Step 2: Verificar el build**

```bash
npm run build
Get-ChildItem dist/assets -Filter *.js | Sort-Object Length -Descending | Select-Object Name,Length
```

Expected: build verde y al menos 3 archivos JS; el chunk de entrada ya no concentra los 600 kB. Si Rollup emite un warning de "circular chunk", cambiar `manualChunks` por una función que agrupe `node_modules/react*` en `react`, el resto de `node_modules` en `vendor`, y dejar el código de la app en el entry.

- [ ] **Step 3: Commit**

```bash
git add vite.config.ts
git commit -m "build(vite): separar react, radix y cmdk en chunks"
```

---

### Task 5: Commitear el fix pendiente de Electron

**Files:** `electron/main.cjs`

El archivo tiene un cambio sin commitear (guardas `win.isDestroyed()` y cadenas de `.catch()` en la carga). No se descarta: se valida y se commitea.

- [ ] **Step 1: Revisar que el cambio sea sólo eso**

```bash
git diff electron/main.cjs
node --check electron/main.cjs
```

Expected: el diff son las guardas de `createWindow` descriptas; `node --check` exit 0.

- [ ] **Step 2: Commit**

```bash
git add electron/main.cjs
git commit -m "fix(electron): no relanzar sobre ventanas destruidas"
```

Si el diff contiene algo fuera de ese alcance, **no commitear**: reportarlo y dejarlo sin stagear.

---

### Task 6: Documentar y cerrar

**Files:** `DESIGN.md`, `docs/ui-slop-audit-2026-11-02.md`

- [ ] **Step 1: `DESIGN.md` — contraste**

En «Color y elevación», reemplazar la mención a tokens ajustados por:

```markdown
Los tokens semánticos son los del preset corporativo. La app no los oscurece
para AA: los pares de texto sobre tintes quedan entre 3.99:1 y 4.63:1 y están
documentados como excepciones medidas en `scripts/check-contrast.mjs`.
`--info` se conserva como semántica de diagnóstico. Los bordes son decorativos:
el script los reporta como "decorativo" y no bloquean el exit.
```

Y en «Gates», reemplazar la línea de `--strict` por:

```markdown
- `node scripts/check-contrast.mjs` — exit 0 con las excepciones medidas. `--strict`
  es diagnóstico: ignora las excepciones y falla a propósito con los pares
  aceptados de tintes.
```

- [ ] **Step 2: Audit — sección de cierre**

Al final de §5 (después de Fase 5), agregar:

```markdown
### Cierre técnico (2026-11-04)

> Ejecutado en `chore/cierre-tecnico`. **Decisión de producto:** se restauraron
> los valores del preset en `--muted-foreground`, `--destructive`, `--success` y
> `--warning`, aceptando que los pares de texto sobre tintes queden bajo 4.5:1;
> esas fallas se documentan como excepciones medidas y `--strict` pasa a ser
> diagnóstico. `--info` se conserva. Además: tests de `QuickActionsBar`
> consolidados en `src/test/`, bordes no-texto reportados como decorativos,
> bundle partido en `react`/`radix`/`cmdk` y commit del fix de guardas en
> `electron/main.cjs`. `Card` se conserva porque lo usan cuatro componentes de
> producto; `Alert` se conserva como primitiva de catálogo (sólo la ejercita
> `ShadcnPreset`). Suite 399/399, build verde, ratchet 0/0/0/1.
```

- [ ] **Step 3: Verificación completa**

```bash
npx vitest run
npm run build
npm run audit:contrast
node scripts/check-contrast.mjs --strict
npx vitest run src/test/designContract.test.ts
```

Expected: suite **399/399** · build verde · `npm run audit:contrast` **exit 0** (con excepciones) · `--strict` **exit 1** por los pares aceptados (contar y confirmar que coinciden con `EXCEPTIONS`) · ratchet 0/0/0/1.

- [ ] **Step 4: Commit**

```bash
git add DESIGN.md docs/ui-slop-audit-2026-11-02.md docs/superpowers/plans/2026-11-04-cierre-tecnico.md
git commit -m "docs(design): cierre tecnico y politica de contraste del preset"
```

---

## Criterios de aceptación

- [ ] Los cuatro tokens de `:root` vuelven a los valores del preset; `.dark`, `--link`, `--console-*` y `*-foreground` intactos.
- [ ] `node scripts/check-contrast.mjs` → exit 0; cada par de texto que falla tiene una excepción con su ratio medido.
- [ ] `node scripts/check-contrast.mjs --strict` → exit 1 con exactamente esos pares (documentado, no silenciado).
- [ ] Los bordes se reportan como "decorativo", no como `FALLA`.
- [ ] Queda **un** archivo `QuickActionsBar.test.tsx` y `QuickActionsBarSite.test.tsx` vive en `src/test/`; el total de tests no baja.
- [ ] `npm run build` produce ≥3 chunks JS y el entry deja de concentrar todo.
- [ ] `electron/main.cjs` commiteado (o reportado si el diff excedía el alcance).
- [ ] Suite 399/399, build verde, ratchet 0/0/0/1, `DESIGN.md` y el audit describen la nueva política.

## Pendientes que quedan fuera (decisión del dueño)

| Tema | Estado |
|---|---|
| Push a `origin` | `main` local sigue adelante; no se pushea sin pedido explícito |
| `cn build` para recortar ~10 kB gzip | Aceptado el costo del compilador inlineado |
| `ScrollArea` en consola/desplegables | Opcional, sin impacto funcional |
