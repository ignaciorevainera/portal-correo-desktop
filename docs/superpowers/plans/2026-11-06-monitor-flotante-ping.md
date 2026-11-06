# Monitor flotante de ping con conexión remota — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** agregar una ventana compacta de monitoreo `ping -t` por equipo consultado, con hasta 4 monitores simultáneos, sesiones de ping independientes de la consola principal, atajo global `Ctrl + Alt + Espacio` y conexión remota inteligente VNC/MSRA desde la cabecera del monitor.

**Architecture:** el proceso principal es el único dueño de los `ping.exe` y de las `BrowserWindow`. Un mapa de sesiones por `webContents.id` aísla la consola principal de cada monitor; un registro de ventanas por target reutiliza monitores y aplica el tope de 4. La UI del monitor es una entrada Vite propia (`monitor.html`) con un preload mínimo; la conexión remota reutiliza `launchRemoteSmart` y el resultado se muestra como toast en la ventana principal.

**Tech Stack:** Electron 34 · React 19 · TypeScript 5.7 · Vite 6 · Tailwind 4 · Vitest 3 · Testing Library · sonner · lucide-react.

**Prerrequisito:** `main` en `a4fae3d`, árbol limpio. Spec: `docs/superpowers/specs/2026-11-06-monitor-flotante-ping-design.md`.

**Comandos de referencia:** `npm test` (Vitest), `npx vitest run <archivo>` (un archivo), `npm run build` (tsc + Vite), `npm run audit:contrast`, `npm run release:check`.

---

## File Structure

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `electron/pingSessions.cjs` | crear | Sesiones de ping por `webContents.id`, tokens y enrutamiento de eventos. |
| `electron/monitorPreferences.cjs` | crear | Persistencia de `{ bounds, pinned }` en `userData`. |
| `electron/monitorWindows.cjs` | crear | Registro, creación, reutilización, tope, bounds, pin y cierre de monitores. |
| `electron/monitorShortcut.cjs` | crear | Handler puro del atajo global. |
| `electron/monitorRemote.cjs` | crear | Handler de conexión remota del monitor. |
| `electron/monitor-preload.cjs` | crear | `monitorAPI` mínimo. |
| `monitor.html` | crear | Entrada Vite del monitor; tema antes del paint. |
| `src/monitor.tsx` | crear | Bootstrap React del monitor. |
| `src/components/MonitorWindow.tsx` | crear | UI, consola, controles y conexión remota. |
| `src/lib/pingLog.ts` | crear | `sanitizePingText` y `classifyPingLine`. |
| `src/types/monitor.ts` | crear | Tipos compartidos de `monitorAPI`. |
| `src/types/monitor.d.ts` | crear | Declaración global de `window.monitorAPI`. |
| `electron/main.cjs` | modificar | Composición, IPC, atajo, target, ciclo de vida y remoto. |
| `electron/preload.cjs` | modificar | Target, apertura, avisos y resultado remoto. |
| `vite.config.ts` | modificar | Input multi-página `monitor.html`. |
| `src/components/LivePingConsole.tsx` | modificar | Usar `sanitizePingText` compartido. |
| `src/services/electronClient.ts` | modificar | Wrappers de target, apertura, avisos y resultado remoto. |
| `src/App.tsx` | modificar | Target, suscripciones, toasts y fallback local. |
| `src/components/SettingsModal.tsx` | modificar | Documentar el atajo. |
| `src/test/setup.ts` | modificar | Polyfill de `requestAnimationFrame` para jsdom. |
| `src/test/pingSessions.test.ts` | crear | Aislamiento de sesiones. |
| `src/test/monitorPreferences.test.ts` | crear | Persistencia. |
| `src/test/monitorWindows.test.ts` | crear | Registro, tope, bounds y cierre. |
| `src/test/monitorShortcut.test.ts` | crear | Atajo. |
| `src/test/monitorRemote.test.ts` | crear | Conexión remota. |
| `src/test/monitorSecurity.test.ts` | crear | Preload, ventana y build. |
| `src/test/monitorMainWiring.test.ts` | crear | Canales y ciclo de vida en `main.cjs`/`preload.cjs`. |
| `src/components/MonitorWindow.test.tsx` | crear | UI del monitor. |
| `src/lib/pingLog.test.ts` | crear | Sanitización y tonos. |
| `src/test/MonitorIntegration.test.tsx` | crear | Target, toasts y atajo local en `App`. |
| `src/services/electronClient.test.ts` | modificar | Wrappers nuevos. |
| `src/components/SettingsModal.test.tsx` | modificar | Texto del atajo. |
| `DESIGN.md` | modificar | Nota de la superficie de monitoreo. |

---

### Task 0: Rama y baseline

**Files:** ninguno.

- [ ] **Step 1: Verificar el árbol y crear la rama**

```bash
git status --porcelain
git switch -c feat/monitor-flotante-ping
```

Expected: `git status --porcelain` sin salida (árbol limpio). La rama nace de `a4fae3d`.

- [ ] **Step 2: Medir el baseline**

```bash
npm test
npm run build
```

Expected: suite completa en verde y build exitoso. Anotar el número de tests; el plan asume la suite actual.

---

### Task 1: Sesiones de ping por renderer

**Files:**
- Create: `electron/pingSessions.cjs`
- Test: `src/test/pingSessions.test.ts`

- [ ] **Step 1: Escribir el test que falla**

Crear `src/test/pingSessions.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';

const { createPingSessions } = require('../../electron/pingSessions.cjs');

function createSender(id: number) {
  const messages: Array<{ channel: string; payload: any }> = [];
  return {
    id,
    messages,
    isDestroyed: () => false,
    send: (channel: string, payload: any) => messages.push({ channel, payload }),
  };
}

function createHarness() {
  const procs: any[] = [];
  const executePing = vi.fn(
    (target: string, options: any, onData: any, onDone: any) => {
      const proc = { target, options, onData, onDone, kill: vi.fn() };
      procs.push(proc);
      return proc;
    },
  );
  const sessions = createPingSessions({
    executePing,
    logger: { warn: vi.fn() },
  });
  return { sessions, executePing, procs };
}

describe('pingSessions', () => {
  it('aísla los eventos por sender', () => {
    const { sessions, procs } = createHarness();
    const a = createSender(1);
    const b = createSender(2);

    sessions.start(a, '192.0.2.1', true);
    sessions.start(b, '192.0.2.2', true);
    procs[0].onData('a-1');
    procs[1].onData('b-1');

    expect(a.messages).toEqual([
      { channel: 'pcd:ping-data', payload: 'a-1' },
    ]);
    expect(b.messages).toEqual([
      { channel: 'pcd:ping-data', payload: 'b-1' },
    ]);
  });

  it('iniciar un ping nuevo de A mata solo el anterior de A', () => {
    const { sessions, procs } = createHarness();
    const a = createSender(1);
    const b = createSender(2);

    sessions.start(a, '192.0.2.1', true);
    sessions.start(b, '192.0.2.2', true);
    sessions.start(a, '192.0.2.3', true);

    expect(procs[0].kill).toHaveBeenCalledTimes(1);
    expect(procs[1].kill).not.toHaveBeenCalled();
    expect(procs[2].target).toBe('192.0.2.3');
  });

  it('un end viejo no emite después de reiniciar', () => {
    const { sessions, procs } = createHarness();
    const a = createSender(1);

    sessions.start(a, '192.0.2.1', true);
    sessions.start(a, '192.0.2.2', true);
    procs[0].onDone(0);

    expect(a.messages).toEqual([]);
  });

  it('detener A no toca B', () => {
    const { sessions, procs } = createHarness();
    const a = createSender(1);
    const b = createSender(2);

    sessions.start(a, '192.0.2.1', true);
    sessions.start(b, '192.0.2.2', true);

    expect(sessions.stop(a)).toBe(true);
    expect(procs[0].kill).toHaveBeenCalledTimes(1);
    expect(procs[1].kill).not.toHaveBeenCalled();
    expect(sessions.has(b)).toBe(true);
  });

  it('stopAll limpia todas las sesiones', () => {
    const { sessions, procs } = createHarness();
    sessions.start(createSender(1), '192.0.2.1', true);
    sessions.start(createSender(2), '192.0.2.2', true);

    sessions.stopAll();

    expect(procs.every((proc) => proc.kill.mock.calls.length === 1)).toBe(true);
    expect(sessions.count()).toBe(0);
  });

  it('no envía eventos a un sender destruido', () => {
    const { sessions, procs } = createHarness();
    const a = createSender(1);
    a.isDestroyed = () => true;

    sessions.start(a, '192.0.2.1', true);
    procs[0].onData('x');
    procs[0].onDone(0);

    expect(a.messages).toEqual([]);
    expect(sessions.count()).toBe(0);
  });

  it('no deja sesión si executePing devuelve null', () => {
    const executePing = vi.fn(() => null);
    const sessions = createPingSessions({
      executePing,
      logger: { warn: vi.fn() },
    });
    const a = createSender(1);

    sessions.start(a, '192.0.2.1', true);

    expect(sessions.has(a)).toBe(false);
  });
});
```

- [ ] **Step 2: Ejecutar el test y verificar que falla**

```bash
npx vitest run src/test/pingSessions.test.ts
```

Expected: FAIL con `Cannot find module '../../electron/pingSessions.cjs'`.

- [ ] **Step 3: Implementar el módulo**

Crear `electron/pingSessions.cjs`:

```js
/**
 * Sesiones de ping aisladas por renderer.
 *
 * Cada `webContents` puede tener una sola sesión activa. Iniciar una nueva
 * detiene solo la anterior de ese renderer; los eventos se envían únicamente
 * a él. Así la consola principal y cada monitor flotante no se interrumpen.
 */

function createPingSessions({ executePing, logger = console } = {}) {
  if (typeof executePing !== 'function') {
    throw new Error('createPingSessions requiere executePing');
  }

  const sessions = new Map();
  let nextSessionId = 1;

  function canSend(webContents) {
    if (!webContents || typeof webContents.send !== 'function') return false;
    if (typeof webContents.isDestroyed !== 'function') return true;
    try {
      return !webContents.isDestroyed();
    } catch {
      return false;
    }
  }

  function send(webContents, channel, payload) {
    if (!canSend(webContents)) return;
    webContents.send(channel, payload);
  }

  function stopById(webContentsId) {
    const session = sessions.get(webContentsId);
    if (!session) return false;
    sessions.delete(webContentsId);
    try {
      session.proc.kill();
    } catch (err) {
      logger.warn?.('No se pudo detener el ping', {
        error: err && err.message,
      });
    }
    return true;
  }

  function stop(webContents) {
    if (!webContents || typeof webContents.id !== 'number') return false;
    return stopById(webContents.id);
  }

  function start(webContents, target, continuous = false) {
    if (!webContents || typeof webContents.id !== 'number') {
      throw new Error('webContents inválido');
    }

    stopById(webContents.id);

    const sessionId = nextSessionId++;
    const session = {
      sessionId,
      proc: null,
      target,
      continuous: Boolean(continuous),
    };
    sessions.set(webContents.id, session);

    const isCurrent = () => sessions.get(webContents.id) === session;

    const onData = (data) => {
      if (!isCurrent()) return;
      send(webContents, 'pcd:ping-data', data);
    };

    const onDone = (code) => {
      if (!isCurrent()) return;
      sessions.delete(webContents.id);
      send(webContents, 'pcd:ping-end', code);
    };

    let proc = null;
    try {
      proc = executePing(
        target,
        continuous ? { continuous: true } : 4,
        onData,
        onDone,
      );
    } catch (err) {
      if (isCurrent()) {
        sessions.delete(webContents.id);
        send(
          webContents,
          'pcd:ping-data',
          `Error al iniciar ping: ${err.message}\n`,
        );
        send(webContents, 'pcd:ping-end', 1);
      }
      logger.warn?.('Error al iniciar ping', {
        error: err && err.message,
      });
      return null;
    }

    if (!proc) {
      if (isCurrent()) sessions.delete(webContents.id);
      return null;
    }

    session.proc = proc;
    return session;
  }

  function stopAll() {
    for (const [id, session] of sessions) {
      try {
        session.proc.kill();
      } catch (err) {
        logger.warn?.('No se pudo detener el ping', {
          error: err && err.message,
        });
      }
      sessions.delete(id);
    }
  }

  function has(webContents) {
    return Boolean(webContents && sessions.has(webContents.id));
  }

  function count() {
    return sessions.size;
  }

  return { start, stop, stopById, stopAll, has, count };
}

module.exports = { createPingSessions };
```

- [ ] **Step 4: Ejecutar el test y verificar que pasa**

```bash
npx vitest run src/test/pingSessions.test.ts
```

Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add electron/pingSessions.cjs src/test/pingSessions.test.ts
git commit -m "feat(ping): isolate sessions per renderer"
```

---

### Task 2: Preferencias del monitor

**Files:**
- Create: `electron/monitorPreferences.cjs`
- Test: `src/test/monitorPreferences.test.ts`

- [ ] **Step 1: Escribir el test que falla**

Crear `src/test/monitorPreferences.test.ts`:

```ts
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
```

- [ ] **Step 2: Ejecutar el test y verificar que falla**

```bash
npx vitest run src/test/monitorPreferences.test.ts
```

Expected: FAIL con `Cannot find module '../../electron/monitorPreferences.cjs'`.

- [ ] **Step 3: Implementar el módulo**

Crear `electron/monitorPreferences.cjs`:

```js
const fs = require('fs');
const path = require('path');

const PREFS_FILE_NAME = 'monitor-preferences.json';

const DEFAULTS = Object.freeze({
  bounds: null,
  pinned: true,
});

function preferencesPath(userDataDir) {
  return path.join(userDataDir, PREFS_FILE_NAME);
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function normalizeBounds(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const { x, y, width, height } = raw;
  if (![x, y, width, height].every(isFiniteNumber)) return null;
  return { x, y, width, height };
}

function normalizePreferences(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  return {
    bounds: normalizeBounds(source.bounds),
    pinned:
      typeof source.pinned === 'boolean' ? source.pinned : DEFAULTS.pinned,
  };
}

function loadMonitorPreferences(userDataDir) {
  if (!userDataDir) return { ...DEFAULTS, stored: false };

  try {
    const file = preferencesPath(userDataDir);
    if (!fs.existsSync(file)) return { ...DEFAULTS, stored: false };
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    return { ...normalizePreferences(raw), stored: true };
  } catch {
    return { ...DEFAULTS, stored: false };
  }
}

function saveMonitorPreferences(userDataDir, patch) {
  const current = loadMonitorPreferences(userDataDir);
  const next = normalizePreferences({ ...current, ...(patch || {}) });

  if (userDataDir) {
    try {
      const file = preferencesPath(userDataDir);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      const tmp = `${file}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(next, null, 2), 'utf8');
      fs.renameSync(tmp, file);
    } catch {
      // Sin persistencia, el cambio aplica solo en esta sesión.
    }
  }

  return { ...next, stored: true };
}

module.exports = {
  DEFAULTS,
  PREFS_FILE_NAME,
  normalizeBounds,
  normalizePreferences,
  loadMonitorPreferences,
  saveMonitorPreferences,
};
```

- [ ] **Step 4: Ejecutar el test y verificar que pasa**

```bash
npx vitest run src/test/monitorPreferences.test.ts
```

Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add electron/monitorPreferences.cjs src/test/monitorPreferences.test.ts
git commit -m "feat(monitor): persist bounds and pin preference"
```

---

### Task 3: Registro y ciclo de vida de las ventanas

**Files:**
- Create: `electron/monitorWindows.cjs`
- Test: `src/test/monitorWindows.test.ts`

- [ ] **Step 1: Escribir el test que falla**

Crear `src/test/monitorWindows.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createMonitorManager,
  normalizeMonitorTarget,
  clampMonitorBounds,
} = require('../../electron/monitorWindows.cjs');

class FakeBrowserWindow {
  static instances: FakeBrowserWindow[] = [];
  static nextWebContentsId = 1;

  options: any;
  destroyed = false;
  visible = false;
  focused = false;
  alwaysOnTop = false;
  skipTaskbar = false;
  webContents: any;
  handlers: Record<string, Function> = {};

  constructor(options: any) {
    this.options = options;
    this.alwaysOnTop = Boolean(options.alwaysOnTop);
    this.webContents = {
      id: FakeBrowserWindow.nextWebContentsId++,
      setWindowOpenHandler: vi.fn(),
      on: vi.fn(),
    };
    FakeBrowserWindow.instances.push(this);
  }

  on(event: string, callback: Function) {
    this.handlers[event] = callback;
  }

  once(event: string, callback: Function) {
    this.handlers[event] = callback;
  }

  isDestroyed() {
    return this.destroyed;
  }

  isVisible() {
    return this.visible;
  }

  isMinimized() {
    return false;
  }

  show() {
    this.visible = true;
  }

  focus() {
    this.focused = true;
  }

  restore() {}

  setAlwaysOnTop(value: boolean) {
    this.alwaysOnTop = value;
  }

  setSkipTaskbar(value: boolean) {
    this.skipTaskbar = value;
  }

  getPosition() {
    return [this.options.x, this.options.y];
  }

  getSize() {
    return [this.options.width, this.options.height];
  }

  getBounds() {
    return {
      x: this.options.x,
      y: this.options.y,
      width: this.options.width,
      height: this.options.height,
    };
  }

  close() {
    this.destroyed = true;
    this.handlers.closed?.();
  }

  destroy() {
    this.destroyed = true;
    this.handlers.closed?.();
  }
}

function createHarness(overrides: any = {}) {
  const savePreferences = vi.fn();
  const notify = vi.fn();
  const onClosed = vi.fn();
  const loadRenderer = vi.fn().mockResolvedValue(undefined);
  const manager = createMonitorManager({
    BrowserWindow: FakeBrowserWindow,
    screen: {
      getDisplayMatching: () => ({
        workArea: { x: 0, y: 0, width: 1920, height: 1080 },
      }),
    },
    getMainWindow: () => ({
      getBounds: () => ({ x: 0, y: 0, width: 1020, height: 680 }),
    }),
    loadRenderer,
    preloadPath: 'C:\\app\\electron\\monitor-preload.cjs',
    iconPath: 'C:\\app\\icon.ico',
    loadPreferences: () => ({
      bounds: null,
      pinned: true,
      ...(overrides.prefs || {}),
    }),
    savePreferences,
    notify,
    onClosed,
    logger: { warn: vi.fn(), error: vi.fn() },
    ...overrides,
  });
  return { manager, savePreferences, notify, onClosed, loadRenderer };
}

describe('monitorWindows', () => {
  beforeEach(() => {
    FakeBrowserWindow.instances = [];
    FakeBrowserWindow.nextWebContentsId = 1;
  });

  it('normaliza el target', () => {
    expect(normalizeMonitorTarget(' 192.0.2.100 ')).toBe('192.0.2.100');
    expect(normalizeMonitorTarget(null)).toBe('');
  });

  it('ajusta bounds al área visible', () => {
    expect(
      clampMonitorBounds(
        { x: -500, y: -500, width: 2000, height: 2000 },
        { x: 0, y: 0, width: 1920, height: 1080 },
      ),
    ).toEqual({ x: 0, y: 0, width: 800, height: 600 });
  });

  it('crea una ventana con la configuración de seguridad', () => {
    const { manager } = createHarness();
    const result = manager.open({
      target: '192.0.2.100',
      label: 'WS-CORP-100',
    });

    expect(result).toEqual({ ok: true, reused: false });
    expect(FakeBrowserWindow.instances).toHaveLength(1);
    const win = FakeBrowserWindow.instances[0];
    expect(win.options.webPreferences).toMatchObject({
      contextIsolation: true,
      nodeIntegration: false,
    });
    expect(win.options.frame).toBe(false);
    expect(win.options.alwaysOnTop).toBe(true);
    expect(win.options.skipTaskbar).toBe(true);
    expect(win.skipTaskbar).toBe(true);
    expect(win.webContents.setWindowOpenHandler).toHaveBeenCalled();
  });

  it('reutiliza el monitor del mismo target', () => {
    const { manager } = createHarness();
    manager.open({ target: '192.0.2.100', label: 'WS-CORP-100' });
    const result = manager.open({
      target: ' 192.0.2.100 ',
      label: 'WS-CORP-100',
    });

    expect(result).toEqual({ ok: true, reused: true });
    expect(FakeBrowserWindow.instances).toHaveLength(1);
    expect(FakeBrowserWindow.instances[0].focused).toBe(true);
  });

  it('respeta el tope de 4 y avisa', () => {
    const { manager, notify } = createHarness();
    for (let index = 0; index < 4; index += 1) {
      manager.open({ target: `192.0.2.${index}`, label: `PC-${index}` });
    }
    const result = manager.open({ target: '192.0.2.99', label: 'PC-99' });

    expect(result).toEqual({ ok: false, reason: 'limit' });
    expect(FakeBrowserWindow.instances).toHaveLength(4);
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'limit' }),
    );
  });

  it('cierra una ventana y limpia la sesión', () => {
    const { manager, onClosed } = createHarness();
    manager.open({ target: '192.0.2.100', label: 'WS-CORP-100' });
    const win = FakeBrowserWindow.instances[0];
    const webContents = { id: win.webContents.id };

    expect(manager.close(webContents)).toBe(true);
    expect(win.destroyed).toBe(true);
    expect(onClosed).toHaveBeenCalledWith(win.webContents.id);
    expect(manager.getContext(webContents)).toBeNull();
  });

  it('closeAll destruye todo y limpia las sesiones', () => {
    const { manager, onClosed } = createHarness();
    manager.open({ target: '192.0.2.100', label: 'PC-100' });
    manager.open({ target: '192.0.2.101', label: 'PC-101' });

    manager.closeAll();

    expect(FakeBrowserWindow.instances.every((win) => win.destroyed)).toBe(
      true,
    );
    expect(onClosed).toHaveBeenCalledTimes(2);
    expect(manager.count()).toBe(0);
  });

  it('persiste y aplica el pin', () => {
    const { manager, savePreferences } = createHarness();
    manager.open({ target: '192.0.2.100', label: 'WS-CORP-100' });
    const win = FakeBrowserWindow.instances[0];
    const webContents = { id: win.webContents.id };

    expect(manager.setPinned(webContents, false)).toBe(true);
    expect(win.alwaysOnTop).toBe(false);
    expect(savePreferences).toHaveBeenCalledWith({ pinned: false });
    expect(manager.getContext(webContents)).toEqual({
      target: '192.0.2.100',
      label: 'WS-CORP-100',
      pinned: false,
    });
  });

  it('clampa los bounds persistidos al abrir', () => {
    const { manager } = createHarness({
      prefs: {
        bounds: { x: 1900, y: 1000, width: 420, height: 300 },
      },
    });
    manager.open({ target: '192.0.2.100', label: 'WS-CORP-100' });
    const win = FakeBrowserWindow.instances[0];

    expect(win.options.x).toBe(1500);
    expect(win.options.y).toBe(780);
  });

  it('avisa si el renderer no carga', async () => {
    const loadRenderer = vi.fn().mockRejectedValue(new Error('load failed'));
    const { manager, notify } = createHarness({ loadRenderer });
    manager.open({ target: '192.0.2.100', label: 'WS-CORP-100' });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(FakeBrowserWindow.instances[0].destroyed).toBe(true);
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'error' }),
    );
  });
});
```

- [ ] **Step 2: Ejecutar el test y verificar que falla**

```bash
npx vitest run src/test/monitorWindows.test.ts
```

Expected: FAIL con `Cannot find module '../../electron/monitorWindows.cjs'`.

- [ ] **Step 3: Implementar el módulo**

Crear `electron/monitorWindows.cjs`:

```js
const DEFAULT_MAX_MONITORS = 4;
const DEFAULT_WIDTH = 420;
const DEFAULT_HEIGHT = 300;
const MIN_WIDTH = 320;
const MIN_HEIGHT = 220;
const MAX_WIDTH = 800;
const MAX_HEIGHT = 600;
const CASCADE_OFFSET = 24;

function normalizeMonitorTarget(target) {
  return typeof target === 'string' ? target.trim().toLowerCase() : '';
}

function clampMonitorBounds(bounds, workArea) {
  const width = Math.min(
    Math.max(Math.round(bounds.width), MIN_WIDTH),
    MAX_WIDTH,
  );
  const height = Math.min(
    Math.max(Math.round(bounds.height), MIN_HEIGHT),
    MAX_HEIGHT,
  );
  const maxX = workArea.x + workArea.width - width;
  const maxY = workArea.y + workArea.height - height;
  const x = Math.min(Math.max(Math.round(bounds.x), workArea.x), maxX);
  const y = Math.min(Math.max(Math.round(bounds.y), workArea.y), maxY);
  return { x, y, width, height };
}

function createMonitorManager({
  BrowserWindow,
  screen,
  getMainWindow,
  loadRenderer,
  preloadPath,
  iconPath,
  loadPreferences,
  savePreferences,
  notify = () => {},
  onClosed = () => {},
  logger = console,
  maxMonitors = DEFAULT_MAX_MONITORS,
}) {
  const windows = new Map();
  const byWebContentsId = new Map();
  let saveTimer = null;

  function getWorkArea() {
    const main = getMainWindow && getMainWindow();
    try {
      const display =
        main && screen && screen.getDisplayMatching
          ? screen.getDisplayMatching(main.getBounds())
          : screen.getPrimaryDisplay();
      return display.workArea;
    } catch {
      return { x: 0, y: 0, width: 1920, height: 1080 };
    }
  }

  function nextBounds() {
    const prefs = loadPreferences();
    const workArea = getWorkArea();
    const base = prefs.bounds || {
      x: workArea.x + Math.round((workArea.width - DEFAULT_WIDTH) / 2),
      y: workArea.y + Math.round((workArea.height - DEFAULT_HEIGHT) / 2),
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
    };
    const offset = windows.size * CASCADE_OFFSET;
    return clampMonitorBounds(
      { ...base, x: base.x + offset, y: base.y + offset },
      workArea,
    );
  }

  function persistBounds(win) {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveTimer = null;
      if (!win || win.isDestroyed()) return;
      try {
        const [x, y] = win.getPosition();
        const [width, height] = win.getSize();
        savePreferences({ bounds: { x, y, width, height } });
      } catch (err) {
        logger.warn?.('No se pudieron guardar los bounds del monitor', {
          error: err && err.message,
        });
      }
    }, 300);
  }

  function cleanup(entry) {
    if (entry.closed) return;
    entry.closed = true;
    if (windows.get(entry.key) === entry) {
      windows.delete(entry.key);
    }
    byWebContentsId.delete(entry.webContentsId);
    try {
      onClosed(entry.webContentsId);
    } catch (err) {
      logger.warn?.('Error al limpiar el monitor', {
        error: err && err.message,
      });
    }
  }

  function open({ target, label } = {}) {
    const key = normalizeMonitorTarget(target);
    if (!key) return { ok: false, reason: 'invalid-target' };

    const existing = windows.get(key);
    if (existing && !existing.win.isDestroyed()) {
      if (existing.win.isMinimized()) existing.win.restore();
      if (!existing.win.isVisible()) existing.win.show();
      existing.win.focus();
      return { ok: true, reused: true };
    }

    if (windows.size >= maxMonitors) {
      notify({
        kind: 'limit',
        message: `Máximo de ${maxMonitors} monitores abiertos. Cerrá uno para abrir otro.`,
      });
      return { ok: false, reason: 'limit' };
    }

    const prefs = loadPreferences();
    const bounds = nextBounds();
    let win;
    try {
      win = new BrowserWindow({
        ...bounds,
        minWidth: MIN_WIDTH,
        minHeight: MIN_HEIGHT,
        maxWidth: MAX_WIDTH,
        maxHeight: MAX_HEIGHT,
        frame: false,
        resizable: true,
        minimizable: false,
        maximizable: false,
        fullscreenable: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        show: false,
        autoHideMenuBar: true,
        backgroundColor: '#0C0C0C',
        title: `Monitor de ping — ${label || target}`,
        ...(iconPath ? { icon: iconPath } : {}),
        webPreferences: {
          preload: preloadPath,
          contextIsolation: true,
          nodeIntegration: false,
        },
      });
    } catch (err) {
      logger.error?.('No se pudo crear el monitor', {
        error: err && err.message,
      });
      notify({ kind: 'error', message: 'No se pudo abrir el monitor de ping.' });
      return { ok: false, reason: 'error' };
    }

    const webContentsId = win.webContents.id;
    const entry = {
      key,
      target,
      label: label || target,
      win,
      pinned: prefs.pinned !== false,
      webContentsId,
      closed: false,
    };
    windows.set(key, entry);
    byWebContentsId.set(webContentsId, entry);

    win.setAlwaysOnTop(entry.pinned);
    win.setSkipTaskbar(true);
    win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    win.webContents.on('will-navigate', (event) => event.preventDefault());
    win.on('move', () => persistBounds(win));
    win.on('resize', () => persistBounds(win));
    win.on('closed', () => cleanup(entry));
    win.webContents.on('render-process-gone', () => {
      if (!win.isDestroyed()) win.destroy();
    });
    win.once('ready-to-show', () => {
      if (!win.isDestroyed()) win.show();
    });

    Promise.resolve()
      .then(() => loadRenderer(win, 'monitor.html'))
      .catch((err) => {
        logger.error?.('No se pudo cargar el monitor', {
          error: err && err.message,
        });
        if (!win.isDestroyed()) win.destroy();
        notify({
          kind: 'error',
          message: 'No se pudo abrir el monitor de ping.',
        });
      });

    return { ok: true, reused: false };
  }

  function close(webContents) {
    const entry = byWebContentsId.get(webContents && webContents.id);
    if (!entry) return false;
    entry.win.close();
    cleanup(entry);
    return true;
  }

  function closeAll() {
    for (const entry of [...windows.values()]) {
      if (!entry.win.isDestroyed()) entry.win.destroy();
      cleanup(entry);
    }
    windows.clear();
    byWebContentsId.clear();
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
  }

  function getContext(webContents) {
    const entry = byWebContentsId.get(webContents && webContents.id);
    if (!entry) return null;
    return { target: entry.target, label: entry.label, pinned: entry.pinned };
  }

  function getTarget(webContents) {
    const entry = byWebContentsId.get(webContents && webContents.id);
    return entry ? entry.target : null;
  }

  function setPinned(webContents, pinned) {
    const entry = byWebContentsId.get(webContents && webContents.id);
    if (!entry) return false;
    entry.pinned = Boolean(pinned);
    entry.win.setAlwaysOnTop(entry.pinned);
    savePreferences({ pinned: entry.pinned });
    return true;
  }

  function has(target) {
    return windows.has(normalizeMonitorTarget(target));
  }

  function count() {
    return windows.size;
  }

  return {
    open,
    close,
    closeAll,
    getContext,
    getTarget,
    setPinned,
    has,
    count,
  };
}

module.exports = {
  DEFAULT_MAX_MONITORS,
  DEFAULT_WIDTH,
  DEFAULT_HEIGHT,
  MIN_WIDTH,
  MIN_HEIGHT,
  MAX_WIDTH,
  MAX_HEIGHT,
  CASCADE_OFFSET,
  normalizeMonitorTarget,
  clampMonitorBounds,
  createMonitorManager,
};
```

- [ ] **Step 4: Ejecutar el test y verificar que pasa**

```bash
npx vitest run src/test/monitorWindows.test.ts
```

Expected: PASS, 9 tests.

- [ ] **Step 5: Commit**

```bash
git add electron/monitorWindows.cjs src/test/monitorWindows.test.ts
git commit -m "feat(monitor): add window registry and lifecycle"
```

---

### Task 4: Handler del atajo

**Files:**
- Create: `electron/monitorShortcut.cjs`
- Test: `src/test/monitorShortcut.test.ts`

- [ ] **Step 1: Escribir el test que falla**

Crear `src/test/monitorShortcut.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';

const { createMonitorShortcut } = require('../../electron/monitorShortcut.cjs');

function createWindow(overrides: any = {}) {
  const win: any = {
    destroyed: false,
    minimized: false,
    visible: true,
    focused: false,
    isDestroyed: () => win.destroyed,
    isMinimized: () => win.minimized,
    isVisible: () => win.visible,
    restore: () => {
      win.minimized = false;
    },
    show: () => {
      win.visible = true;
    },
    focus: () => {
      win.focused = true;
    },
    ...overrides,
  };
  return win;
}

describe('monitorShortcut', () => {
  it('restaura, muestra y enfoca la principal', () => {
    const win = createWindow({ minimized: true, visible: false });
    const openMonitor = vi.fn().mockReturnValue({ ok: true });
    const focusSearch = vi.fn();
    const shortcut = createMonitorShortcut({
      getMainWindow: () => win,
      getLastTarget: () => ({ target: '192.0.2.100', label: 'PC-100' }),
      openMonitor,
      focusSearch,
      notify: vi.fn(),
      logger: { debug: vi.fn() },
    });

    const result = shortcut.handle();

    expect(result).toEqual({ ok: true });
    expect(win.minimized).toBe(false);
    expect(win.visible).toBe(true);
    expect(win.focused).toBe(true);
    expect(openMonitor).toHaveBeenCalledWith({
      target: '192.0.2.100',
      label: 'PC-100',
    });
    expect(focusSearch).not.toHaveBeenCalled();
  });

  it('sin target enfoca el buscador', () => {
    const win = createWindow();
    const focusSearch = vi.fn();
    const openMonitor = vi.fn();
    const shortcut = createMonitorShortcut({
      getMainWindow: () => win,
      getLastTarget: () => null,
      openMonitor,
      focusSearch,
      notify: vi.fn(),
      logger: { debug: vi.fn() },
    });

    expect(shortcut.handle()).toEqual({ ok: false, reason: 'no-target' });
    expect(focusSearch).toHaveBeenCalledWith(win);
    expect(openMonitor).not.toHaveBeenCalled();
  });

  it('avisa cuando se alcanza el tope', () => {
    const notify = vi.fn();
    const shortcut = createMonitorShortcut({
      getMainWindow: () => createWindow(),
      getLastTarget: () => ({ target: '192.0.2.100', label: 'PC-100' }),
      openMonitor: () => ({ ok: false, reason: 'limit' }),
      focusSearch: vi.fn(),
      notify,
      logger: { debug: vi.fn() },
    });

    shortcut.handle();

    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'limit' }),
    );
  });

  it('no hace nada sin ventana principal', () => {
    const shortcut = createMonitorShortcut({
      getMainWindow: () => null,
      getLastTarget: () => ({ target: '192.0.2.100' }),
      openMonitor: vi.fn(),
      focusSearch: vi.fn(),
      notify: vi.fn(),
      logger: { debug: vi.fn() },
    });

    expect(shortcut.handle()).toEqual({ ok: false, reason: 'no-window' });
  });
});
```

- [ ] **Step 2: Ejecutar el test y verificar que falla**

```bash
npx vitest run src/test/monitorShortcut.test.ts
```

Expected: FAIL con `Cannot find module '../../electron/monitorShortcut.cjs'`.

- [ ] **Step 3: Implementar el módulo**

Crear `electron/monitorShortcut.cjs`:

```js
function createMonitorShortcut({
  getMainWindow,
  getLastTarget,
  openMonitor,
  focusSearch,
  notify = () => {},
  logger = console,
}) {
  function handle() {
    const win = getMainWindow && getMainWindow();
    if (!win || (typeof win.isDestroyed === 'function' && win.isDestroyed())) {
      return { ok: false, reason: 'no-window' };
    }

    if (win.isMinimized()) win.restore();
    if (!win.isVisible()) win.show();
    win.focus();

    const lastTarget = getLastTarget && getLastTarget();
    if (!lastTarget || !lastTarget.target) {
      logger.debug?.('Atajo de monitor sin target consultado');
      focusSearch(win);
      return { ok: false, reason: 'no-target' };
    }

    const result = openMonitor(lastTarget);
    if (result && !result.ok && result.reason === 'limit') {
      notify({
        kind: 'limit',
        message:
          'Máximo de 4 monitores abiertos. Cerrá uno para abrir otro.',
      });
    } else if (result && !result.ok && result.reason === 'error') {
      notify({
        kind: 'error',
        message: 'No se pudo abrir el monitor de ping.',
      });
    }
    return result;
  }

  return { handle };
}

module.exports = { createMonitorShortcut };
```

- [ ] **Step 4: Ejecutar el test y verificar que pasa**

```bash
npx vitest run src/test/monitorShortcut.test.ts
```

Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add electron/monitorShortcut.cjs src/test/monitorShortcut.test.ts
git commit -m "feat(monitor): handle global monitor shortcut"
```

---

### Task 5: Conexión remota del monitor

**Files:**
- Create: `electron/monitorRemote.cjs`
- Test: `src/test/monitorRemote.test.ts`

- [ ] **Step 1: Escribir el test que falla**

Crear `src/test/monitorRemote.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';

const { createMonitorRemote } = require('../../electron/monitorRemote.cjs');

function createHarness(overrides: any = {}) {
  const launchRemoteSmart = vi.fn().mockResolvedValue({
    success: true,
    methodUsed: 'vnc',
    portUsed: 5901,
    message: 'VNC iniciado',
  });
  const resolveVncSecret = vi.fn().mockResolvedValue('secret');
  const notifyMain = vi.fn();
  const flashMain = vi.fn();
  const remote = createMonitorRemote({
    getTarget: () => '192.0.2.100',
    launchRemoteSmart,
    resolveVncSecret,
    notifyMain,
    flashMain,
    logger: { warn: vi.fn() },
    ...overrides,
  });
  return { remote, launchRemoteSmart, resolveVncSecret, notifyMain, flashMain };
}

describe('monitorRemote', () => {
  it('usa el target registrado y notifica el resultado', async () => {
    const { remote, launchRemoteSmart, resolveVncSecret, notifyMain } =
      createHarness();

    const result = await remote.connect({ id: 1 });

    expect(launchRemoteSmart).toHaveBeenCalledWith('192.0.2.100', {
      vncPassword: 'secret',
    });
    expect(resolveVncSecret).toHaveBeenCalledTimes(1);
    expect(notifyMain).toHaveBeenCalledWith(
      expect.objectContaining({ target: '192.0.2.100', success: true }),
    );
    expect(result).toEqual(
      expect.objectContaining({ success: true, methodUsed: 'vnc' }),
    );
  });

  it('hace flash y notifica cuando no hay acceso', async () => {
    const launchRemoteSmart = vi.fn().mockResolvedValue({
      success: false,
      methodUsed: 'none',
      message: 'Sin acceso',
    });
    const { remote, notifyMain, flashMain } = createHarness({
      launchRemoteSmart,
    });

    await remote.connect({ id: 1 });

    expect(notifyMain).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, target: '192.0.2.100' }),
    );
    expect(flashMain).toHaveBeenCalled();
  });

  it('captura errores inesperados', async () => {
    const launchRemoteSmart = vi.fn().mockRejectedValue(new Error('boom'));
    const { remote, notifyMain, flashMain } = createHarness({
      launchRemoteSmart,
    });

    const result = await remote.connect({ id: 1 });

    expect(result).toEqual(
      expect.objectContaining({ success: false, methodUsed: 'none' }),
    );
    expect(result.message).toContain('boom');
    expect(notifyMain).toHaveBeenCalledWith(
      expect.objectContaining({ success: false }),
    );
    expect(flashMain).toHaveBeenCalled();
  });

  it('no lanza nada si el sender no es un monitor', async () => {
    const launchRemoteSmart = vi.fn();
    const { remote } = createHarness({
      getTarget: () => null,
      launchRemoteSmart,
    });

    const result = await remote.connect({ id: 99 });

    expect(result.success).toBe(false);
    expect(launchRemoteSmart).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Ejecutar el test y verificar que falla**

```bash
npx vitest run src/test/monitorRemote.test.ts
```

Expected: FAIL con `Cannot find module '../../electron/monitorRemote.cjs'`.

- [ ] **Step 3: Implementar el módulo**

Crear `electron/monitorRemote.cjs`:

```js
function createMonitorRemote({
  getTarget,
  launchRemoteSmart,
  resolveVncSecret,
  notifyMain,
  flashMain = () => {},
  logger = console,
}) {
  async function connect(webContents) {
    const target = getTarget && getTarget(webContents);
    if (!target) {
      return {
        success: false,
        methodUsed: 'none',
        message: 'Monitor no registrado.',
      };
    }

    try {
      const vncPassword = await resolveVncSecret();
      const result = await launchRemoteSmart(target, { vncPassword });
      notifyMain({ ...result, target });
      if (!result.success) flashMain();
      return result;
    } catch (err) {
      const result = {
        success: false,
        methodUsed: 'none',
        message: `Error al conectar remotamente: ${err.message}`,
      };
      notifyMain({ ...result, target });
      flashMain();
      logger.warn?.('Error de conexión remota del monitor', {
        target,
        error: err && err.message,
      });
      return result;
    }
  }

  return { connect };
}

module.exports = { createMonitorRemote };
```

- [ ] **Step 4: Ejecutar el test y verificar que pasa**

```bash
npx vitest run src/test/monitorRemote.test.ts
```

Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add electron/monitorRemote.cjs src/test/monitorRemote.test.ts
git commit -m "feat(monitor): add smart remote connection handler"
```

---

### Task 6: Entrada Vite, preload y tipos del monitor

**Files:**
- Create: `monitor.html`
- Create: `src/monitor.tsx`
- Create: `src/types/monitor.ts`
- Create: `src/types/monitor.d.ts`
- Create: `electron/monitor-preload.cjs`
- Modify: `vite.config.ts`
- Test: `src/test/monitorSecurity.test.ts`

- [ ] **Step 1: Escribir el test que falla**

Crear `src/test/monitorSecurity.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relative: string) =>
  fs.readFileSync(path.join(root, relative), 'utf8');

describe('monitor surface security', () => {
  it('el preload del monitor expone solo la API mínima', () => {
    const preload = read('electron/monitor-preload.cjs');

    expect(preload).toContain("exposeInMainWorld('monitorAPI'");
    expect(preload).toContain('getContext');
    expect(preload).toContain('connectRemote');
    expect(preload).not.toContain('launchVnc');
    expect(preload).not.toContain('launchMsra');
    expect(preload).not.toContain("require('fs')");
    expect(preload).not.toContain("require('child_process')");
  });

  it('la ventana del monitor usa aislamiento y deniega ventanas nuevas', () => {
    const source = read('electron/monitorWindows.cjs');

    expect(source).toContain('contextIsolation: true');
    expect(source).toContain('nodeIntegration: false');
    expect(source).toContain('setWindowOpenHandler');
    expect(source).toContain('will-navigate');
  });

  it('monitor.html es una entrada Vite con tema previo al paint', () => {
    const html = read('monitor.html');
    expect(html).toContain('/src/monitor.tsx');
    expect(html).toContain('pcd-theme');

    const vite = read('vite.config.ts');
    expect(vite).toContain('monitor.html');
    expect(vite).toContain('monitor:');
  });
});
```

- [ ] **Step 2: Ejecutar el test y verificar que falla**

```bash
npx vitest run src/test/monitorSecurity.test.ts
```

Expected: FAIL con `ENOENT` al leer `electron/monitor-preload.cjs` o `monitor.html`.

- [ ] **Step 3: Crear la entrada, el preload y los tipos**

Crear `src/types/monitor.ts`:

```ts
export interface MonitorContext {
  target: string;
  label: string;
  pinned: boolean;
}

export interface MonitorRemoteResult {
  success: boolean;
  methodUsed: 'vnc' | 'msra' | 'none';
  target?: string;
  portUsed?: number;
  message?: string;
  vncClosed?: boolean;
  msraAvailable?: boolean;
}

export interface MonitorApi {
  getContext(): Promise<MonitorContext | null>;
  startPing(): void;
  stopPing(): Promise<boolean>;
  onPingData(callback: (text: string) => void): () => void;
  onPingEnd(callback: (code: number | null) => void): () => void;
  setPinned(pinned: boolean): Promise<boolean>;
  close(): Promise<void>;
  copyText(text: string): Promise<boolean>;
  connectRemote(): Promise<MonitorRemoteResult>;
}
```

Crear `src/types/monitor.d.ts`:

```ts
import type { MonitorApi } from './monitor';

declare global {
  interface Window {
    monitorAPI?: MonitorApi;
  }
}

export {};
```

Crear `electron/monitor-preload.cjs`:

```js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('monitorAPI', {
  getContext: () => ipcRenderer.invoke('pcd:monitor-context'),
  startPing: () => ipcRenderer.send('pcd:monitor-ping-start'),
  stopPing: () => ipcRenderer.invoke('pcd:monitor-ping-stop'),
  onPingData: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on('pcd:ping-data', listener);
    return () => ipcRenderer.removeListener('pcd:ping-data', listener);
  },
  onPingEnd: (callback) => {
    const listener = (_event, code) => callback(code);
    ipcRenderer.on('pcd:ping-end', listener);
    return () => ipcRenderer.removeListener('pcd:ping-end', listener);
  },
  setPinned: (pinned) =>
    ipcRenderer.invoke('pcd:monitor-set-pinned', Boolean(pinned)),
  close: () => ipcRenderer.invoke('pcd:monitor-close'),
  copyText: (text) => ipcRenderer.invoke('pcd:monitor-copy', text),
  connectRemote: () => ipcRenderer.invoke('pcd:monitor-connect-remote'),
});
```

Crear `monitor.html`:

```html
<!DOCTYPE html>
<html lang="es" class="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Monitor de ping</title>
    <script>
      try {
        const theme = localStorage.getItem("pcd-theme") || "dark";
        document.documentElement.classList.toggle("dark", theme === "dark");
      } catch {}
    </script>
  </head>
  <body class="bg-card text-foreground antialiased select-none overflow-hidden">
    <div id="root"></div>
    <script type="module" src="/src/monitor.tsx"></script>
  </body>
</html>
```

Crear `src/monitor.tsx`:

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ErrorBoundary } from './components/ErrorBoundary';
import { MonitorWindow } from './components/MonitorWindow';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <MonitorWindow />
    </ErrorBoundary>
  </React.StrictMode>,
);
```

Modificar `vite.config.ts` para agregar el input multi-página:

```ts
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        monitor: path.resolve(__dirname, 'monitor.html'),
      },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react')) return 'react';
          if (id.includes('node_modules/radix-ui') || id.includes('node_modules/@radix-ui')) return 'radix';
          if (id.includes('node_modules/cmdk')) return 'cmdk';
        },
      },
    },
  },
```

- [ ] **Step 4: Ejecutar el test y verificar que pasa**

```bash
npx vitest run src/test/monitorSecurity.test.ts
```

Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add monitor.html src/monitor.tsx src/types/monitor.ts src/types/monitor.d.ts electron/monitor-preload.cjs vite.config.ts src/test/monitorSecurity.test.ts
git commit -m "feat(monitor): add compact renderer entry and preload"
```

---

### Task 7: Helper compartido de logs de ping

**Files:**
- Create: `src/lib/pingLog.ts`
- Test: `src/lib/pingLog.test.ts`
- Modify: `src/components/LivePingConsole.tsx:54-65`

- [ ] **Step 1: Escribir el test que falla**

Crear `src/lib/pingLog.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { classifyPingLine, sanitizePingText } from './pingLog';

describe('pingLog', () => {
  it('sanitiza estadísticas con encoding roto', () => {
    expect(sanitizePingText('Estad�sticas de ping')).toBe(
      'Estadísticas de ping',
    );
  });

  it('clasifica timeouts, errores, encabezados y respuestas', () => {
    expect(
      classifyPingLine('Tiempo de espera agotado para esta solicitud.'),
    ).toBe('warning');
    expect(classifyPingLine('Host inaccesible.')).toBe('destructive');
    expect(
      classifyPingLine('Estadísticas de ping para 192.0.2.1:'),
    ).toBe('info');
    expect(classifyPingLine('Respuesta desde 192.0.2.1')).toBe('default');
  });
});
```

- [ ] **Step 2: Ejecutar el test y verificar que falla**

```bash
npx vitest run src/lib/pingLog.test.ts
```

Expected: FAIL con `Cannot find module './pingLog'`.

- [ ] **Step 3: Crear el helper y reutilizarlo en la consola**

Crear `src/lib/pingLog.ts`:

```ts
export function sanitizePingText(text: string): string {
  if (!text) return '';
  return text
    .replace(/Estad[\ufffd\?s]?sticas/gi, 'Estadísticas')
    .replace(/M[\ufffd\?a]?ximo/gi, 'Máximo')
    .replace(/M[\ufffd\?i]?nimo/gi, 'Mínimo')
    .replace(/milise[\ufffd\?]?gundos/gi, 'milisegundos')
    .replace(/perdid[\ufffd\?]?s/gi, 'perdidos')
    .replace(/recibid[\ufffd\?]?s/gi, 'recibidos')
    .replace(/enviad[\ufffd\?]?s/gi, 'enviados')
    .replace(/aproximad[\ufffd\?]?s/gi, 'aproximados');
}

export type PingLineTone = 'default' | 'info' | 'warning' | 'destructive';

export function classifyPingLine(line: string): PingLineTone {
  if (!line) return 'default';
  if (/100% perdidos|inaccesible|error/i.test(line)) return 'destructive';
  if (/tiempo de espera agotado|request timed out|agotado/i.test(line)) {
    return 'warning';
  }
  if (/estad[ií]sticas|m[ií]nimo|m[aá]ximo|media|ping -t/i.test(line)) {
    return 'info';
  }
  return 'default';
}
```

En `src/components/LivePingConsole.tsx`, eliminar la función local `sanitizePingText` (líneas 54-65) y agregar el import:

```tsx
import { sanitizePingText } from "@/lib/pingLog";
```

El resto de la lógica de tonos de `LivePingConsole` no se toca.

- [ ] **Step 4: Ejecutar los tests y verificar que pasan**

```bash
npx vitest run src/lib/pingLog.test.ts src/test/LivePingConsole.test.tsx
```

Expected: PASS. Si el archivo de test de la consola tiene otro nombre, usar `npx vitest run src/test/LivePingConsole.test.tsx src/components/LivePingConsoleSite.test.tsx`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pingLog.ts src/lib/pingLog.test.ts src/components/LivePingConsole.tsx
git commit -m "refactor(console): share ping sanitization helper"
```

---

### Task 8: Componente `MonitorWindow`

**Files:**
- Create: `src/components/MonitorWindow.tsx`
- Test: `src/components/MonitorWindow.test.tsx`
- Modify: `src/test/setup.ts`

- [ ] **Step 1: Agregar el polyfill de `requestAnimationFrame`**

En `src/test/setup.ts`, agregar al final:

```ts
// jsdom no garantiza requestAnimationFrame; el monitor agrupa la salida por frame.
if (typeof globalThis.requestAnimationFrame !== 'function') {
  Object.defineProperty(globalThis, 'requestAnimationFrame', {
    writable: true,
    configurable: true,
    value: (callback: FrameRequestCallback) =>
      setTimeout(() => callback(Date.now()), 16) as unknown as number,
  });
  Object.defineProperty(globalThis, 'cancelAnimationFrame', {
    writable: true,
    configurable: true,
    value: (handle: number) => clearTimeout(handle),
  });
}
```

- [ ] **Step 2: Escribir el test que falla**

Crear `src/components/MonitorWindow.test.tsx`:

```tsx
import React from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MonitorWindow } from './MonitorWindow';

function createApi() {
  let dataCallback: (text: string) => void = () => {};
  let endCallback: (code: number | null) => void = () => {};

  return {
    getContext: vi.fn().mockResolvedValue({
      target: '192.0.2.100',
      label: 'WS-CORP-100',
      pinned: true,
    }),
    startPing: vi.fn(),
    stopPing: vi.fn().mockResolvedValue(true),
    onPingData: vi.fn((callback: (text: string) => void) => {
      dataCallback = callback;
      return () => {};
    }),
    onPingEnd: vi.fn((callback: (code: number | null) => void) => {
      endCallback = callback;
      return () => {};
    }),
    setPinned: vi.fn().mockResolvedValue(true),
    close: vi.fn().mockResolvedValue(undefined),
    copyText: vi.fn().mockResolvedValue(true),
    connectRemote: vi.fn().mockResolvedValue({
      success: true,
      methodUsed: 'vnc',
      message: 'VNC iniciado',
    }),
    emitData: (text: string) => dataCallback(text),
    emitEnd: (code: number | null) => endCallback(code),
  };
}

async function flushFrame() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
}

describe('MonitorWindow', () => {
  let api: any;

  beforeEach(() => {
    vi.restoreAllMocks();
    api = createApi();
    (window as any).monitorAPI = api;
  });

  it('renderiza el target e inicia el ping al montar', async () => {
    render(<MonitorWindow />);

    expect(
      await screen.findByText('WS-CORP-100 · 192.0.2.100'),
    ).toBeInTheDocument();
    expect(api.startPing).toHaveBeenCalledTimes(1);
    expect(
      screen.getByText('> ping -t 192.0.2.100'),
    ).toBeInTheDocument();
  });

  it('agrega líneas y respeta el tope de 500', async () => {
    const { container } = render(<MonitorWindow />);
    await screen.findByText('> ping -t 192.0.2.100');

    act(() => {
      api.emitData(
        Array.from({ length: 600 }, (_, index) => `línea ${index}`).join(
          '\n',
        ),
      );
    });
    await flushFrame();

    await waitFor(() =>
      expect(screen.getByText('línea 599')).toBeInTheDocument(),
    );
    const log = container.querySelector('[role="log"]')!;
    expect(log.children.length).toBe(500);
  });

  it('detiene y reinicia el ping', async () => {
    render(<MonitorWindow />);
    await screen.findByText('> ping -t 192.0.2.100');

    fireEvent.click(screen.getByRole('button', { name: 'Detener ping' }));
    expect(api.stopPing).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole('button', { name: 'Reiniciar ping' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Reiniciar ping' }));
    expect(api.startPing).toHaveBeenCalledTimes(2);
  });

  it('alterna el pin', async () => {
    render(<MonitorWindow />);
    await screen.findByText('> ping -t 192.0.2.100');

    fireEvent.click(
      screen.getByRole('button', { name: 'Dejar de mantener visible' }),
    );
    expect(api.setPinned).toHaveBeenCalledWith(false);
    expect(
      screen.getByRole('button', { name: 'Mantener visible' }),
    ).toHaveAttribute('aria-pressed', 'false');
  });

  it('copia los logs y muestra el estado', async () => {
    render(<MonitorWindow />);
    await screen.findByText('> ping -t 192.0.2.100');
    act(() => api.emitData('Respuesta desde 192.0.2.100\n'));
    await flushFrame();
    await screen.findByText('Respuesta desde 192.0.2.100');

    fireEvent.click(
      screen.getByRole('button', { name: 'Copiar logs del monitor' }),
    );

    await waitFor(() => expect(api.copyText).toHaveBeenCalled());
    expect(await screen.findByText('Logs copiados')).toBeInTheDocument();
  });

  it('conecta remotamente con spinner y se rehabilita', async () => {
    let resolveRemote: (value: any) => void = () => {};
    api.connectRemote.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRemote = resolve;
        }),
    );
    render(<MonitorWindow />);
    await screen.findByText('> ping -t 192.0.2.100');

    fireEvent.click(
      screen.getByRole('button', { name: 'Conectar remotamente' }),
    );
    expect(api.connectRemote).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole('button', { name: 'Conectando remotamente…' }),
    ).toBeDisabled();

    await act(async () => {
      resolveRemote({ success: true, methodUsed: 'vnc' });
    });

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Conectar remotamente' }),
      ).toBeEnabled(),
    );
  });

  it('cierra la ventana', async () => {
    render(<MonitorWindow />);
    await screen.findByText('> ping -t 192.0.2.100');

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar monitor' }));
    expect(api.close).toHaveBeenCalledTimes(1);
  });

  it('muestra error si no hay contexto', async () => {
    api.getContext.mockResolvedValue(null);
    render(<MonitorWindow />);

    expect(
      await screen.findByText('No se pudo iniciar el monitor de ping.'),
    ).toBeInTheDocument();
    expect(api.startPing).not.toHaveBeenCalled();
  });

  it('respeta el auto-scroll solo cuando está abajo', async () => {
    const { container } = render(<MonitorWindow />);
    await screen.findByText('> ping -t 192.0.2.100');
    const log = container.querySelector('[role="log"]') as HTMLDivElement;
    Object.defineProperty(log, 'scrollHeight', {
      configurable: true,
      value: 1000,
    });
    Object.defineProperty(log, 'clientHeight', {
      configurable: true,
      value: 200,
    });

    log.scrollTop = 800;
    fireEvent.scroll(log);
    act(() => api.emitData('nueva línea\n'));
    await flushFrame();
    await screen.findByText('nueva línea');
    expect(log.scrollTop).toBe(1000);

    log.scrollTop = 0;
    fireEvent.scroll(log);
    act(() => api.emitData('otra línea\n'));
    await flushFrame();
    await screen.findByText('otra línea');
    expect(log.scrollTop).toBe(0);
  });
});
```

- [ ] **Step 3: Ejecutar el test y verificar que falla**

```bash
npx vitest run src/components/MonitorWindow.test.tsx
```

Expected: FAIL con `Cannot find module './MonitorWindow'`.

- [ ] **Step 4: Implementar el componente**

Crear `src/components/MonitorWindow.tsx`:

```tsx
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  Check,
  Copy,
  MonitorPlay,
  Pin,
  PinOff,
  RotateCw,
  Square,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { classifyPingLine, sanitizePingText } from "@/lib/pingLog";
import type { MonitorContext } from "@/types/monitor";

const MAX_LINES = 500;

type MonitorStatus = "loading" | "starting" | "live" | "stopped" | "error";

const statusLabels: Record<MonitorStatus, string> = {
  loading: "Cargando monitor",
  starting: "Iniciando ping",
  live: "Ping en vivo",
  stopped: "Ping detenido",
  error: "Error de ping",
};

const statusDotClasses: Record<MonitorStatus, string> = {
  loading: "bg-muted-foreground",
  starting: "bg-warning animate-pulse",
  live: "bg-success",
  stopped: "bg-muted-foreground",
  error: "bg-destructive",
};

function toneClass(line: string): string {
  switch (classifyPingLine(line)) {
    case "info":
      return "text-console-info font-semibold";
    case "warning":
      return "text-console-warning";
    case "destructive":
      return "text-console-destructive font-semibold";
    default:
      return "text-console-fg";
  }
}

export function MonitorWindow(): React.JSX.Element {
  const api = window.monitorAPI;
  const [context, setContext] = useState<MonitorContext | null>(null);
  const [lines, setLines] = useState<string[]>([]);
  const [status, setStatus] = useState<MonitorStatus>("loading");
  const [pinned, setPinned] = useState(true);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [remoteBusy, setRemoteBusy] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const bufferRef = useRef("");
  const frameRef = useRef<number | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!api) {
      setStatus("error");
      return;
    }

    let active = true;

    api
      .getContext()
      .then((nextContext) => {
        if (!active) return;
        if (!nextContext) {
          setStatus("error");
          return;
        }
        setContext(nextContext);
        setPinned(nextContext.pinned);
        setLines([`> ping -t ${nextContext.target}`]);
        setStatus("starting");
        api.startPing();
      })
      .catch(() => {
        if (active) setStatus("error");
      });

    const unsubscribeData = api.onPingData((text) => {
      bufferRef.current += sanitizePingText(text);
      if (frameRef.current !== null) return;
      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = null;
        const chunk = bufferRef.current;
        bufferRef.current = "";
        if (!chunk) return;
        const nextLines = chunk.split(/\r?\n/).filter(Boolean);
        if (nextLines.length === 0) return;
        setLines((previous) =>
          [...previous, ...nextLines].slice(-MAX_LINES),
        );
        setStatus("live");
      });
    });

    const unsubscribeEnd = api.onPingEnd((code) => {
      setStatus(code === 0 || code === null ? "stopped" : "error");
      setLines((previous) =>
        [
          ...previous,
          code === null
            ? "[proceso detenido]"
            : `[proceso finalizado: ${code}]`,
        ].slice(-MAX_LINES),
      );
    });

    return () => {
      active = false;
      unsubscribeData();
      unsubscribeEnd();
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      if (api) api.stopPing().catch(() => {});
    };
  }, [api]);

  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (element && stickToBottomRef.current) {
      element.scrollTop = element.scrollHeight;
    }
  }, [lines]);

  const handleScroll = useCallback(() => {
    const element = scrollRef.current;
    if (!element) return;
    stickToBottomRef.current =
      element.scrollHeight - element.scrollTop - element.clientHeight < 24;
  }, []);

  const handleStopRestart = useCallback(() => {
    if (!api || !context) return;
    if (status === "starting" || status === "live") {
      api.stopPing().catch(() => {});
      setStatus("stopped");
      setLines((previous) =>
        [...previous, "[proceso detenido]"].slice(-MAX_LINES),
      );
      return;
    }
    setStatus("starting");
    setLines([`> ping -t ${context.target}`]);
    api.startPing();
  }, [api, context, status]);

  const handleCopy = useCallback(async () => {
    if (!api) return;
    try {
      const ok = await api.copyText(lines.join("\n"));
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      setCopied(ok);
      setCopyError(!ok);
      copyTimerRef.current = setTimeout(() => {
        setCopied(false);
        setCopyError(false);
      }, 2000);
    } catch {
      setCopied(false);
      setCopyError(true);
      copyTimerRef.current = setTimeout(() => {
        setCopied(false);
        setCopyError(false);
      }, 2000);
    }
  }, [api, lines]);

  const handlePin = useCallback(async () => {
    if (!api) return;
    const nextPinned = !pinned;
    setPinned(nextPinned);
    try {
      await api.setPinned(nextPinned);
    } catch {
      setPinned(!nextPinned);
    }
  }, [api, pinned]);

  const handleRemote = useCallback(async () => {
    if (!api || !context || remoteBusy) return;
    setRemoteBusy(true);
    try {
      await api.connectRemote();
    } catch {
      // El main emite el toast de error; el botón solo se rehabilita.
    } finally {
      setRemoteBusy(false);
    }
  }, [api, context, remoteBusy]);

  const handleClose = useCallback(() => {
    if (!api) return;
    api.close().catch(() => {});
  }, [api]);

  const isRunning = status === "starting" || status === "live";
  const displayLabel = context
    ? context.label === context.target
      ? context.target
      : `${context.label} · ${context.target}`
    : "Monitor de ping";

  return (
    <div className="flex h-screen flex-col overflow-hidden border border-border bg-card">
      <header className="app-drag-region flex h-9 shrink-0 items-center justify-between gap-2 border-b border-border px-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={cn(
              "h-1.5 w-1.5 shrink-0 rounded-full",
              statusDotClasses[status],
            )}
            aria-hidden="true"
          />
          <span
            className="truncate font-mono text-xs font-semibold text-foreground"
            title={displayLabel}
          >
            {displayLabel}
          </span>
          <span className="sr-only" role="status">
            {statusLabels[status]}
          </span>
        </div>

        <div className="app-no-drag flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={handleRemote}
            disabled={remoteBusy || !context}
            aria-label={
              remoteBusy ? "Conectando remotamente…" : "Conectar remotamente"
            }
            title="Conectar remotamente (VNC o MSRA según puertos)"
            className="cursor-pointer text-muted-foreground hover:text-foreground"
          >
            {remoteBusy ? (
              <Spinner className="h-3.5 w-3.5" />
            ) : (
              <MonitorPlay className="h-3.5 w-3.5" />
            )}
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={handlePin}
            aria-label={
              pinned ? "Dejar de mantener visible" : "Mantener visible"
            }
            aria-pressed={pinned}
            title={pinned ? "Desanclar ventana" : "Mantener siempre visible"}
            className="cursor-pointer text-muted-foreground hover:text-foreground"
          >
            {pinned ? (
              <Pin className="h-3.5 w-3.5" />
            ) : (
              <PinOff className="h-3.5 w-3.5" />
            )}
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={handleCopy}
            aria-label="Copiar logs del monitor"
            title="Copiar logs del monitor"
            className="cursor-pointer text-muted-foreground hover:text-foreground"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-success" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={handleStopRestart}
            aria-label={isRunning ? "Detener ping" : "Reiniciar ping"}
            title={isRunning ? "Detener ping" : "Reiniciar ping"}
            className="cursor-pointer text-muted-foreground hover:text-foreground"
          >
            {isRunning ? (
              <Square className="h-3.5 w-3.5" />
            ) : (
              <RotateCw className="h-3.5 w-3.5" />
            )}
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={handleClose}
            aria-label="Cerrar monitor"
            title="Cerrar monitor"
            className="cursor-pointer text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </header>

      <span role="status" className="sr-only">
        {copied ? "Logs copiados" : copyError ? "No se pudo copiar" : ""}
      </span>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        role="log"
        aria-live="off"
        aria-label={`Salida de ping de ${context?.label ?? ""}`}
        className="min-h-0 flex-1 overflow-y-auto overflow-x-auto bg-console-bg p-2.5 font-mono text-micro leading-relaxed text-console-fg select-text"
      >
        {status === "loading" && (
          <div className="text-console-muted">Cargando monitor…</div>
        )}
        {status === "error" && lines.length === 0 && (
          <div className="text-console-destructive">
            No se pudo iniciar el monitor de ping.
          </div>
        )}
        {lines.map((line, index) => (
          <div
            key={`${index}-${line.slice(0, 12)}`}
            className={cn("whitespace-pre", toneClass(line))}
          >
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Ejecutar el test y verificar que pasa**

```bash
npx vitest run src/components/MonitorWindow.test.tsx
```

Expected: PASS, 9 tests.

- [ ] **Step 6: Verificar el build con la nueva entrada**

```bash
npm run build
```

Expected: `tsc` y Vite terminan sin errores; `dist/monitor.html` existe.

- [ ] **Step 7: Commit**

```bash
git add src/components/MonitorWindow.tsx src/components/MonitorWindow.test.tsx src/test/setup.ts
git commit -m "feat(monitor): add compact ping window UI"
```

---

### Task 9: Cableado del proceso principal y preload

**Files:**
- Modify: `electron/main.cjs`
- Modify: `electron/preload.cjs`
- Test: `src/test/monitorMainWiring.test.ts`

- [ ] **Step 1: Escribir el test que falla**

Crear `src/test/monitorMainWiring.test.ts`:

```ts
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
    expect(main).toContain('closeAllMonitors');
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
  });
});
```

- [ ] **Step 2: Ejecutar el test y verificar que falla**

```bash
npx vitest run src/test/monitorMainWiring.test.ts
```

Expected: FAIL porque `main.cjs` todavía no contiene los canales ni el atajo.

- [ ] **Step 3: Modificar `electron/main.cjs`**

**3.0 Electron.** Agregar `screen` al destructuring de la primera línea:

```js
const { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage, globalShortcut, clipboard, dialog, net, screen } = require('electron');
```

**3.1 Imports.** Después de `const { loadUiPreferences, saveUiPreferences } = require('./uiPreferences.cjs');`, agregar:

```js
const { createPingSessions } = require('./pingSessions.cjs');
const { createMonitorManager } = require('./monitorWindows.cjs');
const { createMonitorShortcut } = require('./monitorShortcut.cjs');
const { createMonitorRemote } = require('./monitorRemote.cjs');
const {
  loadMonitorPreferences,
  saveMonitorPreferences,
} = require('./monitorPreferences.cjs');
```

**3.2 Estado.** Reemplazar el bloque:

```js
let tray = null;
let uiPreferences = null;
let activePingProcess = null;
let currentPingSessionId = 0;
let activeSubnetAbortController = null;
let downloadedInstallerPath = null;
```

por:

```js
let tray = null;
let uiPreferences = null;
let activeSubnetAbortController = null;
let downloadedInstallerPath = null;
let mainWindow = null;
let monitorManager = null;
let monitorShortcut = null;
let monitorRemote = null;
let lastMonitorTarget = null;
let pingSessions = null;
```

Después de `const logger = createLogger({ scope: 'main' });`, agregar:

```js
pingSessions = createPingSessions({
  executePing: systemTools.executePing,
  logger,
});
```

**3.3 Cierre de la principal.** Reemplazar el handler `win.on('close', ...)` por:

```js
  win.on('close', (event) => {
    if (app.isQuiting) return;

    if (getUiPreferences().minimizeToTray) {
      closeAllMonitors();
      event.preventDefault();
      win.hide();
      return false;
    }

    app.isQuiting = true;
    closeAllMonitors();
  });
```

**3.4 Bandeja.** Reemplazar el handler `pcd:window-hide-tray` por:

```js
ipcMain.handle('pcd:window-hide-tray', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  closeAllMonitors();
  if (win) win.hide();
});
```

En `createTray`, reemplazar el clic de “Cerrar” por:

```js
      click: () => {
        app.isQuiting = true;
        closeAllMonitors();
        app.quit();
      },
```

**3.5 Ping.** Reemplazar el handler `pcd:ping-start` y `pcd:ping-stop` por:

```js
ipcMain.on('pcd:ping-start', (event, target, continuous) => {
  pingSessions.start(event.sender, target, Boolean(continuous));
});

ipcMain.handle('pcd:ping-stop', (event) => {
  return pingSessions.stop(event.sender);
});
```

**3.6 Diagnóstico.** En `ipcMain.on('pcd:cmd-start', ...)`, reemplazar las primeras líneas:

```js
  const { command, target, options } = payload || {};
  currentPingSessionId++;
  if (activePingProcess) {
    try {
      activePingProcess.kill();
    } catch {}
    activePingProcess = null;
  }
  stopActiveDiagnosticProcess();
```

por:

```js
  const { command, target, options } = payload || {};
  pingSessions.stop(event.sender);
  stopActiveDiagnosticProcess();
```

**3.7 IPC del monitor.** Después del handler `pcd:cmd-stop`, agregar:

```js
// Monitor flotante de ping: IPC del renderer compacto
ipcMain.on('pcd:monitor-ping-start', (event) => {
  const target = monitorManager ? monitorManager.getTarget(event.sender) : null;
  if (!target) return;
  pingSessions.start(event.sender, target, true);
});

ipcMain.handle('pcd:monitor-ping-stop', (event) => {
  return pingSessions.stop(event.sender);
});

ipcMain.handle('pcd:monitor-context', (event) => {
  return monitorManager ? monitorManager.getContext(event.sender) : null;
});

ipcMain.handle('pcd:monitor-set-pinned', (event, pinned) => {
  return monitorManager
    ? monitorManager.setPinned(event.sender, Boolean(pinned))
    : false;
});

ipcMain.handle('pcd:monitor-close', (event) => {
  return monitorManager ? monitorManager.close(event.sender) : false;
});

ipcMain.handle('pcd:monitor-copy', (event, text) => {
  if (!monitorManager || !monitorManager.getTarget(event.sender)) return false;
  if (typeof text !== 'string' || !text || text.length > 200000) return false;
  try {
    clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
});

ipcMain.handle('pcd:monitor-connect-remote', async (event) => {
  if (!monitorRemote) {
    return {
      success: false,
      methodUsed: 'none',
      message: 'Monitor no disponible.',
    };
  }
  return monitorRemote.connect(event.sender);
});

ipcMain.on('pcd:monitor-target-set', (event, payload) => {
  if (
    !mainWindow ||
    mainWindow.isDestroyed() ||
    event.sender !== mainWindow.webContents
  ) {
    return;
  }
  if (!payload || typeof payload !== 'object') {
    lastMonitorTarget = null;
    return;
  }
  try {
    const target = systemTools.sanitizeHostOrIp(payload.target);
    const label = String(payload.label || target).slice(0, 120);
    lastMonitorTarget = { target, label };
  } catch {
    lastMonitorTarget = null;
  }
});

ipcMain.handle('pcd:monitor-open-current', () => {
  return monitorShortcut
    ? monitorShortcut.handle()
    : { ok: false, reason: 'unavailable' };
});
```

**3.8 Helpers.** Antes de `app.whenReady`, agregar:

```js
function closeAllMonitors() {
  if (monitorManager) monitorManager.closeAll();
}

function notifyMainWindow(channel, payload) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const webContents = mainWindow.webContents;
  if (!webContents || webContents.isDestroyed()) return;
  webContents.send(channel, payload);
}

function flashMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.flashFrame(true);
  mainWindow.once('focus', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.flashFrame(false);
  });
}

function loadMonitorRenderer(win) {
  const isDev = !app.isPackaged || process.env.NODE_ENV === 'development';
  const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
  const devMonitorUrl = `${devUrl.replace(/\/$/, '')}/monitor.html`;
  const distMonitor = path.join(__dirname, '../dist/monitor.html');

  if (isDev) {
    return win.loadURL(devMonitorUrl).catch(() => {
      if (!win.isDestroyed()) return win.loadFile(distMonitor);
    });
  }
  return win.loadFile(distMonitor).catch(() => {
    if (!win.isDestroyed()) return win.loadURL(devMonitorUrl);
  });
}

function createMonitorInfrastructure() {
  monitorManager = createMonitorManager({
    BrowserWindow,
    screen,
    getMainWindow: () => mainWindow,
    loadRenderer: loadMonitorRenderer,
    preloadPath: path.join(__dirname, 'monitor-preload.cjs'),
    iconPath: getAppIconPath(),
    loadPreferences: () => loadMonitorPreferences(app.getPath('userData')),
    savePreferences: (patch) =>
      saveMonitorPreferences(app.getPath('userData'), patch),
    notify: (payload) => notifyMainWindow('pcd:monitor-notice', payload),
    onClosed: (webContentsId) => pingSessions.stopById(webContentsId),
    logger,
    maxMonitors: 4,
  });

  monitorShortcut = createMonitorShortcut({
    getMainWindow: () => mainWindow,
    getLastTarget: () => lastMonitorTarget,
    openMonitor: (payload) => monitorManager.open(payload),
    focusSearch: (win) => {
      if (win && !win.isDestroyed()) {
        win.webContents.send('pcd:trigger-autofocus-search', {
          isValid: false,
          query: '',
          type: 'none',
          autoSearch: false,
        });
      }
    },
    notify: (payload) => notifyMainWindow('pcd:monitor-notice', payload),
    logger,
  });

  monitorRemote = createMonitorRemote({
    getTarget: (webContents) => monitorManager.getTarget(webContents),
    launchRemoteSmart: systemTools.launchRemoteSmart,
    resolveVncSecret,
    notifyMain: (payload) =>
      notifyMainWindow('pcd:monitor-remote-result', payload),
    flashMain: flashMainWindow,
    logger,
  });
}

function registerMonitorShortcut() {
  if (globalShortcut.isRegistered('CommandOrControl+Alt+Space')) return;
  try {
    const registered = globalShortcut.register(
      'CommandOrControl+Alt+Space',
      () => {
        if (monitorShortcut) monitorShortcut.handle();
      },
    );
    if (!registered) {
      logger.warn('No se pudo registrar CommandOrControl+Alt+Space');
    }
  } catch (err) {
    logger.warn('Error al registrar CommandOrControl+Alt+Space', {
      error: err && err.message,
    });
  }
}
```

**3.9 Arranque.** En el bloque `app.whenReady`, reemplazar:

```js
  app.whenReady().then(() => {
    mainWindow = createWindow();
    registerGlobalSearchShortcut(mainWindow);

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        mainWindow = createWindow();
        registerGlobalSearchShortcut(mainWindow);
      }
    });
  });
```

por:

```js
  app.whenReady().then(() => {
    mainWindow = createWindow();
    createMonitorInfrastructure();
    registerGlobalSearchShortcut(mainWindow);
    registerMonitorShortcut();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        mainWindow = createWindow();
        createMonitorInfrastructure();
        registerGlobalSearchShortcut(mainWindow);
        registerMonitorShortcut();
      }
    });
  });
```

**3.10 Quit.** Reemplazar el handler `before-quit` por:

```js
app.on('before-quit', () => {
  app.isQuiting = true;
  closeAllMonitors();
  if (pingSessions) pingSessions.stopAll();
  if (app.isReady()) {
    globalShortcut.unregisterAll();
  }
});
```

**3.11 Limpieza.** Eliminar la declaración duplicada `let mainWindow = null;` que estaba antes de `ipcMain.handle('pcd:ui-preferences-get', ...)`. Verificar que no queden referencias:

```powershell
Select-String -Path electron/main.cjs -Pattern "activePingProcess|currentPingSessionId"
```

Expected: sin salida.

- [ ] **Step 4: Modificar `electron/preload.cjs`**

Agregar antes de `getUiPreferences`:

```js
  setMonitorTarget: (payload) =>
    ipcRenderer.send('pcd:monitor-target-set', payload),
  openMonitorCurrent: () => ipcRenderer.invoke('pcd:monitor-open-current'),
  onMonitorNotice: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('pcd:monitor-notice', listener);
    return () => ipcRenderer.removeListener('pcd:monitor-notice', listener);
  },
  onMonitorRemoteResult: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('pcd:monitor-remote-result', listener);
    return () =>
      ipcRenderer.removeListener('pcd:monitor-remote-result', listener);
  },
```

- [ ] **Step 5: Ejecutar el test de cableado y la regresión de la consola**

```bash
npx vitest run src/test/monitorMainWiring.test.ts src/test/pingSessions.test.ts src/test/AppTerminalLayout.test.tsx
```

Expected: PASS. La consola principal sigue usando `electronAPI.ping`/`stopPing` sin cambios.

- [ ] **Step 6: Commit**

```bash
git add electron/main.cjs electron/preload.cjs src/test/monitorMainWiring.test.ts
git commit -m "feat(monitor): wire windows, shortcut and remote IPC"
```

---

### Task 10: Puente del renderer, `App` y Ajustes

**Files:**
- Modify: `src/services/electronClient.ts`
- Modify: `src/App.tsx`
- Modify: `src/components/SettingsModal.tsx`
- Test: `src/services/electronClient.test.ts`
- Test: `src/test/MonitorIntegration.test.tsx`
- Test: `src/components/SettingsModal.test.tsx`

- [ ] **Step 1: Escribir los tests que fallan**

**1.1** Agregar al final del `describe` de `src/services/electronClient.test.ts` (o como un nuevo `describe`):

```ts
describe('Monitor bridge', () => {
  it('envía el target del monitor a electronAPI', () => {
    const setTarget = vi.fn();
    (global as any).window.electronAPI = { setMonitorTarget: setTarget };

    setMonitorTarget({ target: '192.0.2.100', label: 'WS-CORP-100' });

    expect(setTarget).toHaveBeenCalledWith({
      target: '192.0.2.100',
      label: 'WS-CORP-100',
    });
  });

  it('no falla sin electronAPI', async () => {
    delete (global as any).window.electronAPI;

    expect(() => setMonitorTarget(null)).not.toThrow();
    await expect(openMonitorCurrent()).resolves.toEqual({
      ok: false,
      reason: 'unavailable',
    });
  });

  it('abre el monitor actual vía electronAPI', async () => {
    const open = vi.fn().mockResolvedValue({ ok: true });
    (global as any).window.electronAPI = { openMonitorCurrent: open };

    await expect(openMonitorCurrent()).resolves.toEqual({ ok: true });
    expect(open).toHaveBeenCalledTimes(1);
  });

  it('se suscribe a los avisos del monitor', () => {
    const unsubscribe = vi.fn();
    const onNotice = vi.fn().mockReturnValue(unsubscribe);
    (global as any).window.electronAPI = { onMonitorNotice: onNotice };
    const callback = vi.fn();

    const unsub = subscribeToMonitorNotice(callback);

    expect(onNotice).toHaveBeenCalledWith(callback);
    unsub();
    expect(unsubscribe).toHaveBeenCalled();
  });

  it('se suscribe al resultado remoto', () => {
    const unsubscribe = vi.fn();
    const onResult = vi.fn().mockReturnValue(unsubscribe);
    (global as any).window.electronAPI = { onMonitorRemoteResult: onResult };
    const callback = vi.fn();

    const unsub = subscribeToMonitorRemoteResult(callback);

    expect(onResult).toHaveBeenCalledWith(callback);
    unsub();
    expect(unsubscribe).toHaveBeenCalled();
  });
});
```

Agregar los imports:

```ts
import {
  openMonitorCurrent,
  setMonitorTarget,
  subscribeToMonitorNotice,
  subscribeToMonitorRemoteResult,
} from './electronClient';
```

**1.2** Crear `src/test/MonitorIntegration.test.tsx`:

```tsx
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';

const terminal = {
  pc: 'WS-CORP-100',
  ip: '192.0.2.100',
  mac: '00:00:5E:00:53:99',
  os: 'Windows 11 Enterprise',
  servicePack: '22631.3007',
  cpuModel: 'Intel Core i7',
  ram: '16.384 MB',
  antivirusVersion: 'Endpoint Protection 14.3',
  ieVersion: 'N/A (Edge)',
  userNt: 'soportecentral',
  architecture: 'x64-based PC',
  surveyDate: '25/10/2026',
  uptimeText: '3 day(s), 2 hour(s)',
  location: 'Sede Central',
  costCenter: 'CC 100',
  alerts: [],
  resetHistory: [],
};

let noticeCallback: ((notice: any) => void) | null = null;
let remoteCallback: ((result: any) => void) | null = null;

function installApi(overrides: any = {}) {
  const api = {
    checkStatus: vi.fn().mockResolvedValue({ connected: true, mode: 'sql' }),
    searchTerminal: vi.fn().mockResolvedValue({ source: 'sql', data: terminal }),
    ping: vi.fn(),
    stopPing: vi.fn(),
    onPingData: vi.fn().mockReturnValue(() => {}),
    onPingEnd: vi.fn().mockReturnValue(() => {}),
    setMonitorTarget: vi.fn(),
    openMonitorCurrent: vi.fn().mockResolvedValue({ ok: true }),
    onMonitorNotice: vi.fn((callback: (notice: any) => void) => {
      noticeCallback = callback;
      return () => {};
    }),
    onMonitorRemoteResult: vi.fn((callback: (result: any) => void) => {
      remoteCallback = callback;
      return () => {};
    }),
    ...overrides,
  };
  (window as any).electronAPI = api;
  return api;
}

async function loadTerminal() {
  render(<App />);
  const input = screen.getByPlaceholderText(/buscar terminal/i);
  fireEvent.change(input, { target: { value: 'WS-CORP-100' } });
  fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
  await waitFor(() =>
    expect(screen.getByTestId('terminal-identity')).toBeInTheDocument(),
  );
}

describe('App monitor integration', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    noticeCallback = null;
    remoteCallback = null;
  });

  it('avisa el target al cargar la terminal', async () => {
    const api = installApi();

    await loadTerminal();

    await waitFor(() =>
      expect(api.setMonitorTarget).toHaveBeenCalledWith({
        target: '192.0.2.100',
        label: 'WS-CORP-100',
      }),
    );
  });

  it('limpia el target cuando no encuentra la terminal', async () => {
    const api = installApi({
      searchTerminal: vi.fn().mockResolvedValue({ source: 'mock', data: null }),
    });

    render(<App />);
    const input = screen.getByPlaceholderText(/buscar terminal/i);
    fireEvent.change(input, { target: { value: 'NO-EXISTE' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    await waitFor(() =>
      expect(api.setMonitorTarget).toHaveBeenLastCalledWith(null),
    );
  });

  it('muestra el aviso de tope como toast', async () => {
    installApi();
    render(<App />);
    await waitFor(() => expect(noticeCallback).toBeTypeOf('function'));

    noticeCallback?.({ kind: 'limit', message: 'Máximo de 4 monitores' });

    expect(
      await screen.findByText('Máximo de monitores alcanzado'),
    ).toBeInTheDocument();
  });

  it('muestra el resultado remoto como toast', async () => {
    installApi();
    render(<App />);
    await waitFor(() => expect(remoteCallback).toBeTypeOf('function'));

    remoteCallback?.({
      success: true,
      methodUsed: 'vnc',
      message: 'VNC iniciado en 192.0.2.100:5901',
      target: '192.0.2.100',
    });

    expect(
      await screen.findByText('VNC iniciado en 192.0.2.100:5901'),
    ).toBeInTheDocument();
  });

  it('dispara la apertura local con Ctrl+Alt+Espacio', async () => {
    const api = installApi();
    render(<App />);

    fireEvent.keyDown(window, {
      key: ' ',
      code: 'Space',
      ctrlKey: true,
      altKey: true,
    });

    await waitFor(() =>
      expect(api.openMonitorCurrent).toHaveBeenCalledTimes(1),
    );
  });
});
```

**1.3** Agregar a `src/components/SettingsModal.test.tsx`:

```tsx
it('documenta el atajo del monitor flotante', () => {
  render(
    <SettingsModal
      isOpen
      onClose={vi.fn()}
      currentVersion="1.2.0"
      backendConnected
    />,
  );

  expect(screen.getByText(/Monitor flotante/i)).toBeInTheDocument();
  expect(screen.getByText(/Ctrl \+ Alt \+ Espacio/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Ejecutar los tests y verificar que fallan**

```bash
npx vitest run src/services/electronClient.test.ts src/test/MonitorIntegration.test.tsx src/components/SettingsModal.test.tsx
```

Expected: FAIL por imports/funciones inexistentes y por el texto ausente.

- [ ] **Step 3: Implementar los wrappers de `electronClient`**

Agregar al inicio de `src/services/electronClient.ts`, después de los imports existentes:

```ts
import type { MonitorRemoteResult } from '@/types/monitor';
export type { MonitorRemoteResult };
```

Agregar al final de `src/services/electronClient.ts`:

```ts
export interface MonitorTargetPayload {
  target: string;
  label: string;
}

export interface MonitorNotice {
  kind: 'limit' | 'error';
  message: string;
}

export function setMonitorTarget(
  payload: MonitorTargetPayload | null,
): void {
  const api = getElectronAPI();
  if (api && typeof api.setMonitorTarget === 'function') {
    api.setMonitorTarget(payload);
  }
}

export async function openMonitorCurrent(): Promise<{
  ok: boolean;
  reason?: string;
}> {
  const api = getElectronAPI();
  if (api && typeof api.openMonitorCurrent === 'function') {
    try {
      return await api.openMonitorCurrent();
    } catch {
      return { ok: false, reason: 'error' };
    }
  }
  return { ok: false, reason: 'unavailable' };
}

export function subscribeToMonitorNotice(
  callback: (notice: MonitorNotice) => void,
): () => void {
  const api = getElectronAPI();
  if (api && typeof api.onMonitorNotice === 'function') {
    return api.onMonitorNotice(callback);
  }
  return () => {};
}

export function subscribeToMonitorRemoteResult(
  callback: (result: MonitorRemoteResult) => void,
): () => void {
  const api = getElectronAPI();
  if (api && typeof api.onMonitorRemoteResult === 'function') {
    return api.onMonitorRemoteResult(callback);
  }
  return () => {};
}
```

- [ ] **Step 4: Integrar en `App.tsx`**

**4.1 Imports.** Agregar al import desde `./services/electronClient`:

```ts
  setMonitorTarget,
  openMonitorCurrent,
  subscribeToMonitorNotice,
  subscribeToMonitorRemoteResult,
```

**4.2 Target.** Después del `useEffect` que escucha `subscribeToAutofocusSearch`, agregar:

```tsx
  useEffect(() => {
    if (terminal?.ip) {
      setMonitorTarget({
        target: terminal.ip,
        label: terminal.pc || terminal.ip,
      });
    } else {
      setMonitorTarget(null);
    }
  }, [terminal?.ip, terminal?.pc]);
```

**4.3 Avisos y resultado remoto.** Agregar otro `useEffect`:

```tsx
  useEffect(() => {
    const unsubscribeNotice = subscribeToMonitorNotice((notice) => {
      if (notice.kind === "limit") {
        toast.warning("Máximo de monitores alcanzado", {
          description: notice.message,
        });
        return;
      }
      toast.error("No se pudo abrir el monitor", {
        description: notice.message,
      });
    });

    const unsubscribeRemote = subscribeToMonitorRemoteResult((result) => {
      if (result.success) {
        if (result.methodUsed === "vnc") {
          toast.success(
            result.message ||
              `VNC iniciado hacia ${result.target ?? "el equipo"}`,
          );
        } else if (result.methodUsed === "msra") {
          toast.info(
            result.message ||
              `Asistencia Remota iniciada hacia ${result.target ?? "el equipo"}`,
          );
        } else {
          toast.success(result.message || "Conexión remota iniciada");
        }
        return;
      }
      toast.error(result.message || "Sin acceso remoto directo", {
        duration: 10000,
      });
    });

    return () => {
      unsubscribeNotice();
      unsubscribeRemote();
    };
  }, []);
```

**4.4 Fallback local.** Agregar:

```tsx
  useEffect(() => {
    const handleMonitorShortcut = (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (event.ctrlKey && event.altKey && event.code === "Space") {
        event.preventDefault();
        openMonitorCurrent().catch(() => {});
      }
    };

    window.addEventListener("keydown", handleMonitorShortcut);
    return () =>
      window.removeEventListener("keydown", handleMonitorShortcut);
  }, []);
```

- [ ] **Step 5: Documentar el atajo en Ajustes**

En `src/components/SettingsModal.tsx`, dentro de la tarjeta “Atajo Global de Teclado”, después del bloque del `Switch`, agregar:

```tsx
              <p className="text-micro text-muted-foreground border-t border-border/60 pt-2">
                Monitor flotante:{" "}
                <span className="font-mono text-foreground">
                  Ctrl + Alt + Espacio
                </span>{" "}
                abre el monitor del último equipo consultado.
              </p>
```

- [ ] **Step 6: Ejecutar los tests y verificar que pasan**

```bash
npx vitest run src/services/electronClient.test.ts src/test/MonitorIntegration.test.tsx src/components/SettingsModal.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/services/electronClient.ts src/App.tsx src/components/SettingsModal.tsx src/services/electronClient.test.ts src/test/MonitorIntegration.test.tsx src/components/SettingsModal.test.tsx
git commit -m "feat(monitor): connect renderer target, toasts and shortcut"
```

---

### Task 11: Verificación final y documentación

**Files:**
- Modify: `DESIGN.md`
- Verify: todo el repositorio.

- [ ] **Step 1: Documentar la superficie en `DESIGN.md`**

Agregar al final del documento:

```md
## Monitor flotante de ping

La ventana de monitoreo (`monitor.html`) usa los tokens semánticos (`bg-card`,
`border-border`) y una consola oscura fija (`--console-*`) en ambos temas. Su
cabecera es arrastrable y sus controles son iconos con `aria-label`. El botón de
conexión remota usa el sondeo inteligente VNC/MSRA y no detiene el ping; el
resultado se comunica con un toast en la ventana principal.
```

- [ ] **Step 2: Ejecutar la suite completa**

```bash
npm test
```

Expected: todos los tests en verde, incluidos los nuevos.

- [ ] **Step 3: Ejecutar el build**

```bash
npm run build
```

Expected: `tsc` y Vite sin errores. Verificar que existe `dist/monitor.html`:

```bash
Test-Path dist/monitor.html
```

Expected: `True`.

- [ ] **Step 4: Ejecutar los gates de release**

```bash
npm run audit:contrast
npm run release:check
```

Expected: ambos exit 0.

- [ ] **Step 5: Checklist manual en Electron**

Ejecutar:

```bash
npm run electron:dev
```

Verificar:

1. Consultar equipo A → `Ctrl + Alt + Espacio` → monitor A abre y pingea.
2. Consultar equipo B → atajo → monitor B abre; A sigue pingeando.
3. La consola principal inicia/detiene su ping sin afectar a A ni B.
4. Cerrar monitor A → su `ping.exe` desaparece; B sigue.
5. Ocultar la principal → se cierran todos los monitores; la bandeja sigue viva.
6. Cerrar desde la bandeja → no queda ningún `ping.exe` iniciado por la app.
7. Pin/unpin y bounds: cerrar y reabrir conserva posición y tamaño.
8. Cuatro monitores → quinto intento muestra toast.
9. Sin terminal consultada o sin IP → el atajo enfoca el buscador.
10. Tema claro: cromo claro, consola oscura. DPI 125/150%: legible.
11. Pulsar el botón remoto del monitor A → VNC o MSRA según puertos; el ping sigue; toast en la principal.
12. Sin acceso remoto → toast de error; el monitor sigue pingeando.
13. `Ctrl + Espacio` sigue trayendo la app y buscando desde el portapapeles.

- [ ] **Step 6: Commit final**

```bash
git add DESIGN.md
git commit -m "docs(design): document floating ping monitor surface"
```

---

## Self-review del plan

- **Cobertura del spec:** cada sección tiene una tarea. Sesiones por renderer → Task 1; preferencias → Task 2; ventanas → Task 3; atajo → Task 4; remoto → Task 5; entrada/preload → Task 6; helper de logs → Task 7; UI → Task 8; main/preload → Task 9; renderer/App/Ajustes → Task 10; verificación/DESIGN → Task 11.
- **Placeholders:** no hay TBD/TODO; cada paso de código incluye el código completo.
- **Consistencia de tipos:** `MonitorContext`, `MonitorRemoteResult` y `MonitorApi` viven en `src/types/monitor.ts`; `electronClient` define `MonitorTargetPayload` y `MonitorNotice`, y reexporta `MonitorRemoteResult`. Los nombres coinciden con los usados en `App`, `MonitorWindow` y los handlers.
- **Riesgo residual:** el toast remoto vive en la principal y puede quedar detrás del monitor; el plan usa `duration: 10000` para errores y `flashFrame` en main, tal como fija el spec.

---

## Execution Handoff

Plan completo y guardado en `docs/superpowers/plans/2026-11-06-monitor-flotante-ping.md`.

**Dos opciones de ejecución:**

1. **Subagent-Driven (recomendada):** se despacha un subagente fresco por tarea, con revisión entre tareas.
2. **Inline Execution:** se ejecuta en esta sesión con `executing-plans`, por lotes y con checkpoints.

¿Cuál preferís?

---

## Estado de ejecución (2026-11-06)

Ejecutado en la rama `feat/monitor-flotante-ping` con subagentes por tarea y revisión de spec + calidad.

**Verificación:** 562/562 tests en 79 archivos, `npm run build` con `dist/monitor.html`, `npm run audit:contrast` y `npm run release:check` en verde. Checklist manual de Electron pendiente de ejecución por el operador.

**Desvíos principales respecto del texto de las tareas** (detalle completo en `docs/superpowers/specs/2026-11-06-monitor-flotante-ping-design.md`, sección 13):

- `monitorWindows.open()` es el único dueño de los avisos de tope/error; `monitorShortcut` ya no recibe `notify`. El fallback local consulta `pcd:monitor-shortcut-status` y solo abre si el global no está registrado.
- `monitorRemote` acepta `isMainMinimized`, deduplica conexiones concurrentes, normaliza errores no-`Error` y protege `notifyMain`/`flashMain`. `systemTools.launchRemoteSmart` reenvía `vncPassword`.
- `monitorWindows.close()` espera `closed` para desregistrar; `setPinned` tolera ventanas destruidas y revierte; `open()` normaliza el target y protege la navegación.
- `pingSessions` rechaza senders destruidos, usa `sessionId` como token y emite `pcd:ping-end` si el proceso es nulo/inválido.
- `src/types/monitor.d.ts` se eliminó; la augmentación `Window.monitorAPI` vive en `src/types/monitor.ts`.
- `MonitorWindow` usa ids estables por línea, buffer de líneas completas con fallback de 250 ms y tema con `pcd-theme` + `storage`.
- El test de `SettingsModal` vive en `src/test/SettingsModal.test.tsx` (no existe `src/components/SettingsModal.test.tsx`).

**Deudas aceptadas:** carrera preexistente de `pcd:cmd-start`; `will-navigate` con origen `file://`; bounds pendientes al cerrar dentro de 300 ms; cascada en esquina clampada; checklist manual de Electron.