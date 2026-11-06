const DEFAULT_MAX_MONITORS = 4;
const DEFAULT_WIDTH = 420;
const DEFAULT_HEIGHT = 300;
const MIN_WIDTH = 320;
const MIN_HEIGHT = 220;
const MAX_WIDTH = 800;
const MAX_HEIGHT = 600;
const CASCADE_OFFSET = 24;

function normalizeMonitorTarget(target) {
  return typeof target === 'string' ? target.trim().toLowerCase() : '';
}

function clampMonitorBounds(bounds, workArea) {
  const width = Math.min(
    Math.max(Math.round(bounds.width), MIN_WIDTH),
    MAX_WIDTH,
  );
  const height = Math.min(
    Math.max(Math.round(bounds.height), MIN_HEIGHT),
    MAX_HEIGHT,
  );
  const maxX = workArea.x + workArea.width - width;
  const maxY = workArea.y + workArea.height - height;
  const x = Math.min(Math.max(Math.round(bounds.x), workArea.x), maxX);
  const y = Math.min(Math.max(Math.round(bounds.y), workArea.y), maxY);
  return { x, y, width, height };
}

function createMonitorManager({
  BrowserWindow,
  screen,
  getMainWindow,
  loadRenderer,
  preloadPath,
  iconPath,
  loadPreferences,
  savePreferences,
  notify = () => {},
  onClosed = () => {},
  logger = console,
  maxMonitors = DEFAULT_MAX_MONITORS,
}) {
  const windows = new Map();
  const byWebContentsId = new Map();
  let saveTimer = null;

  function getWorkArea() {
    const main = getMainWindow && getMainWindow();
    try {
      const display =
        main && screen && screen.getDisplayMatching
          ? screen.getDisplayMatching(main.getBounds())
          : screen.getPrimaryDisplay();
      return display.workArea;
    } catch {
      return { x: 0, y: 0, width: 1920, height: 1080 };
    }
  }

  function nextBounds() {
    const prefs = loadPreferences();
    const workArea = getWorkArea();
    const base = prefs.bounds || {
      x: workArea.x + Math.round((workArea.width - DEFAULT_WIDTH) / 2),
      y: workArea.y + Math.round((workArea.height - DEFAULT_HEIGHT) / 2),
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
    };
    const offset = windows.size * CASCADE_OFFSET;
    return clampMonitorBounds(
      { ...base, x: base.x + offset, y: base.y + offset },
      workArea,
    );
  }

  function persistBounds(win) {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveTimer = null;
      if (!win || win.isDestroyed()) return;
      try {
        const [x, y] = win.getPosition();
        const [width, height] = win.getSize();
        savePreferences({ bounds: { x, y, width, height } });
      } catch (err) {
        logger.warn?.('No se pudieron guardar los bounds del monitor', {
          error: err && err.message,
        });
      }
    }, 300);
  }

  function cleanup(entry) {
    if (entry.closed) return;
    entry.closed = true;
    if (windows.get(entry.key) === entry) {
      windows.delete(entry.key);
    }
    byWebContentsId.delete(entry.webContentsId);
    try {
      onClosed(entry.webContentsId);
    } catch (err) {
      logger.warn?.('Error al limpiar el monitor', {
        error: err && err.message,
      });
    }
  }

  function open({ target, label } = {}) {
    const key = normalizeMonitorTarget(target);
    if (!key) return { ok: false, reason: 'invalid-target' };

    const existing = windows.get(key);
    if (existing && !existing.win.isDestroyed()) {
      if (existing.win.isMinimized()) existing.win.restore();
      if (!existing.win.isVisible()) existing.win.show();
      existing.win.focus();
      return { ok: true, reused: true };
    }

    if (windows.size >= maxMonitors) {
      notify({
        kind: 'limit',
        message: `Máximo de ${maxMonitors} monitores abiertos. Cerrá uno para abrir otro.`,
      });
      return { ok: false, reason: 'limit' };
    }

    const prefs = loadPreferences();
    const bounds = nextBounds();
    let win;
    try {
      win = new BrowserWindow({
        ...bounds,
        minWidth: MIN_WIDTH,
        minHeight: MIN_HEIGHT,
        maxWidth: MAX_WIDTH,
        maxHeight: MAX_HEIGHT,
        frame: false,
        resizable: true,
        minimizable: false,
        maximizable: false,
        fullscreenable: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        show: false,
        autoHideMenuBar: true,
        backgroundColor: '#0C0C0C',
        title: `Monitor de ping — ${label || target}`,
        ...(iconPath ? { icon: iconPath } : {}),
        webPreferences: {
          preload: preloadPath,
          contextIsolation: true,
          nodeIntegration: false,
        },
      });
    } catch (err) {
      logger.error?.('No se pudo crear el monitor', {
        error: err && err.message,
      });
      notify({ kind: 'error', message: 'No se pudo abrir el monitor de ping.' });
      return { ok: false, reason: 'error' };
    }

    const webContentsId = win.webContents.id;
    const entry = {
      key,
      target,
      label: label || target,
      win,
      pinned: prefs.pinned !== false,
      webContentsId,
      closed: false,
    };
    windows.set(key, entry);
    byWebContentsId.set(webContentsId, entry);

    win.setAlwaysOnTop(entry.pinned);
    win.setSkipTaskbar(true);
    win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    win.webContents.on('will-navigate', (event) => event.preventDefault());
    win.on('move', () => persistBounds(win));
    win.on('resize', () => persistBounds(win));
    win.on('closed', () => cleanup(entry));
    win.webContents.on('render-process-gone', () => {
      if (!win.isDestroyed()) win.destroy();
    });
    win.once('ready-to-show', () => {
      if (!win.isDestroyed()) win.show();
    });

    Promise.resolve()
      .then(() => loadRenderer(win, 'monitor.html'))
      .catch((err) => {
        logger.error?.('No se pudo cargar el monitor', {
          error: err && err.message,
        });
        if (!win.isDestroyed()) win.destroy();
        notify({
          kind: 'error',
          message: 'No se pudo abrir el monitor de ping.',
        });
      });

    return { ok: true, reused: false };
  }

  function close(webContents) {
    const entry = byWebContentsId.get(webContents && webContents.id);
    if (!entry) return false;
    entry.win.close();
    cleanup(entry);
    return true;
  }

  function closeAll() {
    for (const entry of [...windows.values()]) {
      if (!entry.win.isDestroyed()) entry.win.destroy();
      cleanup(entry);
    }
    windows.clear();
    byWebContentsId.clear();
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
  }

  function getContext(webContents) {
    const entry = byWebContentsId.get(webContents && webContents.id);
    if (!entry) return null;
    return { target: entry.target, label: entry.label, pinned: entry.pinned };
  }

  function getTarget(webContents) {
    const entry = byWebContentsId.get(webContents && webContents.id);
    return entry ? entry.target : null;
  }

  function setPinned(webContents, pinned) {
    const entry = byWebContentsId.get(webContents && webContents.id);
    if (!entry) return false;
    entry.pinned = Boolean(pinned);
    entry.win.setAlwaysOnTop(entry.pinned);
    savePreferences({ pinned: entry.pinned });
    return true;
  }

  function has(target) {
    return windows.has(normalizeMonitorTarget(target));
  }

  function count() {
    return windows.size;
  }

  return {
    open,
    close,
    closeAll,
    getContext,
    getTarget,
    setPinned,
    has,
    count,
  };
}

module.exports = {
  DEFAULT_MAX_MONITORS,
  DEFAULT_WIDTH,
  DEFAULT_HEIGHT,
  MIN_WIDTH,
  MIN_HEIGHT,
  MAX_WIDTH,
  MAX_HEIGHT,
  CASCADE_OFFSET,
  normalizeMonitorTarget,
  clampMonitorBounds,
  createMonitorManager,
};
