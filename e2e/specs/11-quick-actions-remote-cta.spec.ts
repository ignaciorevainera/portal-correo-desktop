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
  truncateCount: number;
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
      truncateCount: truncatable.length,
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

      // 1. Sin truncado: el CTA conserva spans.truncate (guard anti-vacío) y ninguno recorta.
      expect(metrics.truncateCount, `sin spans.truncate en el CTA a ${width}px`)
        .toBeGreaterThan(0);
      expect(metrics.truncated, `label truncado a ${width}px`).toBe(false);

      // 3. Prioridad de fila: el CTA remoto arranca la primera fila de la barra.
      const otrosCtas: Locator[] = [
        page.locator('button[title^="Iniciar Ping"]'),
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
