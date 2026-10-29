const fs = require('fs');
const path = require('path');

const LEGACY_FILES = ['cmda.config.json', 'cmda.config.local.json'];

function getLegacyTargets({ userDataDir, exeDir, appRoot } = {}) {
  const targets = [];

  if (userDataDir) {
    for (const file of LEGACY_FILES) targets.push(path.join(userDataDir, file));
  }
  if (exeDir) {
    for (const file of LEGACY_FILES) targets.push(path.join(exeDir, file));
  }
  if (appRoot) {
    targets.push(path.join(appRoot, '.env'));
    targets.push(path.join(appRoot, 'cmda.config.local.json'));
  }

  return [...new Set(targets)];
}

function migrateLegacyConfig(options = {}) {
  const {
    userDataDir,
    exeDir,
    appRoot,
    existsSync = fs.existsSync,
    unlinkSync = fs.unlinkSync,
    logger = null,
  } = options;

  const removed = [];

  for (const file of getLegacyTargets({ userDataDir, exeDir, appRoot })) {
    try {
      if (!existsSync(file)) continue;
      unlinkSync(file);
      removed.push(file);
    } catch (err) {
      if (logger) logger.warn('No se pudo eliminar configuración heredada', { file, error: err && err.message });
    }
  }

  if (removed.length > 0 && logger) {
    logger.info('Configuración heredada eliminada', { count: removed.length });
  }

  return { removed };
}

module.exports = { LEGACY_FILES, getLegacyTargets, migrateLegacyConfig };
