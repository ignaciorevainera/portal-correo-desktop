import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Release Pipeline & Zero-Secrets Gate Test', () => {
  it('validates package.json contains dual packaging build configuration and release:check script', () => {
    const pkgPath = path.resolve(process.cwd(), 'package.json');
    const pkgContent = fs.readFileSync(pkgPath, 'utf8');
    const pkg = JSON.parse(pkgContent);

    // Verify scripts
    expect(pkg.scripts).toBeDefined();
    expect(pkg.scripts['release:check']).toBeDefined();
    expect(pkg.scripts['release:check']).toContain('securityAudit.test.ts');
    expect(pkg.scripts['release:check']).toContain('npm run build');

    expect(pkg.scripts['release:build']).toBeDefined();
    expect(pkg.scripts['release:build']).toContain('npm run release:check');
    expect(pkg.scripts['release:build']).toContain('electron-builder');

    // Verify electron-builder build config
    expect(pkg.build).toBeDefined();
    expect(pkg.build.appId).toBe('com.correoargentino.portalcorreodesktop');
    expect(pkg.build.productName).toBe('Portal Correo Desktop');
    expect(pkg.build.directories?.output).toBe('release');
    expect(pkg.build.win).toBeDefined();
    expect(pkg.build.win.target).toContain('nsis');
    expect(pkg.build.win.target).toContain('portable');
  });
});
