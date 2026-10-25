const configManager = require('./configManager.cjs');
const { probeTcpPort } = require('./systemTools.cjs');

function checkDomainMembership(corporateDomain, envObj = process.env) {
  const userDnsDomain = String(envObj.USERDNSDOMAIN || '').trim();
  const userDomain = String(envObj.USERDOMAIN || '').trim();
  const detectedDomain = userDnsDomain || userDomain || 'WORKGROUP';

  if (!corporateDomain || typeof corporateDomain !== 'string' || !corporateDomain.trim()) {
    return { matched: false, detectedDomain };
  }

  const targetFull = corporateDomain.trim().toLowerCase().replace(/^\./, '');
  const targetShort = targetFull.split('.')[0];

  const dnsMatch = Boolean(userDnsDomain && userDnsDomain.toLowerCase() === targetFull);
  const netbiosMatch = Boolean(targetShort && userDomain && userDomain.toLowerCase() === targetShort);

  return {
    matched: dnsMatch || netbiosMatch,
    detectedDomain,
  };
}

async function evaluateSecurityGate(options = {}) {
  const cfg = configManager.getConfig({
    ignoreEnv: options.ignoreEnv,
    skipLocalFiles: options.skipLocalFiles,
  });

  const configured = Boolean(cfg.dbServer && cfg.dbUser && cfg.dbPassword);
  const domainInfo = checkDomainMembership(cfg.corporateDomain, options.env || process.env);

  if (!configured) {
    return {
      authorized: false,
      configured: false,
      domainMatched: false,
      networkReachable: false,
      detectedDomain: domainInfo.detectedDomain,
      reason: 'UNCONFIGURED',
      message:
        'Aplicativo sin configuración corporativa. Vincule el archivo cmda.config.json de la red interna e ingrese su Clave Corporativa.',
    };
  }

  const probeRunner = options.probeFn || probeTcpPort;
  let networkReachable = false;
  try {
    const res = await probeRunner(cfg.dbServer, cfg.dbPort || 1433, options.timeoutMs || 1500);
    networkReachable = Boolean(res && res.open);
  } catch {
    networkReachable = false;
  }

  if (domainInfo.matched || networkReachable) {
    return {
      authorized: true,
      configured: true,
      domainMatched: domainInfo.matched,
      networkReachable,
      detectedDomain: domainInfo.detectedDomain,
      reason: 'AUTHORIZED',
      message:
        domainInfo.matched && networkReachable
          ? 'Entorno corporativo verificado (Dominio AD + Red Corporativa Activa)'
          : domainInfo.matched
          ? 'Autorizado por pertenencia al Dominio Active Directory Corporativo'
          : 'Autorizado por conexión activa a la Red Interna / VPN Corporativa',
    };
  }

  return {
    authorized: false,
    configured: true,
    domainMatched: false,
    networkReachable: false,
    detectedDomain: domainInfo.detectedDomain,
    reason: 'OUTSIDE_CORPORATE_NETWORK',
    message:
      'Acceso denegado: El equipo se encuentra fuera del dominio corporativo y sin conexión activa (LAN/VPN) a la red interna.',
  };
}

async function unlockApplication(configPath, corporateKey = '', options = {}) {
  try {
    configManager.loadConfigFromFile(configPath, corporateKey);
    return await evaluateSecurityGate(options);
  } catch (err) {
    return {
      authorized: false,
      configured: false,
      domainMatched: false,
      networkReachable: false,
      detectedDomain: String((options.env || process.env).USERDNSDOMAIN || (options.env || process.env).USERDOMAIN || 'WORKGROUP'),
      reason: 'UNLOCK_ERROR',
      message: err.message || 'Error al desbloquear la configuración corporativa',
    };
  }
}

module.exports = {
  checkDomainMembership,
  evaluateSecurityGate,
  unlockApplication,
};
