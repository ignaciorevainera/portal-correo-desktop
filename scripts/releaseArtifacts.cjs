const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function sha256OfFile(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

/**
 * Vacía el directorio de salida para que nunca queden artefactos de otras versiones.
 */
function cleanRelease(dir) {
  if (!fs.existsSync(dir)) return { removed: 0 };

  let removed = 0;
  for (const entry of fs.readdirSync(dir)) {
    fs.rmSync(path.join(dir, entry), { recursive: true, force: true });
    removed += 1;
  }

  return { removed };
}

/**
 * Genera un .sha256 por cada .exe y elimina los checksums huérfanos
 * (de versiones anteriores que ya no tienen su ejecutable).
 */
function writeChecksums(dir) {
  if (!fs.existsSync(dir)) {
    throw new Error(`No existe el directorio de artefactos: ${dir}`);
  }

  const entries = fs.readdirSync(dir);
  const exes = entries.filter((name) => name.toLowerCase().endsWith('.exe'));

  if (exes.length === 0) {
    throw new Error('No hay ejecutables para calcular checksums');
  }

  const generated = new Set();
  const checksums = [];

  for (const name of exes) {
    const full = path.join(dir, name);
    const hash = sha256OfFile(full);
    fs.writeFileSync(`${full}.sha256`, `${hash}  ${name}\n`, 'ascii');
    generated.add(`${name}.sha256`);
    checksums.push({ name, hash });
  }

  const orphans = entries.filter(
    (name) => name.toLowerCase().endsWith('.sha256') && !generated.has(name)
  );

  for (const name of orphans) {
    fs.rmSync(path.join(dir, name), { force: true });
  }

  return { checksums, orphans: orphans.length };
}

module.exports = { sha256OfFile, cleanRelease, writeChecksums };
