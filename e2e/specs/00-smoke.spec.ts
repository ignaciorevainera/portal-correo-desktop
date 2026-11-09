import { test, expect, chromium, Browser, Page } from '@playwright/test';
import path from 'path';

let browser: Browser;
let page: Page;

test.beforeAll(async () => {
  browser = await chromium.launch({
    headless: true,
    args: ['--allow-file-access-from-files', '--disable-web-security'],
  });
});

test.beforeEach(async () => {
  page = await browser.newPage();

  // Inyectar el contrato IPC de electronAPI (proveyendo el test harness en la capa de transporte)
  await page.addInitScript(() => {
    (window as any).electronAPI = {
      pingStart: () => {},
      pingStop: () => {},
      searchTerminal: async (query: string) => {
        if (query && query.includes('001')) {
          return {
            source: 'sql',
            data: {
              pc: 'PC-DEMO-001',
              ip: '192.0.2.101',
              mac: '00:1A:2B:3C:4D:5E',
              os: 'Windows 11 Enterprise',
              servicePack: '23H2',
              cpuModel: 'Intel Core i7-12700',
              ram: '16 GB',
              antivirusVersion: 'Defender',
              ieVersion: '11.0',
              userNt: 'CORREO\\operador.demo',
              architecture: '64-bit',
              surveyDate: '2026-11-09',
              uptimeText: '5d 14h',
              location: 'Edificio Central',
              costCenter: 'Soporte',
              alerts: [],
              resetHistory: [],
            },
          };
        }
        return { source: 'mock', data: null };
      },
      getGateStatus: async () => ({
        status: 'READY',
        code: 'AUTHORIZED',
        message: 'Test Harness Activo',
      }),
      onSubnetProgress: () => {},
      onSubnetHostFound: () => {},
      onCmdData: () => {},
      onPingData: () => {},
      removeAllListeners: () => {},
      onContextMenuAction: () => {},
      minimizeWindow: () => {},
      maximizeWindow: () => {},
      closeWindow: () => {},
    };
  });

  const distPath = path.resolve(__dirname, '../../dist/index.html').replace(/\\/g, '/');
  await page.goto(`file:///${distPath}`);
  await page.waitForLoadState('domcontentloaded');
});

test.afterEach(async () => {
  await page.close();
});

test.afterAll(async () => {
  await browser.close();
});

test.describe('Portal Correo Desktop E2E Smoke Suite', () => {
  test('debe cargar la aplicación con título correcto', async () => {
    const title = await page.title();
    expect(title).toContain('Portal Correo Desktop');
  });

  test('debe renderizar la interfaz y permitir buscar una terminal', async () => {
    const root = page.locator('#root');
    await expect(root).toBeVisible({ timeout: 5000 });

    const searchInput = page.getByRole('combobox');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('PC-DEMO-001');
    await searchInput.press('Enter');

    // Debe mostrar la ficha con los datos retornados
    await expect(page.locator('text=PC-DEMO-001').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=192.0.2.101').first()).toBeVisible();
    await expect(page.locator('text=Windows 11 Enterprise').first()).toBeVisible();
  });
});
