import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Empaquetado sin configuración embebida', () => {
  const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf8'));

  it('ya no existe el script de empaquetado con configuración embebida', () => {
    expect(pkg.scripts['release:internal']).toBeUndefined();
    expect(fs.existsSync(path.resolve(process.cwd(), 'scripts', 'build-internal.cjs'))).toBe(false);
  });

  it('el script público de release sigue protegido por el gate de verificación', () => {
    expect(pkg.scripts['release:build']).toBeDefined();
    expect(pkg.scripts['release:build']).toContain('npm run release:check');
    expect(pkg.scripts['release:build']).toContain('electron-builder');
  });

  it('no queda ningún archivo de configuración embebida en electron/', () => {
    const electronDir = path.resolve(process.cwd(), 'electron');
    const archivos = fs.readdirSync(electronDir);
    expect(archivos).not.toContain('embedded.config.json');
  });

  it('incluye el visor VNC y los recursos en el paquete', () => {
    expect(pkg.build.files).toContain('resources/**/*');
    expect(pkg.build.files).toContain('public/**/*');
  });

  it('el build prepara el bootstrap por defecto y los archivos locales están ignorados', () => {
    expect(pkg.scripts['release:build']).toContain('prepare-bootstrap');

    const gitignore = fs.readFileSync(path.resolve(process.cwd(), '.gitignore'), 'utf8');
    expect(gitignore).toContain('bootstrap.local.json');
    expect(gitignore).toContain('electron/bootstrap.default.json');
  });
});
