import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relative: string) =>
  fs.readFileSync(path.join(root, relative), 'utf8');

describe('monitor surface security', () => {
  it('el preload del monitor expone solo la API mínima', () => {
    const preload = read('electron/monitor-preload.cjs');

    expect(preload).toContain("exposeInMainWorld('monitorAPI'");
    expect(preload).toContain('getContext');
    expect(preload).toContain('connectRemote');
    expect(preload).not.toContain('launchVnc');
    expect(preload).not.toContain('launchMsra');
    expect(preload).not.toContain("require('fs')");
    expect(preload).not.toContain("require('child_process')");
  });

  it('la ventana del monitor usa aislamiento y deniega ventanas nuevas', () => {
    const source = read('electron/monitorWindows.cjs');

    expect(source).toContain('contextIsolation: true');
    expect(source).toContain('nodeIntegration: false');
    expect(source).toContain('setWindowOpenHandler');
    expect(source).toContain('will-navigate');
  });

  it('monitor.html es una entrada Vite con tema previo al paint', () => {
    const html = read('monitor.html');
    expect(html).toContain('/src/monitor.tsx');
    expect(html).toContain('pcd-theme');

    const vite = read('vite.config.ts');
    expect(vite).toContain('monitor.html');
    expect(vite).toContain('monitor:');
  });
});
