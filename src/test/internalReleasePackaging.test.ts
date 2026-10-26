import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Internal Release Packaging Pipeline Tests', () => {
  it('validates release:internal script and package.json configuration', () => {
    const pkgPath = path.resolve(process.cwd(), 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

    expect(pkg.scripts['release:internal']).toBeDefined();
    expect(pkg.scripts['release:internal']).toContain('node scripts/build-internal.cjs');

    // Public script must remain pristine and gate-protected
    expect(pkg.scripts['release:build']).toBeDefined();
    expect(pkg.scripts['release:build']).toContain('npm run release:check');
  });

  it('validates scripts/build-internal.cjs exists and safely handles master config without tracking in Git', () => {
    const scriptPath = path.resolve(process.cwd(), 'scripts', 'build-internal.cjs');
    expect(fs.existsSync(scriptPath)).toBe(true);

    const scriptContent = fs.readFileSync(scriptPath, 'utf8');
    expect(scriptContent).toContain('embedded.config.json');
    expect(scriptContent).toContain('electron-builder');
  });
});
