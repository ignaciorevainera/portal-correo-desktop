import { describe, expect, it, vi } from 'vitest';

const { createMonitorRemote } = require('../../electron/monitorRemote.cjs');

function createHarness(overrides: any = {}) {
  const launchRemoteSmart = vi.fn().mockResolvedValue({
    success: true,
    methodUsed: 'vnc',
    portUsed: 5901,
    message: 'VNC iniciado',
  });
  const resolveVncSecret = vi.fn().mockResolvedValue('secret');
  const notifyMain = vi.fn();
  const flashMain = vi.fn();
  const remote = createMonitorRemote({
    getTarget: () => '192.0.2.100',
    launchRemoteSmart,
    resolveVncSecret,
    notifyMain,
    flashMain,
    logger: { warn: vi.fn() },
    ...overrides,
  });
  return { remote, launchRemoteSmart, resolveVncSecret, notifyMain, flashMain };
}

describe('monitorRemote', () => {
  it('usa el target registrado y notifica el resultado', async () => {
    const { remote, launchRemoteSmart, resolveVncSecret, notifyMain } =
      createHarness();

    const result = await remote.connect({ id: 1 });

    expect(launchRemoteSmart).toHaveBeenCalledWith('192.0.2.100', {
      vncPassword: 'secret',
    });
    expect(resolveVncSecret).toHaveBeenCalledTimes(1);
    expect(notifyMain).toHaveBeenCalledWith(
      expect.objectContaining({ target: '192.0.2.100', success: true }),
    );
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

    expect(notifyMain).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, target: '192.0.2.100' }),
    );
    expect(flashMain).toHaveBeenCalled();
  });

  it('captura errores inesperados', async () => {
    const launchRemoteSmart = vi.fn().mockRejectedValue(new Error('boom'));
    const { remote, notifyMain, flashMain } = createHarness({
      launchRemoteSmart,
    });

    const result = await remote.connect({ id: 1 });

    expect(result).toEqual(
      expect.objectContaining({ success: false, methodUsed: 'none' }),
    );
    expect(result.message).toContain('boom');
    expect(notifyMain).toHaveBeenCalledWith(
      expect.objectContaining({ success: false }),
    );
    expect(flashMain).toHaveBeenCalled();
  });

  it('no lanza nada si el sender no es un monitor', async () => {
    const launchRemoteSmart = vi.fn();
    const { remote } = createHarness({
      getTarget: () => null,
      launchRemoteSmart,
    });

    const result = await remote.connect({ id: 99 });

    expect(result.success).toBe(false);
    expect(launchRemoteSmart).not.toHaveBeenCalled();
  });
});
