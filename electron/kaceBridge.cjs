/**
 * kaceBridge.cjs
 * Módulo seguro de integración para Quest KACE y Wake-on-LAN (WOL)
 * Desarrollado para Portal Correo Desktop (new-CMDA)
 */

const path = require('path');
const { spawn } = require('child_process');

const MAC_REGEX = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;

const RUNKBOT_ACTIONS = {
  inventory: ['4', '0'],
  cache: ['3', '0'],
  config: ['1', '0'],
  patch: ['6', '0'],
};

function isValidMacAddress(mac) {
  if (typeof mac !== 'string') return false;
  return MAC_REGEX.test(mac.trim());
}

function formatMacForWol(mac) {
  if (!isValidMacAddress(mac)) {
    throw new Error('Dirección MAC inválida para Wake-on-LAN');
  }
  return mac.trim().replace(/:/g, '-').toUpperCase();
}

function buildWolCommand(mac, kaceDir = 'C:\\MDA\\KACE') {
  const formattedMac = formatMacForWol(mac);
  const executable = path.join(kaceDir, 'kwol.exe');
  return {
    executable,
    args: [formattedMac],
  };
}

function buildRunkbotCommand(action, kaceDir = 'C:\\MDA\\KACE') {
  const args = RUNKBOT_ACTIONS[action];
  if (!args) {
    throw new Error(`Acción KACE desconocida: "${action}". Acciones válidas: ${Object.keys(RUNKBOT_ACTIONS).join(', ')}`);
  }
  const executable = path.join(kaceDir, 'runkbot.exe');
  return {
    executable,
    args,
  };
}

function defaultProcessRunner(executable, args) {
  return new Promise((resolve) => {
    try {
      const child = spawn(executable, args, { windowsHide: true });
      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (d) => {
        stdout += d.toString();
      });
      child.stderr.on('data', (d) => {
        stderr += d.toString();
      });

      child.on('close', (code) => {
        resolve({ code: code || 0, stdout, stderr });
      });

      child.on('error', (err) => {
        resolve({ code: -1, stdout, stderr: err.message });
      });
    } catch (err) {
      resolve({ code: -1, stdout: '', stderr: err.message });
    }
  });
}

async function executeWakeOnLan(mac, kaceDir = 'C:\\MDA\\KACE', runner = defaultProcessRunner) {
  try {
    const cmd = buildWolCommand(mac, kaceDir);
    const res = await runner(cmd.executable, cmd.args);
    if (res.code === 0) {
      return { success: true, targetMac: cmd.args[0], output: res.stdout.trim() };
    }
    return { success: false, error: res.stderr || `Proceso falló con código ${res.code}` };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function executeRunkbotAction(action, kaceDir = 'C:\\MDA\\KACE', runner = defaultProcessRunner) {
  try {
    const cmd = buildRunkbotCommand(action, kaceDir);
    const res = await runner(cmd.executable, cmd.args);
    if (res.code === 0) {
      return { success: true, action, output: res.stdout.trim() };
    }
    return { success: false, error: res.stderr || `Proceso falló con código ${res.code}` };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

module.exports = {
  isValidMacAddress,
  formatMacForWol,
  buildWolCommand,
  buildRunkbotCommand,
  executeWakeOnLan,
  executeRunkbotAction,
  RUNKBOT_ACTIONS,
};
