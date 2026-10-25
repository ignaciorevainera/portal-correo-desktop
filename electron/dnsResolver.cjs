const defaultDns = require('dns');
const configManager = require('./configManager.cjs');

function isIpAddress(query) {
  if (!query || typeof query !== 'string') return false;
  const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
  if (!ipRegex.test(query.trim())) return false;
  const parts = query.trim().split('.').map(Number);
  return parts.every((p) => p >= 0 && p <= 255);
}

function getNormalizedDomainSuffix(explicitDomain) {
  const raw =
    explicitDomain !== undefined
      ? explicitDomain
      : configManager.getConfig().corporateDomain || '';
  const trimmed = String(raw || '').trim().replace(/^\./, '');
  return trimmed ? `.${trimmed}` : '';
}

function resolveNetworkTarget(query, dnsModule = defaultDns, explicitDomain) {
  return new Promise((resolve) => {
    if (!query || typeof query !== 'string') {
      return resolve(null);
    }
    const clean = query.trim();
    const suffix = getNormalizedDomainSuffix(explicitDomain);

    if (isIpAddress(clean)) {
      if (dnsModule.reverse) {
        dnsModule.reverse(clean, (err, hostnames) => {
          if (!err && hostnames && hostnames.length > 0) {
            let resolvedHost = hostnames[0];
            if (suffix && resolvedHost.toLowerCase().endsWith(suffix.toLowerCase())) {
              resolvedHost = resolvedHost.slice(0, -suffix.length);
            }
            return resolve({ ip: clean, hostname: resolvedHost });
          }
          return resolve({ ip: clean, hostname: clean });
        });
      } else {
        return resolve({ ip: clean, hostname: clean });
      }
      return;
    }

    // It is a hostname, attempt direct lookup
    const doLookup = (h, cb) => {
      try {
        dnsModule.lookup(h, (err, address) => cb(err, address));
      } catch {
        dnsModule.lookup(h, { family: 4 }, cb);
      }
    };

    doLookup(clean, (err, address) => {
      if (!err && address) {
        return resolve({ ip: address, hostname: clean });
      }

      // If failed and a corporate domain suffix is configured, try with domain suffix
      if (suffix && !clean.toLowerCase().endsWith(suffix.toLowerCase())) {
        doLookup(`${clean}${suffix}`, (err2, address2) => {
          if (!err2 && address2) {
            return resolve({ ip: address2, hostname: clean });
          }
          return resolve(null);
        });
      } else {
        return resolve(null);
      }
    });
  });
}

function createLiveNetworkTerminal(hostname, ip) {
  return {
    pc: hostname,
    ip: ip,
    mac: 'Relevamiento en red',
    os: 'Estación de Red Activa',
    servicePack: '-',
    cpuModel: 'En línea en red corporativa',
    ram: '-',
    antivirusVersion: '-',
    ieVersion: '-',
    userNt: 'Operador / Red',
    architecture: '-',
    surveyDate: new Date().toLocaleDateString('es-AR'),
    uptimeText: 'Activa en red',
    location: 'Red Corporativa',
    costCenter: '-',
    alerts: [],
    resetHistory: [],
  };
}

module.exports = {
  isIpAddress,
  getNormalizedDomainSuffix,
  resolveNetworkTarget,
  createLiveNetworkTerminal,
};
