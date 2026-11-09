import { Page, Locator, expect } from '@playwright/test';

export class SubnetScannerPOM {
  readonly page: Page;
  readonly openDrawerButton: Locator;
  readonly drawer: Locator;
  readonly scanButton: Locator;
  readonly hostCards: Locator;
  readonly closeDrawerButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.openDrawerButton = page.getByRole('button', { name: /escanear subred|escáner de subred/i }).first();
    this.drawer = page.locator('[data-slot="sheet-content"], [role="dialog"]').filter({ hasText: /subred/i }).first();
    this.scanButton = this.drawer.getByRole('button', { name: /iniciar escaneo|escanear/i }).first();
    this.hostCards = this.drawer.locator('[data-subnet-host], button[class*="rounded"]');
    this.closeDrawerButton = this.drawer.getByRole('button', { name: /cerrar/i }).first();
  }

  async openDrawer(): Promise<void> {
    if (await this.openDrawerButton.isVisible()) {
      await this.openDrawerButton.click();
    }
  }

  async startScan(): Promise<void> {
    if (await this.scanButton.isVisible()) {
      await this.scanButton.click();
    }
  }

  async expectHostVisible(ipOrHost: string): Promise<void> {
    await expect(this.page.locator(`text=${ipOrHost}`).first()).toBeVisible({ timeout: 6000 });
  }

  async closeDrawer(): Promise<void> {
    if (await this.closeDrawerButton.isVisible()) {
      await this.closeDrawerButton.click();
    } else {
      await this.page.keyboard.press('Escape');
    }
  }
}
