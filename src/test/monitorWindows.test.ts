import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createMonitorManager,
  normalizeMonitorTarget,
  clampMonitorBounds,
} = require('../../electron/monitorWindows.cjs');

class FakeBrowserWindow {
  static instances: FakeBrowserWindow[] = [];
  static nextWebContentsId = 1;

  options: any;
  destroyed = false;
  visible = false;
  focused = false;
  alwaysOnTop = false;
  skipTaskbar = false;
  webContents: any;
  handlers: Record<string, Function> = {};

  constructor(options: any) {
    this.options = options;
    this.alwaysOnTop = Boolean(options.alwaysOnTop);
    this.webContents = {
      id: FakeBrowserWindow.nextWebContentsId++,
      setWindowOpenHandler: vi.fn(),
      on: vi.fn(),
    };
    FakeBrowserWindow.instances.push(this);
  }

  on(event: string, callback: Function) {
    this.handlers[event] = callback;
  }

  once(event: string, callback: Function) {
    this.handlers[event] = callback;
  }

  isDestroyed() {
    return this.destroyed;
  }

  isVisible() {
    return this.visible;
  }

  isMinimized() {
    return false;
  }

  show() {
    this.visible = true;
  }

  focus() {
    this.focused = true;
  }

  restore() {}

  setAlwaysOnTop(value: boolean) {
    this.alwaysOnTop = value;
  }

  setSkipTaskbar(value: boolean) {
    this.skipTaskbar = value;
  }

  getPosition() {
    return [this.options.x, this.options.y];
  }

  getSize() {
    return [this.options.width, this.options.height];
  }

  getBounds() {
    return {
      x: this.options.x,
      y: this.options.y,
      width: this.options.width,
      height: this.options.height,
    };
  }

  close() {
    this.destroyed = true;
    this.handlers.closed?.();
  }

  destroy() {
    this.destroyed = true;
    this.handlers.closed?.();
  }
}

function createHarness(overrides: any = {}) {
  const savePreferences = vi.fn();
  const notify = vi.fn();
  const onClosed = vi.fn();
  const loadRenderer = vi.fn().mockResolvedValue(undefined);
  const manager = createMonitorManager({
    BrowserWindow: FakeBrowserWindow,
    screen: {
      getDisplayMatching: () => ({
        workArea: { x: 0, y: 0, width: 1920, height: 1080 },
      }),
    },
    getMainWindow: () => ({
      getBounds: () => ({ x: 0, y: 0, width: 1020, height: 680 }),
    }),
    loadRenderer,
    preloadPath: 'C:\\app\\electron\\monitor-preload.cjs',
    iconPath: 'C:\\app\\icon.ico',
    loadPreferences: () => ({
      bounds: null,
      pinned: true,
      ...(overrides.prefs || {}),
    }),
    savePreferences,
    notify,
    onClosed,
    logger: { warn: vi.fn(), error: vi.fn() },
    ...overrides,
  });
  return { manager, savePreferences, notify, onClosed, loadRenderer };
}

describe('monitorWindows', () => {
  beforeEach(() => {
    FakeBrowserWindow.instances = [];
    FakeBrowserWindow.nextWebContentsId = 1;
  });

  it('normaliza el target', () => {
    expect(normalizeMonitorTarget(' 192.0.2.100 ')).toBe('192.0.2.100');
    expect(normalizeMonitorTarget(null)).toBe('');
  });

  it('ajusta bounds al área visible', () => {
    expect(
      clampMonitorBounds(
        { x: -500, y: -500, width: 2000, height: 2000 },
        { x: 0, y: 0, width: 1920, height: 1080 },
      ),
    ).toEqual({ x: 0, y: 0, width: 800, height: 600 });
  });

  it('crea una ventana con la configuración de seguridad', () => {
    const { manager } = createHarness();
    const result = manager.open({
      target: '192.0.2.100',
      label: 'WS-CORP-100',
    });

    expect(result).toEqual({ ok: true, reused: false });
    expect(FakeBrowserWindow.instances).toHaveLength(1);
    const win = FakeBrowserWindow.instances[0];
    expect(win.options.webPreferences).toMatchObject({
      contextIsolation: true,
      nodeIntegration: false,
    });
    expect(win.options.frame).toBe(false);
    expect(win.options.alwaysOnTop).toBe(true);
    expect(win.options.skipTaskbar).toBe(true);
    expect(win.skipTaskbar).toBe(true);
    expect(win.webContents.setWindowOpenHandler).toHaveBeenCalled();
  });

  it('reutiliza el monitor del mismo target', () => {
    const { manager } = createHarness();
    manager.open({ target: '192.0.2.100', label: 'WS-CORP-100' });
    const result = manager.open({
      target: ' 192.0.2.100 ',
      label: 'WS-CORP-100',
    });

    expect(result).toEqual({ ok: true, reused: true });
    expect(FakeBrowserWindow.instances).toHaveLength(1);
    expect(FakeBrowserWindow.instances[0].focused).toBe(true);
  });

  it('respeta el tope de 4 y avisa', () => {
    const { manager, notify } = createHarness();
    for (let index = 0; index < 4; index += 1) {
      manager.open({ target: `192.0.2.${index}`, label: `PC-${index}` });
    }
    const result = manager.open({ target: '192.0.2.99', label: 'PC-99' });

    expect(result).toEqual({ ok: false, reason: 'limit' });
    expect(FakeBrowserWindow.instances).toHaveLength(4);
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'limit' }),
    );
  });

  it('cierra una ventana y limpia la sesión', () => {
    const { manager, onClosed } = createHarness();
    manager.open({ target: '192.0.2.100', label: 'WS-CORP-100' });
    const win = FakeBrowserWindow.instances[0];
    const webContents = { id: win.webContents.id };

    expect(manager.close(webContents)).toBe(true);
    expect(win.destroyed).toBe(true);
    expect(onClosed).toHaveBeenCalledWith(win.webContents.id);
    expect(manager.getContext(webContents)).toBeNull();
  });

  it('closeAll destruye todo y limpia las sesiones', () => {
    const { manager, onClosed } = createHarness();
    manager.open({ target: '192.0.2.100', label: 'PC-100' });
    manager.open({ target: '192.0.2.101', label: 'PC-101' });

    manager.closeAll();

    expect(FakeBrowserWindow.instances.every((win) => win.destroyed)).toBe(
      true,
    );
    expect(onClosed).toHaveBeenCalledTimes(2);
    expect(manager.count()).toBe(0);
  });

  it('persiste y aplica el pin', () => {
    const { manager, savePreferences } = createHarness();
    manager.open({ target: '192.0.2.100', label: 'WS-CORP-100' });
    const win = FakeBrowserWindow.instances[0];
    const webContents = { id: win.webContents.id };

    expect(manager.setPinned(webContents, false)).toBe(true);
    expect(win.alwaysOnTop).toBe(false);
    expect(savePreferences).toHaveBeenCalledWith({ pinned: false });
    expect(manager.getContext(webContents)).toEqual({
      target: '192.0.2.100',
      label: 'WS-CORP-100',
      pinned: false,
    });
  });

  it('clampa los bounds persistidos al abrir', () => {
    const { manager } = createHarness({
      prefs: {
        bounds: { x: 1900, y: 1000, width: 420, height: 300 },
      },
    });
    manager.open({ target: '192.0.2.100', label: 'WS-CORP-100' });
    const win = FakeBrowserWindow.instances[0];

    expect(win.options.x).toBe(1500);
    expect(win.options.y).toBe(780);
  });

  it('avisa si el renderer no carga', async () => {
    const loadRenderer = vi.fn().mockRejectedValue(new Error('load failed'));
    const { manager, notify } = createHarness({ loadRenderer });
    manager.open({ target: '192.0.2.100', label: 'WS-CORP-100' });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(FakeBrowserWindow.instances[0].destroyed).toBe(true);
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'error' }),
    );
  });
});
