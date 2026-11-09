import { Page, Locator, expect } from '@playwright/test';

export class MainWindowPOM {
  readonly page: Page;
  readonly searchInput: Locator;
  readonly searchButton: Locator;
  readonly root: Locator;
  readonly appTitle: Locator;
  readonly topbar: Locator;
  readonly minimizeButton: Locator;
  readonly powerButton: Locator;
  readonly closeButton: Locator;
  readonly themeToggle: Locator;
  readonly settingsButton: Locator;
  readonly infoButton: Locator;
  readonly terminalHostnameBadge: Locator;
  readonly terminalIpBadge: Locator;

  constructor(page: Page) {
    this.page = page;
    this.root = page.locator('#root');
    this.topbar = page.locator('header').first();
    this.appTitle = page.locator('text=Portal Correo Desktop').first();
    this.searchInput = page.getByRole('combobox');
    this.searchButton = page.getByRole('button', { name: /buscar terminal/i });
    this.minimizeButton = page.getByRole('button', { name: /minimizar ventana/i });
    this.powerButton = page.getByRole('button', { name: /minimizar a bandeja del sistema/i });
    this.closeButton = page.getByRole('button', { name: /cerrar la aplicación definitivamente/i });
    this.themeToggle = page.getByRole('button', { name: /alternar tema/i });
    this.settingsButton = page.getByRole('button', { name: /abrir configuración/i });
    this.infoButton = page.getByRole('button', { name: /abrir información del sistema/i });
    this.terminalHostnameBadge = page.locator('[data-slot="badge"]').first();
    this.terminalIpBadge = page.locator('text=/^192\\./').first();
  }

  async searchTerminal(query: string): Promise<void> {
    await this.searchInput.fill(query);
    await this.searchInput.press('Enter');
  }

  async expectTerminalLoaded(hostname: string, ip: string): Promise<void> {
    await expect(this.page.locator(`text=${hostname}`).first()).toBeVisible({ timeout: 6000 });
    await expect(this.page.locator(`text=${ip}`).first()).toBeVisible({ timeout: 6000 });
  }

  async openSettings(): Promise<void> {
    await this.settingsButton.click();
  }

  async openInfo(): Promise<void> {
    await this.infoButton.click();
  }
}
