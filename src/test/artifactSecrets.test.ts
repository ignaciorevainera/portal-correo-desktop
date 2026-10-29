import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const asarPath = path.resolve(process.cwd(), 'release', 'win-unpacked', 'resources', 'app.asar');
const asarDisponible = fs.existsSync(asarPath);

describe.skipIf(!asarDisponible)('Artefacto empaquetado sin secretos', () => {
  let cache: string[] | null = null;

  const listado = (): string[] => {
    if (cache) return cache;
    const asar = require('@electron/asar');
    const entradas: string[] = asar
      .listPackage(asarPath)
      .map((p: string) => p.replace(/^[\\/]/, '').replace(/\\/g, '/'));
    cache = entradas;
    return entradas;
  };

  it('no contiene configuración embebida', () => {
    expect(listado().some((p) => /embedded\.config\.json$/i.test(p))).toBe(false);
  });

  it('no contiene archivos .env ni configuraciones locales', () => {
    const prohibidos = listado().filter((p) => /(^|\/)\.env(\.|$)/i.test(p) || /cmda\.config/i.test(p));
    expect(prohibidos).toEqual([]);
  });

  it('incluye el visor VNC', () => {
    expect(listado().some((p) => /resources\/bin\/vncviewer\.exe$/i.test(p))).toBe(true);
  });

  it('no incluye el bootstrap local', () => {
    expect(listado().some((p) => /bootstrap\.local\.json$/i.test(p))).toBe(false);
  });

  it('el bootstrap empaquetado sólo tiene claves permitidas', () => {
    const permitidas = ['configSource', 'uncConfigPath', 'updateFeed', 'updateMirror', 'retryIntervalMs'];
    const asar = require('@electron/asar');
    const entrada = listado().find((p) => /electron\/bootstrap\.default\.json$/.test(p));

    if (!entrada) return;

    const contenido = asar.extractFile(asarPath, entrada).toString('utf8');
    const claves = Object.keys(JSON.parse(contenido));

    expect(claves.filter((clave) => !permitidas.includes(clave))).toEqual([]);
  });
});
