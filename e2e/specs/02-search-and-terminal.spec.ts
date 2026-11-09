import { test, expect, chromium, Browser, Page } from '@playwright/test';
import { MainWindowPOM } from '../pom/MainWindowPOM';
import { setupElectronMock, navigateToMainWindow } from '../fixtures/testHelper';
import { MOCK_TERMINALS } from '../fixtures/mockData';

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
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log(`[Browser Error]: ${msg.text()}`);
  });
  page.on('pageerror', (err) => console.log(`[Browser PageError]: ${err.message}`));
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

test.describe('E2E Suite 02: Búsqueda de Terminal y Renderizado Técnico', () => {
  test('debe buscar una terminal por Hostname y renderizar la ficha técnica completa', async () => {
    const target = MOCK_TERMINALS[0]; // PC-DEMO-001
    await mainWindow.searchTerminal(target.pc);

    // Validar invocación de IPC
    expect(harness.invokedIpcCalls.some((c) => c.channel === 'searchTerminal' && c.args[0] === target.pc)).toBe(true);

    // Validar visualización de los datos clave en la UI
    await mainWindow.expectTerminalLoaded(target.pc, target.ip);
    await expect(page.locator(`text=${target.os}`).first()).toBeVisible();
    await expect(page.locator(`text=${target.cpuModel}`).first()).toBeVisible();
    await expect(page.locator(`text=${target.ram}`).first()).toBeVisible();
    await expect(page.locator(`text=${target.location}`).first()).toBeVisible();
  });

  test('debe buscar una terminal por Dirección IP y renderizar los datos correspondientes', async () => {
    const target = MOCK_TERMINALS[1]; // 192.0.2.102 -> PC-DEMO-002
    await mainWindow.searchTerminal(target.ip);

    expect(harness.invokedIpcCalls.some((c) => c.channel === 'searchTerminal' && c.args[0] === target.ip)).toBe(true);
    await mainWindow.expectTerminalLoaded(target.pc, target.ip);
    await expect(page.locator(`text=${target.os}`).first()).toBeVisible();
  });

  test('debe mostrar mensaje o estado apropiado ante una búsqueda sin resultados', async () => {
    await mainWindow.searchTerminal('PC-NO-EXISTE-999');

    // Debe mostrar la notificación o mensaje de que no existe registro técnico
    await expect(page.locator('text=/No existe un registro técnico|No se encontraron resultados/i').first()).toBeVisible({ timeout: 5000 });
  });
});
