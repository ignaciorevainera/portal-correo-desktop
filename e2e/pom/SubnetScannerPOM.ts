import { Page, Locator, expect } from '@playwright/test';

export class SubnetScannerPOM {
  readonly page: Page;
  readonly moreActionsButton: Locator;
  readonly openDrawerButton: Locator;
  readonly drawer: Locator;
  readonly scanButton: Locator;
  readonly hostCards: Locator;
  readonly closeDrawerButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.moreActionsButton = page.getByRole('button', { name: /más acciones/i });
    this.openDrawerButton = page.getByRole('button', { name: 'Escanear Subred' });
    this.drawer = page.getByRole('dialog', { name: /escáner de subred|subred/i }).or(page.locator('[data-slot="sheet-content"]')).first();
    this.scanButton = page.getByRole('button', { name: /iniciar escaneo|escanear|comenzar/i }).first();
    this.hostCards = page.locator('[data-subnet-host]');
    this.closeDrawerButton = page.getByRole('button', { name: /cerrar|close/i }).first();
  }

  async openDrawer(): Promise<void> {
    if (await this.moreActionsButton.isVisible()) {
      await this.moreActionsButton.click();
      await this.openDrawerButton.click();
    } else if (await this.openDrawerButton.isVisible()) {
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
