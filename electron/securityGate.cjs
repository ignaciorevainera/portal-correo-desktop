const configManager = require('./configManager.cjs');
const { ConfigError } = require('./configProvider.cjs');

const STATUS = {
  READY: 'READY',
  BLOCKED: 'BLOCKED',
  NO_CONFIG: 'NO_CONFIG',
};

const MESSAGES = {
  AUTHORIZED: 'Red corporativa y configuración verificadas',
  NO_LAN_DNS:
    'No se pudo resolver el servidor de configuración. Verificá que estés conectado a la red corporativa.',
  NO_LAN_ROUTE:
    'Esta aplicación solo funciona dentro de la red corporativa. Conectate a la red de Correo (cable o Wi-Fi corporativo) y reintentá.',
  NO_LAN_TIMEOUT: 'La red corporativa no respondió a tiempo. Reintentá en unos segundos.',
  NO_PERMISSION: 'Estás en la red, pero tu usuario no tiene acceso a la configuración. Contactá a soporte.',
  NO_CONFIG: 'No se encontró la configuración corporativa. Avisá a soporte.',
  BAD_CONFIG: 'La configuración corporativa está incompleta o dañada. Avisá a soporte.',
  UNKNOWN: 'No se pudo verificar el acceso a la configuración corporativa.',
};

const NETWORK_CODES = new Set(['NO_LAN_DNS', 'NO_LAN_ROUTE', 'NO_LAN_TIMEOUT', 'UNKNOWN']);
const CONFIG_CODES = new Set(['NO_CONFIG', 'BAD_CONFIG']);

function describeEnvironment(env = process.env) {
  const dnsDomain = String(env.USERDNSDOMAIN || '').trim();
  const netbiosDomain = String(env.USERDOMAIN || '').trim();
  const detectedDomain = dnsDomain || netbiosDomain || 'WORKGROUP';
  return {
    detectedDomain,
    isDomainJoined: Boolean(dnsDomain) || (Boolean(netbiosDomain) && netbiosDomain !== 'WORKGROUP'),
    note: 'Dato informativo: no autoriza ni bloquea por sí mismo.',
  };
}

function safeDescribe(provider) {
  try {
    const described = typeof provider.describe === 'function' ? provider.describe() : null;
    if (described && typeof described === 'object') {
      return {
        source: String(described.source || provider.source || 'none'),
        target: String(described.target || ''),
      };
    }
  } catch {
    // Un proveedor defectuoso no debe tumbar el gate.
  }
  return { source: String((provider && provider.source) || 'none'), target: '' };
}

function isUsableConfig(config) {
  return Boolean(
    config &&
      typeof config === 'object' &&
      !Array.isArray(config) &&
      String(config.dbServer || '').trim() &&
      String(config.dbUser || '').trim()
  );
}

function safeLog(logger, level, message, meta) {
  try {
    if (logger && typeof logger[level] === 'function') logger[level](message, meta);
  } catch {
    // El logging nunca debe cambiar el veredicto del gate.
  }
}

async function evaluateGate(options = {}) {
  const { provider, store = configManager, logger = null, env = process.env } = options;

  if (!provider) {
    store.resetConfig();
    return {
      status: STATUS.NO_CONFIG,
      code: 'NO_CONFIG',
      message: MESSAGES.NO_CONFIG,
      source: 'none',
      configPath: '',
      environment: describeEnvironment(env),
    };
  }

  const described = safeDescribe(provider);

  try {
    const config = await provider.getConfig();
    if (!isUsableConfig(config)) {
      throw new ConfigError('BAD_CONFIG', 'El proveedor devolvió una configuración vacía o incompleta');
    }

    store.resetConfig();
    store.setConfig(config);

    safeLog(logger, 'info', 'Gate autorizado', { source: described.source });

    return {
      status: STATUS.READY,
      code: 'AUTHORIZED',
      message: MESSAGES.AUTHORIZED,
      source: described.source,
      configPath: described.target,
      environment: describeEnvironment(env),
    };
  } catch (err) {
    store.resetConfig();

    const code = err instanceof ConfigError ? err.code : 'UNKNOWN';
    const status = CONFIG_CODES.has(code)
      ? STATUS.NO_CONFIG
      : NETWORK_CODES.has(code)
        ? STATUS.BLOCKED
        : STATUS.BLOCKED;

    safeLog(logger, 'warn', 'Gate bloqueado', { code, detail: err && err.message, source: described.source });

    return {
      status,
      code,
      message: MESSAGES[code] || MESSAGES.UNKNOWN,
      source: described.source,
      configPath: described.target,
      environment: describeEnvironment(env),
    };
  }
}

module.exports = { STATUS, MESSAGES, describeEnvironment, evaluateGate };
