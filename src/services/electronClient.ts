import { TerminalData } from '../types/terminal';
import { findTerminalByQuery } from './terminalService';

export type GateStatusCode =
  | 'AUTHORIZED'
  | 'NO_LAN_DNS'
  | 'NO_LAN_ROUTE'
  | 'NO_LAN_TIMEOUT'
  | 'NO_PERMISSION'
  | 'NO_CONFIG'
  | 'BAD_CONFIG'
  | 'UNKNOWN';

export interface GateStatus {
  status: 'READY' | 'BLOCKED' | 'NO_CONFIG';
  code: GateStatusCode;
  message: string;
  source: 'unc' | 'http' | 'dev' | 'none';
  configPath: string;
  environment?: {
    detectedDomain: string;
    isDomainJoined: boolean;
    note: string;
  };
}

export interface DiagnosticsInfo {
  gate: GateStatus;
  bootstrap: {
    found: boolean;
    path: string;
    configSource: string;
    retryIntervalMs: number;
  };
  environment: {
    detectedDomain: string;
    isDomainJoined: boolean;
    note: string;
  };
  packaged: boolean;
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
  methodUsed?: 'vnc' | 'msra' | 'none';
  probe?: RemoteProbeResult;
}

export interface RemoteProbeResult {
  host: string;
  vncPort: number | null;
  port5901Open: boolean;
  port5900Open: boolean;
  msraAvailable: boolean;
  recommendedMethod: 'vnc' | 'msra' | 'none';
}

function getElectronAPI() {
  if (typeof window !== 'undefined' && (window as any).electronAPI) {
    return (window as any).electronAPI;
  }
  return null;
}

export async function checkSecurityGateStatus(): Promise<GateStatus> {
  const api = getElectronAPI();
  if (api && api.getSecurityStatus) {
    try {
      return await api.getSecurityStatus();
    } catch (err: any) {
      return {
        status: 'BLOCKED',
        code: 'UNKNOWN',
        message: err.message || 'Error al verificar el acceso a la configuración corporativa',
        source: 'none',
        configPath: '',
      };
    }
  }

  return {
    status: 'READY',
    code: 'AUTHORIZED',
    message: 'Modo de prueba en navegador web',
    source: 'dev',
    configPath: '',
  };
}

export async function retrySecurityGate(): Promise<GateStatus> {
  const api = getElectronAPI();
  if (api && api.retrySecurity) {
    try {
      return await api.retrySecurity();
    } catch (err: any) {
      return {
        status: 'BLOCKED',
        code: 'UNKNOWN',
        message: err.message || 'Error al reintentar el acceso',
        source: 'none',
        configPath: '',
      };
    }
  }

  return {
    status: 'READY',
    code: 'AUTHORIZED',
    message: 'Modo de prueba en navegador web',
    source: 'dev',
    configPath: '',
  };
}

export async function getDiagnostics(): Promise<DiagnosticsInfo | null> {
  const api = getElectronAPI();
  if (api && api.getDiagnostics) {
    return await api.getDiagnostics();
  }
  return null;
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
      if (res) {
        return res;
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

export async function minimizeWindow(): Promise<void> {
  const api = getElectronAPI();
  if (api && api.minimizeWindow) {
    try {
      await api.minimizeWindow();
    } catch {}
  }
}

export async function maximizeWindow(): Promise<void> {
  const api = getElectronAPI();
  if (api && api.maximizeWindow) {
    try {
      await api.maximizeWindow();
    } catch {}
  }
}

export async function closeWindow(): Promise<void> {
  const api = getElectronAPI();
  if (api && api.closeWindow) {
    try {
      await api.closeWindow();
    } catch {}
  }
}

export async function hideToTray(): Promise<void> {
  const api = getElectronAPI();
  if (api && api.hideToTray) {
    try {
      await api.hideToTray();
    } catch {}
  }
}

export async function stopPing(): Promise<void> {
  const api = getElectronAPI();
  if (api && api.stopPing) {
    try {
      await api.stopPing();
    } catch {}
  }
}

export async function openExternalUrl(url: string): Promise<void> {
  const api = getElectronAPI();
  if (api && api.openExternal) {
    try {
      await api.openExternal(url);
      return;
    } catch {}
  }

  if (typeof window !== 'undefined' && window.open) {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

export type DiagnosticCommandType = 'ping' | 'nbtstat' | 'tracert' | 'arp' | 'netuser';

export async function stopDiagnosticCommand(): Promise<void> {
  const api = getElectronAPI();
  if (api && api.stopCommand) {
    try {
      await api.stopCommand();
    } catch {}
  }
}

export function subscribeToDiagnosticCommand(
  command: DiagnosticCommandType,
  target: string,
  onData: (text: string) => void,
  onEnd: (code: number) => void,
  options?: any
): () => void {
  const api = getElectronAPI();
  if (api && api.startCommand && api.onCommandData && api.onCommandEnd) {
    const unsubData = api.onCommandData(onData);
    const unsubEnd = api.onCommandEnd(onEnd);
    api.startCommand({ command, target, options });
    return () => {
      unsubData();
      unsubEnd();
      api.stopCommand?.();
    };
  }

  // Web Browser fallback simulation
  let timer: any = null;
  let step = 0;

  if (command === 'nbtstat') {
    onData(`\nNetBIOS Remote Machine Name Table\n---------------------------------------------\n`);
    timer = setTimeout(() => {
      onData(`   PC-DEMO-001    <00>  UNIQUE      Registered\n   CORP           <00>  GROUP       Registered\n   PC-DEMO-001    <20>  UNIQUE      Registered\n   CORP\\OPERADOR1 <03>  UNIQUE      Registered\n\n   MAC Address = 00-1A-2B-3C-4D-5E (Simulado)\n`);
      onEnd(0);
    }, 500);
  } else if (command === 'tracert') {
    onData(`\nTraza a ${target} sobre caminos de 6 saltos como máximo:\n\n`);
    const hops = [
      `  1     1 ms    <1 ms    <1 ms  192.0.2.1\n`,
      `  2     4 ms     3 ms     3 ms  192.0.2.254\n`,
      `  3    12 ms    11 ms    12 ms  ${target}\n`,
    ];
    timer = setInterval(() => {
      if (step < hops.length) {
        onData(hops[step]);
        step++;
      } else {
        clearInterval(timer);
        onData(`\nTraza completa (simulado).\n`);
        onEnd(0);
      }
    }, 400);
  } else if (command === 'arp') {
    onData(`\nInterfaz: 192.0.2.100 --- 0x10\n  Dirección de Internet          Dirección física      Tipo\n`);
    timer = setTimeout(() => {
      onData(`  ${target}                     00-1a-2b-3c-4d-5e     dinámico (Simulado)\n`);
      onEnd(0);
    }, 400);
  } else if (command === 'netuser') {
    onData(
      `\nInformación de la cuenta para ${target}\n\n` +
        `Nombre de usuario: ${target}\n` +
        `Nombre completo:\n` +
        `Cuenta activa: Sí\n\n` +
        `Miembro de grupos globales  *GRUPO-SOPORTE  *GRUPO-OPERADORES\n` +
        `El comando se completó correctamente.\n`,
    );
    timer = setTimeout(() => {
      onEnd(0);
    }, 500);
  } else {
    // Ping fallback
    return subscribeToPing(target, onData, onEnd, Boolean(options?.continuous));
  }

  return () => {
    if (timer) {
      clearTimeout(timer);
      clearInterval(timer);
    }
  };
}

export function subscribeToPing(
  target: string,
  onData: (text: string) => void,
  onEnd: (code: number) => void,
  continuous: boolean = false
): () => void {
  const api = getElectronAPI();
  if (api && api.ping && api.onPingData && api.onPingEnd) {
    const unsubData = api.onPingData(onData);
    const unsubEnd = api.onPingEnd(onEnd);
    api.ping(target, continuous);
    return () => {
      unsubData();
      unsubEnd();
      api.stopPing?.();
    };
  }

  // Web Browser fallback simulation
  let timer: any = null;
  let seq = 1;
  onData(`\nHaciendo ping a ${target} con 32 bytes de datos:\n`);

  timer = setInterval(() => {
    if (continuous || seq <= 4) {
      const ms = Math.floor(Math.random() * 20) + 12;
      onData(`Respuesta desde ${target}: bytes=32 tiempo=${ms}ms TTL=126\n`);
      seq++;
    } else {
      clearInterval(timer);
      onData(`\nEstadísticas de ping para ${target}:\n    Paquetes: enviados = 4, recibidos = 4, perdidos = 0 (0% perdidos)\nTiempos aproximados de ida y vuelta en milisegundos:\n    Mínimo = 12ms, Máximo = 28ms, Media = 16ms\n`);
      onEnd(0);
    }
  }, 400);

  return () => {
    if (timer) clearInterval(timer);
  };
}

export interface AutofocusSearchPayload {
  isValid: boolean;
  query: string;
  type: 'ip' | 'hostname' | 'none';
  autoSearch: boolean;
}

export function subscribeToAutofocusSearch(
  callback: (payload: AutofocusSearchPayload) => void
): () => void {
  const api = getElectronAPI();
  if (api && api.onTriggerAutofocusSearch) {
    return api.onTriggerAutofocusSearch(callback);
  }
  return () => {};
}

export interface SubnetDiscoveredHost {
  ip: string;
  /** null when no source (inventory, DNS, NetBIOS, ping -a) resolves a name */
  hostname: string | null;
  alive: boolean;
  latency: number | null;
}

export interface SubnetScanProgress {
  scanned: number;
  total: number;
}

export interface SubnetScanSummary {
  aborted: boolean;
  totalFound: number;
  error?: string;
}

export function startSubnetScanner(
  targetIp: string,
  onHostFound: (host: SubnetDiscoveredHost) => void,
  onProgress: (progress: SubnetScanProgress) => void,
  onDone: (summary: SubnetScanSummary) => void
): () => void {
  const api = getElectronAPI();
  if (api && api.startSubnetScan && api.onSubnetHostFound) {
    const unsubHost = api.onSubnetHostFound(onHostFound);
    const unsubProgress = api.onSubnetProgress(onProgress);
    const unsubDone = api.onSubnetDone(onDone);
    api.startSubnetScan(targetIp);

    return () => {
      unsubHost();
      unsubProgress();
      unsubDone();
      api.abortSubnetScan?.();
    };
  }

  // Web Browser fallback simulation
  let current = 1;
  const total = 254;
  const parts = targetIp.split('.');
  const prefix = `${parts[0] || '192'}.${parts[1] || '0'}.${parts[2] || '2'}`;
  let timer: any = null;

  timer = setInterval(() => {
    if (current <= total) {
      onProgress({ scanned: current, total });
      if (current === 10 || current === 25 || current === 42 || current === 88) {
        onHostFound({
          ip: `${prefix}.${current}`,
          hostname: `PC-SIM-${current}`,
          alive: true,
          latency: Math.floor(Math.random() * 20) + 5,
        });
      }
      current += 8;
    } else {
      clearInterval(timer);
      onProgress({ scanned: total, total });
      onDone({ aborted: false, totalFound: 4 });
    }
  }, 100);

  return () => {
    if (timer) clearInterval(timer);
  };
}


export interface UpdateCheckResult {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseName?: string;
  releaseNotes?: string;
  publishedAt?: string;
  downloadUrl?: string;
  portableDownloadUrl?: string;
  downloadSize?: number;
  error?: string | null;
}

export interface UpdateDownloadProgress {
  receivedBytes: number;
  totalBytes: number;
  percent: number;
}

export async function checkAppUpdates(): Promise<UpdateCheckResult> {
  const api = getElectronAPI();
  if (api && api.checkForUpdates) {
    try {
      return await api.checkForUpdates();
    } catch (err: any) {
      return {
        hasUpdate: false,
        currentVersion: '1.0.0',
        latestVersion: '1.0.0',
        error: err.message || 'Error al consultar actualizaciones',
      };
    }
  }

  // Web Browser fallback simulation
  return {
    hasUpdate: false,
    currentVersion: '1.0.0',
    latestVersion: '1.0.0',
    releaseNotes: 'Modo navegador web (simulación sin ejecutable nativo)',
    error: null,
  };
}

export function startDownloadUpdate(
  downloadUrl: string,
  onProgress: (progress: UpdateDownloadProgress) => void,
  onDownloaded: (filePath: string) => void
): () => void {
  const api = getElectronAPI();
  if (api && api.startDownloadUpdate && api.onUpdateProgress && api.onUpdateDownloaded) {
    const unsubProgress = api.onUpdateProgress(onProgress);
    const unsubDownloaded = api.onUpdateDownloaded(onDownloaded);
    api.startDownloadUpdate(downloadUrl);

    return () => {
      unsubProgress();
      unsubDownloaded();
    };
  }

  // Web Browser fallback simulation
  let percent = 0;
  const timer = setInterval(() => {
    percent += 20;
    if (percent <= 100) {
      onProgress({ receivedBytes: percent * 100000, totalBytes: 10000000, percent });
    }
    if (percent >= 100) {
      clearInterval(timer);
      onDownloaded('simulated://download/PortalCorreoDesktop-Setup.exe');
    }
  }, 400);

  return () => {
    clearInterval(timer);
  };
}

export async function installUpdateNow(): Promise<{ success: boolean; error?: string }> {
  const api = getElectronAPI();
  if (api && api.installUpdateNow) {
    try {
      return await api.installUpdateNow();
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  return { success: true };
}


export interface CorporateConfigSummary {
  isConfigured: boolean;
  dbServer?: string;
  dbDatabase?: string;
  dbUser?: string;
  dbPort?: number;
  corporateDomain?: string;
}

export interface ImportConfigResult {
  success?: boolean;
  canceled?: boolean;
  error?: string;
  config?: CorporateConfigSummary;
  status?: BackendStatus;
}

export async function getCorporateConfig(): Promise<CorporateConfigSummary> {
  const api = getElectronAPI();
  if (api && api.getCorporateConfig) {
    return await api.getCorporateConfig();
  }
  return {
    isConfigured: false,
    dbServer: '',
    dbDatabase: '',
    dbUser: '',
    dbPort: 1433,
  };
}

export async function importCorporateConfigDialog(): Promise<ImportConfigResult> {
  const api = getElectronAPI();
  if (api && api.importConfigDialog) {
    return await api.importConfigDialog();
  }
  return { success: true, canceled: false };
}

export async function importCorporateConfigContent(contentStr: string): Promise<ImportConfigResult> {
  const api = getElectronAPI();
  if (api && api.importConfigContent) {
    return await api.importConfigContent(contentStr);
  }
  return { success: true };
}

export async function clearCorporateConfig(): Promise<{ success: boolean; error?: string }> {
  const api = getElectronAPI();
  if (api && api.clearCorporateConfig) {
    return await api.clearCorporateConfig();
  }
  return { success: true };
}

export async function testSqlConnection(): Promise<BackendStatus> {
  const api = getElectronAPI();
  if (api && api.testSqlConnection) {
    return await api.testSqlConnection();
  }
  return {
    connected: false,
    server: 'Simulación',
    database: 'BD_DEMO',
    mode: 'mock',
  };
}
