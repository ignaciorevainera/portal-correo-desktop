const { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage, globalShortcut, clipboard, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const dbService = require('./dbService.cjs');
const configManager = require('./configManager.cjs');
const systemTools = require('./systemTools.cjs');
const dnsResolver = require('./dnsResolver.cjs');
const { parseClipboardQuery } = require('./clipboardParser.cjs');
const { generateSubnetRange, scanSubnetBatch } = require('./subnetScanner.cjs');
const { checkForUpdates, downloadUpdateFile } = require('./updaterService.cjs');

let tray = null;
let activePingProcess = null;
let activeSubnetAbortController = null;
let downloadedInstallerPath = null;

function getUserDataConfigPath() {
  return path.join(app.getPath('userData'), 'cmda.config.json');
}

function getAdjacentExeConfigPath() {
  return path.join(path.dirname(process.execPath), 'cmda.config.json');
}

function autoDiscoverCorporateConfig() {
  // Check if installer injected an embedded configuration in the application bundle
  const embeddedPath = path.join(__dirname, 'embedded.config.json');
  if (fs.existsSync(embeddedPath)) {
    try {
      const destUserData = getUserDataConfigPath();
      if (!fs.existsSync(destUserData)) {
        fs.copyFileSync(embeddedPath, destUserData);
        console.log('[CorporateConfig] Embedded config initialized into UserData');
      }
    } catch (e) {
      console.warn('[CorporateConfig] Failed to copy embedded config:', e.message);
    }
  }
  try {
    const loaded = configManager.loadFromHierarchicalPaths({
      appDataPath: getUserDataConfigPath(),
      exeDirPath: getAdjacentExeConfigPath(),
    });
    if (loaded && loaded.dbServer) {
      console.log('[CorporateConfig] Autodiscovered config successfully');
    }
  } catch (err) {
    console.warn('[CorporateConfig] Autodiscovery error:', err.message);
  }
}
autoDiscoverCorporateConfig();

app.isQuiting = false;

function getAppIconPath() {
  const winIco = path.join(__dirname, '../public/windows/icon.ico');
  if (fs.existsSync(winIco)) {
    return winIco;
  }
  const rootFavicon = path.join(__dirname, '../public/favicon.ico');
  if (fs.existsSync(rootFavicon)) {
    return rootFavicon;
  }
  const rootPng = path.join(__dirname, '../public/icon.png');
  if (fs.existsSync(rootPng)) {
    return rootPng;
  }
  return null;
}

function getTrayIcon() {
  const iconPath = getAppIconPath();
  if (iconPath) {
    return nativeImage.createFromPath(iconPath);
  }
  return nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAXElEQVR42mNkQAO/gZgBiBkYGBg+/vvH8J8Zf4aT+f8Zfipj+L+dgeE/E4qhn8j+g2n+b8hAjP/Ihv3/f4wUo4EYhM/CwMCgz8DA8J+RfP/TynA0DEYNAACb2y/X2bL3nQAAAABJRU5ErkJggg=='
  );
}

function createTray(win) {
  if (tray) return;
  tray = new Tray(getTrayIcon());
  tray.setToolTip('Portal Correo Desktop - Monitoreo e Inventario de Estaciones');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Abrir Portal Correo Desktop',
      click: () => {
        if (win) {
          win.show();
          win.focus();
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Cerrar',
      click: () => {
        app.isQuiting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (win) {
      if (win.isVisible()) {
        win.focus();
      } else {
        win.show();
        win.focus();
      }
    }
  });

  tray.on('double-click', () => {
    if (win) {
      win.show();
      win.focus();
    }
  });
}

function createWindow() {
  const iconPath = getAppIconPath();
  const win = new BrowserWindow({
    width: 1020,
    height: 680,
    minWidth: 900,
    minHeight: 600,
    maxWidth: 1200,
    maxHeight: 800,
    resizable: true,
    maximizable: false,
    fullscreenable: false,
    backgroundColor: '#0f172a',
    frame: false,
    autoHideMenuBar: true,
    ...(iconPath ? { icon: iconPath } : {}),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'Portal Correo Desktop - Monitoreo e Inventario de Estaciones',
  });

  createTray(win);

  win.on('close', (event) => {
    if (!app.isQuiting) {
      event.preventDefault();
      win.hide();
      return false;
    }
  });

  win.hookWindowMessage(0x0116, () => {
    win.setEnabled(false);
    setTimeout(() => {
      win.setEnabled(true);
    }, 100);
    return true;
  });

  const isDev = !app.isPackaged || process.env.NODE_ENV === 'development';
  const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
  if (isDev) {
    win.loadURL(devUrl).catch(() => {
      win.loadFile(path.join(__dirname, '../dist/index.html'));
    });
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html')).catch(() => {
      win.loadURL(devUrl);
    });
  }

  return win;
}

// Window Controls & External Link IPC Handlers
ipcMain.handle('cmda:window-minimize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.minimize();
});

ipcMain.handle('cmda:window-maximize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  }
});

ipcMain.handle('cmda:window-close', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.close();
});

ipcMain.handle('cmda:window-hide-tray', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.hide();
});

ipcMain.handle('cmda:open-external', async (_event, url) => {
  if (url && typeof url === 'string') {
    await shell.openExternal(url);
  }
});

// Operational IPC Handlers (Direct access without lock screen)
ipcMain.handle('cmda:security-status', async () => {
  return { authorized: true, reason: 'AUTHORIZED', message: 'Acceso directo habilitado' };
});

ipcMain.handle('cmda:security-unlock', async () => {
  return { authorized: true, reason: 'AUTHORIZED', message: 'Acceso directo habilitado' };
});


ipcMain.handle('cmda:get-corporate-config', async () => {
  const cfg = configManager.getConfig();
  return {
    isConfigured: Boolean(cfg.dbServer && cfg.dbUser),
    dbServer: cfg.dbServer,
    dbDatabase: cfg.dbDatabase,
    dbUser: cfg.dbUser,
    dbPort: cfg.dbPort,
    corporateDomain: cfg.corporateDomain,
  };
});

ipcMain.handle('cmda:import-config-dialog', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Seleccionar archivo de configuración corporativa',
    filters: [
      { name: 'Archivos de configuración (.json, .env)', extensions: ['json', 'env'] },
      { name: 'Todos los archivos', extensions: ['*'] },
    ],
    properties: ['openFile'],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true };
  }

  const selectedPath = result.filePaths[0];
  try {
    const importRes = configManager.importConfigFile(selectedPath, getUserDataConfigPath());
    dbService.resetPool();
    const status = await dbService.checkStatus();
    return { success: true, config: importRes.config, status };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('cmda:import-config-content', async (_event, contentStr) => {
  try {
    let parsed;
    if (contentStr.includes('=') && !contentStr.trim().startsWith('{')) {
      parsed = configManager.parseDotEnvContent(contentStr);
    } else {
      parsed = JSON.parse(contentStr);
    }
    const targetPath = getUserDataConfigPath();
    const targetDir = path.dirname(targetPath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    fs.writeFileSync(targetPath, JSON.stringify(parsed, null, 2), 'utf8');
    configManager.setConfig(parsed);
    dbService.resetPool();
    const status = await dbService.checkStatus();
    return { success: true, status };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('cmda:clear-corporate-config', async () => {
  try {
    configManager.clearPersistedConfig(getUserDataConfigPath());
    dbService.resetPool();
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('cmda:test-sql-connection', async () => {
  dbService.resetPool();
  return await dbService.checkStatus();
});

ipcMain.handle('cmda:status', async () => {
  return await dbService.checkStatus();
});

ipcMain.handle('cmda:search-terminal', async (_event, query) => {
  try {
    const raw = await dbService.getTerminalInfo(query);
    if (raw) {
      let ip = raw.ip || '';

      try {
        const netTarget = await dnsResolver.resolveNetworkTarget(raw.pc || query);
        if (netTarget && netTarget.ip) {
          ip = netTarget.ip;
        }
      } catch {}

      const data = {
        pc: raw.pc || '',
        ip: ip,
        mac: raw.Macadrress || raw.mac || '',
        os: raw.Sist_operativo || raw.os || '',
        servicePack: raw.ServPack || raw.servicePack || '',
        cpuModel: raw.ModeloYprocesador || raw.cpuModel || '',
        ram: raw.ram || '',
        antivirusVersion: raw.version_AV || raw.antivirusVersion || '',
        ieVersion: raw.IE || raw.ieVersion || '',
        userNt: raw.userNt || '',
        architecture: raw.Arquitectura || raw.architecture || '',
        surveyDate: raw.Fecha_Relevada || raw.surveyDate || '',
        uptimeText: raw.uptimeText || 'Sin registro en vivo',
        location: raw.location || '',
        costCenter: raw.costCenter || '',
        alerts: raw.alerts || [],
        resetHistory: raw.resetHistory || [],
      };
      return { source: 'sql', data };
    }
  } catch (err) {
    console.warn('SQL lookup failed, checking network:', err.message);
  }

  // Fallback: Try resolving directly on the live corporate network via DNS / IP
  try {
    const netTarget = await dnsResolver.resolveNetworkTarget(query);
    if (netTarget && netTarget.ip) {
      const data = dnsResolver.createLiveNetworkTerminal(netTarget.hostname, netTarget.ip);
      return { source: 'network', data };
    }
  } catch {}

  return { source: 'mock', data: null };
});

ipcMain.handle('cmda:launch-vnc', async (_event, target) => {
  return await systemTools.launchVncSmart(target);
});

ipcMain.handle('cmda:launch-msra', async (_event, target) => {
  return systemTools.launchMsra(target);
});

ipcMain.handle('cmda:probe-remote', async (_event, target) => {
  return await systemTools.probeRemotePorts(target, 800);
});

ipcMain.handle('cmda:launch-remote-smart', async (_event, target) => {
  return await systemTools.launchRemoteSmart(target);
});

ipcMain.on('cmda:ping-start', async (event, target, continuous) => {

  if (activePingProcess) {
    try {
      activePingProcess.kill();
    } catch {}
    activePingProcess = null;
  }

  const pingOptions = continuous ? { continuous: true } : 4;

  activePingProcess = systemTools.executePing(
    target,
    pingOptions,
    (data) => {
      if (!event.sender.isDestroyed()) {
        event.sender.send('cmda:ping-data', data);
      }
    },
    (code) => {
      activePingProcess = null;
      if (!event.sender.isDestroyed()) {
        event.sender.send('cmda:ping-end', code);
      }
    }
  );
});

ipcMain.handle('cmda:ping-stop', () => {
  if (activePingProcess) {
    try {
      activePingProcess.kill();
    } catch {}
    activePingProcess = null;
    return true;
  }
  return false;
});

// Diagnostic Commands IPC Handlers (ping, nbtstat, tracert, arp)
let activeDiagnosticProcess = null;

function stopActiveDiagnosticProcess() {
  if (activeDiagnosticProcess) {
    try {
      activeDiagnosticProcess.kill();
    } catch {}
    activeDiagnosticProcess = null;
    return true;
  }
  return false;
}

ipcMain.on('cmda:cmd-start', async (event, payload) => {
  const { command, target, options } = payload || {};
  // Detener proceso anterior de ping o diagnóstico si estuviera corriendo
  if (activePingProcess) {
    try {
      activePingProcess.kill();
    } catch {}
    activePingProcess = null;
  }
  stopActiveDiagnosticProcess();

  const onData = (data) => {
    if (!event.sender.isDestroyed()) {
      event.sender.send('cmda:cmd-data', data);
    }
  };

  const onDone = (code) => {
    activeDiagnosticProcess = null;
    if (!event.sender.isDestroyed()) {
      event.sender.send('cmda:cmd-end', code);
    }
  };

  if (command === 'nbtstat') {
    activeDiagnosticProcess = systemTools.executeNbtstat(target, onData, onDone);
  } else if (command === 'tracert') {
    activeDiagnosticProcess = systemTools.executeTracert(target, options, onData, onDone);
  } else if (command === 'arp') {
    activeDiagnosticProcess = systemTools.executeArp(target, onData, onDone);
  } else if (command === 'ping') {
    const pingOptions = options?.continuous ? { continuous: true } : (options?.count || 4);
    activeDiagnosticProcess = systemTools.executePing(target, pingOptions, onData, onDone);
  }
});

ipcMain.handle('cmda:cmd-stop', () => {
  return stopActiveDiagnosticProcess();
});

// Subnet Scanner IPC Handlers
ipcMain.on('cmda:subnet-scan-start', async (event, targetIp) => {
  if (activeSubnetAbortController) {
    activeSubnetAbortController.abort();
    activeSubnetAbortController = null;
  }

  activeSubnetAbortController = new AbortController();
  const signal = activeSubnetAbortController.signal;

  try {
    const range = generateSubnetRange(targetIp);
    const result = await scanSubnetBatch(range, {
      concurrency: 16,
      signal,
      onHostFound: (host) => {
        if (!event.sender.isDestroyed()) {
          event.sender.send('cmda:subnet-host-found', host);
        }
      },
      onProgress: (scanned, total) => {
        if (!event.sender.isDestroyed()) {
          event.sender.send('cmda:subnet-progress', { scanned, total });
        }
      },
    });

    if (!event.sender.isDestroyed()) {
      event.sender.send('cmda:subnet-done', {
        aborted: result.aborted,
        totalFound: result.hosts.length,
      });
    }
  } catch (err) {
    if (!event.sender.isDestroyed()) {
      event.sender.send('cmda:subnet-done', {
        aborted: false,
        error: err.message,
        totalFound: 0,
      });
    }
  } finally {
    activeSubnetAbortController = null;
  }
});

ipcMain.handle('cmda:subnet-scan-abort', () => {
  if (activeSubnetAbortController) {
    activeSubnetAbortController.abort();
    activeSubnetAbortController = null;
    return true;
  }
  return false;
});

// In-App Updater IPC Handlers
ipcMain.handle('cmda:check-updates', async () => {
  const currentVersion = app.getVersion ? app.getVersion() : require('../package.json').version;
  return await checkForUpdates({
    currentVersion,
    repoOwner: 'correoargentino',
    repoName: 'new-CMDA',
  });
});

ipcMain.handle('cmda:start-download-update', async (event, downloadUrl) => {
  if (!downloadUrl) return { success: false, error: 'URL de descarga vacía' };
  
  const tempDir = app.getPath ? app.getPath('temp') : require('os').tmpdir();
  const fileName = path.basename(new URL(downloadUrl).pathname) || 'PortalCorreoDesktop-Update.exe';
  const targetPath = path.join(tempDir, fileName);

  return new Promise((resolve) => {
    downloadUpdateFile(
      downloadUrl,
      targetPath,
      (progress) => {
        if (!event.sender.isDestroyed()) {
          event.sender.send('cmda:update-progress', progress);
        }
      },
      (completedPath) => {
        downloadedInstallerPath = completedPath;
        if (!event.sender.isDestroyed()) {
          event.sender.send('cmda:update-downloaded', completedPath);
        }
        resolve({ success: true, filePath: completedPath });
      },
      (err) => {
        resolve({ success: false, error: err.message });
      }
    );
  });
});

ipcMain.handle('cmda:install-update-now', async () => {
  if (downloadedInstallerPath && fs.existsSync(downloadedInstallerPath)) {
    try {
      shell.openPath(downloadedInstallerPath);
      setTimeout(() => {
        app.isQuiting = true;
        app.quit();
      }, 500);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
  return { success: false, error: 'No hay instalador descargado' };
});

app.on('before-quit', () => {
  app.isQuiting = true;
  if (app.isReady()) {
    globalShortcut.unregisterAll();
  }
});

function registerGlobalSearchShortcut(win) {
  try {
    globalShortcut.register('CommandOrControl+Space', () => {
      if (!win || win.isDestroyed()) return;

      if (win.isMinimized()) {
        win.restore();
      }
      if (!win.isVisible()) {
        win.show();
      }
      win.focus();

      // Read clipboard and parse query
      const rawClipboard = clipboard.readText();
      const parsed = parseClipboardQuery(rawClipboard);

      win.webContents.send('cmda:trigger-autofocus-search', parsed);
    });
  } catch (err) {
    console.error('[GlobalShortcut] Failed to register CommandOrControl+Space:', err);
  }
}

let mainWindow = null;

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      if (!mainWindow.isVisible()) mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    mainWindow = createWindow();
    registerGlobalSearchShortcut(mainWindow);

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        mainWindow = createWindow();
        registerGlobalSearchShortcut(mainWindow);
      }
    });
  });
}

app.on('will-quit', () => {
  if (app.isReady()) {
    globalShortcut.unregisterAll();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
