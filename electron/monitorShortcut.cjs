function createMonitorShortcut({
  getMainWindow,
  getLastTarget,
  openMonitor,
  focusSearch,
  logger = console,
}) {
  function handle() {
    let win;
    try {
      win = getMainWindow && getMainWindow();
    } catch (err) {
      logger?.warn?.('No se pudo obtener la ventana principal', {
        error: err && err.message,
      });
      return { ok: false, reason: 'no-window' };
    }

    if (!win || (typeof win.isDestroyed === 'function' && win.isDestroyed())) {
      return { ok: false, reason: 'no-window' };
    }

    try {
      if (win.isMinimized()) win.restore();
      if (!win.isVisible()) win.show();
      win.focus();
    } catch (err) {
      logger?.warn?.('No se pudo enfocar la ventana principal', {
        error: err && err.message,
      });
      return { ok: false, reason: 'no-window' };
    }

    let lastTarget;
    try {
      lastTarget = getLastTarget && getLastTarget();
    } catch (err) {
      logger?.warn?.('No se pudo leer el último target', {
        error: err && err.message,
      });
      lastTarget = null;
    }

    const target =
      lastTarget && typeof lastTarget.target === 'string'
        ? lastTarget.target.trim()
        : '';

    if (!target) {
      logger.debug?.('Atajo de monitor sin target consultado');
      try {
        focusSearch(win);
      } catch (err) {
        logger?.warn?.('No se pudo enfocar el buscador', {
          error: err && err.message,
        });
        return { ok: false, reason: 'error' };
      }
      return { ok: false, reason: 'no-target' };
    }

    let result;
    try {
      result = openMonitor({ ...lastTarget, target });
    } catch (err) {
      logger?.warn?.('No se pudo abrir el monitor', {
        error: err && err.message,
      });
      return { ok: false, reason: 'error' };
    }

    if (!result || typeof result !== 'object') {
      return { ok: false, reason: 'error' };
    }

    return result;
  }

  return { handle };
}

module.exports = { createMonitorShortcut };
