import { Page } from '@playwright/test';
import path from 'path';
import { MOCK_TERMINALS, MOCK_GATE_STATUS, MOCK_SUBNET_HOSTS } from '../fixtures/mockData';

export interface HarnessOptions {
  activeTerminalQuery?: string;
  gateStatus?: typeof MOCK_GATE_STATUS;
}

/**
 * Inyecta el contrato electronAPI completo dentro del contexto del DOM de la página
 * antes de que React y los scripts de dist se inicialicen.
 */
export async function setupElectronMock(page: Page, options: HarnessOptions = {}): Promise<{
  invokedIpcCalls: { channel: string; args: any[] }[];
}> {
  const calls: { channel: string; args: any[] }[] = [];

  await page.exposeFunction('__recordIpcCall', (channel: string, args: any[]) => {
    calls.push({ channel, args });
  });

  await page.addInitScript((mockData: { terminals: typeof MOCK_TERMINALS; gate: typeof MOCK_GATE_STATUS; hosts: typeof MOCK_SUBNET_HOSTS }) => {
    const listeners: Record<string, Function[]> = {};

    (window as any).electronAPI = {
      pingStart: (ip: string) => {
        (window as any).__recordIpcCall('pingStart', [ip]);
        // Simular eventos de ping continuos vía onPingData
        if (listeners['ping-data']) {
          setTimeout(() => {
            listeners['ping-data']?.forEach((cb) => cb(`Haciendo ping a ${ip} con 32 bytes de datos:`));
            listeners['ping-data']?.forEach((cb) => cb(`Respuesta desde ${ip}: bytes=32 tiempo=14ms TTL=126`));
            listeners['ping-data']?.forEach((cb) => cb(`Respuesta desde ${ip}: bytes=32 tiempo=12ms TTL=126`));
          }, 50);
        }
      },
      pingStop: () => {
        (window as any).__recordIpcCall('pingStop', []);
        if (listeners['ping-data']) {
          listeners['ping-data']?.forEach((cb) => cb('Ping detenido por el usuario.'));
        }
      },
      searchTerminal: async (query: string) => {
        (window as any).__recordIpcCall('searchTerminal', [query]);
        const clean = query.trim().toUpperCase();
        const found = mockData.terminals.find(
          (t) => t.pc.toUpperCase() === clean || t.ip === clean || t.pc.includes(clean)
        );
        if (found) {
          return { source: 'sql', data: found };
        }
        return { source: 'mock', data: null };
      },
      getGateStatus: async () => {
        (window as any).__recordIpcCall('getGateStatus', []);
        return mockData.gate;
      },
      startSubnetScan: (subnet: string) => {
        (window as any).__recordIpcCall('startSubnetScan', [subnet]);
        if (listeners['subnet-progress']) {
          listeners['subnet-progress'].forEach((cb) => cb({ scanned: 10, total: 254 }));
        }
        if (listeners['subnet-host-found']) {
          mockData.hosts.forEach((h, index) => {
            setTimeout(() => {
              listeners['subnet-host-found']?.forEach((cb) => cb(h));
            }, (index + 1) * 40);
          });
        }
        setTimeout(() => {
          if (listeners['subnet-progress']) {
            listeners['subnet-progress'].forEach((cb) => cb({ scanned: 254, total: 254 }));
          }
        }, 200);
      },
      cancelSubnetScan: () => {
        (window as any).__recordIpcCall('cancelSubnetScan', []);
      },
      minimizeWindow: () => {
        (window as any).__recordIpcCall('minimizeWindow', []);
      },
      maximizeWindow: () => {
        (window as any).__recordIpcCall('maximizeWindow', []);
      },
      closeWindow: () => {
        (window as any).__recordIpcCall('closeWindow', []);
      },
      hideToTray: () => {
        (window as any).__recordIpcCall('hideToTray', []);
      },
      quitApp: () => {
        (window as any).__recordIpcCall('quitApp', []);
      },
      onPingData: (cb: (data: string) => void) => {
        if (!listeners['ping-data']) listeners['ping-data'] = [];
        listeners['ping-data'].push(cb);
      },
      onCmdData: (cb: (data: string) => void) => {
        if (!listeners['cmd-data']) listeners['cmd-data'] = [];
        listeners['cmd-data'].push(cb);
      },
      onSubnetProgress: (cb: (prog: any) => void) => {
        if (!listeners['subnet-progress']) listeners['subnet-progress'] = [];
        listeners['subnet-progress'].push(cb);
      },
      onSubnetHostFound: (cb: (host: any) => void) => {
        if (!listeners['subnet-host-found']) listeners['subnet-host-found'] = [];
        listeners['subnet-host-found'].push(cb);
      },
      onContextMenuAction: (cb: (action: string) => void) => {
        if (!listeners['context-menu-action']) listeners['context-menu-action'] = [];
        listeners['context-menu-action'].push(cb);
      },
      removeAllListeners: (channel?: string) => {
        if (channel && listeners[channel]) {
          delete listeners[channel];
        } else {
          Object.keys(listeners).forEach((k) => delete listeners[k]);
        }
      },
    };
  }, {
    terminals: MOCK_TERMINALS,
    gate: options.gateStatus || MOCK_GATE_STATUS,
    hosts: MOCK_SUBNET_HOSTS,
  });

  return { invokedIpcCalls: calls };
}

/**
 * Carga el index.html principal compilado de Vite
 */
export async function navigateToMainWindow(page: Page): Promise<void> {
  const distPath = path.resolve(__dirname, '../../dist/index.html').replace(/\\/g, '/');
  await page.goto(`file:///${distPath}`);
  await page.waitForLoadState('domcontentloaded');
}

/**
 * Carga la ventana secundaria monitor.html compilada de Vite
 */
export async function navigateToMonitorWindow(page: Page): Promise<void> {
  const distPath = path.resolve(__dirname, '../../dist/monitor.html').replace(/\\/g, '/');
  await page.goto(`file:///${distPath}`);
  await page.waitForLoadState('domcontentloaded');
}
