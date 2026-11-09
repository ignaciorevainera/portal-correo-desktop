import { test, expect, chromium, Browser, Page } from '@playwright/test';
import { MonitorWindowPOM } from '../pom/MonitorWindowPOM';
import { setupElectronMock, navigateToMonitorWindow } from '../fixtures/testHelper';

let browser: Browser;
let page: Page;
let monitorWindow: MonitorWindowPOM;
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
  monitorWindow = new MonitorWindowPOM(page);
  await navigateToMonitorWindow(page);
});

test.afterEach(async () => {
  await page.close();
});

test.afterAll(async () => {
  await browser.close();
});

test.describe('E2E Suite 06: Multiventana de Monitor Flotante', () => {
  test('debe cargar la ventana secundaria de monitor con título y controles visibles', async () => {
    await monitorWindow.expectLoaded();
    await expect(monitorWindow.header).toBeVisible();
    await expect(monitorWindow.closeButton).toBeVisible();
    await expect(monitorWindow.pinButton).toBeVisible();
    await expect(monitorWindow.stopRestartButton).toBeVisible();
  });

  test('debe permitir alternar el fijado en pantalla (Always on Top)', async () => {
    await monitorWindow.expectLoaded();
    await monitorWindow.togglePin();
    expect(harness.invokedIpcCalls.some((c) => c.channel === 'setPinned')).toBe(true);
  });

  test('debe renderizar el visor de logs y permitir detener/reanudar ping', async () => {
    await monitorWindow.expectLoaded();
    await expect(monitorWindow.consoleLog).toBeVisible();

    await monitorWindow.stopRestartButton.click();
    expect(harness.invokedIpcCalls.some((c) => c.channel === 'stopPing' || c.channel === 'startPing')).toBe(true);
  });

  test('debe despachar el cierre de la ventana de monitor al presionar el botón de cerrar', async () => {
    await monitorWindow.expectLoaded();
    await monitorWindow.close();
    expect(harness.invokedIpcCalls.some((c) => c.channel === 'close')).toBe(true);
  });
});
