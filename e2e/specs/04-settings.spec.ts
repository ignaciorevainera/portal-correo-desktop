import { test, expect, chromium, Browser, Page } from '@playwright/test';
import { MainWindowPOM } from '../pom/MainWindowPOM';
import { SettingsModalPOM } from '../pom/SettingsModalPOM';
import { setupElectronMock, navigateToMainWindow } from '../fixtures/testHelper';

let browser: Browser;
let page: Page;
let mainWindow: MainWindowPOM;
let settingsModal: SettingsModalPOM;

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
  settingsModal = new SettingsModalPOM(page);
  await navigateToMainWindow(page);
});

test.afterEach(async () => {
  await page.close();
});

test.afterAll(async () => {
  await browser.close();
});

test.describe('E2E Suite 04: Modal de Ajustes y Persistencia de Preferencias', () => {
  test('debe abrir y cerrar el modal de ajustes desde la barra superior', async () => {
    await mainWindow.openSettings();
    await settingsModal.expectDialogVisible();

    await settingsModal.close();
    await settingsModal.expectDialogClosed();
  });

  test('debe permitir alternar el switch de Modo de Alto Contraste y reflejar la clase visual', async () => {
    await mainWindow.openSettings();
    await settingsModal.expectDialogVisible();

    const initialState = await settingsModal.highContrastSwitch.getAttribute('aria-checked');
    await settingsModal.toggleHighContrast();

    const newState = await settingsModal.highContrastSwitch.getAttribute('aria-checked');
    expect(newState).not.toBe(initialState);

    // Debe reflejarse en la clase del html o body si se activa
    if (newState === 'true') {
      const htmlClass = await page.locator('html').getAttribute('class');
      expect(htmlClass).toContain('high-contrast');
    }
  });

  test('debe permitir alternar el switch de Ajuste de Línea en consola', async () => {
    await mainWindow.openSettings();
    await settingsModal.expectDialogVisible();

    const initialState = await settingsModal.lineWrapSwitch.getAttribute('aria-checked');
    await settingsModal.toggleLineWrap();

    const newState = await settingsModal.lineWrapSwitch.getAttribute('aria-checked');
    expect(newState).not.toBe(initialState);
  });
});
