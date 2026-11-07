import { describe, it, expect, vi } from 'vitest';
// @ts-expect-error - CJS module in electron
const { scanSubnetBatch } = require('../../electron/subnetScanner.cjs');

describe('Subnet Scanner Continuous Worker Pool & 2-Phase Discovery', () => {
  it('does not block subsequent IPs when one IP is slow (sliding worker pool)', async () => {
    const startedAt: Record<string, number> = {};
    const t0 = Date.now();

    const mockPinger = vi.fn().mockImplementation(async (ip: string) => {
      startedAt[ip] = Date.now() - t0;
      if (ip === '192.0.2.1') {
        // Slow IP: 150ms
        await new Promise((resolve) => setTimeout(resolve, 150));
      } else {
        // Fast IP: 10ms
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      return { alive: false, latency: null };
    });

    // 2 concurrency, 3 IPs.
    // Chunked batch: ip3 starts only after ip1 finishes (>= 150ms).
    // Sliding pool: ip2 finishes at ~10ms, so ip3 starts immediately (~10-40ms).
    const ips = ['192.0.2.1', '192.0.2.2', '192.0.2.3'];

    await scanSubnetBatch(ips, {
      concurrency: 2,
      pinger: mockPinger,
      dnsResolver: vi.fn().mockResolvedValue(null),
    });

    expect(startedAt['192.0.2.1']).toBeDefined();
    expect(startedAt['192.0.2.2']).toBeDefined();
    expect(startedAt['192.0.2.3']).toBeDefined();

    // With a sliding pool, IP 3 must have started before IP 1 finished (well under 100ms)
    expect(startedAt['192.0.2.3']).toBeLessThan(90);
  });

  it('emits onHostFound immediately on ping success (phase 1) and onHostUpdate on DNS resolution (phase 2)', async () => {
    const events: Array<{ type: string; ip: string; hostname: string | null; time: number }> = [];
    const t0 = Date.now();

    const mockPinger = vi.fn().mockImplementation(async () => {
      return { alive: true, latency: 12 };
    });

    const mockDnsResolver = vi.fn().mockImplementation(async () => {
      // Simulate slow DNS lookup (100ms)
      await new Promise((resolve) => setTimeout(resolve, 100));
      return 'DESKTOP-FAST-01';
    });

    await scanSubnetBatch(['192.0.2.50'], {
      concurrency: 1,
      pinger: mockPinger,
      dnsResolver: mockDnsResolver,
      onHostFound: (host: { ip: string; hostname: string | null }) => {
        events.push({ type: 'found', ip: host.ip, hostname: host.hostname, time: Date.now() - t0 });
      },
      onHostUpdate: (host: { ip: string; hostname: string | null }) => {
        events.push({ type: 'update', ip: host.ip, hostname: host.hostname, time: Date.now() - t0 });
      },
    });

    expect(events.length).toBeGreaterThanOrEqual(2);

    const foundEvent = events.find((e) => e.type === 'found');
    const updateEvent = events.find((e) => e.type === 'update');

    expect(foundEvent).toBeDefined();
    expect(foundEvent?.hostname).toBeNull();
    // Phase 1 should emit almost immediately (under 60ms)
    expect(foundEvent?.time).toBeLessThan(60);

    expect(updateEvent).toBeDefined();
    expect(updateEvent?.hostname).toBe('DESKTOP-FAST-01');
    // Phase 2 should emit after DNS completes (>= 90ms)
    expect(updateEvent?.time).toBeGreaterThanOrEqual(90);
  });
});
