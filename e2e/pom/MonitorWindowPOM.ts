import { Page, Locator, expect } from '@playwright/test';

export class MonitorWindowPOM {
  readonly page: Page;
  readonly targetLabel: Locator;
  readonly closeButton: Locator;
  readonly pinButton: Locator;
  readonly consoleLog: Locator;

  constructor(page: Page) {
    this.page = page;
    this.targetLabel = page.locator('header, [data-slot="card-title"], h1, h2').first();
    this.closeButton = page.getByRole('button', { name: /cerrar/i }).first();
    this.pinButton = page.getByRole('button', { name: /fijar|desfijar|pin/i }).first();
    this.consoleLog = page.locator('#monitor-console, [aria-label*="consola"], pre').first();
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
