import { describe, expect, it, vi } from 'vitest';

const { createMonitorShortcut } = require('../../electron/monitorShortcut.cjs');

function createWindow(overrides: any = {}) {
  const win: any = {
    destroyed: false,
    minimized: false,
    visible: true,
    focused: false,
    isDestroyed: () => win.destroyed,
    isMinimized: () => win.minimized,
    isVisible: () => win.visible,
    restore: () => {
      win.minimized = false;
    },
    show: () => {
      win.visible = true;
    },
    focus: () => {
      win.focused = true;
    },
    ...overrides,
  };
  return win;
}

describe('monitorShortcut', () => {
  it('restaura, muestra y enfoca la principal', () => {
    const win = createWindow({ minimized: true, visible: false });
    const openMonitor = vi.fn().mockReturnValue({ ok: true });
    const focusSearch = vi.fn();
    const shortcut = createMonitorShortcut({
      getMainWindow: () => win,
      getLastTarget: () => ({ target: '192.0.2.100', label: 'PC-100' }),
      openMonitor,
      focusSearch,
      logger: { debug: vi.fn(), warn: vi.fn() },
    });

    const result = shortcut.handle();

    expect(result).toEqual({ ok: true });
    expect(win.minimized).toBe(false);
    expect(win.visible).toBe(true);
    expect(win.focused).toBe(true);
    expect(openMonitor).toHaveBeenCalledWith({
      target: '192.0.2.100',
      label: 'PC-100',
    });
    expect(focusSearch).not.toHaveBeenCalled();
  });

  it('sin target enfoca el buscador', () => {
    const win = createWindow();
    const focusSearch = vi.fn();
    const openMonitor = vi.fn();
    const shortcut = createMonitorShortcut({
      getMainWindow: () => win,
      getLastTarget: () => null,
      openMonitor,
      focusSearch,
      logger: { debug: vi.fn(), warn: vi.fn() },
    });

    expect(shortcut.handle()).toEqual({ ok: false, reason: 'no-target' });
    expect(focusSearch).toHaveBeenCalledWith(win);
    expect(openMonitor).not.toHaveBeenCalled();
  });

  it('propaga el resultado del tope sin notificar', () => {
    const focusSearch = vi.fn();
    const openMonitor = vi.fn().mockReturnValue({
      ok: false,
      reason: 'limit',
    });
    const shortcut = createMonitorShortcut({
      getMainWindow: () => createWindow(),
      getLastTarget: () => ({ target: '192.0.2.100', label: 'PC-100' }),
      openMonitor,
      focusSearch,
      logger: { debug: vi.fn(), warn: vi.fn() },
    });

    expect(shortcut.handle()).toEqual({ ok: false, reason: 'limit' });
    expect(openMonitor).toHaveBeenCalledWith({
      target: '192.0.2.100',
      label: 'PC-100',
    });
    expect(focusSearch).not.toHaveBeenCalled();
  });

  it('no hace nada sin ventana principal', () => {
    const shortcut = createMonitorShortcut({
      getMainWindow: () => null,
      getLastTarget: () => ({ target: '192.0.2.100' }),
      openMonitor: vi.fn(),
      focusSearch: vi.fn(),
      logger: { debug: vi.fn(), warn: vi.fn() },
    });

    expect(shortcut.handle()).toEqual({ ok: false, reason: 'no-window' });
  });

  it('devuelve error si openMonitor lanza', () => {
    const openMonitor = vi.fn(() => {
      throw new Error('boom');
    });
    const shortcut = createMonitorShortcut({
      getMainWindow: () => createWindow(),
      getLastTarget: () => ({ target: '192.0.2.100', label: 'PC-100' }),
      openMonitor,
      focusSearch: vi.fn(),
      logger: { debug: vi.fn(), warn: vi.fn() },
    });

    expect(shortcut.handle()).toEqual({ ok: false, reason: 'error' });
  });

  it('no hace nada si la ventana está destruida', () => {
    const win = createWindow({ destroyed: true });
    const getLastTarget = vi.fn();
    const openMonitor = vi.fn();
    const focusSearch = vi.fn();
    const shortcut = createMonitorShortcut({
      getMainWindow: () => win,
      getLastTarget,
      openMonitor,
      focusSearch,
      logger: { debug: vi.fn(), warn: vi.fn() },
    });

    expect(shortcut.handle()).toEqual({ ok: false, reason: 'no-window' });
    expect(getLastTarget).not.toHaveBeenCalled();
    expect(openMonitor).not.toHaveBeenCalled();
    expect(focusSearch).not.toHaveBeenCalled();
  });

  it('trata un target en blanco como no-target', () => {
    const win = createWindow();
    const focusSearch = vi.fn();
    const openMonitor = vi.fn();
    const shortcut = createMonitorShortcut({
      getMainWindow: () => win,
      getLastTarget: () => ({ target: '   ', label: 'PC-100' }),
      openMonitor,
      focusSearch,
      logger: { debug: vi.fn(), warn: vi.fn() },
    });

    expect(shortcut.handle()).toEqual({ ok: false, reason: 'no-target' });
    expect(focusSearch).toHaveBeenCalledWith(win);
    expect(openMonitor).not.toHaveBeenCalled();
  });
});
