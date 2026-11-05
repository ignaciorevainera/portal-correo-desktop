import { afterEach, describe, expect, it } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';

const {
  DEFAULTS,
  normalizePreferences,
  loadUiPreferences,
  saveUiPreferences,
} = require('../../electron/uiPreferences.cjs');

const tempDirs: string[] = [];

function makeUserDataDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pcd-ui-prefs-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tempDirs.length) {
    const dir = tempDirs.pop();
    if (dir) fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('preferencias de interfaz persistidas por el proceso principal', () => {
  it('usa bandeja y atajo activos cuando no hay archivo', () => {
    const prefs = loadUiPreferences(makeUserDataDir());

    expect(prefs).toEqual({ ...DEFAULTS, stored: false });
    expect(prefs.minimizeToTray).toBe(true);
    expect(prefs.globalHotkeyEnabled).toBe(true);
  });

  it('persiste cambios y los recupera en la siguiente lectura', () => {
    const dir = makeUserDataDir();

    const saved = saveUiPreferences(dir, {
      minimizeToTray: false,
      globalHotkeyEnabled: false,
    });
    expect(saved).toMatchObject({
      minimizeToTray: false,
      globalHotkeyEnabled: false,
      stored: true,
    });

    expect(loadUiPreferences(dir)).toEqual({
      minimizeToTray: false,
      globalHotkeyEnabled: false,
      stored: true,
    });
  });

  it('aplica cambios parciales sin perder el otro valor', () => {
    const dir = makeUserDataDir();

    saveUiPreferences(dir, { globalHotkeyEnabled: false });
    saveUiPreferences(dir, { minimizeToTray: false });

    expect(loadUiPreferences(dir)).toMatchObject({
      minimizeToTray: false,
      globalHotkeyEnabled: false,
      stored: true,
    });
  });

  it('descarta archivos corruptos y valores no booleanos', () => {
    const dir = makeUserDataDir();
    fs.writeFileSync(path.join(dir, 'ui-preferences.json'), '{ no-json');

    expect(loadUiPreferences(dir)).toEqual({ ...DEFAULTS, stored: false });

    fs.writeFileSync(
      path.join(dir, 'ui-preferences.json'),
      JSON.stringify({ minimizeToTray: 'no', globalHotkeyEnabled: 'false' })
    );

    expect(loadUiPreferences(dir)).toMatchObject({
      minimizeToTray: true,
      globalHotkeyEnabled: false,
      stored: true,
    });
  });

  it('normaliza entradas ausentes', () => {
    expect(normalizePreferences(undefined)).toEqual(DEFAULTS);
    expect(normalizePreferences({ minimizeToTray: false })).toEqual({
      minimizeToTray: false,
      globalHotkeyEnabled: true,
    });
  });
});
