import { describe, it, expect, beforeEach } from 'vitest';

const configManager = require('../../electron/configManager.cjs');

describe('configManager como store en memoria', () => {
  beforeEach(() => {
    configManager.resetConfig();
  });

  it('arranca sin configuración ni secretos', () => {
    const cfg = configManager.getConfig();
    expect(cfg.dbServer).toBe('');
    expect(cfg.dbUser).toBe('');
    expect(cfg.dbPassword).toBe('');
    expect(cfg.vncPassword).toBe('');
    expect(cfg.authMode).toBe('static-sql');
    expect(configManager.isConfigured()).toBe(false);
  });

  it('guarda y devuelve la configuración normalizada', () => {
    configManager.setConfig({
      dbServer: '  sql.interno  ',
      dbUser: 'operador',
      dbPassword: 'clave',
      dbPort: '1500',
      corporateDomain: 'dominio.interno',
      authMode: 'session-sql',
    });

    const cfg = configManager.getConfig();
    expect(cfg.dbServer).toBe('sql.interno');
    expect(cfg.dbPort).toBe(1500);
    expect(cfg.authMode).toBe('session-sql');
    expect(configManager.isConfigured()).toBe(true);
  });

  it('resetConfig vuelve al estado vacío', () => {
    configManager.setConfig({ dbServer: 'sql.interno', dbUser: 'u', dbPassword: 'p' });
    configManager.resetConfig();
    expect(configManager.getConfig().dbServer).toBe('');
    expect(configManager.isConfigured()).toBe(false);
  });

  it('normaliza puerto inválido a 1433', () => {
    configManager.setConfig({ dbServer: 'sql.interno', dbUser: 'u', dbPassword: 'p', dbPort: 'abc' });
    expect(configManager.getConfig().dbPort).toBe(1433);
  });

  it('no expone funciones de disco', () => {
    expect(configManager.loadConfigFromFile).toBeUndefined();
    expect(configManager.saveEncryptedLocalConfig).toBeUndefined();
    expect(configManager.importConfigFile).toBeUndefined();
    expect(configManager.clearPersistedConfig).toBeUndefined();
  });
});
