const { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage, globalShortcut, clipboard, dialog, net, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const dbService = require('./dbService.cjs');
const configManager = require('./configManager.cjs');
const systemTools = require('./systemTools.cjs');
const dnsResolver = require('./dnsResolver.cjs');
const { parseClipboardQuery } = require('./clipboardParser.cjs');
const { generateSubnetRange, scanSubnetBatch } = require('./subnetScanner.cjs');
const hostnameResolver = require('./hostnameResolver.cjs');
const { checkForUpdates, downloadUpdateFile } = require('./updaterService.cjs');
const { createLogger } = require('./logger.cjs');
const { loadBootstrap, DEFAULTS: BOOTSTRAP_DEFAULTS } = require('./bootstrap.cjs');
const { createConfigProvider, ConfigError } = require('./configProvider.cjs');
const { evaluateGate, describeEnvironment } = require('./securityGate.cjs');
const { migrateLegacyConfig } = require('./migration.cjs');
const { RELAUNCH_FLAG, isCompatEnabled, shouldRetryWithoutSandbox, buildRelaunchArgs } = require('./compatMode.cjs');
const { loadUiPreferences, saveUiPreferences } = require('./uiPreferences.cjs');
const { createPingSessions } = require('./pingSessions.cjs');
const { createMonitorManager } = require('./monitorWindows.cjs');
const { createMonitorShortcut } = require('./monitorShortcut.cjs');
const { createMonitorRemote } = require('./monitorRemote.cjs');
const {
  loadMonitorPreferences,
  saveMonitorPreferences,
} = require('./monitorPreferences.cjs');

// ---------------------------------------------------------------------------
// Modo de renderizado (GPU vs. software)
// ---------------------------------------------------------------------------
// En muchos equipos corporativos (escritorios virtuales, sesiones RDP, VMs sin
// GPU dedicada o GPU bloqueada por política/EDR) Chromium no logra lanzar su
// proceso GPU y Electron aborta al arrancar con:
//   ERROR:gpu_process_host.cc GPU process launch failed: error_code=18
//   FATAL:gpu_data_manager_impl_private.cc GPU process isn't usable. Goodbye.
// Esta aplicación es un panel/formulario, por lo que no necesita aceleración por
// hardware: se usa renderizado por software por defecto. En un equipo con GPU
// funcional se puede reactivar con la variable de entorno PCD_ENABLE_GPU=1.
const gpuEnabled = /^(1|true|yes|on)$/i.test(String(process.env.PCD_ENABLE_GPU || '').trim());

if (!gpuEnabled) {
  app.disableHardwareAcceleration();
  app.commandLine.appendSwitch('disable-gpu');
  app.commandLine.appendSwitch('disable-gpu-compositing');
  // Sin este switch el proceso GPU se sigue intentando lanzar en sandbox y en
  // equipos corporativos falla igualmente (error_code=18) aunque la aceleración
  // esté deshabilitada.
  app.commandLine.appendSwitch('disable-gpu-sandbox');
  console.log('[GPU] Aceleración por hardware deshabilitada (renderizado por software)');
}

// Modo compatibilidad: para equipos donde el antivirus/EDR corporativo bloquea
// la creación de procesos hijos de Chromium y Electron aborta con
// "Renderer process launch-failed" o "GPU process launch failed".
// Se activa solo de forma explícita: PCD_COMPAT_MODE=1
const compatMode = isCompatEnabled(process.env);

if (compatMode) {
  app.commandLine.appendSwitch('no-sandbox');
  app.commandLine.appendSwitch('disable-features', 'RendererCodeIntegrity');
  console.warn('[Compat] Modo compatibilidad activo (sandbox y Renderer Code Integrity deshabilitados)');
}

// ---------------------------------------------------------------------------
// Relanzamiento automático sin sandbox
// ---------------------------------------------------------------------------
// En equipos con EDR o políticas que impiden crear procesos hijos de Chromium,
// el proceso renderer no llega a lanzarse: la app arranca, corre el gate y muere
// antes de dibujar la ventana. En ese caso se relanza UNA vez con --no-sandbox,
// que es la única combinación que funciona en esos equipos. La guarda evita bucles.
let relaunchingWithoutSandbox = false;

function relaunchWithoutSandbox(reason) {
  if (relaunchingWithoutSandbox) return;

  if (!shouldRetryWithoutSandbox({ env: process.env, argv: process.argv })) {
    console.error(`[Compat] ${reason}. No se relanza: ya se intentó o el sandbox está deshabilitado.`);
    return;
  }

  relaunchingWithoutSandbox = true;
  console.warn(`[Compat] ${reason}; relanzando sin sandbox`);

  try {
    process.env[RELAUNCH_FLAG] = '1';
    app.relaunch({ args: buildRelaunchArgs(process.argv) });
  } catch (err) {
    console.error('[Compat] No se pudo programar el relanzamiento:', err && err.message);
  }

  app.exit(0);
}

app.on('child-process-gone', (_event, details) => {
  if (details && details.reason === 'launch-failed') {
    relaunchWithoutSandbox(`el proceso ${details.type} no pudo lanzarse`);
  }
});

let tray = null;
// Preferencias que el proceso principal debe respetar (bandeja y atajo global).
// Se cargan una sola vez, al crear la ventana, y se actualizan por IPC.
let uiPreferences = null;
let activeSubnetAbortController = null;
let downloadedInstallerPath = null;
let mainWindow = null;
let monitorManager = null;
let monitorShortcut = null;
let monitorRemote = null;
let lastMonitorTarget = null;
let pingSessions = null;
let flashFocusBound = false;

app.isQuiting = false;

const logger = createLogger({ scope: 'main' });

pingSessions = createPingSessions({
  executePing: systemTools.executePing,
  logger,
});

let gateState = null;
let gateProvider = null;
let bootstrapConfig = null;
let bootstrapPath = '';

function resolvePackagedBootstrapDefaults() {
  const defaultsPath = path.join(__dirname, 'bootstrap.default.json');
  try {
    if (fs.existsSync(defaultsPath)) {
      return JSON.parse(fs.readFileSync(defaultsPath, 'utf8'));
    }
  } catch (err) {
    logger.warn('No se pudo leer bootstrap.default.json', { error: err && err.message });
  }
  return undefined;
}

function initializeBootstrap() {
  const programDataDir = process.env.PROGRAMDATA || path.join(app.getPath('appData'), '..');
  const packagedDefaults = resolvePackagedBootstrapDefaults();
  bootstrapConfig = loadBootstrap({
    programDataDir,
    exeDir: path.dirname(process.execPath),
    defaults: packagedDefaults ? { ...BOOTSTRAP_DEFAULTS, ...packagedDefaults } : undefined,
  });
  bootstrapPath = bootstrapConfig._path || '';
  logger.info('Bootstrap cargado', {
    found: bootstrapConfig._found,
    path: bootstrapPath,
    configSource: bootstrapConfig.configSource,
  });
}

async function runGate() {
  try {
    if (!gateProvider) {
      gateProvider = createConfigProvider(bootstrapConfig, {
        isPackaged: app.isPackaged,
        logger,
        localConfigPath: path.join(path.resolve(__dirname, '..'), 'portal-correo-desktop.config.local.json'),
      });
    }
    gateState = await evaluateGate({ provider: gateProvider, logger });
  } catch (err) {
    configManager.resetConfig();
    const code = err instanceof ConfigError ? err.code : 'NO_CONFIG';
    gateState = {
      status: code === 'NO_CONFIG' ? 'NO_CONFIG' : 'BLOCKED',
      code,
      message: err && err.message ? err.message : 'No se pudo verificar la configuración corporativa',
      source: 'none',
      configPath: bootstrapPath,
      environment: describeEnvironment(),
    };
  }
  logger.info('Estado del gate', { status: gateState.status, code: gateState.code });
  return gateState;
}

async function resolveVncSecret() {
  try {
    if (!gateProvider) return null;
    return await gateProvider.getVncSecret();
  } catch (err) {
    logger.warn('Clave VNC no disponible', { code: err && err.code });
    return null;
  }
}

app.whenReady().then(async () => {
  // Sólo en la app instalada: en desarrollo el appRoot es el repo y borraría el .env del desarrollador.
  if (app.isPackaged) {
    migrateLegacyConfig({
      userDataDir: app.getPath('userData'),
      exeDir: path.dirname(process.execPath),
      appRoot: path.resolve(__dirname, '..'),
      logger,
    });
  }
  initializeBootstrap();
  const cleanup = systemTools.cleanupStaleVncFiles();
  if (cleanup.removed > 0) logger.info('Temporales VNC eliminados', { count: cleanup.removed });
  await runGate();
});

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

function getUiPreferences() {
  if (!uiPreferences) {
    uiPreferences = loadUiPreferences(app.getPath('userData'));
  }
  return uiPreferences;
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
        closeAllMonitors();
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
    minWidth: 420,
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

  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event, url) => {
    try {
      const current = win.webContents.getURL();
      if (new URL(url).origin !== new URL(current).origin) {
        event.preventDefault();
      }
    } catch {
      event.preventDefault();
    }
  });

  createTray(win);

  win.on('close', (event) => {
    if (app.isQuiting) return;

    if (getUiPreferences().minimizeToTray) {
      closeAllMonitors();
      event.preventDefault();
      win.hide();
      return false;
    }

    app.isQuiting = true;
    closeAllMonitors();
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
  const distIndex = path.join(__dirname, '../dist/index.html');
  const logLoadError = (target) => (err) => {
    if (win.isDestroyed() || relaunchingWithoutSandbox) return;
    console.error(`[Load] No se pudo cargar ${target}: ${err && err.message ? err.message : err}`);
  };

  let windowLoaded = false;
  let loadWatchdog = null;

  win.webContents.on('render-process-gone', (_event, details) => {
    lastMonitorTarget = null;
    if (details && details.reason === 'launch-failed') {
      relaunchWithoutSandbox('el renderer no pudo lanzarse');
      return;
    }
    console.error('[Renderer] El proceso terminó:', details && details.reason);
  });

  win.webContents.on('did-start-loading', () => {
    lastMonitorTarget = null;
  });

  win.webContents.on('did-finish-load', () => {
    windowLoaded = true;
    if (loadWatchdog) clearTimeout(loadWatchdog);
  });

  win.on('closed', () => {
    lastMonitorTarget = null;
    if (loadWatchdog) clearTimeout(loadWatchdog);
  });

  // Red de seguridad: si el renderer no llega a cargar y ningún evento avisa,
  // se relanza sin sandbox en lugar de dejar al operador con una ventana en blanco.
  loadWatchdog = setTimeout(() => {
    if (windowLoaded || relaunchingWithoutSandbox || win.isDestroyed()) return;
    relaunchWithoutSandbox('la ventana no terminó de cargar en 20 segundos');
  }, 20000);

  if (isDev) {
    win.loadURL(devUrl).catch(() => {
      if (!win.isDestroyed() && !relaunchingWithoutSandbox) {
        return win.loadFile(distIndex).catch(logLoadError(distIndex));
      }
    }).catch(logLoadError(devUrl));
  } else {
    win.loadFile(distIndex).catch(() => {
      if (!win.isDestroyed() && !relaunchingWithoutSandbox) {
        return win.loadURL(devUrl).catch(logLoadError(devUrl));
      }
    }).catch(logLoadError(distIndex));
  }

  return win;
}

// Window Controls & External Link IPC Handlers
ipcMain.handle('pcd:window-minimize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.minimize();
});

ipcMain.handle('pcd:window-maximize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  }
});

ipcMain.handle('pcd:window-close', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.close();
});

ipcMain.handle('pcd:window-hide-tray', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  closeAllMonitors();
  if (win) win.hide();
});

ipcMain.handle('pcd:open-external', async (_event, url) => {
  if (url && typeof url === 'string') {
    await shell.openExternal(url);
  }
});

// Operational IPC Handlers (Direct access without lock screen)
ipcMain.handle('pcd:security-status', async () => {
  if (!gateState) await runGate();
  return gateState;
});

ipcMain.handle('pcd:security-retry', async () => {
  gateProvider = null;
  return await runGate();
});

ipcMain.handle('pcd:diagnostics', async () => {
  if (!gateState) await runGate();
  return {
    gate: gateState,
    bootstrap: {
      found: Boolean(bootstrapConfig && bootstrapConfig._found),
      path: bootstrapPath,
      configSource: bootstrapConfig ? bootstrapConfig.configSource : '',
      retryIntervalMs: bootstrapConfig ? bootstrapConfig.retryIntervalMs : 15000,
    },
    environment: describeEnvironment(),
    packaged: app.isPackaged,
  };
});

ipcMain.handle('pcd:test-sql-connection', async () => {
  dbService.resetPool();
  return await dbService.checkStatus();
});

// Administradores habilitados para ver funciones ocultas (p. ej. Alertas y
// Reseteos). Lista separada por comas en PCD_ADMIN_USERS; por defecto, solo el
// administrador del aplicativo. Se compara con el usuario de Windows en sesión.
const DEFAULT_ADMIN_USERS = ['irevainera'];
function isCurrentUserAdmin() {
  try {
    const current = require('os').userInfo().username.toLowerCase();
    const fromEnv = String(process.env.PCD_ADMIN_USERS || '')
      .split(',')
      .map((u) => u.trim().toLowerCase())
      .filter(Boolean);
    const admins = fromEnv.length ? fromEnv : DEFAULT_ADMIN_USERS;
    return admins.includes(current);
  } catch {
    return false;
  }
}

ipcMain.handle('pcd:is-admin', () => isCurrentUserAdmin());

ipcMain.handle('pcd:status', async () => {
  return await dbService.checkStatus();
});

ipcMain.handle('pcd:search-terminal', async (_event, query) => {
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

ipcMain.handle('pcd:launch-vnc', async (_event, target) => {
  const vncPassword = await resolveVncSecret();
  return await systemTools.launchVncSmart(target, { vncPassword });
});

ipcMain.handle('pcd:launch-msra', async (_event, target) => {
  return systemTools.launchMsra(target);
});

ipcMain.handle('pcd:probe-remote', async (_event, target) => {
  return await systemTools.probeRemotePorts(target, 800);
});

ipcMain.handle('pcd:launch-remote-smart', async (_event, target) => {
  const vncPassword = await resolveVncSecret();
  return await systemTools.launchRemoteSmart(target, { vncPassword });
});

ipcMain.on('pcd:ping-start', (event, target, continuous) => {
  pingSessions.start(event.sender, target, Boolean(continuous));
});

ipcMain.handle('pcd:ping-stop', (event) => {
  return pingSessions.stop(event.sender);
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

ipcMain.on('pcd:cmd-start', async (event, payload) => {
  const { command, target, options } = payload || {};
  pingSessions.stop(event.sender);
  stopActiveDiagnosticProcess();

  const onData = (data) => {
    if (!event.sender.isDestroyed()) {
      event.sender.send('pcd:cmd-data', data);
    }
  };

  const onDone = (code) => {
    activeDiagnosticProcess = null;
    if (!event.sender.isDestroyed()) {
      event.sender.send('pcd:cmd-end', code);
    }
  };

  if (command === 'nbtstat') {
    activeDiagnosticProcess = systemTools.executeNbtstat(target, onData, onDone);
  } else if (command === 'tracert') {
    activeDiagnosticProcess = systemTools.executeTracert(target, options, onData, onDone);
  } else if (command === 'arp') {
    activeDiagnosticProcess = systemTools.executeArp(target, onData, onDone);
  } else if (command === 'netuser') {
    activeDiagnosticProcess = systemTools.executeNetUser(target, onData, onDone);
  } else if (command === 'ping') {
    const pingOptions = options?.continuous ? { continuous: true } : (options?.count || 4);
    activeDiagnosticProcess = systemTools.executePing(target, pingOptions, onData, onDone);
  }
});

ipcMain.handle('pcd:cmd-stop', () => {
  return stopActiveDiagnosticProcess();
});

// Monitor flotante de ping: IPC del renderer compacto
ipcMain.on('pcd:monitor-ping-start', (event) => {
  const target = monitorManager ? monitorManager.getTarget(event.sender) : null;
  if (!target) {
    if (!event.sender.isDestroyed()) {
      event.sender.send('pcd:ping-end', 1);
    }
    return;
  }
  pingSessions.start(event.sender, target, true);
});

ipcMain.handle('pcd:monitor-ping-stop', (event) => {
  return pingSessions.stop(event.sender);
});

ipcMain.handle('pcd:monitor-context', (event) => {
  return monitorManager ? monitorManager.getContext(event.sender) : null;
});

ipcMain.handle('pcd:monitor-set-pinned', (event, pinned) => {
  return monitorManager
    ? monitorManager.setPinned(event.sender, Boolean(pinned))
    : false;
});

ipcMain.handle('pcd:monitor-close', (event) => {
  return monitorManager ? monitorManager.close(event.sender) : false;
});

ipcMain.handle('pcd:monitor-copy', (event, text) => {
  if (!monitorManager || !monitorManager.getTarget(event.sender)) return false;
  if (typeof text !== 'string' || !text || text.length > 200000) return false;
  try {
    clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
});

ipcMain.handle('pcd:monitor-connect-remote', async (event) => {
  if (!monitorRemote) {
    return {
      success: false,
      methodUsed: 'none',
      message: 'Monitor no disponible.',
    };
  }
  return monitorRemote.connect(event.sender);
});

ipcMain.on('pcd:monitor-target-set', (event, payload) => {
  if (
    !mainWindow ||
    mainWindow.isDestroyed() ||
    event.sender !== mainWindow.webContents ||
    event.senderFrame !== mainWindow.webContents.mainFrame
  ) {
    return;
  }
  if (!payload || typeof payload !== 'object') {
    lastMonitorTarget = null;
    return;
  }
  try {
    const target = systemTools.sanitizeHostOrIp(payload.target);
    const label = String(payload.label || target).slice(0, 120);
    lastMonitorTarget = { target, label };
  } catch {
    lastMonitorTarget = null;
  }
});

ipcMain.handle('pcd:monitor-open-current', (event) => {
  if (
    !mainWindow ||
    mainWindow.isDestroyed() ||
    event.sender !== mainWindow.webContents ||
    event.senderFrame !== mainWindow.webContents.mainFrame
  ) {
    return { ok: false, reason: 'forbidden' };
  }
  return monitorShortcut
    ? monitorShortcut.handle()
    : { ok: false, reason: 'unavailable' };
});

ipcMain.handle('pcd:monitor-shortcut-status', (event) => {
  if (
    !mainWindow ||
    mainWindow.isDestroyed() ||
    event.sender !== mainWindow.webContents ||
    event.senderFrame !== mainWindow.webContents.mainFrame
  ) {
    return false;
  }
  return globalShortcut.isRegistered('CommandOrControl+Alt+Space');
});

// Subnet Scanner IPC Handlers
ipcMain.on('pcd:subnet-scan-start', async (event, payload) => {
  if (activeSubnetAbortController) {
    activeSubnetAbortController.abort();
    activeSubnetAbortController = null;
  }

  activeSubnetAbortController = new AbortController();
  const signal = activeSubnetAbortController.signal;

  const targetIp = typeof payload === 'object' && payload !== null ? payload.targetIp : payload;
  const fromIndex = typeof payload === 'object' && payload !== null && typeof payload.fromIndex === 'number' ? payload.fromIndex : 0;

  try {
    const fullRange = generateSubnetRange(targetIp);
    const range = fromIndex > 0 ? fullRange.slice(fromIndex) : fullRange;
    const result = await scanSubnetBatch(range, {
      startIndex: fromIndex,
      totalCount: 254,
      concurrency: 16,
      signal,
      dnsResolver: (ip) =>
        hostnameResolver.resolveHostname(ip, [
          async (target) => {
            try {
              return await dbService.resolvePcFromIp(target);
            } catch {
              return null;
            }
          },
          async (target) => {
            try {
              const rev = await dnsResolver.resolveNetworkTarget(target);
              return rev && rev.hostname !== target ? rev.hostname : null;
            } catch {
              return null;
            }
          },
          (target) => hostnameResolver.resolveViaNetbios(target, { timeoutMs: 900 }),
          (target) => hostnameResolver.resolveViaPingA(target, { timeoutMs: 900 }),
        ]),
      onHostFound: (host) => {
        if (!event.sender.isDestroyed()) {
          event.sender.send('pcd:subnet-host-found', host);
        }
      },
      onProgress: (scanned, total) => {
        if (!event.sender.isDestroyed()) {
          event.sender.send('pcd:subnet-progress', { scanned, total });
        }
      },
    });

    if (!event.sender.isDestroyed()) {
      event.sender.send('pcd:subnet-done', {
        aborted: result.aborted,
        totalFound: result.hosts.length,
      });
    }
  } catch (err) {
    if (!event.sender.isDestroyed()) {
      event.sender.send('pcd:subnet-done', {
        aborted: false,
        error: err.message,
        totalFound: 0,
      });
    }
  } finally {
    activeSubnetAbortController = null;
  }
});

ipcMain.handle('pcd:subnet-scan-abort', () => {
  if (activeSubnetAbortController) {
    activeSubnetAbortController.abort();
    activeSubnetAbortController = null;
    return true;
  }
  return false;
});

// In-App Updater IPC Handlers
ipcMain.handle('pcd:check-updates', async () => {
  const currentVersion = app.getVersion ? app.getVersion() : require('../package.json').version;
  const feedUrl = bootstrapConfig && bootstrapConfig.updateFeed ? bootstrapConfig.updateFeed : '';
  return await checkForUpdates({ currentVersion, feedUrl });
});

ipcMain.handle('pcd:start-download-update', async (event, downloadUrl) => {
  if (!downloadUrl) return { success: false, error: 'URL de descarga vacía' };

  const tempDir = app.getPath ? app.getPath('temp') : require('os').tmpdir();
  const fileName = path.basename(new URL(downloadUrl).pathname) || 'PortalCorreoDesktop-Update.exe';
  const targetPath = path.join(tempDir, fileName);

  const resultado = await new Promise((resolve) => {
    downloadUpdateFile(
      downloadUrl,
      targetPath,
      (progress) => {
        if (!event.sender.isDestroyed()) event.sender.send('pcd:update-progress', progress);
      },
      (completedPath) => resolve({ success: true, filePath: completedPath }),
      (err) => resolve({ success: false, error: err.message })
    );
  });

  if (!resultado.success) return resultado;

  const { parseChecksumFile, verifyFileSha256 } = require('./updaterService.cjs');

  let esperado = '';
  try {
    const respuesta = await net.fetch(`${downloadUrl}.sha256`, {
      headers: { 'User-Agent': 'PortalCorreoDesktop-AutoUpdater' },
    });
    if (respuesta.ok) esperado = parseChecksumFile(await respuesta.text());
  } catch (err) {
    logger.warn('No se pudo obtener el checksum de la actualización', { error: err && err.message });
  }

  if (!esperado) {
    try { fs.unlinkSync(resultado.filePath); } catch {}
    return { success: false, error: 'No se pudo verificar la integridad del instalador descargado.' };
  }

  if (!verifyFileSha256(resultado.filePath, esperado)) {
    try { fs.unlinkSync(resultado.filePath); } catch {}
    return { success: false, error: 'El instalador descargado no coincide con el checksum publicado.' };
  }

  downloadedInstallerPath = resultado.filePath;
  if (!event.sender.isDestroyed()) event.sender.send('pcd:update-downloaded', resultado.filePath);
  return { success: true, filePath: resultado.filePath };
});

ipcMain.handle('pcd:install-update-now', async () => {
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
  closeAllMonitors();
  stopActiveDiagnosticProcess();
  if (pingSessions) pingSessions.stopAll();
  if (app.isReady()) {
    globalShortcut.unregisterAll();
  }
});

function registerGlobalSearchShortcut(win) {
  const enabled = getUiPreferences().globalHotkeyEnabled;

  if (!enabled) {
    try {
      globalShortcut.unregister('CommandOrControl+Space');
    } catch {}
    return;
  }

  if (globalShortcut.isRegistered('CommandOrControl+Space')) return;

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

      win.webContents.send('pcd:trigger-autofocus-search', parsed);
    });
  } catch (err) {
    console.error('[GlobalShortcut] Failed to register CommandOrControl+Space:', err);
  }
}

function closeAllMonitors() {
  if (monitorManager) monitorManager.closeAll();
}

function notifyMainWindow(channel, payload) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const webContents = mainWindow.webContents;
  if (!webContents || webContents.isDestroyed()) return;
  webContents.send(channel, payload);
}

function flashMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isFocused()) return;
  mainWindow.flashFrame(true);
  if (flashFocusBound) return;
  flashFocusBound = true;
  mainWindow.once('focus', () => {
    flashFocusBound = false;
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.flashFrame(false);
  });
}

function loadMonitorRenderer(win) {
  const isDev = !app.isPackaged || process.env.NODE_ENV === 'development';
  const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
  const devMonitorUrl = `${devUrl.replace(/\/$/, '')}/monitor.html`;
  const distMonitor = path.join(__dirname, '../dist/monitor.html');

  if (isDev) {
    return win.loadURL(devMonitorUrl).catch(() => {
      if (!win.isDestroyed()) return win.loadFile(distMonitor);
    });
  }
  return win.loadFile(distMonitor).catch(() => {
    if (!win.isDestroyed()) return win.loadURL(devMonitorUrl);
  });
}

function createMonitorInfrastructure() {
  monitorManager = createMonitorManager({
    BrowserWindow,
    screen,
    getMainWindow: () => mainWindow,
    loadRenderer: loadMonitorRenderer,
    preloadPath: path.join(__dirname, 'monitor-preload.cjs'),
    iconPath: getAppIconPath(),
    loadPreferences: () => loadMonitorPreferences(app.getPath('userData')),
    savePreferences: (patch) =>
      saveMonitorPreferences(app.getPath('userData'), patch),
    notify: (payload) => notifyMainWindow('pcd:monitor-notice', payload),
    onClosed: (webContentsId) => pingSessions.stopById(webContentsId),
    logger,
    maxMonitors: 4,
  });

  monitorShortcut = createMonitorShortcut({
    getMainWindow: () => mainWindow,
    getLastTarget: () => lastMonitorTarget,
    openMonitor: (payload) => monitorManager.open(payload),
    focusSearch: (win) => {
      if (win && !win.isDestroyed()) {
        win.webContents.send('pcd:trigger-autofocus-search', {
          isValid: false,
          query: '',
          type: 'none',
          autoSearch: false,
        });
      }
    },
    logger,
  });

  monitorRemote = createMonitorRemote({
    getTarget: (webContents) => monitorManager.getTarget(webContents),
    launchRemoteSmart: systemTools.launchRemoteSmart,
    resolveVncSecret,
    notifyMain: (payload) =>
      notifyMainWindow('pcd:monitor-remote-result', payload),
    flashMain: flashMainWindow,
    isMainMinimized: () =>
      Boolean(
        mainWindow && !mainWindow.isDestroyed() && mainWindow.isMinimized(),
      ),
    logger,
  });
}

function registerMonitorShortcut() {
  if (globalShortcut.isRegistered('CommandOrControl+Alt+Space')) return;
  try {
    const registered = globalShortcut.register(
      'CommandOrControl+Alt+Space',
      () => {
        if (monitorShortcut) monitorShortcut.handle();
      },
    );
    if (!registered) {
      logger.warn('No se pudo registrar CommandOrControl+Alt+Space');
    }
  } catch (err) {
    logger.warn('Error al registrar CommandOrControl+Alt+Space', {
      error: err && err.message,
    });
  }
}

ipcMain.handle('pcd:ui-preferences-get', () => getUiPreferences());

ipcMain.handle('pcd:ui-preferences-set', (_event, patch) => {
  uiPreferences = saveUiPreferences(app.getPath('userData'), patch);
  // El atajo global aplica de inmediato; el cierre de ventana lee la
  // preferencia en cada evento `close`.
  registerGlobalSearchShortcut(mainWindow);
  return uiPreferences;
});

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
    createMonitorInfrastructure();
    registerGlobalSearchShortcut(mainWindow);
    registerMonitorShortcut();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        mainWindow = createWindow();
        createMonitorInfrastructure();
        registerGlobalSearchShortcut(mainWindow);
        registerMonitorShortcut();
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
