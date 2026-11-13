import { test, expect, chromium, Browser, Page } from '@playwright/test';
import { MainWindowPOM } from '../pom/MainWindowPOM';
import { setupElectronMock, navigateToMainWindow } from '../fixtures/testHelper';
import { MOCK_TERMINALS } from '../fixtures/mockData';

let browser: Browser;

// Ancho mínimo real de la ventana principal (electron/main.cjs → minWidth: 420).
const MIN_WINDOW_WIDTH = 420;
// Offset nativo del Toaster (src/App.tsx → offset={12}).
const TOAST_OFFSET = 12;

/**
 * Abre la app en el ancho pedido y dispara el toast del caso reportado:
 * puertos VNC bloqueados con MSRA disponible como alternativa (el que trae el
 * CTA "Conectar por MSRA").
 */
async function openToastAtWidth(page: Page, width: number): Promise<void> {
  await setupElectronMock(page);
  await page.setViewportSize({ width, height: 700 });
  await page.addInitScript(() => {
    const api = (window as any).electronAPI;
    if (api) {
      api.launchVnc = async (target: string) => ({
        success: false,
        vncClosed: true,
        msraAvailable: true,
        message: `Puertos VNC (5901/5900) cerrados en ${target}.`,
      });
    }
  });

  await navigateToMainWindow(page);

  const target = MOCK_TERMINALS[0];
  const mainWindow = new MainWindowPOM(page);
  await mainWindow.searchTerminal(target.pc);
  await mainWindow.expectTerminalLoaded(target.pc, target.ip);

  const surface = page.locator('main, [data-slot="card"]').first();
  await surface.click({ button: 'right' });
  await page.getByRole('menuitem', { name: /conectar vnc viewer/i }).click();

  await expect(page.locator('[data-sonner-toast]').filter({ hasText: 'Puertos VNC' })).toBeVisible({
    timeout: 5000,
  });
}

function readToastLayout(page: Page) {
  return page.evaluate(() => {
    const toast = document.querySelector('[data-sonner-toast]');
    if (!toast) return null;
    const content = toast.querySelector('[data-content]');
    const button = toast.querySelector('[data-button]');
    if (!content || !button) return null;

    const toastBox = toast.getBoundingClientRect();
    const contentBox = content.getBoundingClientRect();
    const buttonBox = button.getBoundingClientRect();

    return {
      viewportWidth: window.innerWidth,
      toastLeft: Math.round(toastBox.left),
      toastRight: Math.round(toastBox.right),
      toastWidth: Math.round(toastBox.width),
      contentWidth: Math.round(contentBox.width),
      // El CTA está debajo del texto cuando arranca por debajo del bloque.
      stacked: buttonBox.top >= contentBox.bottom - 1,
      fitsViewport: toastBox.left >= 0 && toastBox.right <= window.innerWidth,
    };
  });
}

test.beforeAll(async () => {
  browser = await chromium.launch({
    headless: true,
    args: ['--allow-file-access-from-files', '--disable-web-security'],
  });
});

test.afterAll(async () => {
  await browser.close();
});

test.describe('E2E Suite 10: Toast responsive en ventana mínima', () => {
  let page: Page | undefined;

  test.afterEach(async () => {
    await page?.close();
    page = undefined;
  });

  test('el CTA del toast no comprime el mensaje en el ancho mínimo de la ventana', async () => {
    page = await browser.newPage({ viewport: { width: MIN_WINDOW_WIDTH, height: 700 } });
    await openToastAtWidth(page, MIN_WINDOW_WIDTH);

    const layout = await readToastLayout(page);
    expect(layout).not.toBeNull();
    // El mensaje conserva un ancho legible en lugar de quedar en una columna.
    expect(layout!.contentWidth).toBeGreaterThanOrEqual(280);
    // El CTA baja a su propia fila en vez de empujar el cuerpo del texto.
    expect(layout!.stacked).toBe(true);
    // El toast sigue acotado al viewport (sin desbordes horizontales).
    expect(layout!.fitsViewport).toBe(true);
    expect(layout!.viewportWidth).toBe(MIN_WINDOW_WIDTH);
  });

  test('conserva el anclaje nativo a la derecha en todo el rango de anchos', async () => {
    // Sonner cambia a un layout mobile por debajo de 600px; el toast debe
    // seguir anclado a la derecha con 12px, igual que en escritorio.
    for (const width of [MIN_WINDOW_WIDTH, 500, 620, 1020]) {
      page = await browser.newPage({ viewport: { width, height: 700 } });
      await openToastAtWidth(page, width);

      const layout = await readToastLayout(page);
      expect(layout, `sin toast a ${width}px`).not.toBeNull();
      expect(layout!.toastRight, `borde derecho a ${width}px`).toBe(width - TOAST_OFFSET);
      expect(layout!.fitsViewport, `desborde a ${width}px`).toBe(true);
      // Ancho estable: 340px, salvo cuando el viewport no alcanza.
      expect(layout!.toastWidth).toBe(Math.min(340, width - TOAST_OFFSET * 2));

      await page.close();
      page = undefined;
    }
  });
});
