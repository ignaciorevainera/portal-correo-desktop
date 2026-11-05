/**
 * Preferencias de interfaz que el proceso principal necesita conocer para
 * aplicarlas (no basta con localStorage del renderer):
 *
 *  - `minimizeToTray`: al cerrar la ventana, ocultar a la bandeja en lugar de
 *    terminar la aplicación.
 *  - `globalHotkeyEnabled`: registrar o no el atajo global Ctrl + Espacio.
 *
 * Se guardan en un JSON dentro de `userData` para que el arranque aplique el
 * último valor elegido por el operador antes de que cargue el renderer.
 */

const fs = require('fs');
const path = require('path');

const PREFS_FILE_NAME = 'ui-preferences.json';

const DEFAULTS = Object.freeze({
  minimizeToTray: true,
  globalHotkeyEnabled: true,
});

function preferencesPath(userDataDir) {
  return path.join(userDataDir, PREFS_FILE_NAME);
}

function asBoolean(value, fallback) {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return fallback;
}

function normalizePreferences(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  return {
    minimizeToTray: asBoolean(source.minimizeToTray, DEFAULTS.minimizeToTray),
    globalHotkeyEnabled: asBoolean(
      source.globalHotkeyEnabled,
      DEFAULTS.globalHotkeyEnabled
    ),
  };
}

/**
 * Lee las preferencias persistidas. `stored` indica si existía un archivo
 * previo; el renderer lo usa para migrar valores de versiones anteriores que
 * solo vivían en localStorage.
 */
function loadUiPreferences(userDataDir) {
  if (!userDataDir) {
    return { ...DEFAULTS, stored: false };
  }

  try {
    const file = preferencesPath(userDataDir);
    if (!fs.existsSync(file)) {
      return { ...DEFAULTS, stored: false };
    }
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    return { ...normalizePreferences(raw), stored: true };
  } catch {
    return { ...DEFAULTS, stored: false };
  }
}

/**
 * Aplica un cambio parcial y lo persiste. Si la escritura falla, devuelve el
 * estado efectivo igualmente para no bloquear la interfaz.
 */
function saveUiPreferences(userDataDir, patch) {
  const current = loadUiPreferences(userDataDir);
  const next = normalizePreferences({ ...current, ...(patch || {}) });

  if (userDataDir) {
    try {
      const file = preferencesPath(userDataDir);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      const tmp = `${file}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(next, null, 2), 'utf8');
      fs.renameSync(tmp, file);
    } catch {
      // Sin persistencia el cambio aplica solo en esta sesión.
    }
  }

  return { ...next, stored: true };
}

module.exports = {
  DEFAULTS,
  PREFS_FILE_NAME,
  normalizePreferences,
  loadUiPreferences,
  saveUiPreferences,
};
