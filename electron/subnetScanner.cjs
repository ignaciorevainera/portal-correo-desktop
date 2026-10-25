/**
 * Subnet Scanner Core for Portal Correo Desktop
 * Fast, non-blocking asynchronous subnet range sweeper with reverse DNS resolution.
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
async function defaultPingProbe(targetIp, timeoutMs = 400) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const socket = new net.Socket();
    let isResolved = false;

    const cleanup = () => {
      if (!isResolved) {
        isResolved = true;
        socket.destroy();
      }
    };

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
 * Concurrently scans an array of IPs in controlled batches.
 */
async function scanSubnetBatch(ips, options = {}) {
  const {
    concurrency = 16,
    signal,
    pinger = defaultPingProbe,
    dnsResolver = defaultDnsResolver,
    onHostFound,
    onProgress,
  } = options;

  const total = ips.length;
  let scanned = 0;
  const foundHosts = [];

  for (let i = 0; i < ips.length; i += concurrency) {
    if (signal && signal.aborted) {
      return { aborted: true, hosts: foundHosts };
    }

    const batch = ips.slice(i, i + concurrency);
    await Promise.all(
      batch.map(async (ip) => {
        if (signal && signal.aborted) return;

        try {
          const pingRes = await pinger(ip);
          scanned++;
          if (onProgress) {
            onProgress(scanned, total);
          }

          if (pingRes.alive) {
            let hostname = null;
            try {
              hostname = await dnsResolver(ip);
            } catch {}

            const host = {
              ip,
              hostname: hostname || `HOST-${ip.split('.').pop()}`,
              alive: true,
              latency: pingRes.latency,
            };

            foundHosts.push(host);
            if (onHostFound) {
              onHostFound(host);
            }
          }
        } catch {
          scanned++;
          if (onProgress) {
            onProgress(scanned, total);
          }
        }
      })
    );
  }

  return { aborted: false, hosts: foundHosts };
}

module.exports = {
  generateSubnetRange,
  scanSubnetBatch,
  defaultPingProbe,
  defaultDnsResolver,
};
