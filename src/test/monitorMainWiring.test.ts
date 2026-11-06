import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const read = (relative: string) =>
  fs.readFileSync(path.join(process.cwd(), relative), 'utf8');

describe('monitor main wiring', () => {
  it('registra el atajo y los canales del monitor', () => {
    const main = read('electron/main.cjs');

    expect(main).toContain('CommandOrControl+Alt+Space');
    expect(main).toContain("'pcd:monitor-target-set'");
    expect(main).toContain("'pcd:monitor-open-current'");
    expect(main).toContain("'pcd:monitor-connect-remote'");
    expect(main).toContain("'pcd:monitor-remote-result'");
    expect(main).toContain("'pcd:monitor-shortcut-status'");
    expect(main).toContain('closeAllMonitors');
    expect(main).toMatch(/createMonitorInfrastructure\(\);/);
    expect(main).toMatch(/registerMonitorShortcut\(\);/);
    expect(main).toMatch(/pingSessions\.start\(event\.sender/);
    expect(main).toMatch(/pingSessions\.stop\(event\.sender/);
    expect(main).toMatch(
      /shutdownChildProcesses\(\);\s*app\.exit\(0\)/,
    );
  });

  it('el cierre y la bandeja cierran los monitores', () => {
    const main = read('electron/main.cjs');

    expect(main).toMatch(/win\.on\('close'[\s\S]{0,800}closeAllMonitors/);
    expect(main).toMatch(
      /pcd:window-hide-tray[\s\S]{0,300}closeAllMonitors/,
    );
  });

  it('el preload principal expone las funciones del monitor', () => {
    const preload = read('electron/preload.cjs');

    expect(preload).toContain('setMonitorTarget');
    expect(preload).toContain('openMonitorCurrent');
    expect(preload).toContain('onMonitorNotice');
    expect(preload).toContain('onMonitorRemoteResult');
    expect(preload).toContain('isMonitorShortcutRegistered');
    expect(preload).toContain("'pcd:monitor-target-set'");
    expect(preload).toContain("'pcd:monitor-open-current'");
    expect(preload).toContain("'pcd:monitor-notice'");
    expect(preload).toContain("'pcd:monitor-remote-result'");
    expect(preload).toContain("'pcd:monitor-shortcut-status'");
  });
});
