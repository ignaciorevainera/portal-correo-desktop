const fs = require('fs');
const path = require('path');
const os = require('os');
const net = require('net');
const { spawn } = require('child_process');
const configManager = require('./configManager.cjs');

function sanitizeHostOrIp(input) {
  if (!input || typeof input !== 'string') {
    throw new Error('Host inválido: vacío o no es cadena');
  }
  const clean = input.trim();
  if (!clean || clean.length > 255) {
    throw new Error('Host inválido: longitud fuera de límites');
  }

  // Only allow alphanumeric characters, dots, and hyphens (standard hostnames/FQDNs/IPs)
  const validRegex = /^[a-zA-Z0-9.-]+$/;
  if (!validRegex.test(clean)) {
    throw new Error('Host inválido: contiene caracteres no permitidos');
  }

  return clean;
}

function buildVncConfigFile(targetIpOrHost, port = 5901, explicitPassword) {
  const cleanHost = sanitizeHostOrIp(targetIpOrHost);
  const p = Number(port) || 5901;
  const vncPassword =
    explicitPassword !== undefined
      ? explicitPassword
      : configManager.getConfig().vncPassword || '';

  return `[Connection]
HOST=${cleanHost}
UserName=
Password=${vncPassword}
Port=${p}
`;
}

function getVncCommand(vncPath, configPath) {
  return {
    exe: vncPath,
    args: ['/config', configPath],
  };
}

function getMsraCommand(targetIpOrHost) {
  const clean = sanitizeHostOrIp(targetIpOrHost);
  return {
    exe: 'cmd.exe',
    args: ['/c', 'start', '""', 'msra.exe', '/offerRA', clean],
  };
}

/**
 * @param {string} targetIpOrHost
 * @param {number | { count?: number; continuous?: boolean }} [options=1]
 */
function getPingArgs(targetIpOrHost, options = 1) {
  const clean = sanitizeHostOrIp(targetIpOrHost);
  if (typeof options === 'object' && options !== null && options.continuous) {
    return {
      exe: 'ping',
      args: ['-t', clean],
    };
  }
  const count = typeof options === 'number' ? options : (options && options.count) || 4;
  return {
    exe: 'ping',
    args: ['-n', String(count), clean],
  };
}

function getNbtstatArgs(targetIpOrHost) {
  const clean = sanitizeHostOrIp(targetIpOrHost);
  return {
    exe: 'nbtstat',
    args: ['-A', clean],
  };
}

function getTracertArgs(targetIpOrHost, maxHops = 6) {
  const clean = sanitizeHostOrIp(targetIpOrHost);
  const hops = typeof maxHops === 'number' ? maxHops : (maxHops && maxHops.maxHops) || 6;
  return {
    exe: 'tracert',
    args: ['-d', '-h', String(hops), clean],
  };
}

function getArpArgs(targetIpOrHost) {
  const clean = sanitizeHostOrIp(targetIpOrHost);
  return {
    exe: 'arp',
    args: ['-a', clean],
  };
}

function getVncViewerPath() {
  const appPath = path.resolve(__dirname, '..');
  const possiblePaths = [
    path.join(appPath, 'resources', 'bin', 'vncviewer.exe'),
    path.join('C:', 'Cmda', 'vncviewer.exe'),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }
  return 'vncviewer.exe';
}

function probeTcpPort(host, port, timeoutMs = 1200) {
  return new Promise((resolve) => {
    try {
      const cleanHost = sanitizeHostOrIp(host);
      const socket = new net.Socket();
      let resolved = false;

      socket.setTimeout(timeoutMs);

      socket.on('connect', () => {
        if (!resolved) {
          resolved = true;
          socket.destroy();
          resolve({ open: true, port });
        }
      });

      socket.on('timeout', () => {
        if (!resolved) {
          resolved = true;
          socket.destroy();
          resolve({ open: false, port, error: 'TIMEOUT' });
        }
      });

      socket.on('error', (err) => {
        if (!resolved) {
          resolved = true;
          socket.destroy();
          resolve({ open: false, port, error: err.code || 'ERROR' });
        }
      });

      socket.connect(port, cleanHost);
    } catch (err) {
      resolve({ open: false, port, error: err.message });
    }
  });
}

async function probeRemotePorts(host, timeoutMs = 800) {
  const [res5901, res5900, res3389, res135] = await Promise.all([
    probeTcpPort(host, 5901, timeoutMs),
    probeTcpPort(host, 5900, timeoutMs),
    probeTcpPort(host, 3389, timeoutMs),
    probeTcpPort(host, 135, timeoutMs),
  ]);

  let vncPort = null;
  if (res5901.open) {
    vncPort = 5901;
  } else if (res5900.open) {
    vncPort = 5900;
  }

  const msraAvailable = Boolean(res3389.open || res135.open);
  let recommendedMethod = 'none';
  if (vncPort) {
    recommendedMethod = 'vnc';
  } else if (msraAvailable) {
    recommendedMethod = 'msra';
  }

  return {
    host,
    vncPort,
    port5901Open: res5901.open,
    port5900Open: res5900.open,
    msraAvailable,
    recommendedMethod,
  };
}

async function launchRemoteSmart(targetIpOrHost, options = {}) {
  try {
    const cleanHost = sanitizeHostOrIp(targetIpOrHost);
    const probe =
      options.mockProbe || (await probeRemotePorts(cleanHost, options.timeoutMs || 600));

    if (probe.vncPort) {
      const vncLauncher = options.mockLaunchVnc || launchVnc;
      const res = vncLauncher(cleanHost, probe.vncPort);
      return {
        ...res,
        methodUsed: 'vnc',
        portUsed: probe.vncPort,
        probe,
        message: `VNC Viewer iniciado hacia ${cleanHost}:${probe.vncPort}`,
      };
    }

    if (probe.msraAvailable) {
      const msraLauncher = options.mockLaunchMsra || launchMsra;
      const res = msraLauncher(cleanHost);
      return {
        ...res,
        methodUsed: 'msra',
        probe,
        message: `VNC cerrado en ${cleanHost}; se inició Asistencia Remota (MSRA) automáticamente`,
      };
    }

    return {
      success: false,
      methodUsed: 'none',
      vncClosed: true,
      msraAvailable: false,
      probe,
      message: `Sin acceso remoto directo en ${cleanHost} (Puertos VNC 5901/5900 y MSRA cerrados).`,
    };
  } catch (err) {
    return {
      success: false,
      methodUsed: 'none',
      message: `Error al verificar acceso remoto: ${err.message}`,
    };
  }
}

function launchVnc(targetIpOrHost, port = 5901) {
  try {
    const cleanHost = sanitizeHostOrIp(targetIpOrHost);
    const configContent = buildVncConfigFile(cleanHost, port);
    const tempConfigPath = path.join(os.tmpdir(), `cmda_${cleanHost}_${Date.now()}.vnc`);
    fs.writeFileSync(tempConfigPath, configContent, 'utf-8');

    const vncExe = getVncViewerPath();
    const cmd = getVncCommand(vncExe, tempConfigPath);

    const proc = spawn(cmd.exe, cmd.args, {
      detached: true,
      stdio: 'ignore',
    });

    proc.on('error', (err) => {
      console.warn('VNC launch error handled:', err.message);
    });

    proc.unref();

    return { success: true, processId: proc.pid, configPath: tempConfigPath, portUsed: port };
  } catch (err) {
    return { success: false, message: `No se pudo iniciar VNC Viewer: ${err.message}` };
  }
}

async function launchVncSmart(targetIpOrHost, options = {}) {
  try {
    const cleanHost = sanitizeHostOrIp(targetIpOrHost);
    const probe = options.mockProbe || (await probeRemotePorts(cleanHost, options.timeoutMs || 1200));

    if (probe.vncPort) {
      const launcher = options.mockLaunch || launchVnc;
      const res = launcher(cleanHost, probe.vncPort);
      return {
        ...res,
        portUsed: probe.vncPort,
        message: `VNC Viewer iniciado hacia ${cleanHost}:${probe.vncPort}`,
      };
    }

    // Both 5901 and 5900 are closed
    return {
      success: false,
      vncClosed: true,
      msraAvailable: probe.msraAvailable,
      message: `Puertos VNC (5901/5900) cerrados en ${cleanHost}.${
        probe.msraAvailable
          ? ' Asistencia Remota (MSRA / 3389) está disponible en este equipo.'
          : ' El equipo no responde a conexiones remotas directas.'
      }`,
    };
  } catch (err) {
    return {
      success: false,
      message: `Error al verificar puertos VNC: ${err.message}`,
    };
  }
}

function launchMsra(targetIpOrHost) {
  try {
    const cmd = getMsraCommand(targetIpOrHost);
    const proc = spawn(cmd.exe, cmd.args, {
      detached: true,
      stdio: 'ignore',
      shell: false,
    });

    proc.on('error', (err) => {
      console.warn('MSRA launch error handled:', err.message);
    });

    proc.unref();

    return {
      success: true,
      processId: proc.pid,
      message: `Solicitud de Asistencia Remota (MSRA) enviada a ${targetIpOrHost}`,
    };
  } catch (err) {
    return {
      success: false,
      message: `Error al iniciar Asistencia Remota (MSRA): ${err.message}`,
    };
  }
}

function sanitizePingOutput(rawText) {
  if (!rawText || typeof rawText !== 'string') return '';
  return rawText
    // Reemplaza patrones de caracteres corruptos de CP850/CP1252 a UTF-8
    .replace(/Estad[\ufffd\?s]?sticas/gi, 'Estadísticas')
    .replace(/M[\ufffd\?a]?ximo/gi, 'Máximo')
    .replace(/M[\ufffd\?i]?nimo/gi, 'Mínimo')
    .replace(/milise[\ufffd\?]?gundos/gi, 'milisegundos')
    .replace(/perdid[\ufffd\?]?s/gi, 'perdidos')
    .replace(/recibid[\ufffd\?]?s/gi, 'recibidos')
    .replace(/enviad[\ufffd\?]?s/gi, 'enviados')
    .replace(/aproximad[\ufffd\?]?s/gi, 'aproximados');
}

function executeGenericCommand(cmd, toolName, onData, onDone) {
  try {
    const proc = spawn(cmd.exe, cmd.args);

    if (proc.stdout) {
      proc.stdout.on('data', (data) => {
        if (onData) onData(sanitizePingOutput(data.toString()));
      });
    }

    if (proc.stderr) {
      proc.stderr.on('data', (data) => {
        if (onData) onData(sanitizePingOutput(data.toString()));
      });
    }

    proc.on('error', (err) => {
      if (onData) onData(`Error de subproceso ${toolName}: ${err.message}\n`);
      if (onDone) onDone(1);
    });

    proc.on('close', (code) => {
      if (onDone) onDone(code);
    });

    return proc;
  } catch (err) {
    if (onData) onData(`Error al iniciar ${toolName}: ${err.message}\n`);
    if (onDone) onDone(1);
    return null;
  }
}

function executePing(targetIpOrHost, count = 4, onData, onDone) {
  try {
    const cmd = getPingArgs(targetIpOrHost, count);
    return executeGenericCommand(cmd, 'ping', onData, onDone);
  } catch (err) {
    if (onData) onData(`Error al iniciar ping: ${err.message}\n`);
    if (onDone) onDone(1);
    return null;
  }
}

function executeNbtstat(targetIpOrHost, onData, onDone) {
  try {
    const cmd = getNbtstatArgs(targetIpOrHost);
    return executeGenericCommand(cmd, 'nbtstat', onData, onDone);
  } catch (err) {
    if (onData) onData(`Error al iniciar nbtstat: ${err.message}\n`);
    if (onDone) onDone(1);
    return null;
  }
}

function executeTracert(targetIpOrHost, options = 6, onData, onDone) {
  try {
    const cmd = getTracertArgs(targetIpOrHost, options);
    return executeGenericCommand(cmd, 'tracert', onData, onDone);
  } catch (err) {
    if (onData) onData(`Error al iniciar tracert: ${err.message}\n`);
    if (onDone) onDone(1);
    return null;
  }
}

function executeArp(targetIpOrHost, onData, onDone) {
  try {
    const cmd = getArpArgs(targetIpOrHost);
    return executeGenericCommand(cmd, 'arp', onData, onDone);
  } catch (err) {
    if (onData) onData(`Error al iniciar arp: ${err.message}\n`);
    if (onDone) onDone(1);
    return null;
  }
}

module.exports = {
  sanitizeHostOrIp,
  buildVncConfigFile,
  getVncCommand,
  getMsraCommand,
  getPingArgs,
  getNbtstatArgs,
  getTracertArgs,
  getArpArgs,
  getVncViewerPath,
  probeTcpPort,
  probeRemotePorts,
  launchVnc,
  launchVncSmart,
  launchRemoteSmart,
  launchMsra,
  executePing,
  executeNbtstat,
  executeTracert,
  executeArp,
  sanitizePingOutput,
};
