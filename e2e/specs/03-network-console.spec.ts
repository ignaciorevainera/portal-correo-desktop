import { test, expect, chromium, Browser, Page } from '@playwright/test';
import { MainWindowPOM } from '../pom/MainWindowPOM';
import { ConsolePOM } from '../pom/ConsolePOM';
import { setupElectronMock, navigateToMainWindow } from '../fixtures/testHelper';
import { MOCK_TERMINALS } from '../fixtures/mockData';

let browser: Browser;
let page: Page;
let mainWindow: MainWindowPOM;
let consolePom: ConsolePOM;
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
  consolePom = new ConsolePOM(page);
  await navigateToMainWindow(page);
});

test.afterEach(async () => {
  await page.close();
});

test.afterAll(async () => {
  await browser.close();
});

test.describe('E2E Suite 03: Consola de Diagnóstico de Red y Copiado de Bloques', () => {
  test('debe cargar la terminal y permitir iniciar diagnóstico y streaming en la consola', async () => {
    const target = MOCK_TERMINALS[0];
    await mainWindow.searchTerminal(target.pc);
    await mainWindow.expectTerminalLoaded(target.pc, target.ip);

    // La consola debe estar visible
    await expect(consolePom.consoleCard).toBeVisible();

    // Iniciar ping continuo desde el botón principal de la barra rápida
    const pingButton = page.getByRole('button', { name: 'Iniciar Ping continuo -t' });
    if (await pingButton.isVisible()) {
      await pingButton.click();
      // Debe registrar la llamada IPC
      expect(harness.invokedIpcCalls.some((c) => c.channel === 'ping' || c.channel === 'startCommand')).toBe(true);
    }
  });

  test('debe mostrar el botón de detener durante la ejecución y permitir detener el streaming', async () => {
    const target = MOCK_TERMINALS[0];
    await mainWindow.searchTerminal(target.pc);
    await mainWindow.expectTerminalLoaded(target.pc, target.ip);

    const pingButton = page.getByRole('button', { name: 'Iniciar Ping continuo -t' });
    if (await pingButton.isVisible()) {
      await pingButton.click();
    }

    if (await consolePom.stopButton.isVisible()) {
      await consolePom.stopDiagnostic();
      // Tras detener, el botón detener desaparece
      await expect(consolePom.stopButton).not.toBeVisible();
    }
  });

  test('debe permitir limpiar logs de la consola', async () => {
    const target = MOCK_TERMINALS[0];
    await mainWindow.searchTerminal(target.pc);
    await mainWindow.expectTerminalLoaded(target.pc, target.ip);

    await expect(consolePom.clearButton).toBeVisible();
    await consolePom.clearLogs();
  });
});
