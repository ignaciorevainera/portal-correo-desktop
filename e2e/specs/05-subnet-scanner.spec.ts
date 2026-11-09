import { test, expect, chromium, Browser, Page } from '@playwright/test';
import { MainWindowPOM } from '../pom/MainWindowPOM';
import { SubnetScannerPOM } from '../pom/SubnetScannerPOM';
import { setupElectronMock, navigateToMainWindow } from '../fixtures/testHelper';
import { MOCK_TERMINALS, MOCK_SUBNET_HOSTS } from '../fixtures/mockData';

let browser: Browser;
let page: Page;
let mainWindow: MainWindowPOM;
let subnetScanner: SubnetScannerPOM;
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
  subnetScanner = new SubnetScannerPOM(page);
  await navigateToMainWindow(page);
});

test.afterEach(async () => {
  await page.close();
});

test.afterAll(async () => {
  await browser.close();
});

test.describe('E2E Suite 05: Escáner de Subred (Drawer)', () => {
  test('debe abrir el Drawer de subred tras buscar una terminal', async () => {
    const target = MOCK_TERMINALS[0];
    await mainWindow.searchTerminal(target.pc);
    await mainWindow.expectTerminalLoaded(target.pc, target.ip);

    await subnetScanner.openDrawer();
    await expect(subnetScanner.drawer).toBeVisible({ timeout: 6000 });
  });

  test('debe permitir disparar el escaneo y listar los hosts detectados', async () => {
    const target = MOCK_TERMINALS[0];
    await mainWindow.searchTerminal(target.pc);
    await mainWindow.expectTerminalLoaded(target.pc, target.ip);

    await subnetScanner.openDrawer();
    await expect(subnetScanner.drawer).toBeVisible({ timeout: 6000 });

    await subnetScanner.startScan();

    // Debe invocar el IPC startSubnetScan
    expect(harness.invokedIpcCalls.some((c) => c.channel === 'startSubnetScan')).toBe(true);

    // Debe visualizar los hosts encontrados en el fixture
    const hostSample = MOCK_SUBNET_HOSTS[1];
    await subnetScanner.expectHostVisible(hostSample.ip);
  });
});
