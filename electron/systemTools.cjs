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

function getPingArgs(targetIpOrHost, count = 1) {
  const clean = sanitizeHostOrIp(targetIpOrHost);
  return {
    exe: 'ping',
    args: ['-n', String(count), clean],
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

async function probeRemotePorts(host, timeoutMs = 1200) {
  const [res5901, res5900, res3389] = await Promise.all([
    probeTcpPort(host, 5901, timeoutMs),
    probeTcpPort(host, 5900, timeoutMs),
    probeTcpPort(host, 3389, timeoutMs),
  ]);

  let vncPort = null;
  if (res5901.open) {
    vncPort = 5901;
  } else if (res5900.open) {
    vncPort = 5900;
  }

  return {
    host,
    vncPort,
    port5901Open: res5901.open,
    port5900Open: res5900.open,
    msraAvailable: res3389.open,
  };
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

function executePing(targetIpOrHost, count = 4, onData, onDone) {
  try {
    const cmd = getPingArgs(targetIpOrHost, count);
    const proc = spawn(cmd.exe, cmd.args);

    if (proc.stdout) {
      proc.stdout.on('data', (data) => {
        if (onData) onData(data.toString());
      });
    }

    if (proc.stderr) {
      proc.stderr.on('data', (data) => {
        if (onData) onData(data.toString());
      });
    }

    proc.on('error', (err) => {
      if (onData) onData(`Error de subproceso ping: ${err.message}\n`);
      if (onDone) onDone(1);
    });

    proc.on('close', (code) => {
      if (onDone) onDone(code);
    });

    return proc;
  } catch (err) {
    if (onData) onData(`Error al iniciar ping: ${err.message}\n`);
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
  getVncViewerPath,
  probeTcpPort,
  probeRemotePorts,
  launchVnc,
  launchVncSmart,
  launchMsra,
  executePing,
};
