import { Page, Locator, expect } from '@playwright/test';

export class SettingsModalPOM {
  readonly page: Page;
  readonly dialog: Locator;
  readonly closeButton: Locator;
  readonly highContrastSwitch: Locator;
  readonly lineWrapSwitch: Locator;
  readonly minimizeToTraySwitch: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dialog = page.getByRole('dialog', { name: /ajustes y configuración/i });
    this.closeButton = this.dialog.getByRole('button', { name: 'Cerrar' }).first();
    this.highContrastSwitch = this.dialog.getByRole('switch', { name: 'Modo de Alto Contraste' });
    this.lineWrapSwitch = this.dialog.getByRole('switch', { name: 'Ajuste de línea en consola' });
    this.minimizeToTraySwitch = this.dialog.getByRole('switch', { name: 'Minimizar a la bandeja al cerrar' });
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
