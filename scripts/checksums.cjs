/**
 * Genera un .sha256 por cada ejecutable de release/ y limpia los huérfanos.
 * El actualizador pide `<url del exe>.sha256`, así que el nombre debe coincidir.
 */

const path = require('path');
const { writeChecksums } = require('./releaseArtifacts.cjs');

const releaseDir = path.resolve(__dirname, '..', 'release');

try {
  const { checksums, orphans } = writeChecksums(releaseDir);

  for (const { name, hash } of checksums) {
    console.log(`✓ ${name}.sha256  ${hash}`);
  }

  if (orphans > 0) {
    console.log(`✓ ${orphans} checksum(s) huérfano(s) eliminado(s)`);
  }

  console.log(`Listo: ${checksums.length} checksum(s) en release/`);
} catch (err) {
  console.error(`✗ ${err.message}`);
  process.exit(1);
}
