const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

/**
 * Normaliza y divide una versión semántica (ej. "v1.2.3-beta" -> { major, minor, patch, prerelease })
 */
function parseSemver(ver) {
  if (!ver || typeof ver !== 'string') {
    return { major: 0, minor: 0, patch: 0, prerelease: '' };
  }
  const clean = ver.trim().replace(/^v/i, '');
  const [versionPart, prereleasePart] = clean.split('-');
  const [major = '0', minor = '0', patch = '0'] = versionPart.split('.');

  return {
    major: parseInt(major, 10) || 0,
    minor: parseInt(minor, 10) || 0,
    patch: parseInt(patch, 10) || 0,
    prerelease: prereleasePart || '',
  };
}

/**
 * Compara dos versiones semánticas.
 * Retorna:
 *  1 si v1 > v2
 * -1 si v1 < v2
 *  0 si son iguales
 */
function compareVersions(v1, v2) {
  const p1 = parseSemver(v1);
  const p2 = parseSemver(v2);

  if (p1.major !== p2.major) return p1.major > p2.major ? 1 : -1;
  if (p1.minor !== p2.minor) return p1.minor > p2.minor ? 1 : -1;
  if (p1.patch !== p2.patch) return p1.patch > p2.patch ? 1 : -1;

  // Manejo de prerelease: una versión con prerelease es menor que la misma sin prerelease
  if (p1.prerelease && !p2.prerelease) return -1;
  if (!p1.prerelease && p2.prerelease) return 1;
  if (p1.prerelease && p2.prerelease) {
    return p1.prerelease.localeCompare(p2.prerelease);
  }

  return 0;
}

function isNewerVersion(remoteVer, currentVer) {
  return compareVersions(remoteVer, currentVer) > 0;
}

/**
 * Consulta la API pública de GitHub Releases
 */
async function checkForUpdates({
  currentVersion = '1.0.0',
  repoOwner = 'correoargentino',
  repoName = 'new-CMDA',
  fetcher = null,
} = {}) {
  const apiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/releases/latest`;

  try {
    let data;
    if (fetcher) {
      const resp = await fetcher(apiUrl);
      if (!resp.ok) {
        throw new Error(`GitHub API HTTP ${resp.status}`);
      }
      data = await resp.json();
    } else {
      // Uso de fetch nativo de Node.js 18+ o https fallback
      const headers = {
        'User-Agent': 'PortalCorreoDesktop-AutoUpdater',
        'Accept': 'application/vnd.github.v3+json',
      };
      const response = await fetch(apiUrl, { headers });
      if (!response.ok) {
        throw new Error(`GitHub API HTTP ${response.status}`);
      }
      data = await response.json();
    }

    const latestVersion = (data.tag_name || '').replace(/^v/i, '');
    const hasUpdate = isNewerVersion(latestVersion, currentVersion);

    // Buscar assets ejecutables (.exe)
    const assets = Array.isArray(data.assets) ? data.assets : [];
    let downloadUrl = '';
    let portableDownloadUrl = '';
    let downloadSize = 0;

    for (const asset of assets) {
      const name = (asset.name || '').toLowerCase();
      if (name.includes('setup') && name.endsWith('.exe')) {
        downloadUrl = asset.browser_download_url;
        downloadSize = asset.size || 0;
      } else if (name.includes('portable') && name.endsWith('.exe')) {
        portableDownloadUrl = asset.browser_download_url;
      } else if (name.endsWith('.exe') && !downloadUrl) {
        downloadUrl = asset.browser_download_url;
        downloadSize = asset.size || 0;
      }
    }

    return {
      hasUpdate,
      currentVersion,
      latestVersion: latestVersion || currentVersion,
      releaseName: data.name || `Versión ${latestVersion}`,
      releaseNotes: data.body || '',
      publishedAt: data.published_at || '',
      downloadUrl,
      portableDownloadUrl,
      downloadSize,
      error: null,
    };
  } catch (err) {
    return {
      hasUpdate: false,
      currentVersion,
      latestVersion: currentVersion,
      error: err.message || 'Error al consultar actualizaciones en GitHub',
    };
  }
}

/**
 * Descarga el archivo de actualización a una carpeta temporal con reporte de progreso
 */
function downloadUpdateFile(fileUrl, destPath, onProgress, onComplete, onError) {
  try {
    const file = fs.createWriteStream(destPath);
    const client = fileUrl.startsWith('https') ? https : http;

    const request = client.get(fileUrl, { headers: { 'User-Agent': 'PortalCorreoDesktop-AutoUpdater' } }, (response) => {
      // Manejo de redirecciones GitHub (302)
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        file.close();
        try { fs.unlinkSync(destPath); } catch {}
        return downloadUpdateFile(response.headers.location, destPath, onProgress, onComplete, onError);
      }

      if (response.statusCode !== 200) {
        file.close();
        try { fs.unlinkSync(destPath); } catch {}
        return onError(new Error(`Error de descarga HTTP ${response.statusCode}`));
      }

      const totalBytes = parseInt(response.headers['content-length'] || '0', 10);
      let receivedBytes = 0;

      response.on('data', (chunk) => {
        receivedBytes += chunk.length;
        if (totalBytes > 0 && typeof onProgress === 'function') {
          const percent = Math.min(100, Math.round((receivedBytes / totalBytes) * 100));
          onProgress({ receivedBytes, totalBytes, percent });
        }
      });

      response.pipe(file);

      file.on('finish', () => {
        file.close(() => {
          if (typeof onComplete === 'function') {
            onComplete(destPath);
          }
        });
      });
    });

    request.on('error', (err) => {
      file.close();
      try { fs.unlinkSync(destPath); } catch {}
      if (typeof onError === 'function') onError(err);
    });
  } catch (err) {
    if (typeof onError === 'function') onError(err);
  }
}

module.exports = {
  parseSemver,
  compareVersions,
  isNewerVersion,
  checkForUpdates,
  downloadUpdateFile,
};
