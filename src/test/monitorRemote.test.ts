import { describe, expect, it, vi } from 'vitest';

const { createMonitorRemote } = require('../../electron/monitorRemote.cjs');

function createHarness(overrides: any = {}) {
  const deps = {
    getTarget: vi.fn(() => '192.0.2.100'),
    launchRemoteSmart: vi.fn().mockResolvedValue({
      success: true,
      methodUsed: 'vnc',
      portUsed: 5901,
      message: 'VNC iniciado',
    }),
    resolveVncSecret: vi.fn().mockResolvedValue('secret'),
    notifyMain: vi.fn(),
    flashMain: vi.fn(),
    isMainMinimized: vi.fn(() => false),
    logger: { warn: vi.fn() },
    ...overrides,
  };
  const remote = createMonitorRemote(deps);
  return { remote, ...deps };
}

describe('monitorRemote', () => {
  it('usa el target registrado y notifica el resultado', async () => {
    const {
      remote,
      getTarget,
      launchRemoteSmart,
      resolveVncSecret,
      notifyMain,
      flashMain,
    } = createHarness();

    const result = await remote.connect({ id: 1 });

    expect(getTarget).toHaveBeenCalledWith({ id: 1 });
    expect(launchRemoteSmart).toHaveBeenCalledWith('192.0.2.100', {
      vncPassword: 'secret',
    });
    expect(resolveVncSecret).toHaveBeenCalledTimes(1);
    expect(notifyMain).toHaveBeenCalledTimes(1);
    expect(notifyMain).toHaveBeenCalledWith({
      success: true,
      methodUsed: 'vnc',
      portUsed: 5901,
      message: 'VNC iniciado',
      target: '192.0.2.100',
    });
    expect(flashMain).not.toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({ success: true, methodUsed: 'vnc' }),
    );
  });

  it('hace flash y notifica cuando no hay acceso', async () => {
    const launchRemoteSmart = vi.fn().mockResolvedValue({
      success: false,
      methodUsed: 'none',
      message: 'Sin acceso',
    });
    const { remote, notifyMain, flashMain } = createHarness({
      launchRemoteSmart,
    });

    await remote.connect({ id: 1 });

    expect(notifyMain).toHaveBeenCalledTimes(1);
    expect(notifyMain).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, target: '192.0.2.100' }),
    );
    expect(flashMain).toHaveBeenCalledTimes(1);
  });

  it('captura errores inesperados', async () => {
    const launchRemoteSmart = vi.fn().mockRejectedValue(new Error('boom'));
    const { remote, notifyMain, flashMain, logger } = createHarness({
      launchRemoteSmart,
    });

    const result = await remote.connect({ id: 1 });

    expect(result).toEqual(
      expect.objectContaining({ success: false, methodUsed: 'none' }),
    );
    expect(result.message).toContain('boom');
    expect(notifyMain).toHaveBeenCalledTimes(1);
    expect(flashMain).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalled();
  });

  it('no lanza nada si el sender no es un monitor', async () => {
    const launchRemoteSmart = vi.fn();
    const { remote, notifyMain, flashMain, logger } = createHarness({
      getTarget: () => null,
      launchRemoteSmart,
    });

    const result = await remote.connect({ id: 99 });

    expect(result.success).toBe(false);
    expect(result.message).toBe('Monitor no registrado.');
    expect(launchRemoteSmart).not.toHaveBeenCalled();
    expect(notifyMain).not.toHaveBeenCalled();
    expect(flashMain).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalled();
  });

  it('captura un getTarget que lanza', async () => {
    const getTarget = vi.fn(() => {
      throw new Error('registry boom');
    });
    const { remote, launchRemoteSmart, notifyMain, flashMain, logger } =
      createHarness({ getTarget });

    const result = await remote.connect({ id: 1 });

    expect(result).toEqual(
      expect.objectContaining({ success: false, methodUsed: 'none' }),
    );
    expect(result.message).toContain('registry boom');
    expect(launchRemoteSmart).not.toHaveBeenCalled();
    expect(notifyMain).not.toHaveBeenCalled();
    expect(flashMain).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalled();
  });

  it('captura un resolveVncSecret que lanza', async () => {
    const resolveVncSecret = vi.fn().mockRejectedValue(new Error('secret boom'));
    const { remote, launchRemoteSmart, notifyMain, flashMain } = createHarness({
      resolveVncSecret,
    });

    const result = await remote.connect({ id: 1 });

    expect(result.success).toBe(false);
    expect(result.message).toContain('secret boom');
    expect(launchRemoteSmart).not.toHaveBeenCalled();
    expect(notifyMain).toHaveBeenCalledTimes(1);
    expect(flashMain).toHaveBeenCalledTimes(1);
  });

  it('no rechaza si notifyMain falla', async () => {
    const notifyMain = vi.fn(() => {
      throw new Error('send failed');
    });
    const { remote, logger } = createHarness({ notifyMain });

    const result = await remote.connect({ id: 1 });

    expect(result.success).toBe(true);
    expect(logger.warn).toHaveBeenCalled();
  });

  it('hace flash si la principal está minimizada aunque la conexión sea exitosa', async () => {
    const isMainMinimized = vi.fn(() => true);
    const { remote, flashMain } = createHarness({ isMainMinimized });

    await remote.connect({ id: 1 });

    expect(flashMain).toHaveBeenCalledTimes(1);
  });

  it('comparte la promesa en curso para el mismo sender', async () => {
    let resolveLaunch: (value: any) => void = () => {};
    const launchRemoteSmart = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveLaunch = resolve;
        }),
    );
    const { remote } = createHarness({ launchRemoteSmart });

    const first = remote.connect({ id: 1 });
    const second = remote.connect({ id: 1 });

    expect(second).toBe(first);
    await vi.waitFor(() => expect(launchRemoteSmart).toHaveBeenCalledTimes(1));
    resolveLaunch({ success: true, methodUsed: 'vnc', message: 'ok' });
    await first;
    expect(launchRemoteSmart).toHaveBeenCalledTimes(1);
  });

  it('normaliza un error no-Error', async () => {
    const launchRemoteSmart = vi.fn().mockRejectedValue('boom-string');
    const { remote } = createHarness({ launchRemoteSmart });

    const result = await remote.connect({ id: 1 });

    expect(result.success).toBe(false);
    expect(result.message).toContain('boom-string');
  });

  it('trata una respuesta inválida como error', async () => {
    const launchRemoteSmart = vi.fn().mockResolvedValue(null);
    const { remote, notifyMain, flashMain } = createHarness({
      launchRemoteSmart,
    });

    const result = await remote.connect({ id: 1 });

    expect(result.success).toBe(false);
    expect(notifyMain).toHaveBeenCalledTimes(1);
    expect(flashMain).toHaveBeenCalledTimes(1);
  });
});
