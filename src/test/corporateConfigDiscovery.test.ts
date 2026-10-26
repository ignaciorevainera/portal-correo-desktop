import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Require CommonJS module
const configManager = require('../../electron/configManager.cjs');

describe('Corporate Config Discovery & Persistence Tests', () => {
  const tmpDir = path.join(os.tmpdir(), 'cmda-test-config-' + Date.now());
  const appDataDir = path.join(tmpDir, 'appData');
  const exeDir = path.join(tmpDir, 'exeDir');

  beforeEach(() => {
    fs.mkdirSync(appDataDir, { recursive: true });
    fs.mkdirSync(exeDir, { recursive: true });
    configManager.resetConfig();
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
    configManager.resetConfig();
    vi.restoreAllMocks();
  });

  it('resolves config from %APPDATA% directory as highest priority', () => {
    const configData = {
      dbServer: 'sql.correo.internal',
      dbDatabase: 'PortalDB',
      dbUser: 'operador_appdata',
      dbPassword: 'secret_password_123',
      dbPort: 1433,
    };

    const targetFile = path.join(appDataDir, 'cmda.config.json');
    fs.writeFileSync(targetFile, JSON.stringify(configData), 'utf8');

    const loaded = configManager.loadFromHierarchicalPaths({
      appDataPath: targetFile,
      exeDirPath: path.join(exeDir, 'cmda.config.json'),
      skipLocalFiles: true,
      ignoreEnv: true,
    });

    expect(loaded).toBeDefined();
    expect(loaded.dbServer).toBe('sql.correo.internal');
    expect(loaded.dbUser).toBe('operador_appdata');
    expect(loaded.dbPassword).toBe('secret_password_123');
  });

  it('imports a JSON file and writes it to %APPDATA%/cmda.config.json', () => {
    const targetFile = path.join(appDataDir, 'cmda.config.json');
    const sourceFile = path.join(tmpDir, 'source.json');
    const sourceData = {
      dbServer: 'imported.correo.internal',
      dbDatabase: 'ImportedDB',
      dbUser: 'operador_imported',
      dbPassword: 'pwd_imported',
    };
    fs.writeFileSync(sourceFile, JSON.stringify(sourceData), 'utf8');

    const result = configManager.importConfigFile(sourceFile, targetFile);
    expect(result.success).toBe(true);
    expect(fs.existsSync(targetFile)).toBe(true);

    const saved = JSON.parse(fs.readFileSync(targetFile, 'utf8'));
    expect(saved.dbServer).toBe('imported.correo.internal');
    expect(saved.dbUser).toBe('operador_imported');
  });

  it('clears persisted configuration from %APPDATA% and resets runtime state', () => {
    const targetFile = path.join(appDataDir, 'cmda.config.json');
    fs.writeFileSync(targetFile, JSON.stringify({ dbServer: 'temp' }), 'utf8');

    configManager.setConfig({ dbServer: 'temp' });
    expect(configManager.getConfig().dbServer).toBe('temp');

    const clearResult = configManager.clearPersistedConfig(targetFile);
    expect(clearResult.success).toBe(true);
    expect(fs.existsSync(targetFile)).toBe(false);
    expect(configManager.getConfig({ skipLocalFiles: true, ignoreEnv: true }).dbServer).toBe('');
  });
});
