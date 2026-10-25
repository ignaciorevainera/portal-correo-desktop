import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import configManager from '../../electron/configManager.cjs';

describe('configManager (Zero-Secrets & Corporate Config Loader)', () => {
  const tempDir = path.join(os.tmpdir(), `cmda_cfg_test_${Date.now()}`);

  beforeEach(() => {
    configManager.resetConfig();
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  });

  it('returns unconfigured state with zero hardcoded secrets by default', () => {
    const cfg = configManager.getConfig({ ignoreEnv: true });
    expect(cfg.dbServer).toBe('');
    expect(cfg.dbUser).toBe('');
    expect(cfg.dbPassword).toBe('');
    expect(cfg.vncPassword).toBe('');
    expect(cfg.corporateDomain).toBe('');
    expect(configManager.isConfigured({ ignoreEnv: true })).toBe(false);
  });

  it('loads configuration from environment variables when present', () => {
    const mockEnv = {
      CMDA_DB_SERVER: '192.0.2.50',
      CMDA_DB_NAME: 'TestDB_Licencias',
      CMDA_DB_USER: 'test_sql_user',
      CMDA_DB_PASSWORD: 'test_sql_password',
      CMDA_DB_PORT: '1433',
      CMDA_VNC_PASSWORD: 'test_vnc_hash',
      CMDA_CORP_DOMAIN: 'corp.example.internal',
    };

    const cfg = configManager.loadFromEnv(mockEnv);
    expect(cfg.dbServer).toBe('192.0.2.50');
    expect(cfg.dbDatabase).toBe('TestDB_Licencias');
    expect(cfg.dbUser).toBe('test_sql_user');
    expect(cfg.dbPassword).toBe('test_sql_password');
    expect(cfg.vncPassword).toBe('test_vnc_hash');
    expect(cfg.corporateDomain).toBe('corp.example.internal');
    expect(configManager.isConfigured()).toBe(true);
  });

  it('parses .env content accurately ignoring comments and quotes', () => {
    const raw = `
      # Comment line
      CMDA_DB_SERVER="192.0.2.77"
      CMDA_DB_USER='admin_test'
      INVALID_LINE
    `;
    const parsed = configManager.parseDotEnvContent(raw) as Record<string, string>;
    expect(parsed.CMDA_DB_SERVER).toBe('192.0.2.77');
    expect(parsed.CMDA_DB_USER).toBe('admin_test');
  });

  it('encrypts and decrypts a corporate config payload using AES-256-GCM', () => {
    const sampleConfig = {
      dbServer: '192.0.2.99',
      dbDatabase: 'InventoryDB',
      dbUser: 'svc_inventory',
      dbPassword: 'super_secret_db_password',
      dbPort: 1433,
      vncPassword: 'vnc_secret_token',
      corporateDomain: 'intranet.example.com',
    };

    const corporateKey = 'ClaveCorporativa2026!';
    const encrypted = configManager.encryptConfigPayload(sampleConfig, corporateKey);

    expect(encrypted.encrypted).toBe(true);
    expect(encrypted.ciphertext).toBeDefined();
    expect(JSON.stringify(encrypted)).not.toContain('super_secret_db_password');
    expect(JSON.stringify(encrypted)).not.toContain('192.0.2.99');

    const decrypted = configManager.decryptConfigPayload(encrypted, corporateKey);
    expect(decrypted.dbServer).toBe('192.0.2.99');
    expect(decrypted.dbPassword).toBe('super_secret_db_password');
    expect(decrypted.corporateDomain).toBe('intranet.example.com');
  });

  it('throws an error when decrypting with an invalid corporate key', () => {
    const sampleConfig = {
      dbServer: '192.0.2.99',
      dbDatabase: 'InventoryDB',
      dbUser: 'svc_inventory',
      dbPassword: 'super_secret_db_password',
      vncPassword: 'vnc_secret_token',
      corporateDomain: 'intranet.example.com',
    };

    const encrypted = configManager.encryptConfigPayload(sampleConfig, 'ClaveCorrecta');
    expect(() => {
      configManager.decryptConfigPayload(encrypted, 'ClaveIncorrecta');
    }).toThrow(/Clave corporativa inválida/i);
  });

  it('saves and loads an external encrypted cmda.config.json file', () => {
    const filePath = path.join(tempDir, 'cmda.config.json');
    const sampleConfig = {
      dbServer: '198.51.100.40',
      dbDatabase: 'MesaAyudaDB',
      dbUser: 'mesa_user',
      dbPassword: 'mesa_password',
      dbPort: 1433,
      vncPassword: 'mesa_vnc_hash',
      corporateDomain: 'red.ejemplo.local',
    };

    configManager.saveEncryptedLocalConfig(filePath, sampleConfig, 'PassRedInterna');
    const loaded = configManager.loadConfigFromFile(filePath, 'PassRedInterna');
    expect(loaded.dbServer).toBe('198.51.100.40');
    expect(loaded.corporateDomain).toBe('red.ejemplo.local');
    expect(configManager.isConfigured()).toBe(true);
  });

  it('validates accessKey on plain JSON UNC share config files', () => {
    const filePath = path.join(tempDir, 'unc_plain.config.json');
    const plainConfig = {
      dbServer: '198.51.100.41',
      dbDatabase: 'MesaAyudaDB',
      dbUser: 'mesa_user',
      dbPassword: 'mesa_password',
      corporateDomain: 'red.ejemplo.local',
      accessKey: 'TokenUNC2026',
    };
    fs.writeFileSync(filePath, JSON.stringify(plainConfig, null, 2), 'utf-8');

    expect(() => {
      configManager.loadConfigFromFile(filePath, 'TokenIncorrecto');
    }).toThrow(/Clave corporativa inválida/i);

    const loaded = configManager.loadConfigFromFile(filePath, 'TokenUNC2026');
    expect(loaded.dbServer).toBe('198.51.100.41');
  });
});
