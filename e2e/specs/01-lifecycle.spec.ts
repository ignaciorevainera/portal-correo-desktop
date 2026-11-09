import { test, expect, chromium, Browser, Page } from '@playwright/test';
import { MainWindowPOM } from '../pom/MainWindowPOM';
import { setupElectronMock, navigateToMainWindow } from '../fixtures/testHelper';

let browser: Browser;
let page: Page;
let mainWindow: MainWindowPOM;
let harness: { invokedIpcCalls: { channel: string; args: any[] }[] };

test.beforeAll(async () => {
  browser = await chromium.launch({
    headless: true,
    args: ['--allow-file-access-from-files', '--disable-web-security'],
  });
});

test.beforeEach(async () => {
  page = await browser.newPage();
  harness = await setupElectronMock(page);
  mainWindow = new MainWindowPOM(page);
  await navigateToMainWindow(page);
});

test.afterEach(async () => {
  await page.close();
});

test.afterAll(async () => {
  await browser.close();
});

test.describe('E2E Suite 01: Ciclo de Vida y Ventana Principal', () => {
  test('debe cargar la aplicación con el título correcto de ventana', async () => {
    const title = await page.title();
    expect(title).toContain('Portal Correo Desktop');
  });

  test('debe mostrar los controles de la barra de título personalizada', async () => {
    await expect(mainWindow.topbar).toBeVisible();
    await expect(mainWindow.minimizeButton).toBeVisible();
    await expect(mainWindow.powerButton).toBeVisible();
  });

  test('debe despachar las llamadas IPC al pulsar los botones de minimizar y apagado', async () => {
    await mainWindow.minimizeButton.click();
    expect(harness.invokedIpcCalls.some((c) => c.channel === 'minimizeWindow')).toBe(true);

    // Clic simple en el botón de apagado ejecuta hideToTray
    await mainWindow.powerButton.click();
    expect(harness.invokedIpcCalls.some((c) => c.channel === 'hideToTray')).toBe(true);

    // Clic derecho en el botón de apagado abre el menú con la opción de salir definitivamente
    await mainWindow.powerButton.click({ button: 'right' });
    const quitOption = page.getByRole('menuitem', { name: /cerrar la aplicación definitivamente/i });
    await expect(quitOption).toBeVisible();
    await quitOption.click();
    expect(harness.invokedIpcCalls.some((c) => c.channel === 'quitApp')).toBe(true);
  });

  test('debe iniciar en estado limpio sin detalles de terminal previos cargados', async () => {
    // Al iniciar, el input de búsqueda debe estar vacío y visible
    await expect(mainWindow.searchInput).toBeVisible();
    await expect(mainWindow.searchInput).toHaveValue('');

    // La tarjeta técnica no debe tener datos mostrados
    await expect(page.locator('text=Dirección IP').first()).not.toBeVisible();
  });
});
