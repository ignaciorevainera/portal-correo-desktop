# QuickActionsBar: Prioridad de ancho para el CTA de conexión remota — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que el CTA de conexión remota ocupe exactamente el ancho mínimo necesario para mostrar su label completo (nunca truncado, sin estirarse con el sobrante) y arranque siempre en la primera fila de la barra.

**Architecture:** Un solo cambio de clases CSS en el wrapper del split button (`min-w-[170px] flex-1 grow` → `min-w-max`), gobernado primero por un e2e rojo que mide layout real en Chromium a tres anchos de viewport (1440/1024/420px) y por los unit tests existentes (jsdom solo assertea clases). Sin lógica JS nueva.

**Tech Stack:** React 19 + Tailwind CSS v4 (`min-w-max` = `min-width: max-content`), Vitest + Testing Library (unit), Playwright + Chromium headless sobre `dist/index.html` (e2e).

**Spec:** `docs/superpowers/specs/2026-11-12-quick-actions-remote-cta-width-design.md`

---

## File Structure

| Archivo | Responsabilidad | Acción |
|---|---|---|
| `src/components/QuickActionsBar.tsx:148-154` | Wrapper del split remoto + comentarios del bloque | Modificar |
| `src/test/QuickActionsBar.test.tsx:462-466` | Asserts de distribución fluida del CTA remoto | Modificar |
| `e2e/specs/11-quick-actions-remote-cta.spec.ts` | Medición de layout real a 3 anchos de viewport | Crear |

Contexto que el implementador debe conocer (ya verificado):

- Los e2e **no** usan Electron: Chromium headless + `file:///dist/index.html` (`e2e/fixtures/testHelper.ts:230-234`), así que `page.setViewportSize()` cambia el ancho de la app directamente.
- El patrón de spec a copiar es `e2e/specs/10-responsive-toast.spec.ts` (beforeAll/beforeEach, `MainWindowPOM`, mediciones con `getBoundingClientRect`).
- En e2e el probe remoto cae al fallback sin IPC (`src/services/electronClient.ts:259-273`): `recommendedMethod: 'vnc'`, `vncPort: 5901` → el label se estabiliza en `Conectar VNC :5901` y `isProbingRemote` pasa a `false` (`src/App.tsx:291-301`).
- `tsconfig.json` incluye `e2e` → `npm run build` (que corre `tsc`) type-chequea el spec nuevo.
- `dist/` debe recompilarse antes de cualquier run de e2e.

---

### Task 1: Spec e2e de prioridad de ancho (rojo esperado)

**Files:**
- Create: `e2e/specs/11-quick-actions-remote-cta.spec.ts`

- [ ] **Step 1: Crear el spec con las 4 aserciones**

Crea `e2e/specs/11-quick-actions-remote-cta.spec.ts` con exactamente este contenido:

```typescript
import { test, expect, chromium, Browser, Page, Locator } from '@playwright/test';
import { MainWindowPOM } from '../pom/MainWindowPOM';
import { setupElectronMock, navigateToMainWindow } from '../fixtures/testHelper';
import { MOCK_TERMINALS } from '../fixtures/mockData';

let browser: Browser;
let page: Page;
let mainWindow: MainWindowPOM;

// 1440/1024: ≥md, chip F2 visible. 420: minWidth real de la app (electron/main.cjs).
const WIDTHS = [1440, 1024, 420] as const;

interface CtaMetrics {
  width: number;
  y: number;
  left: number;
  right: number;
  innerWidth: number;
  truncated: boolean;
}

test.beforeAll(async () => {
  browser = await chromium.launch({
    headless: true,
    args: ['--allow-file-access-from-files', '--disable-web-security'],
  });
});

test.beforeEach(async () => {
  page = await browser.newPage({ viewport: { width: 1440, height: 800 } });
  await setupElectronMock(page);
  mainWindow = new MainWindowPOM(page);
  await navigateToMainWindow(page);
});

test.afterEach(async () => {
  await page.close();
});

test.afterAll(async () => {
  await browser.close();
});

function primaryCta(page: Page): Locator {
  return page.getByRole('button', { name: /conexión remota inteligente/i });
}

async function measureCta(): Promise<CtaMetrics> {
  return primaryCta(page).evaluate((el) => {
    const box = el.getBoundingClientRect();
    const truncatable = Array.from(el.querySelectorAll<HTMLElement>('span.truncate'));
    return {
      width: box.width,
      y: box.y,
      left: box.left,
      right: box.right,
      innerWidth: window.innerWidth,
      truncated: truncatable.some((s) => s.scrollWidth > s.clientWidth + 1),
    };
  });
}

test.describe('E2E Suite 11: CTA de conexión remota con prioridad de ancho', () => {
  test('el CTA conserva su ancho de contenido y label completo a 1440, 1024 y 420px', async () => {
    const target = MOCK_TERMINALS[0];
    await mainWindow.searchTerminal(target.pc);
    await mainWindow.expectTerminalLoaded(target.pc, target.ip);

    const cta = primaryCta(page);
    await expect(cta).toBeVisible();

    // El probe remoto usa fallback sin IPC en e2e (electronClient.ts:259-273);
    // esperamos el estado estable del label antes de medir.
    await expect(cta).toContainText(/Conectar VNC :\d{4}/, { timeout: 15000 });
    await expect(page.getByText('Detectando acceso...')).toHaveCount(0, { timeout: 15000 });

    const measures = new Map<number, CtaMetrics>();

    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 800 });
      await expect.poll(() => page.evaluate(() => window.innerWidth)).toBe(width);

      const metrics = await measureCta();
      measures.set(width, metrics);

      // 1. Sin truncado: ningún span.truncate dentro del CTA recorta su texto.
      expect(metrics.truncated, `label truncado a ${width}px`).toBe(false);

      // 3. Prioridad de fila: el CTA remoto arranca la primera fila de la barra.
      const otrosCtas: Locator[] = [
        page.getByRole('button', { name: /^iniciar ping$/i }),
        page.getByRole('button', { name: /más acciones/i }),
        page.locator('[title^="Uptime:"]'),
      ];
      for (const otro of otrosCtas) {
        const box = await otro.boundingBox();
        expect(box, `CTA secundario no visible a ${width}px`).not.toBeNull();
        expect(metrics.y, `el CTA remoto no arranca la fila a ${width}px`)
          .toBeLessThanOrEqual(box!.y + 1);
      }

      // 4. Sin desborde: el CTA cabe en el viewport.
      expect(metrics.left, `CTA a la izquierda del viewport a ${width}px`)
        .toBeGreaterThanOrEqual(0);
      expect(metrics.right, `CTA a la derecha del viewport a ${width}px`)
        .toBeLessThanOrEqual(metrics.innerWidth + 1);
    }

    // 2. Sin estiramiento: a ≥md (chip F2 visible) el ancho es idéntico en ambos anchos.
    const wide = measures.get(1440)!;
    const mid = measures.get(1024)!;
    expect(
      Math.abs(wide.width - mid.width),
      'el CTA crece con el ancho de la ventana en lugar de mantenerse a ancho de contenido',
    ).toBeLessThanOrEqual(1);
  });
});
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS, sin errores (el `include` de `tsconfig.json` cubre `e2e`).

- [ ] **Step 3: Compilar `dist/` con el código actual (sin el fix)**

Run: `npm run build`
Expected: PASS, termina con `vite build` sin errores.

- [ ] **Step 4: Correr el spec — debe FALLAR (rojo)**

Run: `npx playwright test e2e/specs/11-quick-actions-remote-cta.spec.ts`
Expected: FAIL con:

```
Error: el CTA crece con el ancho de la ventana en lugar de mantenerse a ancho de contenido
Expected: <= 1
Received: <número claramente > 1>
```

Motivo del rojo (comportamiento actual): con `flex-1 grow` el CTA comparte el sobrante, midiendo ~330px a 1440 y ~226px a 1024. Las aserciones 1, 3 y 4 pasan hoy; la 2 es la que drivea el cambio. Si falla una aserción distinta, detenerse y diagnosticar antes de continuar.

- [ ] **Step 5: Commit del spec en rojo**

```bash
git add e2e/specs/11-quick-actions-remote-cta.spec.ts
git commit -m "test(e2e): add remote CTA width priority spec (expected red until component fix)"
```

---

### Task 2: Unit test rojo → cambio de componente → verde en ambos niveles

**Files:**
- Modify: `src/test/QuickActionsBar.test.tsx:462-466`
- Modify: `src/components/QuickActionsBar.tsx:148-154`

- [ ] **Step 1: Actualizar los asserts del unit test (queda rojo)**

En `src/test/QuickActionsBar.test.tsx`, reemplaza:

```tsx
    expect(remote.closest("div.relative")?.className).toContain("flex-1");
    expect(remote.closest("div.relative")?.className).toContain("grow");
```

por:

```tsx
    // Prioridad del CTA remoto: ancho de contenido (min-w-max), sin crecer.
    expect(remote.closest("div.relative")?.className).toContain("min-w-max");
    expect(remote.closest("div.relative")?.className).not.toContain("flex-1");
    expect(remote.closest("div.relative")?.className).not.toContain("grow");
```

(El `const remote = ...` de arriba no se toca. Los asserts de Ping/`.250`/`.231`/Uptime de las líneas 468-495 y 498-517 tampoco.)

- [ ] **Step 2: Correr el test — debe FALLAR (rojo)**

Run: `npx vitest run src/test/QuickActionsBar.test.tsx`
Expected: FAIL en "mantiene distribución fluida y flexible con flex-wrap para permitir quiebres de 1 a 3 filas" con:

```
AssertionError: expected 'relative flex items-center min-w-[170px] flex-1 grow' to contain 'min-w-max'
```

- [ ] **Step 3: Cambiar el wrapper del CTA remoto**

En `src/components/QuickActionsBar.tsx`, reemplaza el bloque de las líneas 148-154 (comentarios obsoletos + clase):

```tsx
      {/* En ancho compacto `order` cambia el orden visual, no el de tabulación:
          el foco recorre .250/.231 antes de llegar a "Más". Se acepta para no
          alterar el orden de escritorio. */}
      <div className="flex items-center flex-wrap gap-1 w-full min-w-0">
        {/* Split Button Inteligente de Conexión Remota con grow */}
        <div
          className="relative flex items-center min-w-[170px] flex-1 grow"
          ref={dropdownRef}
        >
```

por:

```tsx
      {/* El CTA remoto va primero y a ancho de contenido (min-w-max): nunca se
          trunca y siempre arranca en la primera fila; el resto se acomoda con
          flex-wrap. El foco sigue el orden de DOM (.250/.231 antes de "Más"). */}
      <div className="flex items-center flex-wrap gap-1 w-full min-w-0">
        {/* Split Button Inteligente de Conexión Remota: ancho al contenido (min-w-max), sin crecer */}
        <div
          className="relative flex items-center min-w-max"
          ref={dropdownRef}
        >
```

No se toca nada más: el `ref={dropdownRef}`, `relative`, el label interno con `truncate`, el botón principal `flex-1 min-w-0`, el chevron y el resto de CTAs quedan igual.

- [ ] **Step 4: Correr el test — debe PASAR (verde)**

Run: `npx vitest run src/test/QuickActionsBar.test.tsx`
Expected: PASS, todos los tests del archivo.

- [ ] **Step 5: Suite unitaria completa**

Run: `npm test`
Expected: PASS, sin tests en rojo en ningún archivo.

- [ ] **Step 6: Recompilar `dist/` con el fix**

Run: `npm run build`
Expected: PASS (`tsc` sin errores + `vite build` OK).

- [ ] **Step 7: Correr el spec e2e — debe PASAR (verde)**

Run: `npx playwright test e2e/specs/11-quick-actions-remote-cta.spec.ts`
Expected: PASS, `1 passed`. Las 4 aserciones validan: sin truncado en los 3 anchos, sin estiramiento entre 1440 y 1024, prioridad de fila en los 3 anchos y sin desborde del viewport.

- [ ] **Step 8: Commit**

```bash
git add src/components/QuickActionsBar.tsx src/test/QuickActionsBar.test.tsx
git commit -m "fix(actions): size remote connection CTA to content width (min-w-max) instead of growing"
```

---

### Task 3: Verificación integral (regresión de suite completa)

**Files:**
- Ninguno nuevo. Corre sobre el estado commiteado por Task 1 y Task 2.

- [ ] **Step 1: Suite unitaria completa**

Run: `npm test`
Expected: PASS.

- [ ] **Step 2: Suite e2e completa (todas las specs, contra el `dist/` recién compilado)**

Run: `npm run test:e2e`
Expected: PASS, todas las specs en verde (incluye la nueva spec 11 y las 10 preexistentes). Esto confirma que el cambio de ancho no afecta el toast responsive de la spec 10 ni ninguna otra flujo.

- [ ] **Step 3 (opcional): Verificación manual visual**

Run: `npm run electron:dev`
En la app: buscar `PC-DEMO-001`, seleccionar la terminal y redimensionar la ventana entre ~420px y pantalla completa.
Expected: el CTA `Conectar VNC :5901` muestra siempre el label completo, no crece cuando sobra ancho (el sobrante lo absorben Ping/`.250`/`.231`/Uptime) y permanece en la primera fila de la barra.

- [ ] **Step 4: Estado final de git**

Run: `git status --short` y `git log --oneline -3`
Expected: árbol limpio respecto de los archivos del plan (los untracked preexistentes `scripts/debug-toast.mjs`, `scripts/measure-toast.mjs` y `scripts/toast-harness.html` NO se tocan ni se commitean) y los dos commits nuevos visibles.

---

## Criterios de aceptación (del spec)

- `npm test` en verde con los asserts actualizados (`min-w-max`, sin `flex-1`/`grow`).
- `npm run build && npm run test:e2e` en verde con la spec 11 incluida.
- Ventana ancha: el CTA mide su ancho de contenido y el sobrante queda en los demás CTAs.
- Ventana angosta (hasta 420px): label nunca cortado y CTA en la primera fila.
