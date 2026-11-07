/**
 * Subnet Scanner Core for Portal Correo Desktop
 * Fast, non-blocking asynchronous subnet range sweeper with hostname resolution.
 * `hostname` is null when no source resolves a real name; the renderer then
 * shows the IP once instead of duplicating it.
 */

const dns = require('dns').promises;
const net = require('net');

const IPV4_REGEX = /^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/;

/**
 * Generates an array of all 254 IPv4 addresses in a /24 subnet.
 * @param {string} ip - Any IP in the subnet (e.g. 192.0.2.45)
 * @returns {string[]} Array of 254 IP strings
 */
function generateSubnetRange(ip) {
  if (!ip || typeof ip !== 'string' || !IPV4_REGEX.test(ip.trim())) {
    throw new Error(`Invalid IPv4 address provided for subnet range: "${ip}"`);
  }

  const parts = ip.trim().split('.');
  const prefix = `${parts[0]}.${parts[1]}.${parts[2]}`;
  const range = [];

  for (let i = 1; i <= 254; i++) {
    range.push(`${prefix}.${i}`);
  }

  return range;
}

/**
 * Lightweight TCP/ICMP ping probe with strict timeout.
 * Tests port 445 (SMB) or 135 (RPC/WMI) commonly open on Windows corporate workstations.
 */
async function defaultPingProbe(targetIp, timeoutMs = 400, signal = null) {
  return new Promise((resolve) => {
    if (signal && signal.aborted) {
      resolve({ alive: false, latency: null });
      return;
    }
    const startTime = Date.now();
    const socket = new net.Socket();
    let isResolved = false;

    const cleanup = () => {
      if (!isResolved) {
        isResolved = true;
        if (signal && onAbort) {
          try {
            signal.removeEventListener('abort', onAbort);
          } catch {}
        }
        socket.destroy();
      }
    };

    const onAbort = () => {
      cleanup();
      resolve({ alive: false, latency: null });
    };

    if (signal && typeof signal.addEventListener === 'function') {
      signal.addEventListener('abort', onAbort, { once: true });
    }

    socket.setTimeout(timeoutMs);

    socket.on('connect', () => {
      const latency = Math.max(1, Date.now() - startTime);
      cleanup();
      resolve({ alive: true, latency });
    });

    socket.on('timeout', () => {
      cleanup();
      resolve({ alive: false, latency: null });
    });

    socket.on('close', () => {
      cleanup();
      resolve({ alive: false, latency: null });
    });

    socket.on('error', (err) => {
      // ECONNREFUSED means the host is alive and responded with RST!
      if (err.code === 'ECONNREFUSED') {
        const latency = Math.max(1, Date.now() - startTime);
        cleanup();
        resolve({ alive: true, latency });
      } else {
        cleanup();
        resolve({ alive: false, latency: null });
      }
    });

    try {
      socket.connect(445, targetIp);
    } catch {
      cleanup();
      resolve({ alive: false, latency: null });
    }
  });
}

/**
 * Reverse DNS resolution for an IP address.
 */
async function defaultDnsResolver(targetIp) {
  try {
    const hostnames = await dns.reverse(targetIp);
    if (hostnames && hostnames.length > 0) {
      return hostnames[0].split('.')[0].toUpperCase();
    }
  } catch {}
  return null;
}

/**
 * Concurrently scans an array of IPs using a continuous sliding Worker Pool (concurrency N)
 * with 2-phase host discovery:
 * Phase 1: Emits onHostFound immediately with alive: true and latency as soon as ping succeeds,
 *          without blocking the worker loop or waiting for reverse DNS.
 * Phase 2: Resolves DNS/NetBIOS asynchronously in the background and emits onHostUpdate
 *          (and updates result host) when resolved.
 */
async function scanSubnetBatch(ips, options = {}) {
  const {
    concurrency = 16,
    signal,
    startIndex = 0,
    totalCount,
    pinger = defaultPingProbe,
    dnsResolver = defaultDnsResolver,
    onHostFound,
    onHostUpdate,
    onProgress,
  } = options;

  const total = totalCount || (ips.length + startIndex);
  let scanned = startIndex;
  const foundHosts = [];
  const seenIps = new Set();
  const backgroundDnsTasks = [];
  let currentIndex = 0;

  const worker = async () => {
    while (currentIndex < ips.length) {
      if (signal && signal.aborted) return;
      const index = currentIndex++;
      if (index >= ips.length) return;
      const ip = ips[index];

      try {
        const pingRes = await pinger(ip, 400, signal);
        if (signal && signal.aborted) return;
        scanned++;
        if (onProgress) {
          onProgress(scanned, total);
        }

        if (pingRes && pingRes.alive) {
          if (signal && signal.aborted) return;
          if (!seenIps.has(ip)) {
            seenIps.add(ip);

            const host = {
              ip,
              hostname: null,
              alive: true,
              latency: pingRes.latency,
            };
            foundHosts.push(host);

            // Fase 1: Emisión inmediata de host vivo
            if (onHostFound) {
              onHostFound(host);
            }

            // Fase 2: Resolución asíncrona desacoplada del worker
            if (dnsResolver) {
              const dnsTask = Promise.resolve()
                .then(() => dnsResolver(ip))
                .then((resolvedName) => {
                  if (signal && signal.aborted) return;
                  if (resolvedName) {
                    host.hostname = resolvedName;
                    if (onHostUpdate) {
                      onHostUpdate({ ...host, hostname: resolvedName });
                    }
                  }
                })
                .catch(() => {});
              backgroundDnsTasks.push(dnsTask);
            }
          }
        }
      } catch {
        if (signal && signal.aborted) return;
        scanned++;
        if (onProgress) {
          onProgress(scanned, total);
        }
      }
    }
  };

  const poolSize = Math.max(1, Math.min(concurrency, ips.length));
  const workers = [];
  for (let i = 0; i < poolSize; i++) {
    workers.push(worker());
  }

  await Promise.all(workers);

  if (backgroundDnsTasks.length > 0) {
    await Promise.all(backgroundDnsTasks);
  }

  return { aborted: Boolean(signal && signal.aborted), hosts: foundHosts };
}

module.exports = {
  generateSubnetRange,
  scanSubnetBatch,
  defaultPingProbe,
  defaultDnsResolver,
};
