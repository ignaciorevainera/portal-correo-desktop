const EMPTY_CONFIG = {
  dbServer: '',
  dbDatabase: '',
  dbUser: '',
  dbPassword: '',
  dbPort: 1433,
  corporateDomain: '',
  vncPassword: '',
  authMode: 'static-sql',
};

function getRuntimeState() {
  return globalThis.__PCD_RUNTIME_CONFIG__ || null;
}

function setRuntimeState(value) {
  globalThis.__PCD_RUNTIME_CONFIG__ = value;
}

function normalizeConfigObject(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const port = Number(source.dbPort);
  return {
    dbServer: String(source.dbServer || '').trim(),
    dbDatabase: String(source.dbDatabase || '').trim(),
    dbUser: String(source.dbUser || '').trim(),
    dbPassword: String(source.dbPassword || '').trim(),
    dbPort: Number.isFinite(port) && port > 0 ? port : 1433,
    corporateDomain: String(source.corporateDomain || '').trim(),
    vncPassword: String(source.vncPassword || '').trim(),
    authMode: String(source.authMode || 'static-sql').trim(),
  };
}

function getConfig() {
  const current = getRuntimeState();
  return current ? { ...EMPTY_CONFIG, ...current } : { ...EMPTY_CONFIG };
}

function setConfig(partial) {
  const updated = normalizeConfigObject({ ...(getRuntimeState() || EMPTY_CONFIG), ...partial });
  setRuntimeState(updated);
  return { ...updated };
}

function resetConfig() {
  setRuntimeState(null);
}

function isConfigured() {
  const cfg = getConfig();
  return Boolean(cfg.dbServer && cfg.dbUser && cfg.dbPassword);
}

module.exports = {
  EMPTY_CONFIG,
  normalizeConfigObject,
  getConfig,
  setConfig,
  resetConfig,
  isConfigured,
};
