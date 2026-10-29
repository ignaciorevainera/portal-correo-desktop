const SENSITIVE_TOKENS = new Set([
  'password', 'passwd', 'pwd', 'pass', 'passphrase', 'secret', 'token', 'key',
  'apikey', 'accesskey', 'privatekey', 'credential', 'credentials',
  'clave', 'contras', 'contrasena', 'contraseña',
  'authorization', 'cookie',
]);

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const ROUTE = { debug: 'log', info: 'log', warn: 'warn', error: 'error' };
const MAX_LINE_LENGTH = 8192;

const KEY_VALUE_PATTERN = /(?<key>"[^"]+"|'[^']+'|[\p{L}0-9_.\-[\]]+)\s*(?<sep>[=:])\s*(?:"[^"]*"|'[^']*'|[^;\s,}{]+)/gu;
const AUTH_HEADER_PATTERN = /\b(authorization|proxy-authorization|cookie|set-cookie)\s*([:=])\s*([^\r\n]+)/gi;
const URL_CREDENTIAL_PATTERN = /(\/\/[^/\s:@]+:)([^@\s]+)(@)/g;
const AUTH_SCHEME_PATTERN = /\b(Basic|Bearer|Digest|Negotiate|NTLM)\s+([A-Za-z0-9._~+/=-]+)/gi;

function tokenizeKey(key) {
  return String(key)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[^\p{L}0-9]+/u)
    .filter(Boolean)
    .map((token) => token.toLowerCase());
}

function isSensitiveToken(token) {
  if (SENSITIVE_TOKENS.has(token)) return true;
  if (token.endsWith('s')) return SENSITIVE_TOKENS.has(token.slice(0, -1));
  return false;
}

function isSensitiveKey(key) {
  return tokenizeKey(key).some(isSensitiveToken);
}

function scrubString(value) {
  let out = String(value);

  out = out.replace(AUTH_HEADER_PATTERN, (_match, header, separator) => `${header}${separator}[redactado]`);

  out = out.replace(KEY_VALUE_PATTERN, (match, key, separator) => {
    const cleanKey = key.replace(/^["']|["']$/g, '');
    return isSensitiveKey(cleanKey) ? `${key}${separator}[redactado]` : match;
  });

  out = out.replace(URL_CREDENTIAL_PATTERN, '$1[redactado]$3');
  out = out.replace(AUTH_SCHEME_PATTERN, '$1 [redactado]');

  return out.replace(/\r?\n/g, '\\n');
}

function normalizeLeaf(value) {
  if (value instanceof Error) {
    return { name: value.name, message: scrubString(value.message), code: value.code };
  }
  if (Buffer.isBuffer(value)) return `<Buffer ${value.length} bytes>`;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'function') return '[función omitida]';
  return value;
}

function redact(value, depth = 0) {
  if (depth > 4) return '[profundidad máxima]';
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1));
  if (typeof value === 'string') return scrubString(value);
  if (typeof value !== 'object') return normalizeLeaf(value);
  if (value instanceof Error || Buffer.isBuffer(value) || value instanceof Date) {
    return normalizeLeaf(value);
  }

  const result = Object.create(null);
  const descriptors = Object.getOwnPropertyDescriptors(value);

  for (const key of Object.keys(descriptors)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
    const descriptor = descriptors[key];
    if (!('value' in descriptor)) {
      result[key] = '[getter omitido]';
      continue;
    }
    if (typeof descriptor.value === 'function') {
      result[key] = '[función omitida]';
      continue;
    }
    result[key] = isSensitiveKey(key) ? '[redactado]' : redact(descriptor.value, depth + 1);
  }

  return result;
}

function formatLine(level, scope, message, meta) {
  const base = `[${new Date().toISOString()}] [${String(level).toUpperCase()}] [${scrubString(scope)}] ${scrubString(message)}`;
  if (meta === null || meta === undefined) return base;

  const payload = typeof meta === 'object' ? meta : { meta };

  let serialized;
  try {
    serialized = JSON.stringify(redact(payload));
  } catch {
    serialized = '[meta no serializable]';
  }

  const line = `${base} ${serialized}`;
  if (line.length <= MAX_LINE_LENGTH) return line;
  return `${line.slice(0, MAX_LINE_LENGTH)}…[truncado]`;
}

function createLogger({ scope = 'app', sink = console, level = 'info' } = {}) {
  const minLevel = LEVELS[String(level).toLowerCase()] ?? LEVELS.info;

  const write = (lvl, message, meta) => {
    if (LEVELS[lvl] < minLevel) return;

    let line;
    try {
      line = formatLine(lvl, scope, message, meta);
    } catch {
      line = `[${new Date().toISOString()}] [${lvl.toUpperCase()}] [${scrubString(scope)}] [fallo al formatear la entrada]`;
    }

    const method = ROUTE[lvl];
    const emit = typeof sink[method] === 'function' ? sink[method] : sink.log;
    if (typeof emit !== 'function') return;

    try {
      emit.call(sink, line);
    } catch {
      // Un logger nunca debe interrumpir el flujo que está registrando.
    }
  };

  return {
    debug: (message, meta) => write('debug', message, meta),
    info: (message, meta) => write('info', message, meta),
    warn: (message, meta) => write('warn', message, meta),
    error: (message, meta) => write('error', message, meta),
    child: (childScope) => createLogger({ scope: `${scope}:${childScope}`, sink, level }),
  };
}

module.exports = {
  SENSITIVE_TOKENS,
  LEVELS,
  tokenizeKey,
  isSensitiveToken,
  isSensitiveKey,
  scrubString,
  redact,
  formatLine,
  createLogger,
};
