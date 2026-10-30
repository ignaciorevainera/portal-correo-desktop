import { describe, it, expect } from 'vitest';

const {
  ConfigError,
  mapFsError,
  validateCorporateConfig,
  UncConfigProvider,
  DevEnvConfigProvider,
  createConfigProvider,
} = require('../../electron/configProvider.cjs');

const CONFIG_VALIDA = {
  dbServer: 'sql.interno',
  dbDatabase: 'Inventario',
  dbUser: 'operador_lectura',
  dbPassword: 'clave-sql',
  dbPort: 1433,
  corporateDomain: 'dominio.interno',
  vncPassword: 'clave-vnc',
  authMode: 'static-sql',
};

describe('configProvider', () => {
  it('mapea errores de sistema de archivos a códigos del gate', () => {
    expect(mapFsError({ code: 'ENOENT' })).toBe('NO_CONFIG');
    expect(mapFsError({ code: 'EACCES' })).toBe('NO_PERMISSION');
    expect(mapFsError({ code: 'EPERM' })).toBe('NO_PERMISSION');
    expect(mapFsError({ code: 'ETIMEDOUT' })).toBe('NO_LAN_TIMEOUT');
    expect(mapFsError({ code: 'ENOTFOUND' })).toBe('NO_LAN_DNS');
    expect(mapFsError({ code: 'EAI_AGAIN' })).toBe('NO_LAN_DNS');
    expect(mapFsError({ code: 'ENETUNREACH' })).toBe('NO_LAN_ROUTE');
    expect(mapFsError({ code: 'ECONNREFUSED' })).toBe('NO_LAN_ROUTE');
    expect(mapFsError({ code: 'RARO' })).toBe('UNKNOWN');
  });

  it('rechaza configuración sin campos obligatorios', () => {
    expect(() => validateCorporateConfig({ dbServer: 'sql.interno' })).toThrow(ConfigError);
    try {
      validateCorporateConfig({ dbServer: 'sql.interno' });
    } catch (err: any) {
      expect(err.code).toBe('BAD_CONFIG');
    }
  });

  it('rechaza authMode desconocido', () => {
    try {
      validateCorporateConfig({ ...CONFIG_VALIDA, authMode: 'magia' });
      throw new Error('debió fallar');
    } catch (err: any) {
      expect(err.code).toBe('BAD_CONFIG');
    }
  });

  it('rechaza static-sql sin dbPassword', () => {
    try {
      validateCorporateConfig({ ...CONFIG_VALIDA, dbPassword: '' });
      throw new Error('debió fallar');
    } catch (err: any) {
      expect(err.code).toBe('BAD_CONFIG');
    }
  });

  it('normaliza puerto por defecto y espacios', () => {
    const cfg = validateCorporateConfig({ ...CONFIG_VALIDA, dbServer: '  sql.interno  ', dbPort: undefined });
    expect(cfg.dbServer).toBe('sql.interno');
    expect(cfg.dbPort).toBe(1433);
  });

  it('getConfig no expone la clave VNC', async () => {
    const provider = new UncConfigProvider({
      configPath: '\\\\host\\share\\portal-correo-desktop.config.json',
      readFile: async () => JSON.stringify(CONFIG_VALIDA),
    });

    const cfg = await provider.getConfig();
    expect(cfg.dbServer).toBe('sql.interno');
    expect((cfg as any).vncPassword).toBeUndefined();
  });

  it('getVncSecret devuelve la clave y falla con SECRET_UNAVAILABLE si no existe', async () => {
    const provider = new UncConfigProvider({
      configPath: '\\\\host\\share\\portal-correo-desktop.config.json',
      readFile: async () => JSON.stringify(CONFIG_VALIDA),
    });
    await expect(provider.getVncSecret()).resolves.toBe('clave-vnc');

    const sinVnc = new UncConfigProvider({
      configPath: '\\\\host\\share\\portal-correo-desktop.config.json',
      readFile: async () => JSON.stringify({ ...CONFIG_VALIDA, vncPassword: '' }),
    });
    try {
      await sinVnc.getVncSecret();
      throw new Error('debió fallar');
    } catch (err: any) {
      expect(err.code).toBe('SECRET_UNAVAILABLE');
    }
  });

  it('traduce un error ENOENT de lectura a NO_CONFIG', async () => {
    const provider = new UncConfigProvider({
      configPath: '\\\\host\\share\\portal-correo-desktop.config.json',
      readFile: async () => {
        const err: any = new Error('no existe');
        err.code = 'ENOENT';
        throw err;
      },
    });

    try {
      await provider.getConfig();
      throw new Error('debió fallar');
    } catch (err: any) {
      expect(err.code).toBe('NO_CONFIG');
    }
  });

  it('tolera un BOM UTF-8 al inicio del archivo', async () => {
    const provider = new UncConfigProvider({
      configPath: '\\\\host\\share\\portal-correo-desktop.config.json',
      readFile: async () => `\uFEFF${JSON.stringify(CONFIG_VALIDA)}`,
    });

    const cfg = await provider.getConfig();
    expect(cfg.dbServer).toBe('sql.interno');
  });

  it('traduce un JSON inválido a BAD_CONFIG', async () => {
    const provider = new UncConfigProvider({
      configPath: '\\\\host\\share\\portal-correo-desktop.config.json',
      readFile: async () => 'no soy json',
    });

    try {
      await provider.getConfig();
      throw new Error('debió fallar');
    } catch (err: any) {
      expect(err.code).toBe('BAD_CONFIG');
    }
  });

  it('DevEnvConfigProvider lee variables PCD_ del entorno', async () => {
    const provider = new DevEnvConfigProvider({
      env: {
        PCD_DB_SERVER: 'sql.dev',
        PCD_DB_NAME: 'DevDB',
        PCD_DB_USER: 'dev_user',
        PCD_DB_PASSWORD: 'dev_pass',
        PCD_CORP_DOMAIN: 'dominio.dev',
        PCD_VNC_PASSWORD: 'vnc_dev',
      },
    });

    const cfg = await provider.getConfig();
    expect(cfg.dbServer).toBe('sql.dev');
    expect(cfg.dbPort).toBe(1433);
    await expect(provider.getVncSecret()).resolves.toBe('vnc_dev');
  });

  it('createConfigProvider devuelve DevEnv en desarrollo y UNC en producción', () => {
    const dev = createConfigProvider({ uncConfigPath: '\\\\host\\x.json' }, { isPackaged: false });
    expect(dev.source).toBe('dev');

    const prod = createConfigProvider({ uncConfigPath: '\\\\host\\x.json' }, { isPackaged: true });
    expect(prod.source).toBe('unc');
  });

  it('createConfigProvider falla con NO_CONFIG si producción no define ruta', () => {
    try {
      createConfigProvider({ uncConfigPath: '' }, { isPackaged: true });
      throw new Error('debió fallar');
    } catch (err: any) {
      expect(err.code).toBe('NO_CONFIG');
    }
  });
});
