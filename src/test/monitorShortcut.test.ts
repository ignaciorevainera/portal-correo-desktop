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
      notify: vi.fn(),
      logger: { debug: vi.fn() },
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
      notify: vi.fn(),
      logger: { debug: vi.fn() },
    });

    expect(shortcut.handle()).toEqual({ ok: false, reason: 'no-target' });
    expect(focusSearch).toHaveBeenCalledWith(win);
    expect(openMonitor).not.toHaveBeenCalled();
  });

  it('avisa cuando se alcanza el tope', () => {
    const notify = vi.fn();
    const shortcut = createMonitorShortcut({
      getMainWindow: () => createWindow(),
      getLastTarget: () => ({ target: '192.0.2.100', label: 'PC-100' }),
      openMonitor: () => ({ ok: false, reason: 'limit' }),
      focusSearch: vi.fn(),
      notify,
      logger: { debug: vi.fn() },
    });

    shortcut.handle();

    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'limit' }),
    );
  });

  it('no hace nada sin ventana principal', () => {
    const shortcut = createMonitorShortcut({
      getMainWindow: () => null,
      getLastTarget: () => ({ target: '192.0.2.100' }),
      openMonitor: vi.fn(),
      focusSearch: vi.fn(),
      notify: vi.fn(),
      logger: { debug: vi.fn() },
    });

    expect(shortcut.handle()).toEqual({ ok: false, reason: 'no-window' });
  });
});
