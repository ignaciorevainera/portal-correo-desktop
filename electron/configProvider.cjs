const fs = require('fs');

const AUTH_MODES = ['static-sql', 'session-sql', 'integrated'];

class ConfigError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'ConfigError';
    this.code = code;
    this.details = details;
  }
}

function mapFsError(err) {
  const code = err && err.code;
  if (code === 'ENOENT' || code === 'ENOTDIR') return 'NO_CONFIG';
  if (code === 'EACCES' || code === 'EPERM') return 'NO_PERMISSION';
  if (code === 'ETIMEDOUT' || code === 'ESOCKETTIMEDOUT') return 'NO_LAN_TIMEOUT';
  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') return 'NO_LAN_DNS';
  if (code === 'ENETUNREACH' || code === 'EHOSTUNREACH' || code === 'ECONNREFUSED' || code === 'ECONNRESET') {
    return 'NO_LAN_ROUTE';
  }
  return 'UNKNOWN';
}

function validateCorporateConfig(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new ConfigError('BAD_CONFIG', 'El archivo de configuración no contiene un objeto JSON válido');
  }

  const port = Number(raw.dbPort);
  const authMode = String(raw.authMode || 'static-sql').trim();
  const cfg = {
    dbServer: String(raw.dbServer || '').trim(),
    dbDatabase: String(raw.dbDatabase || '').trim(),
    dbUser: String(raw.dbUser || '').trim(),
    dbPassword: String(raw.dbPassword || '').trim(),
    dbPort: Number.isFinite(port) && port > 0 ? port : 1433,
    corporateDomain: String(raw.corporateDomain || '').trim(),
    vncPassword: String(raw.vncPassword || '').trim(),
    authMode,
  };

  if (!cfg.dbServer || !cfg.dbUser) {
    throw new ConfigError('BAD_CONFIG', 'Faltan campos obligatorios: dbServer y dbUser');
  }
  if (!AUTH_MODES.includes(cfg.authMode)) {
    throw new ConfigError('BAD_CONFIG', `authMode desconocido: ${cfg.authMode}`);
  }
  if (cfg.authMode === 'static-sql' && !cfg.dbPassword) {
    throw new ConfigError('BAD_CONFIG', 'authMode static-sql requiere dbPassword');
  }

  return cfg;
}

class UncConfigProvider {
  constructor({ configPath, readFile = fs.promises.readFile, logger = null } = {}) {
    this.configPath = configPath;
    this.readFile = readFile;
    this.logger = logger;
  }

  get source() {
    return 'unc';
  }

  describe() {
    return { source: this.source, target: this.configPath };
  }

  async readFull() {
    let content;
    try {
      content = await this.readFile(this.configPath, 'utf8');
    } catch (err) {
      throw new ConfigError(mapFsError(err), `No se pudo leer la configuración: ${err && err.message}`, {
        path: this.configPath,
      });
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new ConfigError('BAD_CONFIG', 'El archivo de configuración no es JSON válido', { path: this.configPath });
    }

    return validateCorporateConfig(parsed);
  }

  async getConfig() {
    const full = await this.readFull();
    const { vncPassword, ...config } = full;
    return config;
  }

  async getVncSecret() {
    const full = await this.readFull();
    if (!full.vncPassword) {
      throw new ConfigError('SECRET_UNAVAILABLE', 'La configuración no incluye clave VNC', { path: this.configPath });
    }
    return full.vncPassword;
  }
}

class DevEnvConfigProvider {
  constructor({ env = process.env, localConfigPath = '' } = {}) {
    this.env = env;
    this.localConfigPath = localConfigPath;
  }

  get source() {
    return 'dev';
  }

  describe() {
    return { source: this.source, target: this.localConfigPath || 'variables PCD_*' };
  }

  async readFull() {
    if (this.localConfigPath) {
      try {
        const content = await fs.promises.readFile(this.localConfigPath, 'utf8');
        return validateCorporateConfig(JSON.parse(content));
      } catch (err) {
        if (!(err && err.code === 'ENOENT')) throw err;
      }
    }

    return validateCorporateConfig({
      dbServer: this.env.PCD_DB_SERVER,
      dbDatabase: this.env.PCD_DB_NAME,
      dbUser: this.env.PCD_DB_USER,
      dbPassword: this.env.PCD_DB_PASSWORD,
      dbPort: this.env.PCD_DB_PORT,
      corporateDomain: this.env.PCD_CORP_DOMAIN,
      vncPassword: this.env.PCD_VNC_PASSWORD,
      authMode: this.env.PCD_AUTH_MODE,
    });
  }

  async getConfig() {
    const full = await this.readFull();
    const { vncPassword, ...config } = full;
    return config;
  }

  async getVncSecret() {
    const full = await this.readFull();
    if (!full.vncPassword) {
      throw new ConfigError('SECRET_UNAVAILABLE', 'El entorno de desarrollo no define PCD_VNC_PASSWORD');
    }
    return full.vncPassword;
  }
}

function createConfigProvider(bootstrapConfig, options = {}) {
  const { isPackaged = true, logger = null, localConfigPath = '' } = options;

  if (!isPackaged) {
    return new DevEnvConfigProvider({ env: process.env, localConfigPath });
  }

  if (!bootstrapConfig || !bootstrapConfig.uncConfigPath) {
    throw new ConfigError('NO_CONFIG', 'bootstrap.json no define la ruta de configuración');
  }

  return new UncConfigProvider({ configPath: bootstrapConfig.uncConfigPath, logger });
}

module.exports = {
  AUTH_MODES,
  ConfigError,
  mapFsError,
  validateCorporateConfig,
  UncConfigProvider,
  DevEnvConfigProvider,
  createConfigProvider,
};
