/**
 * Genera electron/bootstrap.default.json a partir de bootstrap.local.json (no versionado).
 * El contenido no es secreto: solo rutas internas. Se empaqueta con la aplicación.
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const sourcePath = path.join(rootDir, 'bootstrap.local.json');
const targetPath = path.join(rootDir, 'electron', 'bootstrap.default.json');

const DEFAULTS = {
  configSource: 'unc',
  uncConfigPath: '',
  updateFeed: '',
  updateMirror: '',
  retryIntervalMs: 15000,
};

const ALLOWED_KEYS = Object.keys(DEFAULTS);

function pickAllowed(raw) {
  const result = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return result;

  for (const key of ALLOWED_KEYS) {
    if (Object.prototype.hasOwnProperty.call(raw, key)) result[key] = raw[key];
  }

  const extra = Object.keys(raw).filter((key) => !ALLOWED_KEYS.includes(key));
  if (extra.length > 0) {
    console.warn(`⚠ Claves ignoradas en bootstrap.local.json: ${extra.join(', ')}`);
  }

  return result;
}

let payload = { ...DEFAULTS };

if (fs.existsSync(sourcePath)) {
  try {
    payload = { ...DEFAULTS, ...pickAllowed(JSON.parse(fs.readFileSync(sourcePath, 'utf8'))) };
    console.log('✓ bootstrap.local.json detectado');
  } catch (err) {
    console.warn(`⚠ bootstrap.local.json inválido (${err.message}); se usan valores por defecto`);
  }
} else {
  console.log('⚠ Sin bootstrap.local.json: se empaqueta sin ruta de configuración');
}

fs.writeFileSync(targetPath, JSON.stringify(payload, null, 2), 'utf8');
console.log(`✓ ${path.relative(rootDir, targetPath)} generado`);
