/**
 * Hostname resolution chain for the subnet scanner.
 * Tries every available local source (inventory DB, reverse DNS, NetBIOS, ping -a)
 * and returns null when no source resolves a real name. Callers must not fall
 * back to the IP: the UI shows the IP once when the name is unknown.
 */

const { execFile } = require('child_process');

const IPV4_REGEX = /^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/;

const SKIPPED_NETBIOS_NAMES = new Set(['__MSBROWSE__', 'WORKGROUP', 'MSHOME']);

function normalizeHostname(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const clean = raw.trim();
  if (!clean || IPV4_REGEX.test(clean)) return null;
  const firstLabel = clean.split('.')[0];
  if (!firstLabel) return null;
  if (!/^[A-Za-z0-9_-]+$/.test(firstLabel)) return null;
  return firstLabel;
}

/**
 * Extracts the workstation name from `nbtstat -A <ip>` output.
 * Ignores group entries, hidden names ($) and browser master records.
 */
function parseNbtstatOutput(output) {
  if (!output || typeof output !== 'string') return null;
  for (const line of output.split(/\r?\n/)) {
    const match = line.match(/^\s*(\S+)\s+<00>\s+UNIQUE\s+/i);
    if (!match) continue;
    const raw = match[1].trim();
    if (!raw || raw.endsWith('$')) continue;
    if (SKIPPED_NETBIOS_NAMES.has(raw.toUpperCase())) continue;
    const name = normalizeHostname(raw);
    if (name) return name;
  }
  return null;
}

/**
 * Extracts the resolved name from `ping -a <ip>` output, e.g.
 * "Pinging PC-123 [10.0.0.5] with 32 bytes" or
 * "Haciendo ping a PC-123 [10.0.0.5] con 32 bytes".
 */
function parsePingAResponse(output, ip) {
  if (!output || typeof output !== 'string' || !IPV4_REGEX.test(String(ip || ''))) return null;
  const escapedIp = ip.trim().replace(/\./g, '\\.');
  const match = output.match(new RegExp(`([A-Za-z0-9][A-Za-z0-9._-]*)\\s*\\[${escapedIp}\\]`));
  if (!match) return null;
  return normalizeHostname(match[1]);
}

function runCommand(execFileImpl, command, args, timeoutMs) {
  return new Promise((resolve) => {
    try {
      execFileImpl(
        command,
        args,
        { timeout: timeoutMs, windowsHide: true, maxBuffer: 256 * 1024 },
        (err, stdout) => {
          if (err) return resolve(null);
          resolve(typeof stdout === 'string' ? stdout : null);
        }
      );
    } catch {
      resolve(null);
    }
  });
}

async function resolveViaNetbios(ip, options = {}) {
  const { execFileImpl = execFile, timeoutMs = 1200 } = options;
  if (!IPV4_REGEX.test(String(ip || '').trim())) return null;
  const output = await runCommand(execFileImpl, 'nbtstat', ['-A', ip.trim()], timeoutMs);
  return parseNbtstatOutput(output);
}

async function resolveViaPingA(ip, options = {}) {
  const { execFileImpl = execFile, timeoutMs = 1200 } = options;
  if (!IPV4_REGEX.test(String(ip || '').trim())) return null;
  const output = await runCommand(
    execFileImpl,
    'ping',
    ['-a', '-n', '1', '-w', String(timeoutMs), ip.trim()],
    timeoutMs + 400
  );
  return parsePingAResponse(output, ip);
}

/**
 * Runs resolvers in order and returns the first real hostname, or null.
 * A resolver that returns the IP itself is treated as "not resolved".
 */
async function resolveHostname(ip, resolvers = []) {
  const target = String(ip || '').trim();
  for (const resolver of resolvers) {
    if (typeof resolver !== 'function') continue;
    try {
      const candidate = await resolver(target);
      const name = normalizeHostname(candidate);
      if (name && name !== target) return name;
    } catch {
      // Try the next source.
    }
  }
  return null;
}

module.exports = {
  normalizeHostname,
  parseNbtstatOutput,
  parsePingAResponse,
  resolveViaNetbios,
  resolveViaPingA,
  resolveHostname,
};
