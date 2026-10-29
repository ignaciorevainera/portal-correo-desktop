import { EventEmitter } from 'node:events';
import net from 'net';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import configManager from '../../electron/configManager.cjs';
import {
  sanitizeHostOrIp,
  buildVncConfigFile,
  buildVncTempPath,
  cleanupStaleVncFiles,
  getVncCommand,
  getMsraCommand,
  getPingArgs,
  probeTcpPort,
  probeRemotePorts,
  launchVncSmart,
  launchRemoteSmart,
  getNbtstatArgs,
  getTracertArgs,
  getArpArgs,
  executeNbtstat,
  executeTracert,
  executeArp,
  sanitizeDomainUser,
  getNetUserArgs,
  executeNetUser,
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
    it('creates standard VNC config content from the explicit password', () => {
      const content = buildVncConfigFile('192.0.2.101', 5901, 'synthetic_vnc_hash_token');
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

  it('escribe la clave VNC explícita en el archivo temporal y no la toma de la config', () => {
    const contenido = buildVncConfigFile('192.0.2.10', 5901, 'clave-explicita');
    expect(contenido).toContain('Password=clave-explicita');
  });

  it('genera el temporal con el prefijo pcd_', () => {
    const ruta = buildVncTempPath('host01', 1700000000000);
    expect(ruta).toContain('pcd_host01_1700000000000.vnc');
  });

  it('limpia temporales pcd_*.vnc de ejecuciones anteriores', () => {
    const os = require('os');
    const fs = require('fs');
    const path = require('path');
    const dir = path.join(os.tmpdir(), `pcd_cleanup_${Date.now()}`);
    fs.mkdirSync(dir, { recursive: true });
    const viejo = path.join(dir, 'pcd_host01_1.vnc');
    fs.writeFileSync(viejo, 'x');

    const { removed } = cleanupStaleVncFiles(dir, {
      now: () => Date.now() + 25 * 60 * 60 * 1000,
    });
    expect(removed).toBeGreaterThanOrEqual(1);
    expect(fs.existsSync(viejo)).toBe(false);
    fs.rmSync(dir, { recursive: true, force: true });
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

    it('defaults to 4 packets when options is omitted', () => {
      const cmd = getPingArgs('192.0.2.101');
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

    it('returns recommendedMethod vnc if 5901 or 5900 open', async () => {
      const connectSpy = vi.spyOn(net.Socket.prototype, 'connect').mockImplementation(function (this: any, port: any) {
        if (port === 5901) {
          queueMicrotask(() => this.emit('connect'));
        } else {
          queueMicrotask(() => this.emit('error', new Error('ECONNREFUSED')));
        }
        return this;
      });

      const probe = await probeRemotePorts('192.0.2.101', 50);
      expect(probe.recommendedMethod).toBe('vnc');
      expect(probe.vncPort).toBe(5901);
      connectSpy.mockRestore();
    });

    it('returns recommendedMethod msra if vnc is closed but 3389 or 135 is open', async () => {
      const connectSpy = vi.spyOn(net.Socket.prototype, 'connect').mockImplementation(function (this: any, port: any) {
        if (port === 135) {
          queueMicrotask(() => this.emit('connect'));
        } else {
          queueMicrotask(() => this.emit('error', new Error('ECONNREFUSED')));
        }
        return this;
      });

      const probe = await probeRemotePorts('192.0.2.102', 50);
      expect(probe.recommendedMethod).toBe('msra');
      expect(probe.msraAvailable).toBe(true);
      expect(probe.vncPort).toBeNull();
      connectSpy.mockRestore();
    });

    it('returns recommendedMethod none if all remote ports are closed', async () => {
      const connectSpy = vi.spyOn(net.Socket.prototype, 'connect').mockImplementation(function (this: any) {
        queueMicrotask(() => this.emit('error', new Error('ECONNREFUSED')));
        return this;
      });

      const probe = await probeRemotePorts('192.0.2.103', 50);
      expect(probe.recommendedMethod).toBe('none');
      expect(probe.vncPort).toBeNull();
      expect(probe.msraAvailable).toBe(false);
      connectSpy.mockRestore();
    });
  });

  describe('launchRemoteSmart (Unified VNC + MSRA Orchestrator)', () => {
    it('prioritizes VNC when both VNC (5901) and MSRA (3389) are open', async () => {
      const mockVnc = vi.fn().mockReturnValue({ success: true, processId: 1001 });
      const mockMsra = vi.fn();

      const res = await launchRemoteSmart('192.0.2.101', {
        mockProbe: {
          host: '192.0.2.101',
          vncPort: 5901,
          port5901Open: true,
          port5900Open: false,
          msraAvailable: true,
          recommendedMethod: 'vnc',
        },
        mockLaunchVnc: mockVnc,
        mockLaunchMsra: mockMsra,
      });

      expect(res.success).toBe(true);
      expect(res.methodUsed).toBe('vnc');
      expect(res.portUsed).toBe(5901);
      expect(mockVnc).toHaveBeenCalledWith('192.0.2.101', 5901);
      expect(mockMsra).not.toHaveBeenCalled();
    });

    it('automatically falls back to MSRA when VNC ports are closed and MSRA is available', async () => {
      const mockVnc = vi.fn();
      const mockMsra = vi.fn().mockReturnValue({
        success: true,
        processId: 2002,
        message: 'Solicitud de Asistencia Remota (MSRA) enviada a 192.0.2.102',
      });

      const res = await launchRemoteSmart('192.0.2.102', {
        mockProbe: {
          host: '192.0.2.102',
          vncPort: null,
          port5901Open: false,
          port5900Open: false,
          msraAvailable: true,
          recommendedMethod: 'msra',
        },
        mockLaunchVnc: mockVnc,
        mockLaunchMsra: mockMsra,
      });

      expect(res.success).toBe(true);
      expect(res.methodUsed).toBe('msra');
      expect(mockVnc).not.toHaveBeenCalled();
      expect(mockMsra).toHaveBeenCalledWith('192.0.2.102');
    });

    it('returns methodUsed="none" and success=false when neither VNC nor MSRA is reachable', async () => {
      const res = await launchRemoteSmart('192.0.2.103', {
        mockProbe: {
          host: '192.0.2.103',
          vncPort: null,
          port5901Open: false,
          port5900Open: false,
          msraAvailable: false,
          recommendedMethod: 'none',
        },
      });

      expect(res.success).toBe(false);
      expect(res.methodUsed).toBe('none');
      expect(res.vncClosed).toBe(true);
      expect(res.msraAvailable).toBe(false);
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

  describe('Native Network Diagnostics Argument Builders', () => {
    it('builds nbtstat command args with sanitized target', () => {
      const cmd = getNbtstatArgs('192.0.2.101');
      expect(cmd.exe).toBe('nbtstat');
      expect(cmd.args).toEqual(['-A', '192.0.2.101']);
    });

    it('rejects invalid hostnames in getNbtstatArgs', () => {
      expect(() => getNbtstatArgs('192.0.2.1; calc.exe')).toThrow('Host inválido');
    });

    it('builds tracert command args with -d and -h 6', () => {
      const cmd = getTracertArgs('192.0.2.102');
      expect(cmd.exe).toBe('tracert');
      expect(cmd.args).toEqual(['-d', '-h', '6', '192.0.2.102']);
    });

    it('supports custom max hops in getTracertArgs', () => {
      const cmd = getTracertArgs('192.0.2.102', 10);
      expect(cmd.args).toEqual(['-d', '-h', '10', '192.0.2.102']);
    });

    it('builds arp command args with -a', () => {
      const cmd = getArpArgs('192.0.2.103');
      expect(cmd.exe).toBe('arp');
      expect(cmd.args).toEqual(['-a', '192.0.2.103']);
    });

    it('rejects invalid host in getArpArgs', () => {
      expect(() => getArpArgs('192.0.2.1 & whoami')).toThrow('Host inválido');
    });
  });

  describe('Native Network Diagnostics Execution Functions', () => {
    it('executes nbtstat and streams data chunks', async () => {
      const onData = vi.fn();
      const onDone = vi.fn();
      const proc = executeNbtstat('192.0.2.101', onData, onDone);
      expect(proc).toBeDefined();
      if (proc && proc.kill) proc.kill();
    });

    it('executes tracert and streams data chunks', async () => {
      const onData = vi.fn();
      const onDone = vi.fn();
      const proc = executeTracert('192.0.2.102', 6, onData, onDone);
      expect(proc).toBeDefined();
      if (proc && proc.kill) proc.kill();
    });

    it('executes arp and streams data chunks', async () => {
      const onData = vi.fn();
      const onDone = vi.fn();
      const proc = executeArp('192.0.2.103', onData, onDone);
      expect(proc).toBeDefined();
      if (proc && proc.kill) proc.kill();
    });
  });

  describe('net user /domain', () => {
    it('accepts only alphanumeric users', () => {
      expect(sanitizeDomainUser('jperez')).toBe('jperez');
      expect(sanitizeDomainUser('OPERADOR01')).toBe('OPERADOR01');

      expect(() => sanitizeDomainUser('operador.demo01')).toThrow('Usuario inválido');
      expect(() => sanitizeDomainUser('juan-perez')).toThrow('Usuario inválido');
      expect(() => sanitizeDomainUser('CORREO\\jperez')).toThrow('Usuario inválido');
      expect(() => sanitizeDomainUser('')).toThrow('Usuario inválido');
    });

    it('builds net.exe with the exact argument list', () => {
      expect(getNetUserArgs('jperez')).toEqual({
        exe: 'net.exe',
        args: ['user', 'jperez', '/domain'],
      });
    });

    it('kills the process and reports a domain timeout', () => {
      vi.useFakeTimers();

      const child = new EventEmitter() as EventEmitter & {
        stdout: EventEmitter;
        stderr: EventEmitter;
        kill: ReturnType<typeof vi.fn>;
      };
      child.stdout = new EventEmitter();
      child.stderr = new EventEmitter();
      child.kill = vi.fn();

      const onData = vi.fn();
      const onDone = vi.fn();

      executeNetUser('jperez', onData, onDone, {
        spawnImpl: () => child,
        timeoutMs: 12000,
      });

      vi.advanceTimersByTime(12000);

      expect(child.kill).toHaveBeenCalledTimes(1);
      expect(onDone).toHaveBeenCalledWith(1);
      expect(onData.mock.calls.flat().join('')).toContain('VPN');

      vi.useRealTimers();
    });
  });
});
