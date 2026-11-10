import { test, expect, chromium, Browser, Page } from '@playwright/test';
import { MainWindowPOM } from '../pom/MainWindowPOM';
import { setupElectronMock, navigateToMainWindow } from '../fixtures/testHelper';
import { MOCK_TERMINALS } from '../fixtures/mockData';

let browser: Browser;
let page: Page;
let mainWindow: MainWindowPOM;

test.beforeAll(async () => {
  browser = await chromium.launch({
    headless: true,
    args: ['--allow-file-access-from-files', '--disable-web-security'],
  });
});

test.beforeEach(async () => {
  page = await browser.newPage();
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

test.describe('E2E Suite 08: Menú Contextual del Operador', () => {
  test('debe abrir el menú contextual con clic derecho sobre la ficha técnica de la terminal', async () => {
    const target = MOCK_TERMINALS[0];
    await mainWindow.searchTerminal(target.pc);
    await mainWindow.expectTerminalLoaded(target.pc, target.ip);

    // Clic derecho sobre el contenedor principal o ficha técnica
    const surface = page.locator('main, [data-slot="card"]').first();
    await surface.click({ button: 'right' });

    // El menú contextual debe abrirse
    const menu = page.getByRole('menu');
    await expect(menu).toBeVisible({ timeout: 5000 });

    // Opciones esperadas del menú contextual del operador
    await expect(page.getByRole('menuitem', { name: /conectar vnc viewer/i })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /copiar ip/i })).toBeVisible();
  });

  test('debe cerrar el menú contextual al presionar la tecla Escape', async () => {
    const target = MOCK_TERMINALS[0];
    await mainWindow.searchTerminal(target.pc);
    await mainWindow.expectTerminalLoaded(target.pc, target.ip);

    const surface = page.locator('main, [data-slot="card"]').first();
    await surface.click({ button: 'right' });

    const menu = page.getByRole('menu');
    await expect(menu).toBeVisible({ timeout: 5000 });

    await page.keyboard.press('Escape');
    await expect(menu).not.toBeVisible({ timeout: 5000 });
  });
});
