import { describe, it, expect } from 'vitest';

const { getLegacyTargets, migrateLegacyConfig } = require('../../electron/migration.cjs');

describe('migración de configuración heredada', () => {
  it('compone las rutas heredadas de userData, ejecutable y raíz de la app', () => {
    const targets = getLegacyTargets({
      userDataDir: 'C:\\Users\\op\\AppData\\Roaming\\portal-correo-desktop',
      exeDir: 'C:\\Program Files\\Portal Correo Desktop',
      appRoot: 'C:\\app',
    });

    expect(targets).toContain('C:\\Users\\op\\AppData\\Roaming\\portal-correo-desktop\\cmda.config.json');
    expect(targets).toContain('C:\\Program Files\\Portal Correo Desktop\\cmda.config.json');
    expect(targets).toContain('C:\\app\\.env');
  });

  it('elimina los archivos existentes e informa cuántos', () => {
    const existentes = new Set(['C:\\app\\.env', 'C:\\app\\cmda.config.local.json']);
    const eliminados: string[] = [];

    const result = migrateLegacyConfig({
      userDataDir: 'C:\\ud',
      exeDir: 'C:\\exe',
      appRoot: 'C:\\app',
      existsSync: (p: string) => existentes.has(p),
      unlinkSync: (p: string) => {
        eliminados.push(p);
        existentes.delete(p);
      },
    });

    expect(result.removed.sort()).toEqual(['C:\\app\\.env', 'C:\\app\\cmda.config.local.json'].sort());
    expect(eliminados).toHaveLength(2);
  });

  it('no falla si el archivo está bloqueado', () => {
    const result = migrateLegacyConfig({
      userDataDir: 'C:\\ud',
      exeDir: 'C:\\exe',
      appRoot: 'C:\\app',
      existsSync: () => true,
      unlinkSync: () => {
        throw new Error('EBUSY');
      },
    });

    expect(result.removed).toEqual([]);
  });

  it('no repite rutas duplicadas', () => {
    const targets = getLegacyTargets({
      userDataDir: 'C:\\app',
      exeDir: 'C:\\app',
      appRoot: 'C:\\app',
    });

    const unicos = new Set(targets);
    expect(unicos.size).toBe(targets.length);
  });
});
