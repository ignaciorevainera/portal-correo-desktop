import { describe, it, expect, vi, beforeEach } from 'vitest';
import configManager from '../../electron/configManager.cjs';
import {
  sanitizeHostOrIp,
  buildVncConfigFile,
  getVncCommand,
  getMsraCommand,
  getPingArgs,
  probeTcpPort,
  probeRemotePorts,
  launchVncSmart,
} from '../../electron/systemTools.cjs';

describe('systemTools orchestration & security sanitization', () => {
  beforeEach(() => {
    configManager.resetConfig();
  });

  describe('sanitizeHostOrIp', () => {
    it('allows valid hostnames and IPv4 addresses', () => {
      expect(sanitizeHostOrIp('192.0.2.101')).toBe('192.0.2.101');
      expect(sanitizeHostOrIp('PC-DEMO-001')).toBe('PC-DEMO-001');
      expect(sanitizeHostOrIp('PC-DEMO-001.corp.example.local')).toBe('PC-DEMO-001.corp.example.local');
    });

    it('rejects commands with injection attempts', () => {
      expect(() => sanitizeHostOrIp('192.0.2.1; rm -rf /')).toThrow('Host inválido');
      expect(() => sanitizeHostOrIp('PC-DEMO-001 & calc.exe')).toThrow('Host inválido');
      expect(() => sanitizeHostOrIp('192.0.2.1 | whoami')).toThrow('Host inválido');
      expect(() => sanitizeHostOrIp('')).toThrow('Host inválido');
    });
  });

  describe('buildVncConfigFile', () => {
    it('creates standard VNC config content injecting password from configManager', () => {
      configManager.setConfig({ vncPassword: 'synthetic_vnc_hash_token' });
      const content = buildVncConfigFile('192.0.2.101');
      expect(content).toContain('HOST=192.0.2.101');
      expect(content).toContain('Port=5901');
      expect(content).toContain('Password=synthetic_vnc_hash_token');
    });

    it('supports custom port', () => {
      const content = buildVncConfigFile('192.0.2.101', 5900, 'custom_token');
      expect(content).toContain('Port=5900');
      expect(content).toContain('Password=custom_token');
    });
  });

  describe('getVncCommand', () => {
    it('constructs correct executable and argument list matching /config flag', () => {
      const cmd = getVncCommand('C:\\resources\\bin\\vncviewer.exe', 'C:\\temp\\session.vnc');
      expect(cmd.exe).toBe('C:\\resources\\bin\\vncviewer.exe');
      expect(cmd.args).toEqual(['/config', 'C:\\temp\\session.vnc']);
    });
  });

  describe('getMsraCommand', () => {
    it('constructs shell start command to satisfy uiAccess permissions and prevent EACCES', () => {
      const cmd = getMsraCommand('192.0.2.101');
      expect(cmd.exe).toBe('cmd.exe');
      expect(cmd.args).toEqual(['/c', 'start', '""', 'msra.exe', '/offerRA', '192.0.2.101']);
    });
  });

  describe('getPingArgs', () => {
    it('constructs ping args for windows standard 4 packets', () => {
      const cmd = getPingArgs('192.0.2.101', 4);
      expect(cmd.exe).toBe('ping');
      expect(cmd.args).toEqual(['-n', '4', '192.0.2.101']);
    });

    it('constructs ping args for continuous infinite ping (-t)', () => {
      const cmd = getPingArgs('192.0.2.101', { continuous: true } as any);
      expect(cmd.exe).toBe('ping');
      expect(cmd.args).toEqual(['-t', '192.0.2.101']);
    });
  });

  describe('probeTcpPort & probeRemotePorts', () => {
    it('returns false for nonexistent unreachable loopback port quickly', async () => {
      const result = await probeTcpPort('127.0.0.1', 59999, 100);
      expect(result.open).toBe(false);
    });

    it('probes 5901, 5900 and 3389 returning structured status', async () => {
      const probe = await probeRemotePorts('127.0.0.1', 50);
      expect(probe).toHaveProperty('vncPort');
      expect(probe).toHaveProperty('msraAvailable');
    });
  });

  describe('launchVncSmart', () => {
    it('reports diagnostic message when VNC ports are closed and suggests MSRA', async () => {
      const res = await launchVncSmart('192.0.2.101', {
        mockProbe: { vncPort: null, msraAvailable: true },
      });
      expect(res.success).toBe(false);
      expect(res.vncClosed).toBe(true);
      expect(res.msraAvailable).toBe(true);
      expect(res.message).toContain('cerrados');
      expect(res.message).toContain('MSRA');
    });

    it('launches VNC when port 5900 or 5901 is open', async () => {
      const res = await launchVncSmart('192.0.2.102', {
        mockProbe: { vncPort: 5900, msraAvailable: false },
        mockLaunch: vi.fn().mockReturnValue({ success: true, processId: 9999 }),
      });
      expect(res.success).toBe(true);
      expect(res.portUsed).toBe(5900);
    });
  });
});
