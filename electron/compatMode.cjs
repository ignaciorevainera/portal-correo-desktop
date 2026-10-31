const RELAUNCH_FLAG = 'PCD_RELAUNCHED_WITHOUT_SANDBOX';

function isCompatEnabled(env = process.env) {
  return /^(1|true|yes|on)$/i.test(String(env.PCD_COMPAT_MODE || '').trim());
}

/**
 * Decide si conviene relanzar sin sandbox tras un fallo de lanzamiento de proceso hijo.
 * No relanza si ya se relanzó, si ya corre sin sandbox o si el modo compatibilidad está pedido.
 */
function shouldRetryWithoutSandbox(options = {}) {
  const env = options.env || process.env;
  const argv = Array.isArray(options.argv) ? options.argv : process.argv;

  if (String(env[RELAUNCH_FLAG] || '') === '1') return false;
  if (argv.includes('--no-sandbox')) return false;
  if (isCompatEnabled(env)) return false;

  return true;
}

function buildRelaunchArgs(argv = process.argv) {
  return [...argv.slice(1), '--no-sandbox'];
}

module.exports = { RELAUNCH_FLAG, isCompatEnabled, shouldRetryWithoutSandbox, buildRelaunchArgs };
