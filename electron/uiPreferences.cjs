/**
 * Preferencias de interfaz que el proceso principal necesita conocer para
 * aplicarlas (no basta con localStorage del renderer):
 *
 *  - `minimizeToTray`: al cerrar la ventana, ocultar a la bandeja en lugar de
 *    terminar la aplicación.
 *  - `globalHotkeyEnabled`: registrar o no el atajo global Ctrl + Espacio.
 *  - `textScale`: escala de visualización / texto ("100" | "110" | "120" | "130").
 *  - `highContrast`: modo de alto contraste reforzado.
 *
 * Se guardan en un JSON dentro de `userData` para que el arranque aplique el
 * último valor elegido por el operador antes de que cargue el renderer.
 */

const fs = require('fs');
const path = require('path');

const PREFS_FILE_NAME = 'ui-preferences.json';

const VALID_TEXT_SCALES = Object.freeze(['100', '110', '120', '130']);

const DEFAULTS = Object.freeze({
  minimizeToTray: true,
  globalHotkeyEnabled: true,
  textScale: '100',
  highContrast: false,
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

function asTextScale(value, fallback) {
  if (typeof value === 'string' && VALID_TEXT_SCALES.includes(value)) {
    return value;
  }
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
    textScale: asTextScale(source.textScale, DEFAULTS.textScale),
    highContrast: asBoolean(source.highContrast, DEFAULTS.highContrast),
  };
}

/**
 * Lee las preferencias persistidas. `stored` indica si existía un archivo
 * previo; el renderer lo usa para migrar valores de versiones anteriores que
 * solo vivían en localStorage.
 */
function scaleToZoomFactor(scale) {
  switch (scale) {
    case '110': return 1.1;
    case '120': return 1.2;
    case '130': return 1.3;
    case '100':
    default:
      return 1.0;
  }
}

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
  VALID_TEXT_SCALES,
  normalizePreferences,
  loadUiPreferences,
  saveUiPreferences,
  scaleToZoomFactor,
};
