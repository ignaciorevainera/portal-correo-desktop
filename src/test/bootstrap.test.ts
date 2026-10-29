import { describe, it, expect } from 'vitest';

const { DEFAULTS, getBootstrapPath, normalizeBootstrap, loadBootstrap } = require('../../electron/bootstrap.cjs');

describe('bootstrap de máquina', () => {
  it('compone la ruta dentro de ProgramData con la nomenclatura del producto', () => {
    const ruta = getBootstrapPath('C:\\ProgramData');
    expect(ruta).toContain('portal-correo-desktop');
    expect(ruta.endsWith('bootstrap.json')).toBe(true);
  });

  it('normaliza valores faltantes sobre los defaults', () => {
    const cfg = normalizeBootstrap({ uncConfigPath: '\\\\host\\share\\portal-correo-desktop.config.json' });
    expect(cfg.configSource).toBe('unc');
    expect(cfg.uncConfigPath).toBe('\\\\host\\share\\portal-correo-desktop.config.json');
    expect(cfg.retryIntervalMs).toBe(DEFAULTS.retryIntervalMs);
  });

  it('prioriza ProgramData sobre el directorio del ejecutable', () => {
    const archivos: Record<string, string> = {
      'C:\\ProgramData\\portal-correo-desktop\\bootstrap.json': JSON.stringify({ uncConfigPath: '\\\\host\\desde-programdata' }),
      'C:\\App\\bootstrap.json': JSON.stringify({ uncConfigPath: '\\\\host\\desde-exe' }),
    };

    const cfg = loadBootstrap({
      programDataDir: 'C:\\ProgramData',
      exeDir: 'C:\\App',
      existsSync: (p: string) => Boolean(archivos[p]),
      readFileSync: (p: string) => archivos[p],
    });

    expect(cfg.uncConfigPath).toBe('\\\\host\\desde-programdata');
    expect(cfg._found).toBe(true);
  });

  it('cae al directorio del ejecutable si ProgramData no tiene archivo', () => {
    const archivos: Record<string, string> = {
      'C:\\App\\bootstrap.json': JSON.stringify({ uncConfigPath: '\\\\host\\desde-exe' }),
    };

    const cfg = loadBootstrap({
      programDataDir: 'C:\\ProgramData',
      exeDir: 'C:\\App',
      existsSync: (p: string) => Boolean(archivos[p]),
      readFileSync: (p: string) => archivos[p],
    });

    expect(cfg.uncConfigPath).toBe('\\\\host\\desde-exe');
  });

  it('devuelve defaults y _found=false cuando no hay archivo', () => {
    const cfg = loadBootstrap({
      programDataDir: 'C:\\ProgramData',
      exeDir: 'C:\\App',
      existsSync: () => false,
      readFileSync: () => '',
    });

    expect(cfg._found).toBe(false);
    expect(cfg.uncConfigPath).toBe('');
    expect(cfg.retryIntervalMs).toBe(DEFAULTS.retryIntervalMs);
  });

  it('ignora un archivo corrupto y sigue con el siguiente candidato', () => {
    const archivos: Record<string, string> = {
      'C:\\ProgramData\\portal-correo-desktop\\bootstrap.json': '{ esto no es json',
      'C:\\App\\bootstrap.json': JSON.stringify({ uncConfigPath: '\\\\host\\valido' }),
    };

    const cfg = loadBootstrap({
      programDataDir: 'C:\\ProgramData',
      exeDir: 'C:\\App',
      existsSync: (p: string) => Boolean(archivos[p]),
      readFileSync: (p: string) => archivos[p],
    });

    expect(cfg.uncConfigPath).toBe('\\\\host\\valido');
  });
});
