import { describe, it, expect, vi } from 'vitest';
// @ts-expect-error - CJS module in electron
import { generateSubnetRange, scanSubnetBatch, SubnetHostResult } from '../../electron/subnetScanner.cjs';

describe('Subnet Scanner Core (Range & Ping Sweep)', () => {
  describe('generateSubnetRange', () => {
    it('should generate 254 IP addresses for a valid /24 IPv4 address', () => {
      const range = generateSubnetRange('192.0.2.45');
      expect(range).toHaveLength(254);
      expect(range[0]).toBe('192.0.2.1');
      expect(range[253]).toBe('192.0.2.254');
    });

    it('should throw an error for invalid IP format', () => {
      expect(() => generateSubnetRange('invalid.ip')).toThrow();
      expect(() => generateSubnetRange('192.168.1')).toThrow();
      expect(() => generateSubnetRange('')).toThrow();
    });
  });

  describe('scanSubnetBatch', () => {
    it('should scan a batch of IPs and stream results via callbacks', async () => {
      const mockPinger = vi.fn().mockImplementation((ip: string) => {
        if (ip === '192.0.2.10' || ip === '192.0.2.20') {
          return Promise.resolve({ alive: true, latency: 15 });
        }
        return Promise.resolve({ alive: false, latency: null });
      });

      const mockDnsResolver = vi.fn().mockImplementation((ip: string) => {
        if (ip === '192.0.2.10') return Promise.resolve('PC-TEST-001');
        if (ip === '192.0.2.20') return Promise.resolve('PC-TEST-002');
        return Promise.resolve(null);
      });

      const ips = ['192.0.2.10', '192.0.2.11', '192.0.2.20'];
      const discoveredHosts: SubnetHostResult[] = [];
      const progressUpdates: number[] = [];

      await scanSubnetBatch(
        ips,
        {
          concurrency: 2,
          pinger: mockPinger,
          dnsResolver: mockDnsResolver,
          onHostFound: (host: SubnetHostResult) => discoveredHosts.push(host),
          onProgress: (scanned: number, total: number) => progressUpdates.push(scanned),
        }
      );

      expect(discoveredHosts).toHaveLength(2);
      expect(discoveredHosts[0]).toMatchObject({
        ip: '192.0.2.10',
        hostname: 'PC-TEST-001',
        alive: true,
        latency: 15,
      });
      expect(discoveredHosts[1]).toMatchObject({
        ip: '192.0.2.20',
        hostname: 'PC-TEST-002',
        alive: true,
        latency: 15,
      });
      expect(progressUpdates[progressUpdates.length - 1]).toBe(3);
    });

    it('should allow aborting scan midway through signal', async () => {
      const abortController = new AbortController();
      let pingsExecuted = 0;

      const mockPinger = vi.fn().mockImplementation(async () => {
        pingsExecuted++;
        if (pingsExecuted === 2) {
          abortController.abort();
        }
        return { alive: false, latency: null };
      });

      const ips = ['192.0.2.1', '192.0.2.2', '192.0.2.3', '192.0.2.4', '192.0.2.5'];

      const result = await scanSubnetBatch(
        ips,
        {
          concurrency: 1,
          signal: abortController.signal,
          pinger: mockPinger,
          dnsResolver: vi.fn().mockResolvedValue(null),
        }
      );

      expect(result.aborted).toBe(true);
      expect(pingsExecuted).toBeLessThan(5);
    });
  });
});
