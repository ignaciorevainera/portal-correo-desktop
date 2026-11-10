import { test, expect, chromium, Browser, Page } from '@playwright/test';
import { MainWindowPOM } from '../pom/MainWindowPOM';
import { setupElectronMock, navigateToMainWindow } from '../fixtures/testHelper';

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

test.describe('E2E Suite 09: Modal de Información del Sistema', () => {
  test('debe abrir y cerrar el modal de información desde el botón de la Topbar', async () => {
    await mainWindow.openInfo();

    // El diálogo de información tiene como título accesible "Portal Correo Desktop"
    const dialog = page.getByRole('dialog', { name: /portal correo desktop/i }).first();
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Debe mostrar la versión y las capacidades principales
    await expect(dialog.locator('text=/Capacidades Principales|v1\\./i').first()).toBeVisible();

    // Cerrar el modal con el botón de cerrar
    const closeBtn = dialog.getByRole('button', { name: 'Cerrar' }).first();
    await closeBtn.click();

    await expect(dialog).not.toBeVisible({ timeout: 5000 });
  });
});
