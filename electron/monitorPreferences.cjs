const fs = require('fs');
const path = require('path');

const PREFS_FILE_NAME = 'monitor-preferences.json';
const MAX_BOUND = 10000;

const DEFAULTS = Object.freeze({
  bounds: null,
  pinned: true,
});

function preferencesPath(userDataDir) {
  return path.join(userDataDir, PREFS_FILE_NAME);
}

function isFiniteInteger(value) {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    Number.isInteger(value)
  );
}

function normalizeBounds(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const { x, y, width, height } = raw;
  if (![x, y, width, height].every(isFiniteInteger)) return null;
  if (width <= 0 || height <= 0) return null;
  if (width > MAX_BOUND || height > MAX_BOUND) return null;
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

function stripUndefined(patch) {
  if (!patch || typeof patch !== 'object') return {};
  return Object.fromEntries(
    Object.entries(patch).filter(([, value]) => value !== undefined),
  );
}

function saveMonitorPreferences(userDataDir, patch) {
  const current = loadMonitorPreferences(userDataDir);
  const next = normalizePreferences({
    ...current,
    ...stripUndefined(patch),
  });
  let stored = false;

  if (userDataDir) {
    let tmp = '';
    try {
      const file = preferencesPath(userDataDir);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(next, null, 2), {
        encoding: 'utf8',
        flag: 'wx',
      });
      fs.renameSync(tmp, file);
      stored = true;
    } catch {
      // Sin persistencia, el cambio aplica solo en esta sesión.
    } finally {
      if (tmp) {
        try {
          fs.unlinkSync(tmp);
        } catch {}
      }
    }
  }

  return { ...next, stored };
}

module.exports = {
  DEFAULTS,
  PREFS_FILE_NAME,
  normalizeBounds,
  normalizePreferences,
  loadMonitorPreferences,
  saveMonitorPreferences,
};
