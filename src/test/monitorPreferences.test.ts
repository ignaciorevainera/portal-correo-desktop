import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const {
  DEFAULTS,
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
    fs.writeFileSync(path.join(dir, 'monitor-preferences.json'), '{no-json');
    expect(loadMonitorPreferences(dir)).toEqual({
      ...DEFAULTS,
      stored: false,
    });
  });

  it('normaliza bounds inválidos a null', () => {
    expect(normalizeBounds({ x: 1, y: 2 })).toBeNull();
    expect(normalizeBounds({ x: 1, y: 2, width: 420, height: 300 })).toEqual({
      x: 1,
      y: 2,
      width: 420,
      height: 300,
    });
  });

  it('persiste y recupera bounds y pin', () => {
    saveMonitorPreferences(dir, {
      bounds: { x: 10, y: 20, width: 420, height: 300 },
      pinned: false,
    });

    expect(loadMonitorPreferences(dir)).toEqual({
      bounds: { x: 10, y: 20, width: 420, height: 300 },
      pinned: false,
      stored: true,
    });
  });

  it('ignora campos desconocidos y conserva el valor previo', () => {
    saveMonitorPreferences(dir, { pinned: false });
    saveMonitorPreferences(dir, { bounds: { x: 1, y: 2, width: 420, height: 300 } });

    expect(loadMonitorPreferences(dir).pinned).toBe(false);
  });
});
