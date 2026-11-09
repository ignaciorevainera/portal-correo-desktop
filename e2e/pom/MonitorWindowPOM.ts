import { Page, Locator, expect } from '@playwright/test';

export class MonitorWindowPOM {
  readonly page: Page;
  readonly header: Locator;
  readonly closeButton: Locator;
  readonly pinButton: Locator;
  readonly copyButton: Locator;
  readonly stopRestartButton: Locator;
  readonly consoleLog: Locator;

  constructor(page: Page) {
    this.page = page;
    this.header = page.locator('header').first();
    this.closeButton = page.getByRole('button', { name: /cerrar monitor/i });
    this.pinButton = page.getByRole('button', { name: /mantener visible|dejar de mantener visible/i });
    this.copyButton = page.getByRole('button', { name: /copiar logs del monitor/i });
    this.stopRestartButton = page.getByRole('button', { name: /detener ping|reiniciar ping/i });
    this.consoleLog = page.locator('[role="log"]');
  }

  async togglePin(): Promise<void> {
    if (await this.pinButton.isVisible()) {
      await this.pinButton.click();
    }
  }

  async close(): Promise<void> {
    if (await this.closeButton.isVisible()) {
      await this.closeButton.click();
    } else {
      await this.page.close();
    }
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page.locator('body')).toBeVisible({ timeout: 5000 });
  }
}
