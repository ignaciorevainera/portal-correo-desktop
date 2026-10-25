const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const dbService = require('./dbService.cjs');
const systemTools = require('./systemTools.cjs');
const dnsResolver = require('./dnsResolver.cjs');
const securityGate = require('./securityGate.cjs');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'new CMDA - Monitoreo e Inventario de Estaciones',
    autoHideMenuBar: true,
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
  if (process.env.NODE_ENV === 'development') {
    win.loadURL(devUrl);
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html')).catch(() => {
      win.loadURL(devUrl);
    });
  }
}

// Security Gate IPC Handlers
ipcMain.handle('cmda:security-status', async () => {
  return await securityGate.evaluateSecurityGate();
});

ipcMain.handle('cmda:security-unlock', async (_event, configPath, corporateKey) => {
  const status = await securityGate.unlockApplication(configPath, corporateKey);
  dbService.resetPool();
  return status;
});

// Protected Operational IPC Handlers
ipcMain.handle('cmda:status', async () => {
  const gate = await securityGate.evaluateSecurityGate();
  if (!gate.authorized) {
    return {
      connected: false,
      server: 'Bloqueado por Seguridad',
      database: '',
      mode: 'mock',
      error: gate.message,
    };
  }
  return await dbService.checkStatus();
});

ipcMain.handle('cmda:search-terminal', async (_event, query) => {
  const gate = await securityGate.evaluateSecurityGate();
  if (!gate.authorized) {
    return { source: 'mock', data: null, error: gate.message };
  }

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
  const gate = await securityGate.evaluateSecurityGate();
  if (!gate.authorized) {
    return { success: false, message: gate.message };
  }
  return await systemTools.launchVncSmart(target);
});

ipcMain.handle('cmda:launch-msra', async (_event, target) => {
  const gate = await securityGate.evaluateSecurityGate();
  if (!gate.authorized) {
    return { success: false, message: gate.message };
  }
  return systemTools.launchMsra(target);
});

ipcMain.on('cmda:ping-start', async (event, target) => {
  const gate = await securityGate.evaluateSecurityGate();
  if (!gate.authorized) {
    if (!event.sender.isDestroyed()) {
      event.sender.send('cmda:ping-data', `Acceso denegado: ${gate.message}\n`);
      event.sender.send('cmda:ping-end', 1);
    }
    return;
  }

  systemTools.executePing(
    target,
    4,
    (data) => {
      if (!event.sender.isDestroyed()) {
        event.sender.send('cmda:ping-data', data);
      }
    },
    (code) => {
      if (!event.sender.isDestroyed()) {
        event.sender.send('cmda:ping-end', code);
      }
    }
  );
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
