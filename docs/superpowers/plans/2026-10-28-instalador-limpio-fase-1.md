# Instalador limpio — Fase 1: Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que el instalador publicado no contenga ningún secreto y que la aplicación obtenga su configuración de un share corporativo, bloqueándose por completo cuando no lo alcanza.

**Architecture:** La configuración se lee en tiempo de ejecución desde `\\<HOST>\portal-correo-desktop-config$\portal-correo-desktop.config.json` mediante un `ConfigProvider` con contrato único. El gate de arranque se reduce a una pregunta: ¿pudo leer la configuración? Los consumidores (`dbService`, `systemTools`, `dnsResolver`) no cambian su contrato: siguen leyendo de `configManager.getConfig()`, que pasa a ser un store en memoria sin acceso a disco.

**Tech Stack:** Electron 34, React 19, TypeScript 5.7, Vitest 3, electron-builder 26, Node 20+ (módulos `.cjs` en `electron/`).

**Spec:** `docs/superpowers/specs/2026-10-28-instalador-limpio-config-por-identidad-design.md`

---

## Prerrequisitos

- [ ] Dependencias instaladas y suite verde antes de empezar.

```bash
npm install
npx vitest run
```

Expected: `Test Files  N passed` sin fallos. Si algo falla antes de tocar nada, resolverlo primero.

- [ ] Rama de trabajo:

```bash
git checkout -b feat/instalador-limpio-fase-1
```

- [ ] Recordatorio de seguridad: **no escribir en ningún archivo versionado** el nombre real del host, el dominio corporativo ni IPs del rango `10.254/220/210`. `src/test/securityAudit.test.ts` falla si aparecen. Usar siempre `<HOST>` y `<dominio>`.

---

## Mapa de archivos

**Nuevos:**

| Archivo | Responsabilidad |
| --- | --- |
| `electron/logger.cjs` | Logger con redacción de campos sensibles |
| `electron/bootstrap.cjs` | Lectura de `bootstrap.json` de máquina |
| `electron/configProvider.cjs` | Contrato de proveedor, validación de esquema, errores tipados |
| `electron/migration.cjs` | Borrado de configuración heredada en texto plano |
| `src/components/BlockedScreen.tsx` | Pantalla de bloqueo con diagnóstico |
| `src/test/logger.test.ts` | Pruebas de redacción |
| `src/test/bootstrap.test.ts` | Pruebas de resolución de bootstrap |
| `src/test/configProvider.test.ts` | Pruebas de contrato y validación |
| `src/test/migration.test.ts` | Pruebas de migración |
| `src/test/artifactSecrets.test.ts` | Escaneo del artefacto empaquetado |
| `scripts/prepare-bootstrap.cjs` | Inyecta `bootstrap.default.json` en el build |

**Modificados:**

| Archivo | Cambio |
| --- | --- |
| `electron/configManager.cjs` | Pasa a store en memoria; se elimina todo el acceso a disco |
| `electron/securityGate.cjs` | Reescritura completa: máquina de estados sobre el proveedor |
| `electron/main.cjs` | Cableado del gate, eliminación de la config embebida y de los IPC de importación |
| `electron/preload.cjs` | Canales `pcd:*` |
| `electron/systemTools.cjs` | VNC con secreto explícito y limpieza de temporales |
| `electron/updaterService.cjs` | Verificación SHA-256 de la descarga |
| `src/services/electronClient.ts` | Nuevo tipo `GateStatus` y funciones del gate |
| `src/types/electron-modules.d.ts` | Tipos de los módulos nuevos |
| `src/App.tsx` | Montaje del gate y de la pantalla de bloqueo |
| `src/components/SettingsModal.tsx` | La sección de configuración pasa a diagnóstico |
| `package.json` | `files` con `resources/**/*` y `public/**/*`; se elimina `release:internal` |
| `src/services/securityGate.test.ts` | Reescritura |
| `src/services/configManager.test.ts` | Reescritura |
| `src/test/internalReleasePackaging.test.ts` | Reescritura |
| `README.md` | Documentación del modelo nuevo |

**Eliminados:**

| Archivo | Motivo |
| --- | --- |
| `scripts/build-internal.cjs` | Es la fuente del empaquetado de secretos |
| `src/test/corporateConfigDiscovery.test.ts` | Prueba funciones de disco que dejan de existir |

---

## Task 1: Logger con redacción

> **Fuente canónica:** `electron/logger.cjs` en el commit `f417a90`. El bloque de código de abajo refleja esa versión; si alguna vez divergen, manda el archivo, no el plan.

**Files:**
- Create: `electron/logger.cjs`
- Test: `src/test/logger.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/test/logger.test.ts`:

```ts
import { describe, it, expect } from 'vitest';

const { redact, formatLine, createLogger } = require('../../electron/logger.cjs');

function sinkEspia() {
  const lineas: string[] = [];
  const sink = {
    log: (l: string) => lineas.push(l),
    warn: (l: string) => lineas.push(l),
    error: (l: string) => lineas.push(l),
  };
  return { lineas, sink };
}

describe('logger con redacción de secretos', () => {
  it('redacta claves sensibles en objetos anidados y arrays', () => {
    const out = redact({
      db: { dbPassword: 'SuperSecreto123', host: 'sql.interno' },
      vncPassword: 'clave-vnc',
      lista: [{ token: 'abc' }],
      visible: 'ok',
    });

    const serializado = JSON.stringify(out);
    expect(serializado).not.toContain('SuperSecreto123');
    expect(serializado).not.toContain('clave-vnc');
    expect(serializado).not.toContain('abc');
    expect(out.db.host).toBe('sql.interno');
    expect(out.visible).toBe('ok');
    expect(out.lista[0].token).toBe('[redactado]');
  });

  it('redacta accessKey, key, dbPass y clave (camelCase y separadores)', () => {
    const out = redact({
      accessKey: 'K1',
      key: 'K2',
      dbPass: 'K3',
      clave: 'K4',
      api_key: 'K5',
      privateKey: 'K6',
      ACCESS_KEY: 'K7',
      keyboard: 'no-es-secreto',
    });

    for (const clave of ['accessKey', 'key', 'dbPass', 'clave', 'api_key', 'privateKey', 'ACCESS_KEY']) {
      expect(out[clave]).toBe('[redactado]');
    }
    expect(out.keyboard).toBe('no-es-secreto');
  });

  it('redacta plurales y variantes en español', () => {
    const out = redact({
      apiKeys: 'P1',
      keys: 'P2',
      tokens: 'P3',
      passwords: 'P4',
      passphrase: 'P5',
      contraseña: 'P6',
      authorization: 'P7',
      'set-cookie': 'P8',
    });

    for (const clave of ['apiKeys', 'keys', 'tokens', 'passwords', 'passphrase', 'contraseña', 'authorization', 'set-cookie']) {
      expect(out[clave]).toBe('[redactado]');
    }
  });

  it('redacta credenciales que viajan en el mensaje de un Error', () => {
    const linea = formatLine('error', 'db', 'fallo de conexión', {
      err: new Error('Login failed: Server=sql;Password=MARKER123;'),
    });

    expect(linea).not.toContain('MARKER123');
    expect(linea).toContain('fallo de conexión');
  });

  it('redacta Authorization Basic, Bearer y cookies', () => {
    const linea = formatLine('info', 'http', 'petición', {
      headers: {
        Authorization: 'Basic dXNlcjpwYXNzd29yZA==',
        Cookie: 'session=abc123',
      },
      mensaje: 'Authorization: Bearer TOKEN123',
    });

    expect(linea).not.toContain('dXNlcjpwYXNzd29yZA==');
    expect(linea).not.toContain('abc123');
    expect(linea).not.toContain('TOKEN123');
  });

  it('redacta JSON embebido en un string con claves entrecomilladas', () => {
    const linea = formatLine('info', 'cfg', 'config={"dbPassword":"JSONP6","apiKey":"JSONP7"}', {
      raw: '{"secret":"JSONP3"}',
    });

    expect(linea).not.toContain('JSONP3');
    expect(linea).not.toContain('JSONP6');
    expect(linea).not.toContain('JSONP7');
  });

  it('limpia secretos embebidos en el mensaje y en strings', () => {
    const linea = formatLine('info', 'gate', 'conectando pwd=SuperSecreto123 y Bearer abc.def', {
      conn: 'Server=sql;Password=OtraClave;',
      url: 'https://user:claveEnUrl@host/path',
    });

    expect(linea).not.toContain('SuperSecreto123');
    expect(linea).not.toContain('abc.def');
    expect(linea).not.toContain('OtraClave');
    expect(linea).not.toContain('claveEnUrl');
    expect(linea).toContain('[redactado]');
  });

  it('redacta claves con acentos en texto libre y en mensajes de Error', () => {
    const linea = formatLine('error', 'db', 'contraseña=ACENT1 y Contraseña=ACENT2', {
      c: 'contraseña=ACENT3',
      err: new Error('CONTRASEÑA=ACENT4'),
    });

    for (const secreto of ['ACENT1', 'ACENT2', 'ACENT3', 'ACENT4']) {
      expect(linea).not.toContain(secreto);
    }
    expect(linea).toContain('[redactado]');
  });

  it('no imprime valores sensibles pero conserva el contexto', () => {
    const linea = formatLine('info', 'gate', 'arranque', {
      dbPassword: 'SuperSecreto123',
      configPath: '\\\\host\\share\\portal-correo-desktop.config.json',
    });

    expect(linea).not.toContain('SuperSecreto123');
    expect(linea).toContain('[redactado]');
    expect(linea).toContain('portal-correo-desktop.config.json');
  });

  it('no lanza con BigInt, Error, Date ni getters que explotan', () => {
    const conGetter = {};
    Object.defineProperty(conGetter, 'peligroso', {
      enumerable: true,
      get() {
        throw new Error('getter explosivo');
      },
    });

    const linea = formatLine('error', 'gate', 'meta rara', {
      n: 1n,
      err: new Error('fallo'),
      fecha: new Date('2026-01-01T00:00:00.000Z'),
      conGetter,
    });

    expect(linea).toContain('"n":"1"');
    expect(linea).toContain('fallo');
    expect(linea).toContain('[getter omitido]');
  });

  it('neutraliza un toJSON propio y las funciones', () => {
    const linea = formatLine('info', 'gate', 'objeto hostil', {
      id: 1,
      toJSON() {
        return { password: 'FILTRADO' };
      },
    });

    expect(linea).not.toContain('FILTRADO');
    expect(linea).toContain('[función omitida]');
  });

  it('respeta el nivel mínimo y enruta cada nivel a su método', () => {
    const { lineas, sink } = sinkEspia();
    const log = createLogger({ scope: 'test', sink, level: 'warn' });

    log.info('no aparece');
    log.debug('tampoco');
    log.warn('sí aparece');
    log.error('también');

    expect(lineas).toHaveLength(2);
    expect(lineas[0]).toContain('sí aparece');
    expect(lineas[1]).toContain('también');
  });

  it('child compone el scope', () => {
    const { lineas, sink } = sinkEspia();
    const log = createLogger({ scope: 'main', sink, level: 'info' }).child('gate');
    log.info('mensaje');
    expect(lineas[0]).toContain('[main:gate]');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/test/logger.test.ts
```

Expected: FAIL con `Cannot find module '../../electron/logger.cjs'`.

- [ ] **Step 3: Write minimal implementation**

Create `electron/logger.cjs`:

```js
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
      line = `[${new Date().toISOString()}] [${lvl.toUpperCase()}] [${scope}] [fallo al formatear la entrada]`;
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
```

> **Nota de diseño:** la detección es por *tokens* y no por substring. `accessKey` se parte en `access` + `key` y matchea; `keyboard` queda como un token y no se redacta. Un regex de substring con `key` habría enmascarado `keyboard` y cualquier palabra que la contenga.

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/test/logger.test.ts
```

Expected: PASS, 12 tests.

- [ ] **Step 5: Commit**

```bash
git add electron/logger.cjs src/test/logger.test.ts
git commit -m "feat(electron): logger con redaccion de secretos"
```

---

## Task 2: Bootstrap de máquina

**Files:**
- Create: `electron/bootstrap.cjs`
- Test: `src/test/bootstrap.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/test/bootstrap.test.ts`:

```ts
import { describe, it, expect } from 'vitest';

const { DEFAULTS, getBootstrapPath, normalizeBootstrap, loadBootstrap } = require('../../electron/bootstrap.cjs');

describe('bootstrap de máquina', () => {
  it('compone la ruta dentro de ProgramData con la nomenclatura del producto', () => {
    const ruta = getBootstrapPath('C:\\ProgramData');
    expect(ruta).toContain('portal-correo-desktop');
    expect(ruta.endsWith('bootstrap.json')).toBe(true);
  });

  it('normaliza valores faltantes sobre los defaults', () => {
    const cfg = normalizeBootstrap({ uncConfigPath: '\\\\host\\share\\portal-correo-desktop.config.json' });
    expect(cfg.configSource).toBe('unc');
    expect(cfg.uncConfigPath).toBe('\\\\host\\share\\portal-correo-desktop.config.json');
    expect(cfg.retryIntervalMs).toBe(DEFAULTS.retryIntervalMs);
  });

  it('prioriza ProgramData sobre el directorio del ejecutable', () => {
    const archivos: Record<string, string> = {
      'C:\\ProgramData\\portal-correo-desktop\\bootstrap.json': JSON.stringify({ uncConfigPath: '\\\\host\\desde-programdata' }),
      'C:\\App\\bootstrap.json': JSON.stringify({ uncConfigPath: '\\\\host\\desde-exe' }),
    };

    const cfg = loadBootstrap({
      programDataDir: 'C:\\ProgramData',
      exeDir: 'C:\\App',
      existsSync: (p: string) => Boolean(archivos[p]),
      readFileSync: (p: string) => archivos[p],
    });

    expect(cfg.uncConfigPath).toBe('\\\\host\\desde-programdata');
    expect(cfg._found).toBe(true);
  });

  it('cae al directorio del ejecutable si ProgramData no tiene archivo', () => {
    const archivos: Record<string, string> = {
      'C:\\App\\bootstrap.json': JSON.stringify({ uncConfigPath: '\\\\host\\desde-exe' }),
    };

    const cfg = loadBootstrap({
      programDataDir: 'C:\\ProgramData',
      exeDir: 'C:\\App',
      existsSync: (p: string) => Boolean(archivos[p]),
      readFileSync: (p: string) => archivos[p],
    });

    expect(cfg.uncConfigPath).toBe('\\\\host\\desde-exe');
  });

  it('devuelve defaults y _found=false cuando no hay archivo', () => {
    const cfg = loadBootstrap({
      programDataDir: 'C:\\ProgramData',
      exeDir: 'C:\\App',
      existsSync: () => false,
      readFileSync: () => '',
    });

    expect(cfg._found).toBe(false);
    expect(cfg.uncConfigPath).toBe('');
    expect(cfg.retryIntervalMs).toBe(DEFAULTS.retryIntervalMs);
  });

  it('ignora un archivo corrupto y sigue con el siguiente candidato', () => {
    const archivos: Record<string, string> = {
      'C:\\ProgramData\\portal-correo-desktop\\bootstrap.json': '{ esto no es json',
      'C:\\App\\bootstrap.json': JSON.stringify({ uncConfigPath: '\\\\host\\valido' }),
    };

    const cfg = loadBootstrap({
      programDataDir: 'C:\\ProgramData',
      exeDir: 'C:\\App',
      existsSync: (p: string) => Boolean(archivos[p]),
      readFileSync: (p: string) => archivos[p],
    });

    expect(cfg.uncConfigPath).toBe('\\\\host\\valido');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/test/bootstrap.test.ts
```

Expected: FAIL con `Cannot find module '../../electron/bootstrap.cjs'`.

- [ ] **Step 3: Write minimal implementation**

Create `electron/bootstrap.cjs`:

```js
const fs = require('fs');
const path = require('path');

const BOOTSTRAP_DIR = 'portal-correo-desktop';
const BOOTSTRAP_FILE = 'bootstrap.json';

const DEFAULTS = {
  configSource: 'unc',
  uncConfigPath: '',
  updateFeed: '',
  updateMirror: '',
  retryIntervalMs: 15000,
};

function getBootstrapPath(programDataDir) {
  return path.join(programDataDir, BOOTSTRAP_DIR, BOOTSTRAP_FILE);
}

function normalizeBootstrap(raw, defaults = DEFAULTS) {
  const merged = { ...defaults, ...(raw && typeof raw === 'object' ? raw : {}) };
  const retry = Number(merged.retryIntervalMs);
  return {
    configSource: String(merged.configSource || 'unc').trim(),
    uncConfigPath: String(merged.uncConfigPath || '').trim(),
    updateFeed: String(merged.updateFeed || '').trim(),
    updateMirror: String(merged.updateMirror || '').trim(),
    retryIntervalMs: Number.isFinite(retry) && retry >= 1000 ? retry : defaults.retryIntervalMs,
  };
}

function loadBootstrap(options = {}) {
  const {
    programDataDir,
    exeDir,
    existsSync = fs.existsSync,
    readFileSync = (file) => fs.readFileSync(file, 'utf8'),
    defaults = DEFAULTS,
  } = options;

  const candidates = [];
  if (programDataDir) candidates.push(getBootstrapPath(programDataDir));
  if (exeDir) candidates.push(path.join(exeDir, BOOTSTRAP_FILE));

  for (const file of candidates) {
    if (!existsSync(file)) continue;
    try {
      const parsed = JSON.parse(readFileSync(file));
      return { ...normalizeBootstrap(parsed, defaults), _path: file, _found: true };
    } catch {
      // Archivo ilegible o JSON inválido: se prueba el siguiente candidato.
    }
  }

  return { ...normalizeBootstrap({}, defaults), _path: candidates[0] || '', _found: false };
}

module.exports = { BOOTSTRAP_DIR, BOOTSTRAP_FILE, DEFAULTS, getBootstrapPath, normalizeBootstrap, loadBootstrap };
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/test/bootstrap.test.ts
```

Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add electron/bootstrap.cjs src/test/bootstrap.test.ts
git commit -m "feat(electron): lectura de bootstrap.json de maquina"
```

---

## Task 3: ConfigProvider y validación de esquema

**Files:**
- Create: `electron/configProvider.cjs`
- Test: `src/test/configProvider.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/test/configProvider.test.ts`:

```ts
import { describe, it, expect } from 'vitest';

const {
  ConfigError,
  mapFsError,
  validateCorporateConfig,
  UncConfigProvider,
  DevEnvConfigProvider,
  createConfigProvider,
} = require('../../electron/configProvider.cjs');

const CONFIG_VALIDA = {
  dbServer: 'sql.interno',
  dbDatabase: 'Inventario',
  dbUser: 'operador_lectura',
  dbPassword: 'clave-sql',
  dbPort: 1433,
  corporateDomain: 'dominio.interno',
  vncPassword: 'clave-vnc',
  authMode: 'static-sql',
};

describe('configProvider', () => {
  it('mapea errores de sistema de archivos a códigos del gate', () => {
    expect(mapFsError({ code: 'ENOENT' })).toBe('NO_CONFIG');
    expect(mapFsError({ code: 'EACCES' })).toBe('NO_PERMISSION');
    expect(mapFsError({ code: 'EPERM' })).toBe('NO_PERMISSION');
    expect(mapFsError({ code: 'ETIMEDOUT' })).toBe('NO_LAN_TIMEOUT');
    expect(mapFsError({ code: 'ENOTFOUND' })).toBe('NO_LAN_DNS');
    expect(mapFsError({ code: 'EAI_AGAIN' })).toBe('NO_LAN_DNS');
    expect(mapFsError({ code: 'ENETUNREACH' })).toBe('NO_LAN_ROUTE');
    expect(mapFsError({ code: 'ECONNREFUSED' })).toBe('NO_LAN_ROUTE');
    expect(mapFsError({ code: 'RARO' })).toBe('UNKNOWN');
  });

  it('rechaza configuración sin campos obligatorios', () => {
    expect(() => validateCorporateConfig({ dbServer: 'sql.interno' })).toThrow(ConfigError);
    try {
      validateCorporateConfig({ dbServer: 'sql.interno' });
    } catch (err: any) {
      expect(err.code).toBe('BAD_CONFIG');
    }
  });

  it('rechaza authMode desconocido', () => {
    try {
      validateCorporateConfig({ ...CONFIG_VALIDA, authMode: 'magia' });
      throw new Error('debió fallar');
    } catch (err: any) {
      expect(err.code).toBe('BAD_CONFIG');
    }
  });

  it('rechaza static-sql sin dbPassword', () => {
    try {
      validateCorporateConfig({ ...CONFIG_VALIDA, dbPassword: '' });
      throw new Error('debió fallar');
    } catch (err: any) {
      expect(err.code).toBe('BAD_CONFIG');
    }
  });

  it('normaliza puerto por defecto y espacios', () => {
    const cfg = validateCorporateConfig({ ...CONFIG_VALIDA, dbServer: '  sql.interno  ', dbPort: undefined });
    expect(cfg.dbServer).toBe('sql.interno');
    expect(cfg.dbPort).toBe(1433);
  });

  it('getConfig no expone la clave VNC', async () => {
    const provider = new UncConfigProvider({
      configPath: '\\\\host\\share\\portal-correo-desktop.config.json',
      readFile: async () => JSON.stringify(CONFIG_VALIDA),
    });

    const cfg = await provider.getConfig();
    expect(cfg.dbServer).toBe('sql.interno');
    expect((cfg as any).vncPassword).toBeUndefined();
  });

  it('getVncSecret devuelve la clave y falla con SECRET_UNAVAILABLE si no existe', async () => {
    const provider = new UncConfigProvider({
      configPath: '\\\\host\\share\\portal-correo-desktop.config.json',
      readFile: async () => JSON.stringify(CONFIG_VALIDA),
    });
    await expect(provider.getVncSecret()).resolves.toBe('clave-vnc');

    const sinVnc = new UncConfigProvider({
      configPath: '\\\\host\\share\\portal-correo-desktop.config.json',
      readFile: async () => JSON.stringify({ ...CONFIG_VALIDA, vncPassword: '' }),
    });
    try {
      await sinVnc.getVncSecret();
      throw new Error('debió fallar');
    } catch (err: any) {
      expect(err.code).toBe('SECRET_UNAVAILABLE');
    }
  });

  it('traduce un error ENOENT de lectura a NO_CONFIG', async () => {
    const provider = new UncConfigProvider({
      configPath: '\\\\host\\share\\portal-correo-desktop.config.json',
      readFile: async () => {
        const err: any = new Error('no existe');
        err.code = 'ENOENT';
        throw err;
      },
    });

    try {
      await provider.getConfig();
      throw new Error('debió fallar');
    } catch (err: any) {
      expect(err.code).toBe('NO_CONFIG');
    }
  });

  it('traduce un JSON inválido a BAD_CONFIG', async () => {
    const provider = new UncConfigProvider({
      configPath: '\\\\host\\share\\portal-correo-desktop.config.json',
      readFile: async () => 'no soy json',
    });

    try {
      await provider.getConfig();
      throw new Error('debió fallar');
    } catch (err: any) {
      expect(err.code).toBe('BAD_CONFIG');
    }
  });

  it('DevEnvConfigProvider lee variables PCD_ del entorno', async () => {
    const provider = new DevEnvConfigProvider({
      env: {
        PCD_DB_SERVER: 'sql.dev',
        PCD_DB_NAME: 'DevDB',
        PCD_DB_USER: 'dev_user',
        PCD_DB_PASSWORD: 'dev_pass',
        PCD_CORP_DOMAIN: 'dominio.dev',
        PCD_VNC_PASSWORD: 'vnc_dev',
      },
    });

    const cfg = await provider.getConfig();
    expect(cfg.dbServer).toBe('sql.dev');
    expect(cfg.dbPort).toBe(1433);
    await expect(provider.getVncSecret()).resolves.toBe('vnc_dev');
  });

  it('createConfigProvider devuelve DevEnv en desarrollo y UNC en producción', () => {
    const dev = createConfigProvider({ uncConfigPath: '\\\\host\\x.json' }, { isPackaged: false });
    expect(dev.source).toBe('dev');

    const prod = createConfigProvider({ uncConfigPath: '\\\\host\\x.json' }, { isPackaged: true });
    expect(prod.source).toBe('unc');
  });

  it('createConfigProvider falla con NO_CONFIG si producción no define ruta', () => {
    try {
      createConfigProvider({ uncConfigPath: '' }, { isPackaged: true });
      throw new Error('debió fallar');
    } catch (err: any) {
      expect(err.code).toBe('NO_CONFIG');
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/test/configProvider.test.ts
```

Expected: FAIL con `Cannot find module '../../electron/configProvider.cjs'`.

- [ ] **Step 3: Write minimal implementation**

Create `electron/configProvider.cjs`:

```js
const fs = require('fs');

const AUTH_MODES = ['static-sql', 'session-sql', 'integrated'];

class ConfigError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'ConfigError';
    this.code = code;
    this.details = details;
  }
}

function mapFsError(err) {
  const code = err && err.code;
  if (code === 'ENOENT' || code === 'ENOTDIR') return 'NO_CONFIG';
  if (code === 'EACCES' || code === 'EPERM') return 'NO_PERMISSION';
  if (code === 'ETIMEDOUT' || code === 'ESOCKETTIMEDOUT') return 'NO_LAN_TIMEOUT';
  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') return 'NO_LAN_DNS';
  if (code === 'ENETUNREACH' || code === 'EHOSTUNREACH' || code === 'ECONNREFUSED' || code === 'ECONNRESET') {
    return 'NO_LAN_ROUTE';
  }
  return 'UNKNOWN';
}

function validateCorporateConfig(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new ConfigError('BAD_CONFIG', 'El archivo de configuración no contiene un objeto JSON válido');
  }

  const port = Number(raw.dbPort);
  const authMode = String(raw.authMode || 'static-sql').trim();
  const cfg = {
    dbServer: String(raw.dbServer || '').trim(),
    dbDatabase: String(raw.dbDatabase || '').trim(),
    dbUser: String(raw.dbUser || '').trim(),
    dbPassword: String(raw.dbPassword || '').trim(),
    dbPort: Number.isFinite(port) && port > 0 ? port : 1433,
    corporateDomain: String(raw.corporateDomain || '').trim(),
    vncPassword: String(raw.vncPassword || '').trim(),
    authMode,
  };

  if (!cfg.dbServer || !cfg.dbUser) {
    throw new ConfigError('BAD_CONFIG', 'Faltan campos obligatorios: dbServer y dbUser');
  }
  if (!AUTH_MODES.includes(cfg.authMode)) {
    throw new ConfigError('BAD_CONFIG', `authMode desconocido: ${cfg.authMode}`);
  }
  if (cfg.authMode === 'static-sql' && !cfg.dbPassword) {
    throw new ConfigError('BAD_CONFIG', 'authMode static-sql requiere dbPassword');
  }

  return cfg;
}

class UncConfigProvider {
  constructor({ configPath, readFile = fs.promises.readFile, logger = null } = {}) {
    this.configPath = configPath;
    this.readFile = readFile;
    this.logger = logger;
  }

  get source() {
    return 'unc';
  }

  describe() {
    return { source: this.source, target: this.configPath };
  }

  async readFull() {
    let content;
    try {
      content = await this.readFile(this.configPath, 'utf8');
    } catch (err) {
      throw new ConfigError(mapFsError(err), `No se pudo leer la configuración: ${err && err.message}`, {
        path: this.configPath,
      });
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new ConfigError('BAD_CONFIG', 'El archivo de configuración no es JSON válido', { path: this.configPath });
    }

    return validateCorporateConfig(parsed);
  }

  async getConfig() {
    const full = await this.readFull();
    const { vncPassword, ...config } = full;
    return config;
  }

  async getVncSecret() {
    const full = await this.readFull();
    if (!full.vncPassword) {
      throw new ConfigError('SECRET_UNAVAILABLE', 'La configuración no incluye clave VNC', { path: this.configPath });
    }
    return full.vncPassword;
  }
}

class DevEnvConfigProvider {
  constructor({ env = process.env, localConfigPath = '' } = {}) {
    this.env = env;
    this.localConfigPath = localConfigPath;
  }

  get source() {
    return 'dev';
  }

  describe() {
    return { source: this.source, target: this.localConfigPath || 'variables PCD_*' };
  }

  async readFull() {
    if (this.localConfigPath) {
      try {
        const content = await fs.promises.readFile(this.localConfigPath, 'utf8');
        return validateCorporateConfig(JSON.parse(content));
      } catch (err) {
        if (!(err && err.code === 'ENOENT')) throw err;
      }
    }

    return validateCorporateConfig({
      dbServer: this.env.PCD_DB_SERVER,
      dbDatabase: this.env.PCD_DB_NAME,
      dbUser: this.env.PCD_DB_USER,
      dbPassword: this.env.PCD_DB_PASSWORD,
      dbPort: this.env.PCD_DB_PORT,
      corporateDomain: this.env.PCD_CORP_DOMAIN,
      vncPassword: this.env.PCD_VNC_PASSWORD,
      authMode: this.env.PCD_AUTH_MODE,
    });
  }

  async getConfig() {
    const full = await this.readFull();
    const { vncPassword, ...config } = full;
    return config;
  }

  async getVncSecret() {
    const full = await this.readFull();
    if (!full.vncPassword) {
      throw new ConfigError('SECRET_UNAVAILABLE', 'El entorno de desarrollo no define PCD_VNC_PASSWORD');
    }
    return full.vncPassword;
  }
}

function createConfigProvider(bootstrapConfig, options = {}) {
  const { isPackaged = true, logger = null, localConfigPath = '' } = options;

  if (!isPackaged) {
    return new DevEnvConfigProvider({ env: process.env, localConfigPath });
  }

  if (!bootstrapConfig || !bootstrapConfig.uncConfigPath) {
    throw new ConfigError('NO_CONFIG', 'bootstrap.json no define la ruta de configuración');
  }

  return new UncConfigProvider({ configPath: bootstrapConfig.uncConfigPath, logger });
}

module.exports = {
  AUTH_MODES,
  ConfigError,
  mapFsError,
  validateCorporateConfig,
  UncConfigProvider,
  DevEnvConfigProvider,
  createConfigProvider,
};
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/test/configProvider.test.ts
```

Expected: PASS, 12 tests.

- [ ] **Step 5: Commit**

```bash
git add electron/configProvider.cjs src/test/configProvider.test.ts
git commit -m "feat(electron): contrato de ConfigProvider y validacion de esquema"
```

---

## Task 4: `configManager` como store en memoria

**Files:**
- Modify: `electron/configManager.cjs` (reemplazo completo)
- Modify: `src/services/configManager.test.ts` (reemplazo completo)
- Delete: `src/test/corporateConfigDiscovery.test.ts`

- [ ] **Step 1: Write the failing test**

Replace the whole content of `src/services/configManager.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';

const configManager = require('../../electron/configManager.cjs');

describe('configManager como store en memoria', () => {
  beforeEach(() => {
    configManager.resetConfig();
  });

  it('arranca sin configuración ni secretos', () => {
    const cfg = configManager.getConfig();
    expect(cfg.dbServer).toBe('');
    expect(cfg.dbUser).toBe('');
    expect(cfg.dbPassword).toBe('');
    expect(cfg.vncPassword).toBe('');
    expect(cfg.authMode).toBe('static-sql');
    expect(configManager.isConfigured()).toBe(false);
  });

  it('guarda y devuelve la configuración normalizada', () => {
    configManager.setConfig({
      dbServer: '  sql.interno  ',
      dbUser: 'operador',
      dbPassword: 'clave',
      dbPort: '1500',
      corporateDomain: 'dominio.interno',
      authMode: 'session-sql',
    });

    const cfg = configManager.getConfig();
    expect(cfg.dbServer).toBe('sql.interno');
    expect(cfg.dbPort).toBe(1500);
    expect(cfg.authMode).toBe('session-sql');
    expect(configManager.isConfigured()).toBe(true);
  });

  it('resetConfig vuelve al estado vacío', () => {
    configManager.setConfig({ dbServer: 'sql.interno', dbUser: 'u', dbPassword: 'p' });
    configManager.resetConfig();
    expect(configManager.getConfig().dbServer).toBe('');
    expect(configManager.isConfigured()).toBe(false);
  });

  it('normaliza puerto inválido a 1433', () => {
    configManager.setConfig({ dbServer: 'sql.interno', dbUser: 'u', dbPassword: 'p', dbPort: 'abc' });
    expect(configManager.getConfig().dbPort).toBe(1433);
  });

  it('no expone funciones de disco', () => {
    expect(configManager.loadConfigFromFile).toBeUndefined();
    expect(configManager.saveEncryptedLocalConfig).toBeUndefined();
    expect(configManager.importConfigFile).toBeUndefined();
    expect(configManager.clearPersistedConfig).toBeUndefined();
  });
});
```

Delete the obsolete suite:

```bash
git rm src/test/corporateConfigDiscovery.test.ts
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/services/configManager.test.ts
```

Expected: FAIL en el último test (`loadConfigFromFile` todavía existe) y en `authMode` (no definido).

- [ ] **Step 3: Write minimal implementation**

Replace the whole content of `electron/configManager.cjs`:

```js
const EMPTY_CONFIG = {
  dbServer: '',
  dbDatabase: '',
  dbUser: '',
  dbPassword: '',
  dbPort: 1433,
  corporateDomain: '',
  vncPassword: '',
  authMode: 'static-sql',
};

function getRuntimeState() {
  return globalThis.__PCD_RUNTIME_CONFIG__ || null;
}

function setRuntimeState(value) {
  globalThis.__PCD_RUNTIME_CONFIG__ = value;
}

function normalizeConfigObject(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const port = Number(source.dbPort);
  return {
    dbServer: String(source.dbServer || '').trim(),
    dbDatabase: String(source.dbDatabase || '').trim(),
    dbUser: String(source.dbUser || '').trim(),
    dbPassword: String(source.dbPassword || '').trim(),
    dbPort: Number.isFinite(port) && port > 0 ? port : 1433,
    corporateDomain: String(source.corporateDomain || '').trim(),
    vncPassword: String(source.vncPassword || '').trim(),
    authMode: String(source.authMode || 'static-sql').trim(),
  };
}

function getConfig() {
  const current = getRuntimeState();
  return current ? { ...EMPTY_CONFIG, ...current } : { ...EMPTY_CONFIG };
}

function setConfig(partial) {
  const updated = normalizeConfigObject({ ...(getRuntimeState() || EMPTY_CONFIG), ...partial });
  setRuntimeState(updated);
  return { ...updated };
}

function resetConfig() {
  setRuntimeState(null);
}

function isConfigured() {
  const cfg = getConfig();
  return Boolean(cfg.dbServer && cfg.dbUser && cfg.dbPassword);
}

module.exports = {
  EMPTY_CONFIG,
  normalizeConfigObject,
  getConfig,
  setConfig,
  resetConfig,
  isConfigured,
};
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/services/configManager.test.ts
```

Expected: PASS, 5 tests.

- [ ] **Step 5: Run the rest of the suite to find consumers of removed functions**

```bash
npx vitest run
```

Expected: fallos esperados en `src/services/securityGate.test.ts`, `src/services/electronClient.test.ts` y `src/test/internalReleasePackaging.test.ts`. Se corrigen en las tareas 5, 7 y 13. Ningún otro archivo debe fallar.

- [ ] **Step 6: Commit**

```bash
git add electron/configManager.cjs src/services/configManager.test.ts
git commit -m "refactor(electron): configManager como store en memoria sin acceso a disco"
```

---

## Task 5: Gate con máquina de estados

**Files:**
- Modify: `electron/securityGate.cjs` (reemplazo completo)
- Modify: `src/services/securityGate.test.ts` (reemplazo completo)

- [ ] **Step 1: Write the failing test**

Replace the whole content of `src/services/securityGate.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';

const configManager = require('../../electron/configManager.cjs');
const securityGate = require('../../electron/securityGate.cjs');

const CONFIG_VALIDA = {
  dbServer: 'sql.interno',
  dbDatabase: 'Inventario',
  dbUser: 'operador',
  dbPassword: 'clave',
  dbPort: 1433,
  corporateDomain: 'dominio.interno',
  authMode: 'static-sql',
};

function providerQueDevuelve(config: any) {
  return {
    source: 'unc',
    describe: () => ({ source: 'unc', target: '\\\\host\\share\\portal-correo-desktop.config.json' }),
    getConfig: async () => config,
    getVncSecret: async () => 'clave-vnc',
  };
}

function providerQueFalla(code: string) {
  const { ConfigError } = require('../../electron/configProvider.cjs');
  return {
    source: 'unc',
    describe: () => ({ source: 'unc', target: '\\\\host\\share\\portal-correo-desktop.config.json' }),
    getConfig: async () => {
      throw new ConfigError(code, 'fallo simulado');
    },
    getVncSecret: async () => {
      throw new ConfigError(code, 'fallo simulado');
    },
  };
}

describe('securityGate (máquina de estados sobre el ConfigProvider)', () => {
  beforeEach(() => {
    configManager.resetConfig();
  });

  it('queda READY y publica la configuración cuando el proveedor responde', async () => {
    const result = await securityGate.evaluateGate({ provider: providerQueDevuelve(CONFIG_VALIDA) });

    expect(result.status).toBe('READY');
    expect(result.code).toBe('AUTHORIZED');
    expect(configManager.getConfig().dbServer).toBe('sql.interno');
  });

  it('queda BLOCKED con NO_LAN_DNS y limpia el store', async () => {
    configManager.setConfig(CONFIG_VALIDA);

    const result = await securityGate.evaluateGate({ provider: providerQueFalla('NO_LAN_DNS') });

    expect(result.status).toBe('BLOCKED');
    expect(result.code).toBe('NO_LAN_DNS');
    expect(result.message).toContain('red corporativa');
    expect(configManager.getConfig().dbServer).toBe('');
  });

  it('queda BLOCKED con NO_PERMISSION y lo distingue del problema de red', async () => {
    const result = await securityGate.evaluateGate({ provider: providerQueFalla('NO_PERMISSION') });

    expect(result.status).toBe('BLOCKED');
    expect(result.code).toBe('NO_PERMISSION');
    expect(result.message).toContain('no tiene acceso');
  });

  it('queda NO_CONFIG cuando la red responde pero falta el archivo', async () => {
    const result = await securityGate.evaluateGate({ provider: providerQueFalla('NO_CONFIG') });

    expect(result.status).toBe('NO_CONFIG');
    expect(result.code).toBe('NO_CONFIG');
  });

  it('queda NO_CONFIG cuando el esquema es inválido', async () => {
    const result = await securityGate.evaluateGate({ provider: providerQueFalla('BAD_CONFIG') });

    expect(result.status).toBe('NO_CONFIG');
    expect(result.code).toBe('BAD_CONFIG');
  });

  it('nunca autoriza por pertenencia a dominio sin red', async () => {
    const original = process.env.USERDNSDOMAIN;
    process.env.USERDNSDOMAIN = 'dominio.interno';

    try {
      const result = await securityGate.evaluateGate({ provider: providerQueFalla('NO_LAN_ROUTE') });
      expect(result.status).toBe('BLOCKED');
      expect(result.code).toBe('NO_LAN_ROUTE');
    } finally {
      if (original === undefined) delete process.env.USERDNSDOMAIN;
      else process.env.USERDNSDOMAIN = original;
    }
  });

  it('no exporta checkDomainMembership como autorizador', () => {
    expect(securityGate.checkDomainMembership).toBeUndefined();
  });

  it('describeEnvironment devuelve el dominio solo como dato informativo', () => {
    const info = securityGate.describeEnvironment({ USERDNSDOMAIN: 'dominio.interno', USERDOMAIN: 'INTERNO' });
    expect(info.detectedDomain).toBe('dominio.interno');
    expect(info.isDomainJoined).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/services/securityGate.test.ts
```

Expected: FAIL con `securityGate.evaluateGate is not a function`.

- [ ] **Step 3: Write minimal implementation**

Replace the whole content of `electron/securityGate.cjs`:

```js
const configManager = require('./configManager.cjs');
const { ConfigError } = require('./configProvider.cjs');

const STATUS = {
  READY: 'READY',
  BLOCKED: 'BLOCKED',
  NO_CONFIG: 'NO_CONFIG',
};

const MESSAGES = {
  AUTHORIZED: 'Red corporativa y configuración verificadas',
  NO_LAN_DNS:
    'No se pudo resolver el servidor de configuración. Verificá que estés conectado a la red corporativa.',
  NO_LAN_ROUTE:
    'Esta aplicación solo funciona dentro de la red corporativa. Conectate a la red de Correo (cable o Wi-Fi corporativo) y reintentá.',
  NO_LAN_TIMEOUT: 'La red corporativa no respondió a tiempo. Reintentá en unos segundos.',
  NO_PERMISSION: 'Estás en la red, pero tu usuario no tiene acceso a la configuración. Contactá a soporte.',
  NO_CONFIG: 'No se encontró la configuración corporativa. Avisá a soporte.',
  BAD_CONFIG: 'La configuración corporativa está incompleta o dañada. Avisá a soporte.',
  UNKNOWN: 'No se pudo verificar el acceso a la configuración corporativa.',
};

const NETWORK_CODES = new Set(['NO_LAN_DNS', 'NO_LAN_ROUTE', 'NO_LAN_TIMEOUT', 'UNKNOWN']);
const CONFIG_CODES = new Set(['NO_CONFIG', 'BAD_CONFIG']);

function describeEnvironment(env = process.env) {
  const dnsDomain = String(env.USERDNSDOMAIN || '').trim();
  const netbiosDomain = String(env.USERDOMAIN || '').trim();
  const detectedDomain = dnsDomain || netbiosDomain || 'WORKGROUP';
  return {
    detectedDomain,
    isDomainJoined: Boolean(dnsDomain) || (Boolean(netbiosDomain) && netbiosDomain !== 'WORKGROUP'),
    note: 'Dato informativo: no autoriza ni bloquea por sí mismo.',
  };
}

async function evaluateGate(options = {}) {
  const { provider, store = configManager, logger = null, env = process.env } = options;

  if (!provider) {
    store.resetConfig();
    return {
      status: STATUS.NO_CONFIG,
      code: 'NO_CONFIG',
      message: MESSAGES.NO_CONFIG,
      source: 'none',
      configPath: '',
      environment: describeEnvironment(env),
    };
  }

  const described = typeof provider.describe === 'function' ? provider.describe() : { source: provider.source, target: '' };

  try {
    const config = await provider.getConfig();
    store.setConfig(config);
    if (logger) logger.info('Gate autorizado', { source: described.source });
    return {
      status: STATUS.READY,
      code: 'AUTHORIZED',
      message: MESSAGES.AUTHORIZED,
      source: described.source,
      configPath: described.target,
      environment: describeEnvironment(env),
    };
  } catch (err) {
    store.resetConfig();

    const code = err instanceof ConfigError ? err.code : 'UNKNOWN';
    const status = CONFIG_CODES.has(code)
      ? STATUS.NO_CONFIG
      : NETWORK_CODES.has(code)
        ? STATUS.BLOCKED
        : STATUS.BLOCKED;

    if (logger) {
      logger.warn('Gate bloqueado', { code, detail: err && err.message, source: described.source });
    }

    return {
      status,
      code,
      message: MESSAGES[code] || MESSAGES.UNKNOWN,
      source: described.source,
      configPath: described.target,
      environment: describeEnvironment(env),
    };
  }
}

module.exports = { STATUS, MESSAGES, describeEnvironment, evaluateGate };
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/services/securityGate.test.ts
```

Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add electron/securityGate.cjs src/services/securityGate.test.ts
git commit -m "feat(electron): gate de red basado en alcanzabilidad real"
```

---

## Task 6: Cableado en `main.cjs` y eliminación de la configuración embebida

**Files:**
- Modify: `electron/main.cjs:1-89` (imports y arranque) y los handlers de configuración
- Delete: `scripts/build-internal.cjs`

- [ ] **Step 1: Reemplazar el bloque de imports y arranque**

En `electron/main.cjs`, reemplazar el bloque desde la línea 4 (`const dbService = require('./dbService.cjs');`) hasta la línea 89 (`autoDiscoverCorporateConfig();`) por:

```js
const dbService = require('./dbService.cjs');
const configManager = require('./configManager.cjs');
const systemTools = require('./systemTools.cjs');
const dnsResolver = require('./dnsResolver.cjs');
const { parseClipboardQuery } = require('./clipboardParser.cjs');
const { generateSubnetRange, scanSubnetBatch } = require('./subnetScanner.cjs');
const hostnameResolver = require('./hostnameResolver.cjs');
const { checkForUpdates, downloadUpdateFile } = require('./updaterService.cjs');
const { createLogger } = require('./logger.cjs');
const { loadBootstrap } = require('./bootstrap.cjs');
const { createConfigProvider, ConfigError } = require('./configProvider.cjs');
const { evaluateGate, describeEnvironment } = require('./securityGate.cjs');

const logger = createLogger({ scope: 'main' });

let gateState = null;
let gateProvider = null;
let bootstrapConfig = null;
let bootstrapPath = '';

function resolvePackagedBootstrapDefaults() {
  const defaultsPath = path.join(__dirname, 'bootstrap.default.json');
  try {
    if (fs.existsSync(defaultsPath)) {
      return JSON.parse(fs.readFileSync(defaultsPath, 'utf8'));
    }
  } catch (err) {
    logger.warn('No se pudo leer bootstrap.default.json', { error: err && err.message });
  }
  return undefined;
}

function initializeBootstrap() {
  const programDataDir = process.env.PROGRAMDATA || path.join(app.getPath('appData'), '..');
  const defaults = resolvePackagedBootstrapDefaults();
  bootstrapConfig = loadBootstrap({
    programDataDir,
    exeDir: path.dirname(process.execPath),
    defaults: defaults ? { ...require('./bootstrap.cjs').DEFAULTS, ...defaults } : undefined,
  });
  bootstrapPath = bootstrapConfig._path || '';
  logger.info('Bootstrap cargado', {
    found: bootstrapConfig._found,
    path: bootstrapPath,
    configSource: bootstrapConfig.configSource,
  });
}

async function runGate() {
  try {
    if (!gateProvider) {
      gateProvider = createConfigProvider(bootstrapConfig, {
        isPackaged: app.isPackaged,
        logger,
        localConfigPath: path.join(path.resolve(__dirname, '..'), 'portal-correo-desktop.config.local.json'),
      });
    }
    gateState = await evaluateGate({ provider: gateProvider, logger });
  } catch (err) {
    const code = err instanceof ConfigError ? err.code : 'NO_CONFIG';
    gateState = {
      status: code === 'NO_CONFIG' ? 'NO_CONFIG' : 'BLOCKED',
      code,
      message: err && err.message ? err.message : 'No se pudo verificar la configuración corporativa',
      source: 'none',
      configPath: bootstrapPath,
      environment: describeEnvironment(),
    };
  }
  logger.info('Estado del gate', { status: gateState.status, code: gateState.code });
  return gateState;
}

async function resolveVncSecret() {
  try {
    if (!gateProvider) return null;
    return await gateProvider.getVncSecret();
  } catch (err) {
    logger.warn('Clave VNC no disponible', { code: err && err.code });
    return null;
  }
}

app.isQuiting = false;

app.whenReady().then(async () => {
  initializeBootstrap();
  await runGate();
});
```

> Nota: `app.whenReady().then(...)` ya existe más abajo en el archivo (bloque `gotTheLock`). Este bloque nuevo se ejecuta antes y no reemplaza a ese; ambos conviven. No agregar un segundo `app.whenReady()` que cree ventanas.

- [ ] **Step 2: Reemplazar los handlers de seguridad y configuración**

En `electron/main.cjs`, reemplazar desde `ipcMain.handle('cmda:security-status'` hasta el cierre del handler `cmda:clear-corporate-config` (bloque que incluye `get-corporate-config`, `import-config-dialog`, `import-config-content` y `clear-corporate-config`) por:

```js
ipcMain.handle('pcd:security-status', async () => {
  if (!gateState) await runGate();
  return gateState;
});

ipcMain.handle('pcd:security-retry', async () => {
  gateProvider = null;
  return await runGate();
});

ipcMain.handle('pcd:diagnostics', async () => {
  if (!gateState) await runGate();
  return {
    gate: gateState,
    bootstrap: {
      found: Boolean(bootstrapConfig && bootstrapConfig._found),
      path: bootstrapPath,
      configSource: bootstrapConfig ? bootstrapConfig.configSource : '',
      retryIntervalMs: bootstrapConfig ? bootstrapConfig.retryIntervalMs : 15000,
    },
    environment: describeEnvironment(),
    packaged: app.isPackaged,
  };
});
```

- [ ] **Step 3: Reemplazar los handlers de VNC y MSRA para pasar el secreto**

En `electron/main.cjs`, reemplazar:

```js
ipcMain.handle('cmda:launch-vnc', async (_event, target) => {
  return await systemTools.launchVncSmart(target);
});

ipcMain.handle('cmda:launch-msra', async (_event, target) => {
  return systemTools.launchMsra(target);
});
```

por:

```js
ipcMain.handle('pcd:launch-vnc', async (_event, target) => {
  const vncPassword = await resolveVncSecret();
  return await systemTools.launchVncSmart(target, { vncPassword });
});

ipcMain.handle('pcd:launch-msra', async (_event, target) => {
  return systemTools.launchMsra(target);
});
```

- [ ] **Step 4: Renombrar el resto de los canales IPC**

En `electron/main.cjs`, reemplazar todas las apariciones de `'cmda:` por `'pcd:` (incluye `ipcMain.handle`, `ipcMain.on` y `event.sender.send`). Verificar que no quede ninguna:

```bash
grep -n "cmda:" electron/main.cjs
```

Expected: sin resultados.

- [ ] **Step 5: Eliminar el script de empaquetado con secretos**

```bash
git rm scripts/build-internal.cjs
```

- [ ] **Step 6: Verificar que la aplicación arranca en desarrollo**

```bash
npx vitest run src/test/bootstrap.test.ts src/test/configProvider.test.ts src/services/securityGate.test.ts
```

Expected: PASS. (La verificación visual con `npx electron .` se hace en la Task 8, cuando exista la pantalla de bloqueo.)

- [ ] **Step 7: Commit**

```bash
git add electron/main.cjs
git commit -m "feat(electron): cableado del gate y eliminacion de la configuracion embebida"
```

---

## Task 7: Puente IPC y cliente TypeScript

**Files:**
- Modify: `electron/preload.cjs`
- Modify: `src/services/electronClient.ts:1-115`
- Modify: `src/services/electronClient.test.ts:1-130`
- Modify: `src/types/electron-modules.d.ts`

- [ ] **Step 1: Actualizar `preload.cjs`**

Reemplazar las primeras 6 líneas y el bloque final de configuración corporativa por:

```js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getSecurityStatus: () => ipcRenderer.invoke('pcd:security-status'),
  retrySecurity: () => ipcRenderer.invoke('pcd:security-retry'),
  getDiagnostics: () => ipcRenderer.invoke('pcd:diagnostics'),
```

y reemplazar el bloque `// Corporate Config channels` por:

```js
  // Diagnóstico
  testSqlConnection: () => ipcRenderer.invoke('pcd:test-sql-connection'),
```

Todos los demás canales pasan de `cmda:` a `pcd:`.

- [ ] **Step 2: Escribir la prueba del cliente**

En `src/services/electronClient.test.ts`, reemplazar el import de la línea 3-4 y los dos primeros `it` (líneas 27-120) por:

```ts
import {
  checkSecurityGateStatus,
  retrySecurityGate,
```

```ts
  it('usa fallback READY cuando window.electronAPI no existe (modo navegador)', async () => {
    delete (global as any).window.electronAPI;

    const gate = await checkSecurityGateStatus();
    expect(gate.status).toBe('READY');
    expect(gate.code).toBe('AUTHORIZED');
    expect(gate.source).toBe('dev');
  });

  it('delega el gate a window.electronAPI en Electron', async () => {
    const respuesta = {
      status: 'BLOCKED',
      code: 'NO_LAN_ROUTE',
      message: 'Conectate a la red corporativa',
      source: 'unc',
      configPath: '\\\\host\\share\\portal-correo-desktop.config.json',
      environment: { detectedDomain: 'dominio.interno', isDomainJoined: true, note: '' },
    };

    const mockElectronAPI = {
      getSecurityStatus: vi.fn().mockResolvedValue(respuesta),
      retrySecurity: vi.fn().mockResolvedValue({ ...respuesta, status: 'READY', code: 'AUTHORIZED' }),
    };

    (global as any).window.electronAPI = mockElectronAPI;

    const gate = await checkSecurityGateStatus();
    expect(gate.status).toBe('BLOCKED');
    expect(mockElectronAPI.getSecurityStatus).toHaveBeenCalledTimes(1);

    const reintento = await retrySecurityGate();
    expect(reintento.status).toBe('READY');
    expect(mockElectronAPI.retrySecurity).toHaveBeenCalledTimes(1);
  });
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npx vitest run src/services/electronClient.test.ts
```

Expected: FAIL con `retrySecurityGate is not a function`.

- [ ] **Step 4: Implementar el cliente**

En `src/services/electronClient.ts`, reemplazar las líneas 4-12 (`export interface SecurityGateStatus {...}`) por:

```ts
export type GateStatusCode =
  | 'AUTHORIZED'
  | 'NO_LAN_DNS'
  | 'NO_LAN_ROUTE'
  | 'NO_LAN_TIMEOUT'
  | 'NO_PERMISSION'
  | 'NO_CONFIG'
  | 'BAD_CONFIG'
  | 'UNKNOWN';

export interface GateStatus {
  status: 'READY' | 'BLOCKED' | 'NO_CONFIG';
  code: GateStatusCode;
  message: string;
  source: 'unc' | 'http' | 'dev' | 'none';
  configPath: string;
  environment?: {
    detectedDomain: string;
    isDomainJoined: boolean;
    note: string;
  };
}

export interface DiagnosticsInfo {
  gate: GateStatus;
  bootstrap: {
    found: boolean;
    path: string;
    configSource: string;
    retryIntervalMs: number;
  };
  environment: {
    detectedDomain: string;
    isDomainJoined: boolean;
    note: string;
  };
  packaged: boolean;
}
```

y reemplazar desde `export async function checkSecurityGateStatus()` hasta el final de `unlockCorporateSecurity` por:

```ts
export async function checkSecurityGateStatus(): Promise<GateStatus> {
  const api = getElectronAPI();
  if (api && api.getSecurityStatus) {
    try {
      return await api.getSecurityStatus();
    } catch (err: any) {
      return {
        status: 'BLOCKED',
        code: 'UNKNOWN',
        message: err.message || 'Error al verificar el acceso a la configuración corporativa',
        source: 'none',
        configPath: '',
      };
    }
  }

  return {
    status: 'READY',
    code: 'AUTHORIZED',
    message: 'Modo de prueba en navegador web',
    source: 'dev',
    configPath: '',
  };
}

export async function retrySecurityGate(): Promise<GateStatus> {
  const api = getElectronAPI();
  if (api && api.retrySecurity) {
    try {
      return await api.retrySecurity();
    } catch (err: any) {
      return {
        status: 'BLOCKED',
        code: 'UNKNOWN',
        message: err.message || 'Error al reintentar el acceso',
        source: 'none',
        configPath: '',
      };
    }
  }

  return {
    status: 'READY',
    code: 'AUTHORIZED',
    message: 'Modo de prueba en navegador web',
    source: 'dev',
    configPath: '',
  };
}

export async function getDiagnostics(): Promise<DiagnosticsInfo | null> {
  const api = getElectronAPI();
  if (api && api.getDiagnostics) {
    return await api.getDiagnostics();
  }
  return null;
}
```

- [ ] **Step 5: Eliminar las funciones de importación de configuración**

En `src/services/electronClient.ts`, eliminar las funciones `importCorporateConfigDialog`, `importCorporateConfigContent` y `clearCorporateConfig` (alrededor de las líneas 625-650) y la interfaz `CorporateConfigSummary` si quedó sin uso.

```bash
grep -n "importCorporateConfigDialog\|clearCorporateConfig\|CorporateConfigSummary" src/services/electronClient.ts
```

Expected: sin resultados.

- [ ] **Step 6: Run tests**

```bash
npx vitest run src/services/electronClient.test.ts
```

Expected: PASS.

- [ ] **Step 7: Declarar los tipos de los módulos nuevos**

Agregar al final de `src/types/electron-modules.d.ts`:

```ts
declare module '../../electron/logger.cjs' {
  export function redact(value: any, depth?: number): any;
  export function formatLine(level: string, scope: string, message: string, meta?: Record<string, any>): string;
  export function createLogger(options?: { scope?: string; sink?: any; level?: string }): {
    debug: (message: string, meta?: Record<string, any>) => void;
    info: (message: string, meta?: Record<string, any>) => void;
    warn: (message: string, meta?: Record<string, any>) => void;
    error: (message: string, meta?: Record<string, any>) => void;
    child: (scope: string) => any;
  };
}

declare module '../../electron/bootstrap.cjs' {
  export const DEFAULTS: {
    configSource: string;
    uncConfigPath: string;
    updateFeed: string;
    updateMirror: string;
    retryIntervalMs: number;
  };
  export function getBootstrapPath(programDataDir: string): string;
  export function normalizeBootstrap(raw: any, defaults?: any): any;
  export function loadBootstrap(options?: any): any;
}

declare module '../../electron/configProvider.cjs' {
  export class ConfigError extends Error {
    code: string;
    details: Record<string, any>;
  }
  export function mapFsError(err: any): string;
  export function validateCorporateConfig(raw: any): any;
  export class UncConfigProvider {
    constructor(options: { configPath: string; readFile?: any; logger?: any });
    source: string;
    describe(): { source: string; target: string };
    getConfig(): Promise<any>;
    getVncSecret(): Promise<string>;
  }
  export class DevEnvConfigProvider {
    constructor(options?: { env?: any; localConfigPath?: string });
    source: string;
    describe(): { source: string; target: string };
    getConfig(): Promise<any>;
    getVncSecret(): Promise<string>;
  }
  export function createConfigProvider(bootstrapConfig: any, options?: any): any;
}

declare module '../../electron/migration.cjs' {
  export function getLegacyTargets(options: any): string[];
  export function migrateLegacyConfig(options?: any): { removed: string[] };
}
```

- [ ] **Step 8: Commit**

```bash
git add electron/preload.cjs src/services/electronClient.ts src/services/electronClient.test.ts src/types/electron-modules.d.ts
git commit -m "feat(ipc): canales pcd y cliente del gate con tipos nuevos"
```

---

## Task 8: Pantalla de bloqueo

**Files:**
- Create: `src/components/BlockedScreen.tsx`
- Create: `src/components/BlockedScreen.test.tsx`
- Modify: `src/App.tsx:19-75` y el `return` principal

- [ ] **Step 1: Write the failing test**

Create `src/components/BlockedScreen.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BlockedScreen } from './BlockedScreen';
import type { GateStatus } from '../services/electronClient';

const gateBloqueado: GateStatus = {
  status: 'BLOCKED',
  code: 'NO_LAN_ROUTE',
  message: 'Esta aplicación solo funciona dentro de la red corporativa.',
  source: 'unc',
  configPath: '\\\\host\\share\\portal-correo-desktop.config.json',
};

describe('BlockedScreen', () => {
  it('muestra el mensaje del gate y el código de diagnóstico', () => {
    render(<BlockedScreen gate={gateBloqueado} onRetry={() => {}} isRetrying={false} />);

    expect(screen.getByText(/solo funciona dentro de la red corporativa/i)).toBeInTheDocument();
    expect(screen.getByText(/NO_LAN_ROUTE/)).toBeInTheDocument();
  });

  it('dispara el reintento al presionar el botón', () => {
    const onRetry = vi.fn();
    render(<BlockedScreen gate={gateBloqueado} onRetry={onRetry} isRetrying={false} />);

    fireEvent.click(screen.getByRole('button', { name: /reintentar/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('deshabilita el botón mientras reintenta', () => {
    render(<BlockedScreen gate={gateBloqueado} onRetry={() => {}} isRetrying={true} />);

    expect(screen.getByRole('button', { name: /verificando/i })).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/components/BlockedScreen.test.tsx
```

Expected: FAIL con `Cannot find module './BlockedScreen'`.

- [ ] **Step 3: Write the component**

Create `src/components/BlockedScreen.tsx`:

```tsx
import { ShieldAlert, RefreshCw, WifiOff, FileWarning } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { GateStatus } from '../services/electronClient';

interface BlockedScreenProps {
  gate: GateStatus;
  onRetry: () => void;
  isRetrying: boolean;
}

const TITULOS: Record<string, string> = {
  NO_CONFIG: 'Falta la configuración corporativa',
  BAD_CONFIG: 'La configuración corporativa no es válida',
};

export function BlockedScreen({ gate, onRetry, isRetrying }: BlockedScreenProps) {
  const esConfig = gate.status === 'NO_CONFIG';
  const Icono = esConfig ? FileWarning : gate.code === 'NO_PERMISSION' ? ShieldAlert : WifiOff;
  const titulo = TITULOS[gate.status] || 'Sin acceso a la red corporativa';

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-6 bg-background p-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <Icono className="h-8 w-8" aria-hidden="true" />
      </div>

      <div className="max-w-md space-y-2">
        <h1 className="font-heading text-xl font-bold text-foreground">{titulo}</h1>
        <p className="text-sm text-muted-foreground">{gate.message}</p>
      </div>

      <div className="w-full max-w-md rounded-md border border-border/70 bg-muted/30 p-3 text-left font-mono text-[11px] text-muted-foreground">
        <div>
          <span className="font-semibold">Código:</span> {gate.code}
        </div>
        <div>
          <span className="font-semibold">Origen:</span> {gate.source}
        </div>
        {gate.configPath ? (
          <div className="break-all">
            <span className="font-semibold">Ruta:</span> {gate.configPath}
          </div>
        ) : null}
      </div>

      <Button onClick={onRetry} disabled={isRetrying} className="gap-2">
        <RefreshCw className={`h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
        {isRetrying ? 'Verificando…' : 'Reintentar'}
      </Button>

      <p className="max-w-md text-xs text-muted-foreground">
        Si estás fuera de la red corporativa, conectate por cable o Wi-Fi corporativo y reintentá.
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/components/BlockedScreen.test.tsx
```

Expected: PASS, 3 tests.

- [ ] **Step 5: Montar en `App.tsx`**

En `src/App.tsx`, agregar el import después de la línea 18 (`import { SettingsModal } ...`):

```tsx
import { BlockedScreen } from "./components/BlockedScreen";
```

Agregar al import de `electronClient` (línea 24-37) las funciones nuevas:

```tsx
  checkSecurityGateStatus,
  retrySecurityGate,
  GateStatus,
```

Insertar después de `const [isSettingsOpen, setIsSettingsOpen] = useState(false);` (línea 75):

```tsx
  const [gate, setGate] = useState<GateStatus>({
    status: "READY",
    code: "AUTHORIZED",
    message: "",
    source: "dev",
    configPath: "",
  });
  const [isRetryingGate, setIsRetryingGate] = useState(false);

  useEffect(() => {
    let cancelado = false;
    checkSecurityGateStatus()
      .then((estado) => {
        if (!cancelado) setGate(estado);
      })
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, []);

  const handleRetryGate = async () => {
    setIsRetryingGate(true);
    try {
      setGate(await retrySecurityGate());
    } finally {
      setIsRetryingGate(false);
    }
  };
```

Insertar justo antes del `return (` que abre el JSX principal (el que empieza con `<ThemeProvider>`):

```tsx
  if (gate.status !== "READY") {
    return (
      <ThemeProvider>
        <BlockedScreen gate={gate} onRetry={handleRetryGate} isRetrying={isRetryingGate} />
        <Toaster />
      </ThemeProvider>
    );
  }

```

- [ ] **Step 6: Run the UI suite**

```bash
npx vitest run src/App.test.tsx src/test/AppInitialState.test.tsx src/components/BlockedScreen.test.tsx
```

Expected: PASS. Los tests de App no tienen `window.electronAPI`, así que el fallback devuelve `READY` y la UI normal sigue renderizando.

- [ ] **Step 7: Commit**

```bash
git add src/components/BlockedScreen.tsx src/components/BlockedScreen.test.tsx src/App.tsx
git commit -m "feat(ui): pantalla de bloqueo con diagnostico del gate"
```

---

## Task 9: `SettingsModal` como panel de diagnóstico

**Files:**
- Modify: `src/components/SettingsModal.tsx:16-20`, `:66-115`, `:150-202`, `:391-467`

- [ ] **Step 1: Cambiar los imports**

Reemplazar las líneas 16-20 (`getCorporateConfig`, `importCorporateConfigDialog`, `clearCorporateConfig`, `testSqlConnection`, `CorporateConfigSummary`) por:

```tsx
  testSqlConnection,
  getDiagnostics,
  DiagnosticsInfo,
```

- [ ] **Step 2: Reemplazar el estado de configuración**

Reemplazar el bloque `// Corporate Config State` (líneas 66-70) por:

```tsx
  // Diagnóstico del gate
  const [diagnostics, setDiagnostics] = useState<DiagnosticsInfo | null>(null);
```

- [ ] **Step 3: Reemplazar el efecto de carga**

Reemplazar el bloque que llama a `getCorporateConfig()` (líneas 107-115) por:

```tsx
      getDiagnostics()
        .then(setDiagnostics)
        .catch(() => setDiagnostics(null));
```

- [ ] **Step 4: Eliminar los handlers de importar y borrar**

Eliminar por completo `handleImportConfigFile` (líneas 150-166) y `handleClearConfig` (líneas 185-202). Conservar `handleTestConnection`.

- [ ] **Step 5: Reemplazar la tarjeta de configuración corporativa**

Reemplazar desde el `Badge` que muestra `SQL Online` (línea ~385) hasta el cierre de `<div className="flex flex-wrap items-center gap-2 pt-2">` (línea 467) por:

```tsx
                  (diagnostics?.gate.status === "READY" && connTestResult?.connected)
                    ? "SQL Online"
                    : "Sin conexión"}
                </Badge>
              </div>

              <div className="text-xs text-muted-foreground space-y-1">
                <p>
                  La configuración se lee de la red corporativa en cada arranque.
                  No se guarda en este equipo.
                </p>
                <div className="mt-2 p-2.5 rounded-md bg-background/60 border border-border/60 font-mono text-[11px] space-y-1">
                  <div>
                    <span className="text-muted-foreground">Estado:</span>{" "}
                    <strong>{diagnostics?.gate.status || "desconocido"}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Código:</span>{" "}
                    {diagnostics?.gate.code || "—"}
                  </div>
                  <div className="break-all">
                    <span className="text-muted-foreground">Origen:</span>{" "}
                    {diagnostics?.gate.configPath || "—"}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Bootstrap:</span>{" "}
                    {diagnostics?.bootstrap.found ? "encontrado" : "no encontrado"}
                  </div>
                  <div className="break-all">
                    <span className="text-muted-foreground">Ruta bootstrap:</span>{" "}
                    {diagnostics?.bootstrap.path || "—"}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={isTestingConn || diagnostics?.gate.status !== "READY"}
                  className="text-xs font-semibold gap-1.5 h-8 cursor-pointer"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${isTestingConn ? "animate-spin" : ""}`}
                  />
                  <span>{isTestingConn ? "Probando..." : "Probar conexión"}</span>
                </Button>
```

- [ ] **Step 6: Eliminar imports sin uso**

```bash
grep -n "Upload\|Trash2\|CorporateConfigSummary" src/components/SettingsModal.tsx
```

Expected: sin resultados. Si aparece alguno, eliminarlo del import de `lucide-react`.

- [ ] **Step 7: Run the UI suite**

```bash
npx vitest run src/test/SettingsModal.test.tsx
```

Expected: PASS. Si el test consulta textos de importación, actualizarlo para buscar `Estado:` en lugar de `Importar archivo de configuración`.

- [ ] **Step 7b: Verificar que el proyecto compila**

```bash
npm run build
```

Expected: `tsc` sin errores y `vite build` completo. Esto detecta imports huérfanos de `CorporateConfigSummary` o de las funciones eliminadas.

- [ ] **Step 8: Commit**

```bash
git add src/components/SettingsModal.tsx src/test/SettingsModal.test.tsx
git commit -m "feat(ui): ajustes como panel de diagnostico del gate"
```

---

## Task 10: VNC con secreto bajo demanda

**Files:**
- Modify: `electron/systemTools.cjs:26-60`, `:233-260`, `:556-575`
- Test: `src/services/systemTools.test.ts`

- [ ] **Step 1: Write the failing test**

Agregar al final de `src/services/systemTools.test.ts`, dentro del `describe` existente:

```ts
  it('escribe la clave VNC explícita en el archivo temporal y no la toma de la config', () => {
    const contenido = systemTools.buildVncConfigFile('10.0.0.10', 5901, 'clave-explicita');
    expect(contenido).toContain('Password=clave-explicita');
  });

  it('genera el temporal con el prefijo pcd_', () => {
    const { buildVncTempPath } = systemTools;
    expect(buildVncTempPath('host01', 1700000000000)).toContain('pcd_host01_1700000000000.vnc');
  });

  it('limpia temporales pcd_*.vnc de ejecuciones anteriores', () => {
    const os = require('os');
    const fs = require('fs');
    const path = require('path');
    const dir = path.join(os.tmpdir(), `pcd_cleanup_${Date.now()}`);
    fs.mkdirSync(dir, { recursive: true });
    const viejo = path.join(dir, 'pcd_host01_1.vnc');
    fs.writeFileSync(viejo, 'x');

    const { removed } = systemTools.cleanupStaleVncFiles(dir, { now: () => Date.now() + 1000 });
    expect(removed).toBeGreaterThanOrEqual(1);
    expect(fs.existsSync(viejo)).toBe(false);
  });
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/services/systemTools.test.ts
```

Expected: FAIL con `systemTools.buildVncTempPath is not a function`.

- [ ] **Step 3: Implementar**

En `electron/systemTools.cjs`, reemplazar la función `buildVncConfigFile` por:

```js
function buildVncConfigFile(targetIpOrHost, port = 5901, explicitPassword = '') {
  const cleanHost = sanitizeHostOrIp(targetIpOrHost);
  const vncPassword = String(explicitPassword || '').trim();

  return [
    `[Connection]`,
    `Host=${cleanHost}`,
    `Port=${port}`,
    `Password=${vncPassword}`,
    `[Options]`,
    `Use8Bit=1`,
    `SendKeyEvents=1`,
  ].join('\n');
}

function buildVncTempPath(targetIpOrHost, timestamp = Date.now()) {
  const cleanHost = sanitizeHostOrIp(targetIpOrHost);
  return path.join(os.tmpdir(), `pcd_${cleanHost}_${timestamp}.vnc`);
}

function cleanupStaleVncFiles(dir = os.tmpdir(), options = {}) {
  const { now = () => Date.now(), maxAgeMs = 24 * 60 * 60 * 1000 } = options;
  let removed = 0;
  try {
    for (const entry of fs.readdirSync(dir)) {
      if (!/^pcd_.*\.vnc$/i.test(entry)) continue;
      const full = path.join(dir, entry);
      try {
        const stats = fs.statSync(full);
        if (now() - stats.mtimeMs >= maxAgeMs) {
          fs.unlinkSync(full);
          removed += 1;
        }
      } catch {
        // archivo bloqueado o ya eliminado
      }
    }
  } catch {
    // directorio ilegible
  }
  return { removed };
}
```

Reemplazar el cuerpo de `launchVnc` por:

```js
function launchVnc(targetIpOrHost, port = 5901, options = {}) {
  try {
    const cleanHost = sanitizeHostOrIp(targetIpOrHost);
    const configContent = buildVncConfigFile(cleanHost, port, options.vncPassword || '');
    const tempConfigPath = buildVncTempPath(cleanHost);

    fs.writeFileSync(tempConfigPath, configContent, { encoding: 'utf8', mode: 0o600 });

    const vncExe = getVncViewerPath();
    const cmd = getVncCommand(vncExe, tempConfigPath);
    const child = spawn(cmd.exe, cmd.args, { detached: true, stdio: 'ignore' });
    child.unref();

    setTimeout(() => {
      try {
        fs.unlinkSync(tempConfigPath);
      } catch {
        // el visor ya lo eliminó o no existe
      }
    }, 2000);

    return { success: true, processId: child.pid, configPath: tempConfigPath, portUsed: port };
  } catch (err) {
    return { success: false, message: `No se pudo iniciar VNC Viewer: ${err.message}` };
  }
}
```

Reemplazar en `launchVncSmart` la línea `const res = launcher(cleanHost, probe.vncPort);` por:

```js
      const res = launcher(cleanHost, probe.vncPort, { vncPassword: options.vncPassword || '' });
```

Agregar al `module.exports` de `electron/systemTools.cjs`: `buildVncTempPath` y `cleanupStaleVncFiles`.

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/services/systemTools.test.ts
```

Expected: PASS. Si algún test previo dependía de que la clave saliera de `configManager`, actualizarlo para pasar el tercer argumento explícito.

- [ ] **Step 5: Llamar la limpieza al arrancar**

En `electron/main.cjs`, dentro del `app.whenReady()` agregado en la Task 6, después de `initializeBootstrap();`:

```js
  const cleanup = systemTools.cleanupStaleVncFiles();
  if (cleanup.removed > 0) logger.info('Temporales VNC eliminados', { count: cleanup.removed });
```

- [ ] **Step 6: Commit**

```bash
git add electron/systemTools.cjs electron/main.cjs src/services/systemTools.test.ts
git commit -m "feat(electron): clave VNC bajo demanda y limpieza de temporales"
```

---

## Task 11: Migración de secretos heredados

**Files:**
- Create: `electron/migration.cjs`
- Test: `src/test/migration.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/test/migration.test.ts`:

```ts
import { describe, it, expect } from 'vitest';

const { getLegacyTargets, migrateLegacyConfig } = require('../../electron/migration.cjs');

describe('migración de configuración heredada', () => {
  it('compone las rutas heredadas de userData, ejecutable y raíz de la app', () => {
    const targets = getLegacyTargets({
      userDataDir: 'C:\\Users\\op\\AppData\\Roaming\\portal-correo-desktop',
      exeDir: 'C:\\Program Files\\Portal Correo Desktop',
      appRoot: 'C:\\app',
    });

    expect(targets).toContain('C:\\Users\\op\\AppData\\Roaming\\portal-correo-desktop\\cmda.config.json');
    expect(targets).toContain('C:\\Program Files\\Portal Correo Desktop\\cmda.config.json');
    expect(targets).toContain('C:\\app\\.env');
  });

  it('elimina los archivos existentes e informa cuántos', () => {
    const existentes = new Set(['C:\\app\\.env', 'C:\\app\\cmda.config.local.json']);
    const eliminados: string[] = [];

    const result = migrateLegacyConfig({
      userDataDir: 'C:\\ud',
      exeDir: 'C:\\exe',
      appRoot: 'C:\\app',
      existsSync: (p: string) => existentes.has(p),
      unlinkSync: (p: string) => {
        eliminados.push(p);
        existentes.delete(p);
      },
    });

    expect(result.removed.sort()).toEqual(['C:\\app\\.env', 'C:\\app\\cmda.config.local.json'].sort());
    expect(eliminados).toHaveLength(2);
  });

  it('no falla si el archivo está bloqueado', () => {
    const result = migrateLegacyConfig({
      userDataDir: 'C:\\ud',
      exeDir: 'C:\\exe',
      appRoot: 'C:\\app',
      existsSync: () => true,
      unlinkSync: () => {
        throw new Error('EBUSY');
      },
    });

    expect(result.removed).toEqual([]);
  });

  it('no repite rutas duplicadas', () => {
    const targets = getLegacyTargets({
      userDataDir: 'C:\\app',
      exeDir: 'C:\\app',
      appRoot: 'C:\\app',
    });

    const unicos = new Set(targets);
    expect(unicos.size).toBe(targets.length);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/test/migration.test.ts
```

Expected: FAIL con `Cannot find module '../../electron/migration.cjs'`.

- [ ] **Step 3: Implementar**

Create `electron/migration.cjs`:

```js
const fs = require('fs');
const path = require('path');

const LEGACY_FILES = ['cmda.config.json', 'cmda.config.local.json'];

function getLegacyTargets({ userDataDir, exeDir, appRoot } = {}) {
  const targets = [];

  if (userDataDir) {
    for (const file of LEGACY_FILES) targets.push(path.join(userDataDir, file));
  }
  if (exeDir) {
    for (const file of LEGACY_FILES) targets.push(path.join(exeDir, file));
  }
  if (appRoot) {
    targets.push(path.join(appRoot, '.env'));
    targets.push(path.join(appRoot, 'cmda.config.local.json'));
  }

  return [...new Set(targets)];
}

function migrateLegacyConfig(options = {}) {
  const {
    userDataDir,
    exeDir,
    appRoot,
    existsSync = fs.existsSync,
    unlinkSync = fs.unlinkSync,
    logger = null,
  } = options;

  const removed = [];

  for (const file of getLegacyTargets({ userDataDir, exeDir, appRoot })) {
    try {
      if (!existsSync(file)) continue;
      unlinkSync(file);
      removed.push(file);
    } catch (err) {
      if (logger) logger.warn('No se pudo eliminar configuración heredada', { file, error: err && err.message });
    }
  }

  if (removed.length > 0 && logger) {
    logger.info('Configuración heredada eliminada', { count: removed.length });
  }

  return { removed };
}

module.exports = { LEGACY_FILES, getLegacyTargets, migrateLegacyConfig };
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/test/migration.test.ts
```

Expected: PASS, 4 tests.

- [ ] **Step 5: Cablear la migración en `main.cjs`**

En `electron/main.cjs`, agregar el require junto a los demás:

```js
const { migrateLegacyConfig } = require('./migration.cjs');
```

y reemplazar el bloque `app.whenReady().then(async () => {` agregado en la Task 6 por:

```js
app.whenReady().then(async () => {
  migrateLegacyConfig({
    userDataDir: app.getPath('userData'),
    exeDir: path.dirname(process.execPath),
    appRoot: path.resolve(__dirname, '..'),
    logger,
  });
  initializeBootstrap();
  await runGate();
});
```

- [ ] **Step 6: Commit**

```bash
git add electron/migration.cjs electron/main.cjs src/test/migration.test.ts
git commit -m "feat(electron): migracion que elimina secretos heredados"
```

---

## Task 12: Verificación de integridad en el actualizador

**Files:**
- Modify: `electron/updaterService.cjs:130-190`
- Modify: `electron/main.cjs` (handler `pcd:start-download-update`)
- Test: `src/test/updaterService.test.ts`

- [ ] **Step 1: Write the failing test**

Agregar al final de `src/test/updaterService.test.ts`, dentro del `describe` existente:

```ts
  it('calcula el SHA-256 de un archivo descargado', () => {
    const fs = require('fs');
    const os = require('os');
    const path = require('path');
    const archivo = path.join(os.tmpdir(), `pcd_hash_${Date.now()}.bin`);
    fs.writeFileSync(archivo, 'contenido de prueba');

    const hash = updaterService.computeFileSha256(archivo);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    fs.unlinkSync(archivo);
  });

  it('rechaza un archivo cuyo hash no coincide', () => {
    const fs = require('fs');
    const os = require('os');
    const path = require('path');
    const archivo = path.join(os.tmpdir(), `pcd_hash_bad_${Date.now()}.bin`);
    fs.writeFileSync(archivo, 'contenido de prueba');

    expect(updaterService.verifyFileSha256(archivo, 'a'.repeat(64))).toBe(false);
    const real = updaterService.computeFileSha256(archivo);
    expect(updaterService.verifyFileSha256(archivo, real)).toBe(true);
    fs.unlinkSync(archivo);
  });

  it('interpreta el archivo .sha256 publicado', () => {
    expect(updaterService.parseChecksumFile('  ABCDEF123  Portal Correo Desktop Setup 1.0.0.exe\n')).toBe('abcdef123');
    expect(updaterService.parseChecksumFile('')).toBe('');
  });
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/test/updaterService.test.ts
```

Expected: FAIL con `updaterService.computeFileSha256 is not a function`.

- [ ] **Step 3: Implementar**

Agregar al final de `electron/updaterService.cjs`, antes de `module.exports`:

```js
function computeFileSha256(filePath) {
  const hash = crypto.createHash('sha256');
  const buffer = fs.readFileSync(filePath);
  hash.update(buffer);
  return hash.digest('hex');
}

function verifyFileSha256(filePath, expectedHex) {
  const expected = String(expectedHex || '').trim().toLowerCase();
  if (!expected) return false;
  return computeFileSha256(filePath) === expected;
}

function parseChecksumFile(content) {
  const first = String(content || '').trim().split(/\s+/)[0] || '';
  return first.toLowerCase();
}
```

Agregar `const crypto = require('crypto');` al inicio del archivo y exportar las tres funciones nuevas en `module.exports`.

- [ ] **Step 4: Verificar en el handler de descarga**

`net.fetch` de Electron usa la pila de red de Chromium: respeta el proxy del sistema y el almacén de certificados de Windows, a diferencia de `fetch` de Node, que los ignora. En `electron/main.cjs`, agregar `net` al require de electron:

```js
const { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage, globalShortcut, clipboard, dialog, net } = require('electron');
```

y reemplazar el handler `pcd:start-download-update` por:

```js
ipcMain.handle('pcd:start-download-update', async (event, downloadUrl) => {
  if (!downloadUrl) return { success: false, error: 'URL de descarga vacía' };

  const tempDir = app.getPath ? app.getPath('temp') : require('os').tmpdir();
  const fileName = path.basename(new URL(downloadUrl).pathname) || 'PortalCorreoDesktop-Update.exe';
  const targetPath = path.join(tempDir, fileName);

  const resultado = await new Promise((resolve) => {
    downloadUpdateFile(
      downloadUrl,
      targetPath,
      (progress) => {
        if (!event.sender.isDestroyed()) event.sender.send('pcd:update-progress', progress);
      },
      (completedPath) => resolve({ success: true, filePath: completedPath }),
      (err) => resolve({ success: false, error: err.message })
    );
  });

  if (!resultado.success) return resultado;

  let esperado = '';
  try {
    const respuesta = await net.fetch(`${downloadUrl}.sha256`, {
      headers: { 'User-Agent': 'PortalCorreoDesktop-AutoUpdater' },
    });
    if (respuesta.ok) esperado = require('./updaterService.cjs').parseChecksumFile(await respuesta.text());
  } catch (err) {
    logger.warn('No se pudo obtener el checksum de la actualización', { error: err && err.message });
  }

  if (!esperado) {
    try { fs.unlinkSync(resultado.filePath); } catch {}
    return { success: false, error: 'No se pudo verificar la integridad del instalador descargado.' };
  }

  const { verifyFileSha256 } = require('./updaterService.cjs');
  if (!verifyFileSha256(resultado.filePath, esperado)) {
    try { fs.unlinkSync(resultado.filePath); } catch {}
    return { success: false, error: 'El instalador descargado no coincide con el checksum publicado.' };
  }

  downloadedInstallerPath = resultado.filePath;
  if (!event.sender.isDestroyed()) event.sender.send('pcd:update-downloaded', resultado.filePath);
  return { success: true, filePath: resultado.filePath };
});
```

- [ ] **Step 5: Run tests**

```bash
npx vitest run src/test/updaterService.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add electron/updaterService.cjs electron/main.cjs src/test/updaterService.test.ts
git commit -m "feat(electron): verificacion sha256 del instalador descargado"
```

---

## Task 13: Empaquetado y test de artefacto

**Files:**
- Modify: `package.json` (`build.files`, scripts)
- Create: `scripts/prepare-bootstrap.cjs`
- Create: `src/test/artifactSecrets.test.ts`
- Modify: `src/test/internalReleasePackaging.test.ts` (reemplazo completo)
- Modify: `.gitignore`

- [ ] **Step 1: Escribir el test del empaquetado**

Reemplazar el contenido de `src/test/internalReleasePackaging.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Empaquetado limpio', () => {
  const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf8'));

  it('incluye el visor VNC y los recursos en el paquete', () => {
    expect(pkg.build.files).toContain('resources/**/*');
    expect(pkg.build.files).toContain('public/**/*');
  });

  it('ya no existe el script de empaquetado con configuración embebida', () => {
    expect(pkg.scripts['release:internal']).toBeUndefined();
    expect(fs.existsSync(path.resolve(process.cwd(), 'scripts', 'build-internal.cjs'))).toBe(false);
  });

  it('el build prepara el bootstrap por defecto', () => {
    expect(pkg.scripts['release:build']).toContain('prepare-bootstrap');
  });

  it('el bootstrap local está ignorado por Git', () => {
    const gitignore = fs.readFileSync(path.resolve(process.cwd(), '.gitignore'), 'utf8');
    expect(gitignore).toContain('bootstrap.local.json');
    expect(gitignore).toContain('bootstrap.default.json');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/test/internalReleasePackaging.test.ts
```

Expected: FAIL en las cuatro aserciones.

- [ ] **Step 3: Crear el script de preparación**

Create `scripts/prepare-bootstrap.cjs`:

```js
/**
 * Genera electron/bootstrap.default.json a partir de bootstrap.local.json (no versionado).
 * El contenido no es secreto: solo rutas internas. Se elimina al terminar el build.
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const sourcePath = path.join(rootDir, 'bootstrap.local.json');
const targetPath = path.join(rootDir, 'electron', 'bootstrap.default.json');

const DEFAULTS = {
  configSource: 'unc',
  uncConfigPath: '',
  updateFeed: '',
  updateMirror: '',
  retryIntervalMs: 15000,
};

let payload = { ...DEFAULTS };

if (fs.existsSync(sourcePath)) {
  try {
    payload = { ...DEFAULTS, ...JSON.parse(fs.readFileSync(sourcePath, 'utf8')) };
    console.log('✓ bootstrap.local.json detectado');
  } catch (err) {
    console.warn(`⚠ bootstrap.local.json inválido (${err.message}); se usan valores por defecto`);
  }
} else {
  console.log('⚠ Sin bootstrap.local.json: se empaqueta sin ruta de configuración');
}

fs.writeFileSync(targetPath, JSON.stringify(payload, null, 2), 'utf8');
console.log(`✓ ${path.relative(rootDir, targetPath)} generado`);
```

- [ ] **Step 4: Actualizar `package.json`**

En `build.files`, agregar:

```json
      "resources/**/*",
      "public/**/*",
```

En `scripts`, eliminar `"release:internal"` y reemplazar `"release:build"` por:

```json
    "release:build": "npm run release:check && node scripts/prepare-bootstrap.cjs && electron-builder --win",
```

- [ ] **Step 5: Actualizar `.gitignore`**

Agregar al final:

```
# Bootstrap generado en build (rutas internas, no secretos)
bootstrap.local.json
electron/bootstrap.default.json
```

- [ ] **Step 6: Crear el test de artefacto**

Create `src/test/artifactSecrets.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const asarPath = path.resolve(process.cwd(), 'release', 'win-unpacked', 'resources', 'app.asar');
const asarDisponible = fs.existsSync(asarPath);

describe.skipIf(!asarDisponible)('Artefacto empaquetado sin secretos', () => {
  const listado = (() => {
    const asar = require('@electron/asar');
    return asar.listPackage(asarPath).map((p: string) => p.replace(/^[\\/]/, '').replace(/\\/g, '/'));
  })();

  it('no contiene configuración embebida', () => {
    expect(listado.some((p: string) => /embedded\.config\.json$/i.test(p))).toBe(false);
  });

  it('no contiene archivos .env ni configuraciones locales', () => {
    const prohibidos = listado.filter((p: string) => /(^|\/)\.env(\.|$)/i.test(p) || /cmda\.config/i.test(p));
    expect(prohibidos).toEqual([]);
  });

  it('incluye el visor VNC', () => {
    expect(listado.some((p: string) => /resources\/bin\/vncviewer\.exe$/i.test(p))).toBe(true);
  });

  it('no incluye la carpeta de pruebas ni el bootstrap local', () => {
    expect(listado.some((p: string) => /bootstrap\.local\.json$/i.test(p))).toBe(false);
  });
});
```

- [ ] **Step 6b: Declarar la dependencia que lee el asar**

El test requiere `@electron/asar`, que hoy llega como dependencia transitiva de `electron-builder`. Declararla explícitamente evita que un cambio de versión la rompa:

```bash
npm install -D @electron/asar
```

- [ ] **Step 7: Run tests**

```bash
npx vitest run src/test/internalReleasePackaging.test.ts src/test/artifactSecrets.test.ts
```

Expected: PASS. `artifactSecrets` se saltea si no hay artefacto construido (sin fallar).

- [ ] **Step 8: Construir y verificar el paquete**

```bash
npm run build
npx electron-builder --win --dir
npx vitest run src/test/artifactSecrets.test.ts
```

Expected: el test de artefacto corre (ya no se saltea) y pasa los 4 casos.

- [ ] **Step 9: Commit**

```bash
git add package.json scripts/prepare-bootstrap.cjs src/test/internalReleasePackaging.test.ts src/test/artifactSecrets.test.ts .gitignore
git commit -m "build: empaquetado limpio con recursos y verificacion del artefacto"
```

---

## Task 14: Barrido final del renombre y documentación

**Files:**
- Modify: `README.md`
- Modify: cualquier archivo con `cmda` residual

- [ ] **Step 1: Detectar restos del nombre viejo**

```bash
grep -rniI "cmda" --include="*.cjs" --include="*.ts" --include="*.tsx" --include="*.json" --include="*.md" electron src scripts README.md package.json
```

Expected: solo aparecen los nombres de procedimientos almacenados (`CMDA_Trae_Info_DE_PC_PARAmesa_T`, `Cmda_Trae_Datos_De_Ubicacion_Y_cpa_centro_Costo_T`, `cmda_Busca_SI_HAY_ALERTA_Activa_para_terminal_T`, `CMDA_Trae_historial_De_REset_DE_UNA_PC_T`, `Cmda_trae_historial_UptimeXterminal_T`) y las menciones históricas del spec.

- [ ] **Step 2: Reemplazar los restos propios**

Para cada aparición que **no** sea un procedimiento almacenado:

- `CMDA_` en variables de entorno → `PCD_`
- `cmda:` en canales IPC → `pcd:`
- `cmda.config` en rutas → `portal-correo-desktop.config`
- `cmda_` en nombres de temporales → `pcd_`

Verificar de nuevo:

```bash
grep -rniI "cmda:" electron src
grep -rniI "CMDA_" electron src
```

Expected: sin resultados en ambos.

- [ ] **Step 3: Actualizar el README**

Reemplazar la sección `## 🛠️ Configuración de Desarrollo Local` por:

```markdown
## 🛠️ Configuración de Desarrollo Local

La aplicación no guarda credenciales. En producción lee su configuración de un share
corporativo; en desarrollo usa variables de entorno o un archivo local no versionado.

1. Copiá `.env.example` a `.env` y completá los valores.
2. Copiá `portal-correo-desktop.config.example.json` a `portal-correo-desktop.config.local.json`
   para probar el proveedor de desarrollo sin variables de entorno.

```bash
npm install
npm run dev            # Vite en modo web
npx electron .         # Escritorio (usa .env o el config local)
npm run build
npm test
```

### Modelo de configuración en producción

| Artefacto | Ubicación |
| --- | --- |
| Bootstrap de máquina | `%ProgramData%\portal-correo-desktop\bootstrap.json` |
| Configuración corporativa | `\\<HOST>\portal-correo-desktop-config$\portal-correo-desktop.config.json` |

Si la aplicación no alcanza el share, se bloquea y muestra el código de diagnóstico
(`NO_LAN_ROUTE`, `NO_PERMISSION`, `NO_CONFIG`, `BAD_CONFIG`).
```

- [ ] **Step 4: Renombrar el archivo de ejemplo**

```bash
git mv cmda.config.example.json portal-correo-desktop.config.example.json
```

Actualizar su contenido a:

```json
{
  "dbServer": "192.0.2.10",
  "dbDatabase": "Nombre_Base_Datos",
  "dbUser": "usuario_sql",
  "dbPassword": "clave_sql_segura",
  "dbPort": 1433,
  "vncPassword": "hash_vnc_corporativo",
  "corporateDomain": "dominio.corporativo.local",
  "authMode": "static-sql"
}
```

- [ ] **Step 5: Suite completa**

```bash
npx vitest run
```

Expected: `Test Files  N passed`, sin fallos.

- [ ] **Step 6: Auditoría de seguridad del repositorio**

```bash
npx vitest run src/test/securityAudit.test.ts
```

Expected: PASS, 3 tests. Si falla, el mensaje indica el archivo y el patrón.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: barrido final del renombre y documentacion del modelo de configuracion"
```

---

## Fuera del alcance de este plan

**Trabajo operativo, no de código** (lo ejecuta infraestructura, no el ingeniero):

- Crear `C:\portal-correo-desktop\config` y `C:\portal-correo-desktop\public` con sus shares y ACL.
- Crear el grupo `PortalCorreoDesktop-Operadores` en AD.
- Publicar el artefacto en el repositorio público de releases.
- Emitir el certificado de firma de código.

**Diferido a Fase 1b, con motivo:**

- **Equipos fuera del dominio dentro de la red (spec §8.4).** Requiere un flujo de UI para capturar credenciales de red y guardarlas con `cmdkey`. Como la decisión D5 limita la aplicación a la red corporativa, el caso es poco frecuente y no está en los criterios de aceptación de la Fase 1. Queda identificado para no perderlo.

**Fase 2:**

- `HttpConfigProvider` sobre IIS con Windows Authentication en 443.
- `session-sql`: credenciales por sesión entregadas por el endpoint.
- Firma Authenticode verificada además del SHA-256.

---

## Verificación final de la Fase 1

- [ ] `npx vitest run` pasa completo.
- [ ] `npx electron-builder --win --dir` genera el paquete y `src/test/artifactSecrets.test.ts` pasa sin saltearse.
- [ ] `grep -rniI "cmda:" electron src` no devuelve nada.
- [ ] `grep -rniI "CMDA_" electron src` no devuelve nada.
- [ ] Arrancar la app con `npx electron .` sin VPN ni red corporativa muestra la pantalla de bloqueo con código `NO_LAN_ROUTE` o `NO_LAN_DNS`.
- [ ] Con el share accesible, la app abre la interfaz normal y busca una terminal.
- [ ] En `%APPDATA%\portal-correo-desktop\` no queda ningún archivo de configuración tras la migración.

---

## Estado de ejecución — 2026-10-29

Las 14 tareas se implementaron en la rama `feat/instalador-limpio-fase-1`. Resultado al cierre:
51 archivos de test, 272 tests verdes, `tsc --noEmit` en 0 y el artefacto empaquetado verificado sin secretos.

### Desviaciones respecto de lo escrito arriba

| Tarea | Desviación | Motivo |
| --- | --- | --- |
| 1 | La detección de claves pasó de regex a tokenización (`SENSITIVE_TOKENS` + `tokenizeKey`), y se agregaron `scrubString`, `safeDescribe`-style robustez, `AUTH_HEADER_PATTERN`, `AUTH_SCHEME_PATTERN` y `[^\p{L}...]` para acentos | La regex original no incluía `key` (fuga real de `accessKey`), no inspeccionaba strings y podía lanzar con `BigInt`/getters. Tres rondas de revisión |
| 5 | Se agregaron `safeDescribe`, `isUsableConfig` y `safeLog` | `provider.describe()` fuera del `try` podía rechazar la promesa dejando el store con datos viejos; un `getConfig()` que resuelve `undefined` daba `READY` con la configuración anterior (fail-open) |
| 6 | El bloque de arranque se insertó después de `app.isQuiting = false;` y se eliminaron `getUserDataConfigPath`/`getAdjacentExeConfigPath` | Evitar duplicar `app.isQuiting` y dejar sin código muerto al quitar la configuración embebida |
| 7 y 9 | La eliminación de `unlockCorporateSecurity` se hizo en la 7; las funciones de importación/borrado, en la 9 | `SettingsModal` todavía las usaba: quitarlas antes rompía `tsc` |
| 10 | El test de limpieza usa `now + 25 h` en lugar de `now + 1 s` | Con el umbral de 24 h, el test original nunca borraba nada (el test estaba mal, no el código) |
| 13 | `package.json` + `internalReleasePackaging.test.ts` se adelantaron a un commit propio antes de la 13 | Dejar el script `release:internal` apuntando a un archivo borrado mantenía la suite en rojo durante seis tareas |
| 14 | También se renombró `cmda-theme` → `pcd-theme` y se agregaron al `.gitignore` los nombres nuevos del archivo de configuración | Restos propios no enumerados; sin el gitignore, el config local que indica el README quedaría versionable |

### Deuda registrada (no bloqueante)

- `electron/bootstrap.cjs:45`: `existsSync` fuera del `try`; si lanza, no se prueba el siguiente candidato.
- `electron/bootstrap.cjs:23`: `configSource` cae a `'unc'` hardcodeado en vez de a `defaults.configSource`.
- `electron/configProvider.cjs`: el archivo local del proveedor de desarrollo relanza errores no-`ENOENT` sin envolver en `ConfigError`; las coerciones sobre JSON pueden lanzar `TypeError` sin `code`; el puerto acepta valores fuera de 1..65535.
- `electron/systemTools.cjs`: queda un `require('./configManager.cjs')` sin uso.
- `public/**/*` embebe los iconos completos en el asar (inofensivo, pero se puede acotar).
- `electron/bootstrap.default.json` no está versionado: en un clone limpio la app avisa hasta que se corre `node scripts/prepare-bootstrap.cjs`.
- Renombrar las claves de `localStorage` reinicia las preferencias de los operadores que ya usaban la app.

### Pendiente fuera de este plan

- **Operativo:** crear los shares y el grupo `PortalCorreoDesktop-Operadores`, publicar el artefacto en el repositorio público de releases y emitir el certificado de firma de código.
- **Fase 1b:** credenciales de red para equipos fuera de dominio (spec §8.4).
- **Fase 2:** `HttpConfigProvider` sobre IIS con Windows Authentication en 443, `session-sql` y verificación Authenticode.


## Correcciones posteriores a la revisi�n final � 2026-10-29

La revisi�n de la rama completa encontr� fallas que las revisiones por tarea no detectaron. Se corrigieron:

| Hallazgo | Correcci�n |
| --- | --- |
| `logger.error(new Error('Password=X'))` y `'config: password=X'` filtraban el valor, porque un par no sensible (`Error:`) consum�a el valor y ocultaba el par sensible | `scrubString` usa un patr�n anclado con *lookbehind* de l�mite que s�lo matchea pares cuya clave contiene un t�rmino sensible; se agregaron dos tests (mensaje `Error` y prefijo con dos puntos) |
| El gate daba `READY` con configuraci�n sin `dbPassword` en `static-sql` | `isUsableConfig` exige la clave para ese modo; test dedicado |
| Un proveedor hostil (Proxy) o un `describe()` que lanza pod�a rechazar `evaluateGate` dejando el store con datos previos | `store.resetConfig()` al inicio de `evaluateGate`; `safeDescribe` ya no desreferencia fuera del `try`; tests de Proxy hostil y de `describe` defectuoso con config v�lida |
| `launchRemoteSmart` arrancaba VNC sin clave | `main.cjs` resuelve el secreto y lo pasa como `{ vncPassword }` |
| La migraci�n borraba el `.env` del repo al ejecutar `npx electron .` | S�lo corre con `app.isPackaged` |
| `prepare-bootstrap` copiaba claves arbitrarias al artefacto | Allowlist de las cinco claves del bootstrap, con aviso de las ignoradas |
| El test de artefacto fallaba sin `release/` y no verificaba el bootstrap empaquetado | Listado perezoso y test de claves permitidas dentro del asar |
| El README promet�a cifrado AES-256-GCM, autorizaci�n por dominio/VPN y carga de `.env` | Se corrigieron las tres afirmaciones |

**Pendiente de verificaci�n:** reconstruir el artefacto en HEAD (`npm run release:build`) y correr `src/test/artifactSecrets.test.ts` sin que se saltee. En el entorno de implementaci�n la red dej� de resolver `github.com` (`EAI_AGAIN`) y electron-builder no pudo completar el empaquetado. La �ltima evidencia v�lida del artefacto corresponde a un build anterior a los �ltimos commits.

**Deuda que sigue abierta:** el renderer arranca en `READY` y bloquea reci�n cuando llega la respuesta del gate (ventana de milisegundos, y permanente si el preload no carga); no hay re-evaluaci�n peri�dica ni al recuperar foco; el `retryIntervalMs` s�lo se muestra en diagn�stico.
