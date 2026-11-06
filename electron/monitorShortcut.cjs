function createMonitorShortcut({
  getMainWindow,
  getLastTarget,
  openMonitor,
  focusSearch,
  notify = () => {},
  logger = console,
}) {
  function handle() {
    const win = getMainWindow && getMainWindow();
    if (!win || (typeof win.isDestroyed === 'function' && win.isDestroyed())) {
      return { ok: false, reason: 'no-window' };
    }

    if (win.isMinimized()) win.restore();
    if (!win.isVisible()) win.show();
    win.focus();

    const lastTarget = getLastTarget && getLastTarget();
    if (!lastTarget || !lastTarget.target) {
      logger.debug?.('Atajo de monitor sin target consultado');
      focusSearch(win);
      return { ok: false, reason: 'no-target' };
    }

    const result = openMonitor(lastTarget);
    if (result && !result.ok && result.reason === 'limit') {
      notify({
        kind: 'limit',
        message:
          'Máximo de 4 monitores abiertos. Cerrá uno para abrir otro.',
      });
    } else if (result && !result.ok && result.reason === 'error') {
      notify({
        kind: 'error',
        message: 'No se pudo abrir el monitor de ping.',
      });
    }
    return result;
  }

  return { handle };
}

module.exports = { createMonitorShortcut };
