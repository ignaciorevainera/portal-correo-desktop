const fs = require('fs');
const path = require('path');

const PREFS_FILE_NAME = 'monitor-preferences.json';

const DEFAULTS = Object.freeze({
  bounds: null,
  pinned: true,
});

function preferencesPath(userDataDir) {
  return path.join(userDataDir, PREFS_FILE_NAME);
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function normalizeBounds(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const { x, y, width, height } = raw;
  if (![x, y, width, height].every(isFiniteNumber)) return null;
  return { x, y, width, height };
}

function normalizePreferences(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  return {
    bounds: normalizeBounds(source.bounds),
    pinned:
      typeof source.pinned === 'boolean' ? source.pinned : DEFAULTS.pinned,
  };
}

function loadMonitorPreferences(userDataDir) {
  if (!userDataDir) return { ...DEFAULTS, stored: false };

  try {
    const file = preferencesPath(userDataDir);
    if (!fs.existsSync(file)) return { ...DEFAULTS, stored: false };
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    return { ...normalizePreferences(raw), stored: true };
  } catch {
    return { ...DEFAULTS, stored: false };
  }
}

function saveMonitorPreferences(userDataDir, patch) {
  const current = loadMonitorPreferences(userDataDir);
  const next = normalizePreferences({ ...current, ...(patch || {}) });

  if (userDataDir) {
    try {
      const file = preferencesPath(userDataDir);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      const tmp = `${file}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(next, null, 2), 'utf8');
      fs.renameSync(tmp, file);
    } catch {
      // Sin persistencia, el cambio aplica solo en esta sesión.
    }
  }

  return { ...next, stored: true };
}

module.exports = {
  DEFAULTS,
  PREFS_FILE_NAME,
  normalizeBounds,
  normalizePreferences,
  loadMonitorPreferences,
  saveMonitorPreferences,
};
