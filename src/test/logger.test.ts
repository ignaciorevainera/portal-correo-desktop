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

    expect(JSON.stringify(out)).not.toContain('SuperSecreto123');
    expect(JSON.stringify(out)).not.toContain('clave-vnc');
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

  it('limpia secretos embebidos en el mensaje y en strings', () => {
    const linea = formatLine('info', 'gate', 'conectando pwd=S1 pass=S2 private_key=S3 password="S4"', {
      conn: 'Server=sql;Password=S5;',
      url: 'https://user:S6@host/path',
      json: 'token: {"password":"S7"}',
    });

    for (const secreto of ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7']) {
      expect(linea).not.toContain(secreto);
    }
    expect(linea).toContain('[redactado]');
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
