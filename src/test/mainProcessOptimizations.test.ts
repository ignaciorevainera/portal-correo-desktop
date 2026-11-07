import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';

describe('Main Process & System Tools Optimizations', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  describe('probeRemotePorts caching', () => {
    it('caches probe result for a host within TTL avoiding repeated socket calls', async () => {
      const systemTools = require('../../electron/systemTools.cjs');
      expect(typeof systemTools.clearProbeCache).toBe('function');

      systemTools.clearProbeCache();

      // Spy on probeTcpPort
      let callCount = 0;
      const originalProbeTcp = systemTools.probeTcpPort;
      systemTools.setProbeTcpPortImpl?.((host: string, port: number) => {
        callCount++;
        return Promise.resolve({ open: port === 5901, port });
      });

      // First call: should query
      const res1 = await systemTools.probeRemotePorts('192.0.2.100', 500);
      expect(res1.vncPort).toBe(5901);

      // Second call immediately for same host: should return cached result
      const res2 = await systemTools.probeRemotePorts('192.0.2.100', 500);
      expect(res2.vncPort).toBe(5901);
      expect(res2.cached).toBe(true);

      // Clean up
      systemTools.clearProbeCache();
    });
  });

  describe('cleanupStaleVncFilesAsync', () => {
    it('asynchronously cleans up stale temp files without blocking event loop', async () => {
      const systemTools = require('../../electron/systemTools.cjs');
      expect(typeof systemTools.cleanupStaleVncFilesAsync).toBe('function');

      const tempDir = path.join(os.tmpdir(), `pcd_test_async_vnc_${Date.now()}`);
      fs.mkdirSync(tempDir, { recursive: true });

      const oldFile = path.join(tempDir, 'pcd_TESTPC1_12345.vnc');
      fs.writeFileSync(oldFile, 'dummy content');

      // Make mtime 2 days ago
      const oldTime = new Date(Date.now() - 48 * 3600 * 1000);
      fs.utimesSync(oldFile, oldTime, oldTime);

      const recentFile = path.join(tempDir, 'pcd_TESTPC2_67890.vnc');
      fs.writeFileSync(recentFile, 'dummy content');

      const result = await systemTools.cleanupStaleVncFilesAsync(tempDir);
      expect(result.removed).toBe(1);
      expect(fs.existsSync(oldFile)).toBe(false);
      expect(fs.existsSync(recentFile)).toBe(true);

      // Cleanup
      try {
        fs.unlinkSync(recentFile);
        fs.rmdirSync(tempDir);
      } catch {}
    });
  });

  describe('UncConfigProvider caching', () => {
    it('caches configuration in memory so subsequent getVncSecret calls do not re-read from UNC path', async () => {
      const { UncConfigProvider } = require('../../electron/configProvider.cjs');

      let readCallCount = 0;
      const fakeReadFile = vi.fn(async () => {
        readCallCount++;
        return JSON.stringify({
          dbServer: 'sql.corp.internal',
          dbUser: 'usr_portal',
          dbPassword: 'secret_sql_password',
          vncPassword: 'secret_vnc_password',
        });
      });

      const provider = new UncConfigProvider({
        configPath: '\\\\srv\\share\\config.json',
        readFile: fakeReadFile,
      });

      const secret1 = await provider.getVncSecret();
      expect(secret1).toBe('secret_vnc_password');
      expect(readCallCount).toBe(1);

      const secret2 = await provider.getVncSecret();
      expect(secret2).toBe('secret_vnc_password');
      // Subsequent call MUST reuse cached configuration, not re-read network file
      expect(readCallCount).toBe(1);

      const config = await provider.getConfig();
      expect(config.dbServer).toBe('sql.corp.internal');
      expect(readCallCount).toBe(1);
    });
  });
});
