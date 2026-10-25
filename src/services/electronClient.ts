import { TerminalData } from '../types/terminal';
import { findTerminalByQuery } from './terminalService';

export interface SecurityGateStatus {
  authorized: boolean;
  configured: boolean;
  domainMatched: boolean;
  networkReachable: boolean;
  detectedDomain: string;
  reason: 'AUTHORIZED' | 'UNCONFIGURED' | 'OUTSIDE_CORPORATE_NETWORK' | 'UNLOCK_ERROR';
  message: string;
}

export interface BackendStatus {
  connected: boolean;
  server?: string;
  database?: string;
  mode: 'sql' | 'mock';
  error?: string;
}

export interface TerminalSearchResult {
  source: 'sql' | 'mock' | 'network';
  data: TerminalData | null;
}

export interface ToolExecutionResult {
  success: boolean;
  processId?: number;
  simulated?: boolean;
  message?: string;
  vncClosed?: boolean;
  msraAvailable?: boolean;
  portUsed?: number;
}

function getElectronAPI() {
  if (typeof window !== 'undefined' && (window as any).electronAPI) {
    return (window as any).electronAPI;
  }
  return null;
}

export async function checkSecurityGateStatus(): Promise<SecurityGateStatus> {
  const api = getElectronAPI();
  if (api && api.getSecurityStatus) {
    try {
      return await api.getSecurityStatus();
    } catch (err: any) {
      return {
        authorized: false,
        configured: false,
        domainMatched: false,
        networkReachable: false,
        detectedDomain: 'UNKNOWN',
        reason: 'UNLOCK_ERROR',
        message: err.message || 'Error al verificar el candado de seguridad corporativo',
      };
    }
  }

  return {
    authorized: true,
    configured: true,
    domainMatched: true,
    networkReachable: true,
    detectedDomain: 'DEV-MODE',
    reason: 'AUTHORIZED',
    message: 'Modo de prueba en navegador web',
  };
}

export async function unlockCorporateSecurity(
  configPath: string,
  corporateKey: string
): Promise<SecurityGateStatus> {
  const api = getElectronAPI();
  if (api && api.unlockSecurity) {
    try {
      return await api.unlockSecurity(configPath, corporateKey);
    } catch (err: any) {
      return {
        authorized: false,
        configured: false,
        domainMatched: false,
        networkReachable: false,
        detectedDomain: 'UNKNOWN',
        reason: 'UNLOCK_ERROR',
        message: err.message || 'No se pudo desbloquear la configuración corporativa',
      };
    }
  }

  return {
    authorized: true,
    configured: true,
    domainMatched: true,
    networkReachable: true,
    detectedDomain: 'DEV-MODE',
    reason: 'AUTHORIZED',
    message: 'Configuración desbloqueada en modo desarrollo',
  };
}

export async function checkBackendStatus(): Promise<BackendStatus> {
  const api = getElectronAPI();
  if (api && api.checkStatus) {
    try {
      return await api.checkStatus();
    } catch (err: any) {
      return {
        connected: false,
        mode: 'mock',
        error: err.message,
      };
    }
  }

  return {
    connected: false,
    mode: 'mock',
    server: 'Web Browser (Simulado)',
  };
}

export async function searchTerminalUnified(query: string): Promise<TerminalSearchResult> {
  const api = getElectronAPI();
  if (api && api.searchTerminal) {
    try {
      const res = await api.searchTerminal(query);
      if (res && res.data) {
        return res;
      }
      if (res && res.error) {
        return { source: 'mock', data: null };
      }
    } catch {
      // fallback to mock in dev
    }
  }

  // Fallback to local synthetic mock data when in dev/authorized mode
  const mock = findTerminalByQuery(query);
  return {
    source: 'mock',
    data: mock,
  };
}

export async function launchVncClient(target: string): Promise<ToolExecutionResult> {
  const api = getElectronAPI();
  if (api && api.launchVnc) {
    try {
      return await api.launchVnc(target);
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }

  return {
    success: true,
    simulated: true,
    message: `[Simulación Web] VNC Viewer lanzado para ${target}`,
  };
}

export async function launchMsraClient(target: string): Promise<ToolExecutionResult> {
  const api = getElectronAPI();
  if (api && api.launchMsra) {
    try {
      return await api.launchMsra(target);
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }

  return {
    success: true,
    simulated: true,
    message: `[Simulación Web] Asistencia Remota (MSRA) solicitada para ${target}`,
  };
}

export function subscribeToPing(
  target: string,
  onData: (text: string) => void,
  onEnd: (code: number) => void
): () => void {
  const api = getElectronAPI();
  if (api && api.ping && api.onPingData && api.onPingEnd) {
    const unsubData = api.onPingData(onData);
    const unsubEnd = api.onPingEnd(onEnd);
    api.ping(target);
    return () => {
      unsubData();
      unsubEnd();
    };
  }

  // Web Browser fallback simulation
  let timer: any = null;
  let seq = 1;
  onData(`Iniciando simulación Ping a [${target}] en navegador web...\n`);

  timer = setInterval(() => {
    if (seq <= 4) {
      const ms = Math.floor(Math.random() * 20) + 12;
      onData(`Respuesta desde ${target}: bytes=32 tiempo=${ms}ms TTL=126 (simulado)\n`);
      seq++;
    } else {
      clearInterval(timer);
      onData(`\nEstadísticas de ping para ${target}:\n    Paquetes: enviados = 4, recibidos = 4, perdidos = 0 (0% perdidos)\n`);
      onEnd(0);
    }
  }, 600);

  return () => {
    if (timer) clearInterval(timer);
  };
}
