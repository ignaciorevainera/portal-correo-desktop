# Unified Smart Remote Connection Orchestrator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify VNC and MSRA remote connection actions into a single intelligent Split Button CTA powered by a backend port-probing and auto-fallback orchestrator (`electron/systemTools.cjs`).

**Architecture:** When a terminal is loaded, the frontend asynchronously invokes `cmda:probe-remote` to detect whether VNC (`5901`/`5900`) or MSRA (`3389`/`135`) is open, updating the Split Button label and indicator in real time. Clicking the primary CTA triggers `cmda:launch-remote-smart`, which performs a fast 600ms re-verification and launches VNC (priority 1) or falls back automatically to MSRA (priority 2), while a side dropdown chevron allows forcing VNC, forcing MSRA, or re-probing ports manually.

**Tech Stack:** Electron (`ipcMain`, `ipcRenderer`), Node.js `net.Socket`, React 19, Tailwind CSS v4, Shadcn UI (`Button`, `Badge`, `Kbd`), Vitest + React Testing Library.

---

### Task 1: Backend Smart Remote Orchestrator (`electron/systemTools.cjs`)

**Files:**
- Modify: `electron/systemTools.cjs:129-240`
- Test: `src/services/systemTools.test.ts`

- [ ] **Step 1: Write the failing unit tests for `probeRemotePorts` (`recommendedMethod`) and `launchRemoteSmart`**

Add to `src/services/systemTools.test.ts`:

```typescript
  describe('launchRemoteSmart (Unified VNC + MSRA Orchestrator)', () => {
    it('prioritizes VNC when both VNC (5901) and MSRA (3389) are open', async () => {
      const mockVnc = vi.fn().mockReturnValue({ success: true, processId: 1001 });
      const mockMsra = vi.fn();

      const res = await launchRemoteSmart('192.0.2.101', {
        mockProbe: {
          host: '192.0.2.101',
          vncPort: 5901,
          port5901Open: true,
          port5900Open: false,
          msraAvailable: true,
          recommendedMethod: 'vnc',
        },
        mockLaunchVnc: mockVnc,
        mockLaunchMsra: mockMsra,
      });

      expect(res.success).toBe(true);
      expect(res.methodUsed).toBe('vnc');
      expect(res.portUsed).toBe(5901);
      expect(mockVnc).toHaveBeenCalledWith('192.0.2.101', 5901);
      expect(mockMsra).not.toHaveBeenCalled();
    });

    it('automatically falls back to MSRA when VNC ports are closed and MSRA is available', async () => {
      const mockVnc = vi.fn();
      const mockMsra = vi.fn().mockReturnValue({
        success: true,
        processId: 2002,
        message: 'Solicitud de Asistencia Remota (MSRA) enviada a 192.0.2.102',
      });

      const res = await launchRemoteSmart('192.0.2.102', {
        mockProbe: {
          host: '192.0.2.102',
          vncPort: null,
          port5901Open: false,
          port5900Open: false,
          msraAvailable: true,
          recommendedMethod: 'msra',
        },
        mockLaunchVnc: mockVnc,
        mockLaunchMsra: mockMsra,
      });

      expect(res.success).toBe(true);
      expect(res.methodUsed).toBe('msra');
      expect(mockVnc).not.toHaveBeenCalled();
      expect(mockMsra).toHaveBeenCalledWith('192.0.2.102');
    });

    it('returns methodUsed="none" and success=false when neither VNC nor MSRA is reachable', async () => {
      const res = await launchRemoteSmart('192.0.2.103', {
        mockProbe: {
          host: '192.0.2.103',
          vncPort: null,
          port5901Open: false,
          port5900Open: false,
          msraAvailable: false,
          recommendedMethod: 'none',
        },
      });

      expect(res.success).toBe(false);
      expect(res.methodUsed).toBe('none');
      expect(res.vncClosed).toBe(true);
      expect(res.msraAvailable).toBe(false);
    });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx.cmd vitest run src/services/systemTools.test.ts`
Expected: FAIL with `launchRemoteSmart is not a function`

- [ ] **Step 3: Implement `recommendedMethod` in `probeRemotePorts` and `launchRemoteSmart` in `electron/systemTools.cjs`**

Update `electron/systemTools.cjs`:

```javascript
async function probeRemotePorts(host, timeoutMs = 800) {
  const [res5901, res5900, res3389, res135] = await Promise.all([
    probeTcpPort(host, 5901, timeoutMs),
    probeTcpPort(host, 5900, timeoutMs),
    probeTcpPort(host, 3389, timeoutMs),
    probeTcpPort(host, 135, timeoutMs),
  ]);

  let vncPort = null;
  if (res5901.open) {
    vncPort = 5901;
  } else if (res5900.open) {
    vncPort = 5900;
  }

  const msraAvailable = Boolean(res3389.open || res135.open);
  let recommendedMethod = 'none';
  if (vncPort) {
    recommendedMethod = 'vnc';
  } else if (msraAvailable) {
    recommendedMethod = 'msra';
  }

  return {
    host,
    vncPort,
    port5901Open: res5901.open,
    port5900Open: res5900.open,
    msraAvailable,
    recommendedMethod,
  };
}

async function launchRemoteSmart(targetIpOrHost, options = {}) {
  try {
    const cleanHost = sanitizeHostOrIp(targetIpOrHost);
    const probe =
      options.mockProbe || (await probeRemotePorts(cleanHost, options.timeoutMs || 600));

    if (probe.vncPort) {
      const vncLauncher = options.mockLaunchVnc || launchVnc;
      const res = vncLauncher(cleanHost, probe.vncPort);
      return {
        ...res,
        methodUsed: 'vnc',
        portUsed: probe.vncPort,
        probe,
        message: `VNC Viewer iniciado hacia ${cleanHost}:${probe.vncPort}`,
      };
    }

    if (probe.msraAvailable) {
      const msraLauncher = options.mockLaunchMsra || launchMsra;
      const res = msraLauncher(cleanHost);
      return {
        ...res,
        methodUsed: 'msra',
        probe,
        message: `VNC cerrado en ${cleanHost}; se inició Asistencia Remota (MSRA) automáticamente`,
      };
    }

    return {
      success: false,
      methodUsed: 'none',
      vncClosed: true,
      msraAvailable: false,
      probe,
      message: `Sin acceso remoto directo en ${cleanHost} (Puertos VNC 5901/5900 y MSRA cerrados).`,
    };
  } catch (err) {
    return {
      success: false,
      methodUsed: 'none',
      message: `Error al verificar acceso remoto: ${err.message}`,
    };
  }
}
```

Export `launchRemoteSmart` in `module.exports` of `electron/systemTools.cjs`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx.cmd vitest run src/services/systemTools.test.ts`
Expected: PASS (all tests in `systemTools.test.ts` green)

- [ ] **Step 5: Commit**

```bash
git add electron/systemTools.cjs src/services/systemTools.test.ts
git commit -m "feat(remote): Add unified launchRemoteSmart orchestrator and recommendedMethod probe"
```

---

### Task 2: Wire IPC Channels & Frontend Client (`electron/main.cjs`, `electron/preload.cjs`, `src/services/electronClient.ts`)

**Files:**
- Modify: `electron/main.cjs:212-220`
- Modify: `electron/preload.cjs:8-15`
- Modify: `src/services/electronClient.ts`
- Test: `src/services/electronClient.test.ts`

- [ ] **Step 1: Write failing test in `src/services/electronClient.test.ts`**

Add tests for `probeRemoteStatus` and `launchSmartRemoteClient` in `src/services/electronClient.test.ts`:

```typescript
  it('probes remote status and launches smart remote client via electronAPI or fallback', async () => {
    const probeRes = await probeRemoteStatus('192.0.2.101');
    expect(probeRes).toHaveProperty('recommendedMethod');

    const launchRes = await launchSmartRemoteClient('192.0.2.101');
    expect(launchRes.success).toBe(true);
    expect(launchRes.methodUsed).toBeDefined();
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx.cmd vitest run src/services/electronClient.test.ts`
Expected: FAIL (`probeRemoteStatus` / `launchSmartRemoteClient` not exported)

- [ ] **Step 3: Add IPC handlers in `electron/main.cjs`, `electron/preload.cjs`, and `src/services/electronClient.ts`**

In `electron/main.cjs`:
```javascript
ipcMain.handle('cmda:probe-remote', async (_event, target) => {
  return await systemTools.probeRemotePorts(target, 800);
});

ipcMain.handle('cmda:launch-remote-smart', async (_event, target) => {
  return await systemTools.launchRemoteSmart(target);
});
```

In `electron/preload.cjs`:
```javascript
  probeRemote: (target) => ipcRenderer.invoke('cmda:probe-remote', target),
  launchRemoteSmart: (target) => ipcRenderer.invoke('cmda:launch-remote-smart', target),
```

In `src/services/electronClient.ts`:
```typescript
export interface RemoteProbeResult {
  host: string;
  vncPort: number | null;
  port5901Open: boolean;
  port5900Open: boolean;
  msraAvailable: boolean;
  recommendedMethod: 'vnc' | 'msra' | 'none';
}

export async function probeRemoteStatus(target: string): Promise<RemoteProbeResult> {
  const api = getElectronAPI();
  if (api && api.probeRemote) {
    try {
      return await api.probeRemote(target);
    } catch {}
  }
  return {
    host: target,
    vncPort: 5901,
    port5901Open: true,
    port5900Open: false,
    msraAvailable: true,
    recommendedMethod: 'vnc',
  };
}

export async function launchSmartRemoteClient(target: string): Promise<ToolExecutionResult> {
  const api = getElectronAPI();
  if (api && api.launchRemoteSmart) {
    try {
      return await api.launchRemoteSmart(target);
    } catch (err: any) {
      return { success: false, methodUsed: 'none', message: err.message };
    }
  }
  return {
    success: true,
    simulated: true,
    methodUsed: 'vnc',
    portUsed: 5901,
    message: `Conexión Remota Inteligente (VNC :5901) iniciada hacia ${target} (Modo Simulación)`,
  };
}
```
Also add `methodUsed?: 'vnc' | 'msra' | 'none';` and `probe?: RemoteProbeResult;` to `ToolExecutionResult`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx.cmd vitest run src/services/electronClient.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add electron/main.cjs electron/preload.cjs src/services/electronClient.ts src/services/electronClient.test.ts
git commit -m "feat(ipc): Expose probeRemoteStatus and launchSmartRemoteClient IPC channels"
```

---

### Task 3: Unified Smart Split Button in `QuickActionsBar` & `App.tsx`

**Files:**
- Modify: `src/components/QuickActionsBar.tsx`
- Modify: `src/App.tsx`
- Test: `src/test/QuickActionsBar.test.tsx`

- [ ] **Step 1: Write unit tests for the Unified Smart Split Button in `src/test/QuickActionsBar.test.tsx`**

Update `src/test/QuickActionsBar.test.tsx` to verify:
1. Primary CTA adapts label according to `remoteProbe` (`Conectar VNC :5901`, `Conectar MSRA`, `Detectando acceso...`, or `Sin Acceso (Reintentar)`).
2. Clicking the primary CTA invokes `onLaunchSmartRemote` (or falls back to `onLaunchVnc` when not provided for backwards compatibility in older tests).
3. Clicking the dropdown trigger (`Opciones de conexión remota`) opens the menu allowing manual override for VNC (`Conectar por VNC Viewer`) and MSRA (`Iniciar Asistencia MSRA`).

- [ ] **Step 2: Run test to verify it fails**

Run: `npx.cmd vitest run src/test/QuickActionsBar.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement the Unified Smart Split Button in `src/components/QuickActionsBar.tsx` and wire pre-probe in `src/App.tsx`**

In `src/components/QuickActionsBar.tsx`:
- Replace the 2 separate VNC and MSRA buttons in the grid with a 3-column grid (`grid-cols-1 sm:grid-cols-3 gap-2 w-full`):
  1. **Unified Smart Remote Split Button:**
     - Primary button (`flex-1`) triggers `onLaunchSmartRemote` (or `onLaunchVnc` fallback). Shows dynamic label/icon based on `remoteProbe` and `isProbingRemote`.
     - Secondary chevron button (`px-2`) toggles a popover menu with live port badges and manual buttons:
       - `Forzar VNC Viewer (F2)` (`aria-label="Conectar por VNC Viewer"`)
       - `Forzar Asistencia MSRA (F4)` (`aria-label="Iniciar Asistencia MSRA"`)
       - `Re-verificar puertos`
  2. **Ping Group (2:1 ratio):** `Ping (F3)` + `-t`.
  3. **Uptime indicator.**

In `src/App.tsx`:
- Add state `remoteProbe: RemoteProbeResult | null` and `isProbingRemote: boolean`.
- When `searchTerminalUnified` resolves a terminal with `res.data?.ip`, automatically call `probeRemoteStatus(res.data.ip)` in parallel with the initial ping to populate `remoteProbe`.
- Create `handleLaunchSmartRemote()` which calls `launchSmartRemoteClient(target)`, updates `remoteProbe` if `res.probe` is returned, and shows a clear toast message indicating whether VNC or MSRA was launched.

- [ ] **Step 4: Run full test suite to verify all tests pass**

Run: `npx.cmd vitest run`
Expected: PASS (100% of test files green, including `securityAudit.test.ts`)

- [ ] **Step 5: Commit**

```bash
git add src/components/QuickActionsBar.tsx src/App.tsx src/test/QuickActionsBar.test.tsx
git commit -m "feat(ui): Unify VNC and MSRA into smart adaptive Split Button CTA"
```
