/**
 * Vacía release/ antes de empaquetar, para que la carpeta nunca mezcle
 * artefactos de distintas versiones.
 */

const path = require('path');
const { cleanRelease } = require('./releaseArtifacts.cjs');

const releaseDir = path.resolve(__dirname, '..', 'release');

const { removed } = cleanRelease(releaseDir);
console.log(`✓ release/ limpio (${removed} elemento(s) eliminado(s))`);
