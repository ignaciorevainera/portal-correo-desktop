import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('updaterService (In-App Updater and GitHub Releases Client)', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('compares semantic versions correctly', async () => {
    const { compareVersions, isNewerVersion } = await import('../../electron/updaterService.cjs');

    expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
    expect(compareVersions('v1.0.1', '1.0.0')).toBe(1);
    expect(compareVersions('1.0.0', '1.1.0')).toBe(-1);
    expect(compareVersions('2.0.0', '1.9.9')).toBe(1);
    expect(compareVersions('1.0.0-beta.1', '1.0.0')).toBe(-1);

    expect(isNewerVersion('v1.1.0', '1.0.0')).toBe(true);
    expect(isNewerVersion('1.0.0', '1.0.0')).toBe(false);
    expect(isNewerVersion('0.9.9', '1.0.0')).toBe(false);
  });

  it('usa feedUrl cuando el bootstrap lo define, ignorando owner/repo', async () => {
    const { checkForUpdates } = await import('../../electron/updaterService.cjs');

    const mockFetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ tag_name: 'v1.0.0', assets: [] }),
    });

    await checkForUpdates({
      currentVersion: '1.0.0',
      feedUrl: 'https://api.github.com/repos/otra-org/otro-repo/releases/latest',
      fetcher: mockFetcher,
    });

    expect(mockFetcher).toHaveBeenCalledWith('https://api.github.com/repos/otra-org/otro-repo/releases/latest');
  });

  it('cae al repositorio por defecto cuando no hay feedUrl', async () => {
    const { checkForUpdates } = await import('../../electron/updaterService.cjs');

    const mockFetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ tag_name: 'v1.0.0', assets: [] }),
    });

    await checkForUpdates({ currentVersion: '1.0.0', fetcher: mockFetcher });

    expect(mockFetcher).toHaveBeenCalledWith(
      'https://api.github.com/repos/ignaciorevainera/portal-correo-desktop/releases/latest'
    );
  });

  it('queries GitHub Releases API and detects updates with assets', async () => {
    const { checkForUpdates } = await import('../../electron/updaterService.cjs');

    const mockRelease = {
      tag_name: 'v1.1.0',
      name: 'Portal Correo Desktop v1.1.0',
      body: '## Novedades\n- Soporte para escáner de subred\n- Atajo global Ctrl+Espacio',
      published_at: '2026-10-25T12:00:00Z',
      assets: [
        {
          name: 'PortalCorreoDesktop-Setup-1.1.0.exe',
          browser_download_url: 'https://github.com/mock-org/new-CMDA/releases/download/v1.1.0/PortalCorreoDesktop-Setup-1.1.0.exe',
          size: 85000000,
        },
        {
          name: 'PortalCorreoDesktop-1.1.0-portable.exe',
          browser_download_url: 'https://github.com/mock-org/new-CMDA/releases/download/v1.1.0/PortalCorreoDesktop-1.1.0-portable.exe',
          size: 78000000,
        },
      ],
    };

    const mockFetcher = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockRelease,
    });

    const result = await (checkForUpdates as any)({
      currentVersion: '1.0.0',
      repoOwner: 'mock-org',
      repoName: 'new-CMDA',
      fetcher: mockFetcher,
    });

    expect(result.hasUpdate).toBe(true);
    expect(result.latestVersion).toBe('1.1.0');
    expect(result.releaseNotes).toContain('Soporte para escáner de subred');
    expect(result.downloadUrl).toBe(
      'https://github.com/mock-org/new-CMDA/releases/download/v1.1.0/PortalCorreoDesktop-Setup-1.1.0.exe'
    );
    expect(result.portableDownloadUrl).toBe(
      'https://github.com/mock-org/new-CMDA/releases/download/v1.1.0/PortalCorreoDesktop-1.1.0-portable.exe'
    );
  });

  it('reports hasUpdate: false when already on the latest or higher version', async () => {
    const { checkForUpdates } = await import('../../electron/updaterService.cjs');

    const mockRelease = {
      tag_name: 'v1.0.0',
      name: 'Release 1.0.0',
      body: 'Initial release',
      assets: [],
    };

    const mockFetcher = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockRelease,
    });

    const result = await (checkForUpdates as any)({
      currentVersion: '1.0.0',
      repoOwner: 'mock-org',
      repoName: 'new-CMDA',
      fetcher: mockFetcher,
    });

    expect(result.hasUpdate).toBe(false);
    expect(result.latestVersion).toBe('1.0.0');
  });

  it('handles network or rate limit errors gracefully without crashing', async () => {
    const { checkForUpdates } = await import('../../electron/updaterService.cjs');

    const mockFetcher = vi.fn().mockRejectedValue(new Error('Network offline or DNS error'));

    const result = await (checkForUpdates as any)({
      currentVersion: '1.0.0',
      repoOwner: 'mock-org',
      repoName: 'new-CMDA',
      fetcher: mockFetcher,
    });

    expect(result.hasUpdate).toBe(false);
    expect(result.error).toContain('Network offline or DNS error');
  });

  it('calcula el SHA-256 de un archivo descargado', async () => {
    const { computeFileSha256 } = await import('../../electron/updaterService.cjs');

    const fs = require('fs');
    const os = require('os');
    const path = require('path');
    const archivo = path.join(os.tmpdir(), `pcd_hash_${Date.now()}.bin`);
    fs.writeFileSync(archivo, 'contenido de prueba');

    const hash = computeFileSha256(archivo);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    fs.unlinkSync(archivo);
  });

  it('rechaza un archivo cuyo hash no coincide', async () => {
    const { computeFileSha256, verifyFileSha256 } = await import('../../electron/updaterService.cjs');

    const fs = require('fs');
    const os = require('os');
    const path = require('path');
    const archivo = path.join(os.tmpdir(), `pcd_hash_bad_${Date.now()}.bin`);
    fs.writeFileSync(archivo, 'contenido de prueba');

    expect(verifyFileSha256(archivo, 'a'.repeat(64))).toBe(false);
    const real = computeFileSha256(archivo);
    expect(verifyFileSha256(archivo, real)).toBe(true);
    fs.unlinkSync(archivo);
  });

  it('interpreta el archivo .sha256 publicado', async () => {
    const { parseChecksumFile } = await import('../../electron/updaterService.cjs');

    expect(parseChecksumFile('  ABCDEF123  Portal Correo Desktop Setup 1.0.0.exe\n')).toBe('abcdef123');
    expect(parseChecksumFile('')).toBe('');
  });
});
