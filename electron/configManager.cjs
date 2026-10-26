const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const EMPTY_CONFIG = {
  dbServer: '',
  dbDatabase: '',
  dbUser: '',
  dbPassword: '',
  dbPort: 1433,
  vncPassword: '',
  corporateDomain: '',
  uncConfigPath: '',
};

function getRuntimeState() {
  return globalThis.__CMDA_RUNTIME_CONFIG__ || null;
}

function setRuntimeState(val) {
  globalThis.__CMDA_RUNTIME_CONFIG__ = val;
}

function parseDotEnvContent(content) {
  const result = {};
  if (!content || typeof content !== 'string') return result;
  const lines = content.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eqIdx = line.indexOf('=');
    if (eqIdx === -1) continue;
    const key = line.slice(0, eqIdx).trim();
    let val = line.slice(eqIdx + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    result[key] = val;
  }
  return result;
}

function loadFromEnv(envObj = process.env) {
  const cfg = {
    dbServer: (envObj.CMDA_DB_SERVER || '').trim(),
    dbDatabase: (envObj.CMDA_DB_NAME || '').trim(),
    dbUser: (envObj.CMDA_DB_USER || '').trim(),
    dbPassword: (envObj.CMDA_DB_PASSWORD || '').trim(),
    dbPort: parseInt(envObj.CMDA_DB_PORT || '1433', 10) || 1433,
    vncPassword: (envObj.CMDA_VNC_PASSWORD || '').trim(),
    corporateDomain: (envObj.CMDA_CORP_DOMAIN || '').trim(),
    uncConfigPath: (envObj.CMDA_UNC_CONFIG_PATH || '').trim(),
  };

  if (cfg.dbServer || cfg.dbUser || cfg.dbPassword || cfg.corporateDomain) {
    setRuntimeState(cfg);
  }
  return { ...EMPTY_CONFIG, ...cfg };
}

function encryptConfigPayload(configObj, secretKey) {
  if (!secretKey || typeof secretKey !== 'string' || !secretKey.trim()) {
    throw new Error('Se requiere una clave corporativa para cifrar la configuración');
  }
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = crypto.scryptSync(secretKey.trim(), salt, 32);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const plaintext = JSON.stringify(configObj);
  let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
  ciphertext += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  return {
    encrypted: true,
    version: 1,
    salt: salt.toString('hex'),
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    ciphertext,
  };
}

function decryptConfigPayload(payload, secretKey) {
  if (!payload || !payload.encrypted || !payload.ciphertext || !payload.salt || !payload.iv || !payload.authTag) {
    throw new Error('Formato de configuración cifrada inválido');
  }
  if (!secretKey || typeof secretKey !== 'string' || !secretKey.trim()) {
    throw new Error('Clave corporativa inválida o vacía');
  }

  try {
    const salt = Buffer.from(payload.salt, 'hex');
    const iv = Buffer.from(payload.iv, 'hex');
    const authTag = Buffer.from(payload.authTag, 'hex');
    const key = crypto.scryptSync(secretKey.trim(), salt, 32);

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(payload.ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
  } catch {
    throw new Error('Clave corporativa inválida o archivo corrupto');
  }
}

function normalizeConfigObject(raw) {
  return {
    dbServer: String(raw.dbServer || raw.CMDA_DB_SERVER || '').trim(),
    dbDatabase: String(raw.dbDatabase || raw.CMDA_DB_NAME || raw.database || '').trim(),
    dbUser: String(raw.dbUser || raw.CMDA_DB_USER || raw.user || '').trim(),
    dbPassword: String(raw.dbPassword || raw.CMDA_DB_PASSWORD || raw.password || '').trim(),
    dbPort: Number(raw.dbPort || raw.CMDA_DB_PORT || raw.port) || 1433,
    vncPassword: String(raw.vncPassword || raw.CMDA_VNC_PASSWORD || '').trim(),
    corporateDomain: String(raw.corporateDomain || raw.CMDA_CORP_DOMAIN || '').trim(),
    uncConfigPath: String(raw.uncConfigPath || raw.CMDA_UNC_CONFIG_PATH || '').trim(),
  };
}

function loadConfigFromFile(filePath, secretKey = '') {
  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error(`No se encontró el archivo de configuración en: ${filePath}`);
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  let parsed;
  if (filePath.endsWith('.env') || content.includes('=') && !content.trim().startsWith('{')) {
    parsed = parseDotEnvContent(content);
  } else {
    parsed = JSON.parse(content);
  }

  let resolvedConfig;
  if (parsed.encrypted) {
    resolvedConfig = decryptConfigPayload(parsed, secretKey);
  } else {
    if (parsed.accessKey && parsed.accessKey !== secretKey.trim()) {
      throw new Error('Clave corporativa inválida para el archivo de configuración');
    }
    resolvedConfig = parsed;
  }

  const normalized = normalizeConfigObject({
    ...resolvedConfig,
    uncConfigPath: filePath,
  });
  setRuntimeState(normalized);
  return { ...normalized };
}

function saveEncryptedLocalConfig(filePath, configObj, secretKey) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const encrypted = encryptConfigPayload(configObj, secretKey);
  fs.writeFileSync(filePath, JSON.stringify(encrypted, null, 2), 'utf-8');
  return encrypted;
}

function loadFromHierarchicalPaths(options = {}) {
  // 1. Check AppData path if provided
  if (options.appDataPath && fs.existsSync(options.appDataPath)) {
    try {
      const cfg = loadConfigFromFile(options.appDataPath);
      if (cfg.dbServer && cfg.dbUser) {
        return cfg;
      }
    } catch {}
  }

  // 2. Check adjacent to exe
  if (options.exeDirPath && fs.existsSync(options.exeDirPath)) {
    try {
      const cfg = loadConfigFromFile(options.exeDirPath);
      if (cfg.dbServer && cfg.dbUser) {
        return cfg;
      }
    } catch {}
  }

  // 3. Fallback to process.env and local untracked files
  return getConfig(options);
}

function importConfigFile(sourceFilePath, targetUserDataPath) {
  if (!sourceFilePath || !fs.existsSync(sourceFilePath)) {
    throw new Error('El archivo de configuración origen no existe.');
  }

  const content = fs.readFileSync(sourceFilePath, 'utf8');
  let parsed;
  if (sourceFilePath.endsWith('.env') || (content.includes('=') && !content.trim().startsWith('{'))) {
    const parsedEnv = parseDotEnvContent(content);
    parsed = normalizeConfigObject(parsedEnv);
  } else {
    parsed = normalizeConfigObject(JSON.parse(content));
  }

  if (!parsed.dbServer || !parsed.dbUser) {
    throw new Error('El archivo no contiene los campos mínimos requeridos (dbServer, dbUser).');
  }

  const targetDir = path.dirname(targetUserDataPath);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  fs.writeFileSync(targetUserDataPath, JSON.stringify(parsed, null, 2), 'utf8');
  setRuntimeState(parsed);
  return { success: true, config: parsed };
}

function clearPersistedConfig(targetUserDataPath) {
  try {
    if (targetUserDataPath && fs.existsSync(targetUserDataPath)) {
      fs.unlinkSync(targetUserDataPath);
    }
  } catch {}
  setRuntimeState(null);
  return { success: true };
}

function tryLoadLocalUntrackedFiles() {
  const appRoot = path.resolve(__dirname, '..');
  const dotEnvPath = path.join(appRoot, '.env');
  if (fs.existsSync(dotEnvPath)) {
    try {
      const parsedEnv = parseDotEnvContent(fs.readFileSync(dotEnvPath, 'utf-8'));
      const merged = { ...parsedEnv, ...process.env };
      const cfg = loadFromEnv(merged);
      if (cfg.dbServer && cfg.dbUser && cfg.dbPassword) {
        return cfg;
      }
    } catch {
      // ignore read errors
    }
  }

  const localJsonPath = path.join(appRoot, 'cmda.config.local.json');
  if (fs.existsSync(localJsonPath)) {
    try {
      return loadConfigFromFile(localJsonPath, process.env.CMDA_ACCESS_KEY || '');
    } catch {
      // ignore
    }
  }

  return null;
}

function getConfig(options = {}) {
  const current = getRuntimeState();
  if (current) {
    return { ...EMPTY_CONFIG, ...current };
  }

  if (!options.ignoreEnv) {
    if (
      process.env.CMDA_DB_SERVER ||
      process.env.CMDA_DB_USER ||
      process.env.CMDA_DB_PASSWORD ||
      process.env.CMDA_CORP_DOMAIN
    ) {
      return loadFromEnv(process.env);
    }

    if (!options.skipLocalFiles) {
      const localLoaded = tryLoadLocalUntrackedFiles();
      if (localLoaded) {
        return localLoaded;
      }
    }
  }

  return { ...EMPTY_CONFIG };
}

function setConfig(partial) {
  const current = getRuntimeState();
  const updated = normalizeConfigObject({
    ...(current || EMPTY_CONFIG),
    ...partial,
  });
  setRuntimeState(updated);
  return { ...updated };
}

function resetConfig() {
  setRuntimeState(null);
}

function isConfigured(options = {}) {
  const cfg = getConfig(options);
  return Boolean(cfg.dbServer && cfg.dbUser && cfg.dbPassword);
}

module.exports = {
  EMPTY_CONFIG,
  parseDotEnvContent,
  loadFromEnv,
  encryptConfigPayload,
  decryptConfigPayload,
  loadConfigFromFile,
  saveEncryptedLocalConfig,
  loadFromHierarchicalPaths,
  importConfigFile,
  clearPersistedConfig,
  getConfig,
  setConfig,
  resetConfig,
  isConfigured,
};
