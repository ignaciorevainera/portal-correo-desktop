import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const asarPath = path.resolve(process.cwd(), 'release', 'win-unpacked', 'resources', 'app.asar');
const asarDisponible = fs.existsSync(asarPath);

describe.skipIf(!asarDisponible)('Artefacto empaquetado sin secretos', () => {
  const listado = (() => {
    const asar = require('@electron/asar');
    return asar.listPackage(asarPath).map((p: string) => p.replace(/^[\\/]/, '').replace(/\\/g, '/'));
  })();

  it('no contiene configuración embebida', () => {
    expect(listado.some((p: string) => /embedded\.config\.json$/i.test(p))).toBe(false);
  });

  it('no contiene archivos .env ni configuraciones locales', () => {
    const prohibidos = listado.filter((p: string) => /(^|\/)\.env(\.|$)/i.test(p) || /cmda\.config/i.test(p));
    expect(prohibidos).toEqual([]);
  });

  it('incluye el visor VNC', () => {
    expect(listado.some((p: string) => /resources\/bin\/vncviewer\.exe$/i.test(p))).toBe(true);
  });

  it('no incluye el bootstrap local', () => {
    expect(listado.some((p: string) => /bootstrap\.local\.json$/i.test(p))).toBe(false);
  });
});
