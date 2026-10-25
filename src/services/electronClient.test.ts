import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  checkSecurityGateStatus,
  unlockCorporateSecurity,
  checkBackendStatus,
  searchTerminalUnified,
  launchVncClient,
  launchMsraClient,
} from './electronClient';

describe('electronClient (Unified bridge with security gate & browser mock fallback)', () => {
  const originalWindow = global.window;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    (global as any).window = originalWindow;
  });

  it('uses browser mock fallback when window.electronAPI is undefined', async () => {
    delete (global as any).window.electronAPI;

    const gate = await checkSecurityGateStatus();
    expect(gate.authorized).toBe(true);

    const status = await checkBackendStatus();
    expect(status.connected).toBe(false);
    expect(status.mode).toBe('mock');

    const result = await searchTerminalUnified('WS-DEMO-002');
    expect(result.source).toBe('mock');
    expect(result.data?.pc).toBe('WS-DEMO-002');

    const vncResult = await launchVncClient('192.0.2.102');
    expect(vncResult.simulated).toBe(true);

    const msraResult = await launchMsraClient('192.0.2.102');
    expect(msraResult.simulated).toBe(true);
  });

  it('delegates security gate and operational calls to window.electronAPI in Electron runtime', async () => {
    const mockElectronAPI = {
      getSecurityStatus: vi.fn().mockResolvedValue({
        authorized: false,
        configured: false,
        domainMatched: false,
        networkReachable: false,
        detectedDomain: 'WORKGROUP',
        reason: 'UNCONFIGURED',
        message: 'Requiere configuración corporativa',
      }),
      unlockSecurity: vi.fn().mockResolvedValue({
        authorized: true,
        configured: true,
        domainMatched: true,
        networkReachable: true,
        detectedDomain: 'CORP.LOCAL',
        reason: 'AUTHORIZED',
        message: 'Autorizado',
      }),
      checkStatus: vi.fn().mockResolvedValue({
        connected: true,
        server: '192.0.2.50',
        mode: 'sql',
      }),
      searchTerminal: vi.fn().mockResolvedValue({
        source: 'sql',
        data: {
          pc: 'PC-DEMO-001',
          ip: '192.0.2.101',
          os: 'W-10',
        },
      }),
      launchVnc: vi.fn().mockResolvedValue({ success: true, processId: 1234 }),
      launchMsra: vi.fn().mockResolvedValue({ success: true, processId: 5678 }),
    };

    (global as any).window.electronAPI = mockElectronAPI;

    const secStatus = await checkSecurityGateStatus();
    expect(secStatus.authorized).toBe(false);
    expect(secStatus.reason).toBe('UNCONFIGURED');

    const unlocked = await unlockCorporateSecurity('\\\\SERVER\\Share\\cmda.config.json', 'SecretKey');
    expect(unlocked.authorized).toBe(true);
    expect(mockElectronAPI.unlockSecurity).toHaveBeenCalledWith(
      '\\\\SERVER\\Share\\cmda.config.json',
      'SecretKey'
    );

    const status = await checkBackendStatus();
    expect(status.connected).toBe(true);
    expect(status.mode).toBe('sql');

    const search = await searchTerminalUnified('PC-DEMO-001');
    expect(search.source).toBe('sql');
    expect(search.data?.pc).toBe('PC-DEMO-001');

    const vnc = await launchVncClient('192.0.2.101');
    expect(vnc.success).toBe(true);
    expect(vnc.processId).toBe(1234);

    const msra = await launchMsraClient('192.0.2.101');
    expect(msra.success).toBe(true);
    expect(msra.processId).toBe(5678);
  });
});
