import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  checkSecurityGateStatus,
  retrySecurityGate,
  checkBackendStatus,
  searchTerminalUnified,
  launchVncClient,
  launchMsraClient,
  probeRemoteStatus,
  launchSmartRemoteClient,
  subscribeToDiagnosticCommand,
  stopDiagnosticCommand,
  DiagnosticCommandType,
  openMonitorCurrent,
  setMonitorTarget,
  subscribeToMonitorNotice,
  subscribeToMonitorRemoteResult,
  isMonitorShortcutRegistered,
} from './electronClient';

describe('electronClient (Unified bridge with security gate & browser mock fallback)', () => {
  const originalWindow = global.window;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    (global as any).window = originalWindow;
  });

  it('usa fallback READY cuando window.electronAPI no existe (modo navegador)', async () => {
    delete (global as any).window.electronAPI;

    const gate = await checkSecurityGateStatus();
    expect(gate.status).toBe('READY');
    expect(gate.code).toBe('AUTHORIZED');
    expect(gate.source).toBe('dev');
  });

  it('delega el gate a window.electronAPI en Electron', async () => {
    const respuesta = {
      status: 'BLOCKED',
      code: 'NO_LAN_ROUTE',
      message: 'Conectate a la red corporativa',
      source: 'unc',
      configPath: '\\\\host\\share\\portal-correo-desktop.config.json',
      environment: { detectedDomain: 'dominio.interno', isDomainJoined: true, note: '' },
    };

    const mockElectronAPI = {
      getSecurityStatus: vi.fn().mockResolvedValue(respuesta),
      retrySecurity: vi.fn().mockResolvedValue({ ...respuesta, status: 'READY', code: 'AUTHORIZED' }),
    };

    (global as any).window.electronAPI = mockElectronAPI;

    const gate = await checkSecurityGateStatus();
    expect(gate.status).toBe('BLOCKED');
    expect(mockElectronAPI.getSecurityStatus).toHaveBeenCalledTimes(1);

    const reintento = await retrySecurityGate();
    expect(reintento.status).toBe('READY');
    expect(mockElectronAPI.retrySecurity).toHaveBeenCalledTimes(1);
  });

  it('handles errors gracefully in launchSmartRemoteClient', async () => {
    (global as any).window.electronAPI = {
      launchRemoteSmart: vi.fn().mockRejectedValue(new Error('Process launch error')),
    };
    const res = await launchSmartRemoteClient('192.0.2.101');
    expect(res.success).toBe(false);
    expect(res.methodUsed).toBe('none');
    expect(res.message).toContain('Process launch error');
  });

  describe('Diagnostic Commands IPC Bridge (nbtstat, tracert, arp)', () => {
    it('executes diagnostic command in browser fallback simulation mode', async () => {
      delete (global as any).window.electronAPI;
      const onData = vi.fn();
      const onEnd = vi.fn();

      const unsub = subscribeToDiagnosticCommand('nbtstat', '192.0.2.101', onData, onEnd);
      expect(typeof unsub).toBe('function');
      unsub();
    });

    it('delegates diagnostic command to window.electronAPI when present', () => {
      const startCmdMock = vi.fn();
      const stopCmdMock = vi.fn();
      const onCmdDataMock = vi.fn().mockReturnValue(() => {});
      const onCmdEndMock = vi.fn().mockReturnValue(() => {});

      (global as any).window.electronAPI = {
        startCommand: startCmdMock,
        stopCommand: stopCmdMock,
        onCommandData: onCmdDataMock,
        onCommandEnd: onCmdEndMock,
      };

      const onData = vi.fn();
      const onEnd = vi.fn();

      const unsub = subscribeToDiagnosticCommand('tracert', '192.0.2.102', onData, onEnd, { maxHops: 6 });
      expect(startCmdMock).toHaveBeenCalledWith({
        command: 'tracert',
        target: '192.0.2.102',
        options: { maxHops: 6 },
      });
      expect(onCmdDataMock).toHaveBeenCalledWith(onData);
      expect(onCmdEndMock).toHaveBeenCalledWith(onEnd);

      unsub();
      expect(stopCmdMock).toHaveBeenCalled();
    });

    it('calls stopCommand via stopDiagnosticCommand helper', async () => {
      const stopCmdMock = vi.fn().mockResolvedValue(true);
      (global as any).window.electronAPI = {
        stopCommand: stopCmdMock,
      };

      await stopDiagnosticCommand();
      expect(stopCmdMock).toHaveBeenCalled();
    });

    it('simulates net user output in the browser fallback', () => {
      vi.useFakeTimers();
      delete (global as any).window.electronAPI;

      const onData = vi.fn();
      const onEnd = vi.fn();

      subscribeToDiagnosticCommand('netuser', 'jperez', onData, onEnd);
      vi.advanceTimersByTime(600);

      const output = onData.mock.calls.flat().join('');
      expect(output).toContain('grupos globales');
      expect(onEnd).toHaveBeenCalledWith(0);

      vi.useRealTimers();
    });
  });

  describe('Monitor bridge', () => {
    it('envía el target del monitor a electronAPI', () => {
      const setTarget = vi.fn();
      (global as any).window.electronAPI = { setMonitorTarget: setTarget };

      setMonitorTarget({ target: '192.0.2.100', label: 'WS-CORP-100' });

      expect(setTarget).toHaveBeenCalledWith({
        target: '192.0.2.100',
        label: 'WS-CORP-100',
      });
    });

    it('no falla sin electronAPI', async () => {
      delete (global as any).window.electronAPI;

      expect(() => setMonitorTarget(null)).not.toThrow();
      await expect(openMonitorCurrent()).resolves.toEqual({
        ok: false,
        reason: 'unavailable',
      });
    });

    it('abre el monitor actual vía electronAPI', async () => {
      const open = vi.fn().mockResolvedValue({ ok: true });
      (global as any).window.electronAPI = { openMonitorCurrent: open };

      await expect(openMonitorCurrent()).resolves.toEqual({ ok: true });
      expect(open).toHaveBeenCalledTimes(1);
    });

    it('se suscribe a los avisos del monitor', () => {
      const unsubscribe = vi.fn();
      const onNotice = vi.fn().mockReturnValue(unsubscribe);
      (global as any).window.electronAPI = { onMonitorNotice: onNotice };
      const callback = vi.fn();

      const unsub = subscribeToMonitorNotice(callback);

      expect(onNotice).toHaveBeenCalledWith(callback);
      unsub();
      expect(unsubscribe).toHaveBeenCalled();
    });

    it('se suscribe al resultado remoto', () => {
      const unsubscribe = vi.fn();
      const onResult = vi.fn().mockReturnValue(unsubscribe);
      (global as any).window.electronAPI = {
        onMonitorRemoteResult: onResult,
      };
      const callback = vi.fn();

      const unsub = subscribeToMonitorRemoteResult(callback);

      expect(onResult).toHaveBeenCalledWith(callback);
      unsub();
      expect(unsubscribe).toHaveBeenCalled();
    });
  });

  describe('isMonitorShortcutRegistered', () => {
    it('devuelve true cuando electronAPI lo informa', async () => {
      const check = vi.fn().mockResolvedValue(true);
      (global as any).window.electronAPI = {
        isMonitorShortcutRegistered: check,
      };

      await expect(isMonitorShortcutRegistered()).resolves.toBe(true);
      expect(check).toHaveBeenCalledTimes(1);
    });

    it('devuelve false cuando electronAPI lo informa', async () => {
      const check = vi.fn().mockResolvedValue(false);
      (global as any).window.electronAPI = {
        isMonitorShortcutRegistered: check,
      };

      await expect(isMonitorShortcutRegistered()).resolves.toBe(false);
      expect(check).toHaveBeenCalledTimes(1);
    });

    it('devuelve false sin electronAPI', async () => {
      delete (global as any).window.electronAPI;

      await expect(isMonitorShortcutRegistered()).resolves.toBe(false);
    });
  });
});
