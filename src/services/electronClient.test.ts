import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  checkSecurityGateStatus,
  unlockCorporateSecurity,
  checkBackendStatus,
  searchTerminalUnified,
  launchVncClient,
  launchMsraClient,
  probeRemoteStatus,
  launchSmartRemoteClient,
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

    const probeResult = await probeRemoteStatus('192.0.2.102');
    expect(probeResult.recommendedMethod).toBe('vnc');
    expect(probeResult.port5901Open).toBe(true);

    const smartResult = await launchSmartRemoteClient('192.0.2.102');
    expect(smartResult.simulated).toBe(true);
    expect(smartResult.methodUsed).toBe('vnc');
    expect(smartResult.success).toBe(true);
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
      probeRemote: vi.fn().mockResolvedValue({
        host: '192.0.2.101',
        vncPort: 5900,
        port5901Open: false,
        port5900Open: true,
        msraAvailable: true,
        recommendedMethod: 'vnc',
      }),
      launchRemoteSmart: vi.fn().mockResolvedValue({
        success: true,
        methodUsed: 'vnc',
        portUsed: 5900,
        processId: 9999,
      }),
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

    const probe = await probeRemoteStatus('192.0.2.101');
    expect(probe.recommendedMethod).toBe('vnc');
    expect(probe.vncPort).toBe(5900);
    expect(mockElectronAPI.probeRemote).toHaveBeenCalledWith('192.0.2.101');

    const smart = await launchSmartRemoteClient('192.0.2.101');
    expect(smart.success).toBe(true);
    expect(smart.methodUsed).toBe('vnc');
    expect(smart.portUsed).toBe(5900);
    expect(mockElectronAPI.launchRemoteSmart).toHaveBeenCalledWith('192.0.2.101');
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
});
