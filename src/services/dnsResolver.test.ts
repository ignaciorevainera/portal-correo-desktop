import { describe, it, expect, vi, beforeEach } from 'vitest';
import configManager from '../../electron/configManager.cjs';
import {
  resolveNetworkTarget,
  createLiveNetworkTerminal,
} from '../../electron/dnsResolver.cjs';

describe('dnsResolver & live network fallback (Zero-Secrets)', () => {
  beforeEach(() => {
    configManager.resetConfig();
  });

  it('creates live network terminal data structure for reachable hosts', () => {
    const term = createLiveNetworkTerminal('PC-DEMO-308', '192.0.2.231');
    expect(term.pc).toBe('PC-DEMO-308');
    expect(term.ip).toBe('192.0.2.231');
    expect(term.os).toContain('Estación de Red');
    expect(term.alerts).toEqual([]);
    expect(term.resetHistory).toEqual([]);
  });

  it('resolves direct IP targets stripping configured corporate domain', async () => {
    configManager.setConfig({ corporateDomain: 'corp.example.local' });
    const mockDns = {
      reverse: vi.fn().mockImplementation((ip, cb) => cb(null, ['PC-DEMO-308.corp.example.local'])),
      lookup: vi.fn(),
    };

    const res = await resolveNetworkTarget('192.0.2.231', mockDns as any);
    expect(res?.ip).toBe('192.0.2.231');
    expect(res?.hostname).toBe('PC-DEMO-308');
  });

  it('resolves hostname using configured corporateDomain suffix fallback', async () => {
    configManager.setConfig({ corporateDomain: 'corp.example.local' });
    const mockDns = {
      reverse: vi.fn(),
      lookup: vi.fn().mockImplementation((host, cb) => {
        if (host === 'PC-DEMO-001') {
          return cb(new Error('ENOTFOUND'));
        }
        if (host === 'PC-DEMO-001.corp.example.local') {
          return cb(null, '192.0.2.101', 4);
        }
        cb(new Error('ENOTFOUND'));
      }),
    };

    const res = await resolveNetworkTarget('PC-DEMO-001', mockDns as any);
    expect(res?.ip).toBe('192.0.2.101');
    expect(res?.hostname).toBe('PC-DEMO-001');
  });

  it('returns null when host cannot be resolved and is not an IP', async () => {
    const mockDns = {
      reverse: vi.fn(),
      lookup: vi.fn().mockImplementation((host, cb) => cb(new Error('ENOTFOUND'))),
    };

    const res = await resolveNetworkTarget('no_existe_host_9999', mockDns as any);
    expect(res).toBeNull();
  });
});
