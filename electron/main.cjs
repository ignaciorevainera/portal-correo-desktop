const { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const dbService = require('./dbService.cjs');
const systemTools = require('./systemTools.cjs');
const dnsResolver = require('./dnsResolver.cjs');

let tray = null;
let activePingProcess = null;
app.isQuiting = false;

function getTrayIcon() {
  const customPath = path.join(__dirname, '../public/favicon.ico');
  if (fs.existsSync(customPath)) {
    return nativeImage.createFromPath(customPath);
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
  const win = new BrowserWindow({
    width: 1020,
    height: 680,
    minWidth: 860,
    minHeight: 560,
    backgroundColor: '#0f172a',
    frame: false,
    autoHideMenuBar: true,
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

app.on('before-quit', () => {
  app.isQuiting = true;
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
