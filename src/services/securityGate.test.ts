import { describe, it, expect, beforeEach } from 'vitest';

const configManager = require('../../electron/configManager.cjs');
const securityGate = require('../../electron/securityGate.cjs');

const CONFIG_VALIDA = {
  dbServer: 'sql.interno',
  dbDatabase: 'Inventario',
  dbUser: 'operador',
  dbPassword: 'clave',
  dbPort: 1433,
  corporateDomain: 'dominio.interno',
  authMode: 'static-sql',
};

function providerQueDevuelve(config: any) {
  return {
    source: 'unc',
    describe: () => ({ source: 'unc', target: '\\\\host\\share\\portal-correo-desktop.config.json' }),
    getConfig: async () => config,
    getVncSecret: async () => 'clave-vnc',
  };
}

function providerQueFalla(code: string) {
  const { ConfigError } = require('../../electron/configProvider.cjs');
  return {
    source: 'unc',
    describe: () => ({ source: 'unc', target: '\\\\host\\share\\portal-correo-desktop.config.json' }),
    getConfig: async () => {
      throw new ConfigError(code, 'fallo simulado');
    },
    getVncSecret: async () => {
      throw new ConfigError(code, 'fallo simulado');
    },
  };
}

describe('securityGate (máquina de estados sobre el ConfigProvider)', () => {
  beforeEach(() => {
    configManager.resetConfig();
  });

  it('queda READY y publica la configuración cuando el proveedor responde', async () => {
    const result = await securityGate.evaluateGate({ provider: providerQueDevuelve(CONFIG_VALIDA) });

    expect(result.status).toBe('READY');
    expect(result.code).toBe('AUTHORIZED');
    expect(configManager.getConfig().dbServer).toBe('sql.interno');
  });

  it('queda BLOCKED con NO_LAN_DNS y limpia el store', async () => {
    configManager.setConfig(CONFIG_VALIDA);

    const result = await securityGate.evaluateGate({ provider: providerQueFalla('NO_LAN_DNS') });

    expect(result.status).toBe('BLOCKED');
    expect(result.code).toBe('NO_LAN_DNS');
    expect(result.message).toContain('red corporativa');
    expect(configManager.getConfig().dbServer).toBe('');
  });

  it('queda BLOCKED con NO_PERMISSION y lo distingue del problema de red', async () => {
    const result = await securityGate.evaluateGate({ provider: providerQueFalla('NO_PERMISSION') });

    expect(result.status).toBe('BLOCKED');
    expect(result.code).toBe('NO_PERMISSION');
    expect(result.message).toContain('no tiene acceso');
  });

  it('queda NO_CONFIG cuando la red responde pero falta el archivo', async () => {
    const result = await securityGate.evaluateGate({ provider: providerQueFalla('NO_CONFIG') });

    expect(result.status).toBe('NO_CONFIG');
    expect(result.code).toBe('NO_CONFIG');
  });

  it('queda NO_CONFIG cuando el esquema es inválido', async () => {
    const result = await securityGate.evaluateGate({ provider: providerQueFalla('BAD_CONFIG') });

    expect(result.status).toBe('NO_CONFIG');
    expect(result.code).toBe('BAD_CONFIG');
  });

  it('nunca autoriza por pertenencia a dominio sin red', async () => {
    const original = process.env.USERDNSDOMAIN;
    process.env.USERDNSDOMAIN = 'dominio.interno';

    try {
      const result = await securityGate.evaluateGate({ provider: providerQueFalla('NO_LAN_ROUTE') });
      expect(result.status).toBe('BLOCKED');
      expect(result.code).toBe('NO_LAN_ROUTE');
    } finally {
      if (original === undefined) delete process.env.USERDNSDOMAIN;
      else process.env.USERDNSDOMAIN = original;
    }
  });

  it('no exporta checkDomainMembership como autorizador', () => {
    expect(securityGate.checkDomainMembership).toBeUndefined();
  });

  it('describeEnvironment devuelve el dominio solo como dato informativo', () => {
    const info = securityGate.describeEnvironment({ USERDNSDOMAIN: 'dominio.interno', USERDOMAIN: 'INTERNO' });
    expect(info.detectedDomain).toBe('dominio.interno');
    expect(info.isDomainJoined).toBe(true);
  });

  it('no deja el store con datos viejos si el proveedor devuelve config vacía', async () => {
    configManager.setConfig(CONFIG_VALIDA);

    const result = await securityGate.evaluateGate({ provider: providerQueDevuelve(undefined) });

    expect(result.status).toBe('NO_CONFIG');
    expect(result.code).toBe('BAD_CONFIG');
    expect(configManager.getConfig().dbServer).toBe('');
  });

  it('no deja el store con datos viejos si el proveedor devuelve config parcial', async () => {
    configManager.setConfig(CONFIG_VALIDA);

    const result = await securityGate.evaluateGate({ provider: providerQueDevuelve({ dbPassword: 'nueva' }) });

    expect(result.status).toBe('NO_CONFIG');
    expect(configManager.getConfig().dbServer).toBe('');
  });

  it('no lanza si describe() explota y limpia el store', async () => {
    configManager.setConfig(CONFIG_VALIDA);

    const provider = {
      source: 'unc',
      describe: () => {
        throw new Error('describe explosivo');
      },
      getConfig: async () => {
        throw new Error('sin red');
      },
      getVncSecret: async () => '',
    };

    const result = await securityGate.evaluateGate({ provider });

    expect(result.status).toBe('BLOCKED');
    expect(result.code).toBe('UNKNOWN');
    expect(configManager.getConfig().dbServer).toBe('');
  });
});
