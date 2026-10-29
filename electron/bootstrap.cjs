const fs = require('fs');
const path = require('path');

const BOOTSTRAP_DIR = 'portal-correo-desktop';
const BOOTSTRAP_FILE = 'bootstrap.json';

const DEFAULTS = {
  configSource: 'unc',
  uncConfigPath: '',
  updateFeed: '',
  updateMirror: '',
  retryIntervalMs: 15000,
};

function getBootstrapPath(programDataDir) {
  return path.join(programDataDir, BOOTSTRAP_DIR, BOOTSTRAP_FILE);
}

function normalizeBootstrap(raw, defaults = DEFAULTS) {
  const merged = { ...defaults, ...(raw && typeof raw === 'object' ? raw : {}) };
  const retry = Number(merged.retryIntervalMs);
  return {
    configSource: String(merged.configSource || 'unc').trim(),
    uncConfigPath: String(merged.uncConfigPath || '').trim(),
    updateFeed: String(merged.updateFeed || '').trim(),
    updateMirror: String(merged.updateMirror || '').trim(),
    retryIntervalMs: Number.isFinite(retry) && retry >= 1000 ? retry : defaults.retryIntervalMs,
  };
}

function loadBootstrap(options = {}) {
  const {
    programDataDir,
    exeDir,
    existsSync = fs.existsSync,
    readFileSync = (file) => fs.readFileSync(file, 'utf8'),
    defaults = DEFAULTS,
  } = options;

  const candidates = [];
  if (programDataDir) candidates.push(getBootstrapPath(programDataDir));
  if (exeDir) candidates.push(path.join(exeDir, BOOTSTRAP_FILE));

  for (const file of candidates) {
    if (!existsSync(file)) continue;
    try {
      const parsed = JSON.parse(readFileSync(file));
      return { ...normalizeBootstrap(parsed, defaults), _path: file, _found: true };
    } catch {
      // Archivo ilegible o JSON inválido: se prueba el siguiente candidato.
    }
  }

  return { ...normalizeBootstrap({}, defaults), _path: candidates[0] || '', _found: false };
}

module.exports = { BOOTSTRAP_DIR, BOOTSTRAP_FILE, DEFAULTS, getBootstrapPath, normalizeBootstrap, loadBootstrap };
