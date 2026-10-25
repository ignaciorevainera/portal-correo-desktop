declare module '../../electron/dbService.cjs' {
  const dbService: any;
  export default dbService;
}

declare module '../../electron/configManager.cjs' {
  const configManager: any;
  export default configManager;
}

declare module '../../electron/securityGate.cjs' {
  const securityGate: any;
  export default securityGate;
}

declare module '../../electron/dnsResolver.cjs' {
  export function isIpAddress(query: string): boolean;
  export function resolveNetworkTarget(query: string, dnsModule?: any): Promise<{ ip: string; hostname: string } | null>;
  export function createLiveNetworkTerminal(hostname: string, ip: string): any;
}

declare module '../../electron/systemTools.cjs' {
  export function sanitizeHostOrIp(input: string): string;
  export function buildVncConfigFile(targetIpOrHost: string, port?: number): string;
  export function getVncCommand(vncPath: string, configPath: string): { exe: string; args: string[] };
  export function getMsraCommand(targetIpOrHost: string): { exe: string; args: string[] };
  export function getPingArgs(targetIpOrHost: string, count?: number): { exe: string; args: string[] };
  export function getVncViewerPath(): string;
  export function probeTcpPort(host: string, port: number, timeoutMs?: number): Promise<{ open: boolean; port: number; error?: string }>;
  export function probeRemotePorts(host: string, timeoutMs?: number): Promise<{
    host: string;
    vncPort: number | null;
    port5901Open: boolean;
    port5900Open: boolean;
    msraAvailable: boolean;
  }>;
  export function launchVnc(targetIpOrHost: string, port?: number): { success: boolean; processId?: number; configPath?: string; portUsed?: number; message?: string };
  export function launchVncSmart(targetIpOrHost: string, options?: any): Promise<{
    success: boolean;
    processId?: number;
    configPath?: string;
    portUsed?: number;
    vncClosed?: boolean;
    msraAvailable?: boolean;
    message?: string;
  }>;
  export function launchMsra(targetIpOrHost: string): { success: boolean; processId?: number; message?: string };
  export function executePing(
    targetIpOrHost: string,
    count?: number,
    onData?: (data: string) => void,
    onDone?: (code: number) => void
  ): any;
}
