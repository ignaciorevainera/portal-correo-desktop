import { describe, it, expect } from 'vitest';

const { RELAUNCH_FLAG, isCompatEnabled, shouldRetryWithoutSandbox, buildRelaunchArgs } = require('../../electron/compatMode.cjs');

describe('modo compatibilidad y relanzamiento sin sandbox', () => {
  it('detecta PCD_COMPAT_MODE con valores habituales', () => {
    expect(isCompatEnabled({ PCD_COMPAT_MODE: '1' })).toBe(true);
    expect(isCompatEnabled({ PCD_COMPAT_MODE: 'true' })).toBe(true);
    expect(isCompatEnabled({ PCD_COMPAT_MODE: ' on ' })).toBe(true);
    expect(isCompatEnabled({ PCD_COMPAT_MODE: '0' })).toBe(false);
    expect(isCompatEnabled({})).toBe(false);
  });

  it('permite relanzar en el primer fallo', () => {
    expect(shouldRetryWithoutSandbox({ env: {}, argv: ['electron', '.'] })).toBe(true);
  });

  it('no relanza si ya se relanzó antes', () => {
    expect(shouldRetryWithoutSandbox({ env: { [RELAUNCH_FLAG]: '1' }, argv: ['electron', '.'] })).toBe(false);
  });

  it('no relanza si ya corre sin sandbox', () => {
    expect(shouldRetryWithoutSandbox({ env: {}, argv: ['electron', '.', '--no-sandbox'] })).toBe(false);
  });

  it('no relanza si el modo compatibilidad ya está activo', () => {
    expect(shouldRetryWithoutSandbox({ env: { PCD_COMPAT_MODE: '1' }, argv: ['electron', '.'] })).toBe(false);
  });

  it('construye argumentos preservando los originales y agregando --no-sandbox', () => {
    expect(buildRelaunchArgs(['electron.exe', '.', '--enable-logging'])).toEqual([
      '.',
      '--enable-logging',
      '--no-sandbox',
    ]);
  });
});
