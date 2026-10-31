import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';

const { sha256OfFile, cleanRelease, writeChecksums } = require('../../scripts/releaseArtifacts.cjs');

describe('artefactos de release', () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pcd-release-'));
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('calcula el sha256 de un archivo', () => {
    const archivo = path.join(dir, 'a.bin');
    fs.writeFileSync(archivo, 'contenido');
    expect(sha256OfFile(archivo)).toMatch(/^[a-f0-9]{64}$/);
  });

  it('genera un checksum por ejecutable', () => {
    fs.writeFileSync(path.join(dir, 'App Setup 1.0.0.exe'), 'instalador');
    fs.writeFileSync(path.join(dir, 'App-Portable-1.0.0.exe'), 'portable');
    fs.writeFileSync(path.join(dir, 'latest.yml'), 'no es exe');

    const { checksums, orphans } = writeChecksums(dir);

    expect(checksums).toHaveLength(2);
    expect(orphans).toBe(0);
    expect(fs.existsSync(path.join(dir, 'App Setup 1.0.0.exe.sha256'))).toBe(true);
    expect(fs.existsSync(path.join(dir, 'App-Portable-1.0.0.exe.sha256'))).toBe(true);
    expect(fs.existsSync(path.join(dir, 'latest.yml.sha256'))).toBe(false);
  });

  it('escribe el checksum con el formato que espera el actualizador', () => {
    fs.writeFileSync(path.join(dir, 'App Setup 1.0.0.exe'), 'instalador');
    writeChecksums(dir);

    const contenido = fs.readFileSync(path.join(dir, 'App Setup 1.0.0.exe.sha256'), 'utf8');
    expect(contenido).toMatch(/^[a-f0-9]{64} {2}App Setup 1\.0\.0\.exe\n$/);
  });

  it('elimina checksums huérfanos de versiones anteriores', () => {
    fs.writeFileSync(path.join(dir, 'App Setup 2.0.0.exe'), 'nuevo');
    fs.writeFileSync(path.join(dir, 'App Setup 1.0.0.exe.sha256'), 'viejo');
    fs.writeFileSync(path.join(dir, 'App-Portable-0.9.0.exe.sha256'), 'viejo');

    const { orphans } = writeChecksums(dir);

    expect(orphans).toBe(2);
    expect(fs.existsSync(path.join(dir, 'App Setup 1.0.0.exe.sha256'))).toBe(false);
    expect(fs.existsSync(path.join(dir, 'App-Portable-0.9.0.exe.sha256'))).toBe(false);
    expect(fs.existsSync(path.join(dir, 'App Setup 2.0.0.exe.sha256'))).toBe(true);
  });

  it('falla si no hay ejecutables', () => {
    fs.writeFileSync(path.join(dir, 'latest.yml'), 'sin exe');
    expect(() => writeChecksums(dir)).toThrow(/No hay ejecutables/);
  });

  it('falla si el directorio no existe', () => {
    expect(() => writeChecksums(path.join(dir, 'inexistente'))).toThrow(/No existe el directorio/);
  });

  it('limpia todo el contenido del directorio de release', () => {
    fs.writeFileSync(path.join(dir, 'App Setup 1.0.0.exe'), 'x');
    fs.mkdirSync(path.join(dir, 'win-unpacked'));

    const { removed } = cleanRelease(dir);

    expect(removed).toBe(2);
    expect(fs.readdirSync(dir)).toEqual([]);
  });

  it('no falla si el directorio no existe al limpiar', () => {
    expect(cleanRelease(path.join(dir, 'inexistente'))).toEqual({ removed: 0 });
  });
});
