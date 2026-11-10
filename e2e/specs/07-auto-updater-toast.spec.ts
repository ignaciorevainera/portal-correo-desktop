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
});

test.afterEach(async () => {
  await page.close();
});

test.afterAll(async () => {
  await browser.close();
});

test.describe('E2E Suite 07: Notificación de Actualizaciones en Background', () => {
  test('debe mostrar el toast interactivo cuando hay una nueva versión y permitir descartarla con "Ahora no"', async () => {
    // Sobrescribir checkForUpdates para simular que existe una nueva versión
    await page.addInitScript(() => {
      const originalAPI = (window as any).electronAPI || {};
      (window as any).electronAPI = {
        ...originalAPI,
        checkForUpdates: async () => ({
          hasUpdate: true,
          currentVersion: '1.2.0',
          latestVersion: '1.3.0',
          downloadUrl: 'https://example.com/setup.exe',
          error: null,
        }),
      };
    });

    await navigateToMainWindow(page);
    await expect(mainWindow.root).toBeVisible();

    // Esperar a que el delay diferido de 4 segundos dispare el toast interactivo
    const updateToast = page.locator('[data-sonner-toast]').filter({ hasText: 'Nueva versión disponible' });
    await expect(updateToast).toBeVisible({ timeout: 8000 });

    // Verificar botones 'Descargar' y 'Ahora no'
    const downloadButton = updateToast.getByRole('button', { name: 'Descargar' });
    const dismissButton = updateToast.getByRole('button', { name: 'Ahora no' });

    await expect(downloadButton).toBeVisible();
    await expect(dismissButton).toBeVisible();

    // Al hacer click en "Ahora no", el toast desaparece
    await dismissButton.click();
    await expect(updateToast).not.toBeVisible({ timeout: 3000 });

    // Verificar que se haya registrado en sessionStorage
    const isDismissed = await page.evaluate(() => sessionStorage.getItem('pcd_dismissed_update_1.3.0'));
    expect(isDismissed).toBe('true');
  });
});
