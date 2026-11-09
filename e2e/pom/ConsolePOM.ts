import { Page, Locator, expect } from '@playwright/test';

export class ConsolePOM {
  readonly page: Page;
  readonly consoleContainer: Locator;
  readonly stopButton: Locator;
  readonly clearButton: Locator;
  readonly copyLastButton: Locator;
  readonly copyLogsButton: Locator;
  readonly commandBlocks: Locator;

  constructor(page: Page) {
    this.page = page;
    this.consoleContainer = page.locator('#ping-console-scroll-container, [aria-label="Resultados de diagnóstico y conectividad"]');
    this.stopButton = page.getByRole('button', { name: /detener/i });
    this.clearButton = page.getByRole('button', { name: /limpiar/i });
    this.copyLastButton = page.getByRole('button', { name: /copiar último/i });
    this.copyLogsButton = page.getByRole('button', { name: /copiar logs/i });
    this.commandBlocks = page.locator('[data-command-block]');
  }

  async stopDiagnostic(): Promise<void> {
    if (await this.stopButton.isVisible()) {
      await this.stopButton.click();
    }
  }

  async clearLogs(): Promise<void> {
    if (await this.clearButton.isVisible()) {
      await this.clearButton.click();
    }
  }

  async copyLogs(): Promise<void> {
    await this.copyLogsButton.click();
  }

  async hoverAndCopyBlock(index: number = 0): Promise<void> {
    const block = this.commandBlocks.nth(index);
    await block.hover();
    const copyButton = block.locator('button[aria-label*="Copiar bloque"], [title*="Copiar"]');
    if (await copyButton.isVisible()) {
      await copyButton.click();
    } else {
      await block.click();
    }
  }

  async expectLineContaining(text: string): Promise<void> {
    await expect(this.page.locator(`text=${text}`).first()).toBeVisible({ timeout: 6000 });
  }
}
