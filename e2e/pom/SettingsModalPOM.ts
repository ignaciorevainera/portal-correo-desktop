import { Page, Locator, expect } from '@playwright/test';

export class SettingsModalPOM {
  readonly page: Page;
  readonly dialog: Locator;
  readonly closeButton: Locator;
  readonly highContrastSwitch: Locator;
  readonly lineWrapSwitch: Locator;
  readonly textScaleSelect: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dialog = page.getByRole('dialog', { name: /ajustes|configuración/i });
    this.closeButton = this.dialog.getByRole('button', { name: /cerrar|guardar|aplicar/i }).first();
    this.highContrastSwitch = this.dialog.getByLabel(/alto contraste/i).or(this.dialog.locator('button[role="switch"]').first());
    this.lineWrapSwitch = this.dialog.getByLabel(/ajuste de línea|line wrap/i).or(this.dialog.locator('button[role="switch"]').nth(1));
    this.textScaleSelect = this.dialog.getByRole('combobox').or(this.dialog.locator('select')).first();
  }

  async toggleHighContrast(): Promise<void> {
    await this.highContrastSwitch.click();
  }

  async toggleLineWrap(): Promise<void> {
    await this.lineWrapSwitch.click();
  }

  async close(): Promise<void> {
    if (await this.closeButton.isVisible()) {
      await this.closeButton.click();
    } else {
      await this.page.keyboard.press('Escape');
    }
  }

  async expectDialogVisible(): Promise<void> {
    await expect(this.dialog).toBeVisible({ timeout: 5000 });
  }

  async expectDialogClosed(): Promise<void> {
    await expect(this.dialog).not.toBeVisible({ timeout: 5000 });
  }
}
