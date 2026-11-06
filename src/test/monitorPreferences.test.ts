import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const {
  DEFAULTS,
  PREFS_FILE_NAME,
  normalizeBounds,
  loadMonitorPreferences,
  saveMonitorPreferences,
} = require('../../electron/monitorPreferences.cjs');

describe('monitorPreferences', () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pcd-monitor-prefs-'));
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('devuelve los defaults cuando no hay archivo', () => {
    expect(loadMonitorPreferences(dir)).toEqual({
      ...DEFAULTS,
      stored: false,
    });
  });

  it('tolera un JSON corrupto', () => {
    const file = path.join(dir, PREFS_FILE_NAME);
    fs.writeFileSync(file, '{no-json');

    expect(fs.existsSync(file)).toBe(true);
    expect(loadMonitorPreferences(dir)).toEqual({
      ...DEFAULTS,
      stored: false,
    });
  });

  it('normaliza bounds inválidos a null', () => {
    expect(normalizeBounds({ x: 1, y: 2 })).toBeNull();
    expect(normalizeBounds({ x: 1, y: 2, width: 0, height: 300 })).toBeNull();
    expect(
      normalizeBounds({ x: 1, y: 2, width: -420, height: 300 }),
    ).toBeNull();
    expect(
      normalizeBounds({ x: 1, y: 2, width: 420.5, height: 300 }),
    ).toBeNull();
    expect(
      normalizeBounds({ x: 1, y: 2, width: 420, height: Number.NaN }),
    ).toBeNull();
    expect(
      normalizeBounds({
        x: 1,
        y: 2,
        width: 420,
        height: Number.POSITIVE_INFINITY,
      }),
    ).toBeNull();
    expect(
      normalizeBounds({ x: 1, y: 2, width: 10001, height: 300 }),
    ).toBeNull();
    expect(
      normalizeBounds({ x: -100, y: -50, width: 420, height: 300 }),
    ).toEqual({ x: -100, y: -50, width: 420, height: 300 });
    expect(
      normalizeBounds({ x: 1, y: 2, width: 420, height: 300 }),
    ).toEqual({ x: 1, y: 2, width: 420, height: 300 });
  });

  it('persiste y recupera bounds y pin', () => {
    const saved = saveMonitorPreferences(dir, {
      bounds: { x: 10, y: 20, width: 420, height: 300 },
      pinned: false,
    });

    expect(saved.stored).toBe(true);
    expect(loadMonitorPreferences(dir)).toEqual({
      bounds: { x: 10, y: 20, width: 420, height: 300 },
      pinned: false,
      stored: true,
    });
  });

  it('ignora campos desconocidos y conserva el valor previo', () => {
    saveMonitorPreferences(dir, { pinned: false });
    const saved = saveMonitorPreferences(dir, {
      bounds: { x: 1, y: 2, width: 420, height: 300 },
      foo: 1,
    });

    expect(saved.stored).toBe(true);
    const raw = JSON.parse(
      fs.readFileSync(path.join(dir, PREFS_FILE_NAME), 'utf8'),
    );
    expect(raw.foo).toBeUndefined();
    expect(loadMonitorPreferences(dir)).toEqual({
      bounds: { x: 1, y: 2, width: 420, height: 300 },
      pinned: false,
      stored: true,
    });
  });

  it('no marca stored si no hay directorio o la escritura falla', () => {
    expect(saveMonitorPreferences('', { pinned: false }).stored).toBe(false);

    const filePath = path.join(dir, 'not-a-dir');
    fs.writeFileSync(filePath, 'x');
    expect(saveMonitorPreferences(filePath, { pinned: false }).stored).toBe(
      false,
    );
  });
});
