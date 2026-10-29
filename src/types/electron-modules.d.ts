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
    recommendedMethod?: 'vnc' | 'msra' | 'none';
  }>;
  export function launchRemoteSmart(targetIpOrHost: string, options?: any): Promise<{
    success: boolean;
    methodUsed: 'vnc' | 'msra' | 'none';
    processId?: number;
    portUsed?: number;
    configPath?: string;
    vncClosed?: boolean;
    msraAvailable?: boolean;
    probe?: any;
    message?: string;
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
    count?: number | { count?: number; continuous?: boolean },
    onData?: (data: string) => void,
    onDone?: (code: number) => void
  ): any;
  export function getNbtstatArgs(targetIpOrHost: string): { exe: string; args: string[] };
  export function getTracertArgs(targetIpOrHost: string, maxHops?: number): { exe: string; args: string[] };
  export function getArpArgs(targetIpOrHost: string): { exe: string; args: string[] };
  export function executeNbtstat(
    targetIpOrHost: string,
    onData?: (data: string) => void,
    onDone?: (code: number) => void
  ): any;
  export function executeTracert(
    targetIpOrHost: string,
    options?: { maxHops?: number } | number,
    onData?: (data: string) => void,
    onDone?: (code: number) => void
  ): any;
  export function executeArp(
    targetIpOrHost: string,
    onData?: (data: string) => void,
    onDone?: (code: number) => void
  ): any;
}


declare module '../../electron/updaterService.cjs' {
  export function parseSemver(ver: string): { major: number; minor: number; patch: number; prerelease: string };
  export function compareVersions(v1: string, v2: string): number;
  export function isNewerVersion(remoteVer: string, currentVer: string): boolean;
  export function checkForUpdates(options?: {
    currentVersion?: string;
    repoOwner?: string;
    repoName?: string;
    fetcher?: any;
  }): Promise<{
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
  }>;
  export function downloadUpdateFile(
    fileUrl: string,
    destPath: string,
    onProgress?: (progress: { receivedBytes: number; totalBytes: number; percent: number }) => void,
    onComplete?: (destPath: string) => void,
    onError?: (err: Error) => void
  ): void;
}


declare module '../../electron/logger.cjs' {
  export function redact(value: any, depth?: number): any;
  export function formatLine(level: string, scope: string, message: string, meta?: Record<string, any>): string;
  export function createLogger(options?: { scope?: string; sink?: any; level?: string }): {
    debug: (message: string, meta?: Record<string, any>) => void;
    info: (message: string, meta?: Record<string, any>) => void;
    warn: (message: string, meta?: Record<string, any>) => void;
    error: (message: string, meta?: Record<string, any>) => void;
    child: (scope: string) => any;
  };
}

declare module '../../electron/bootstrap.cjs' {
  export const DEFAULTS: {
    configSource: string;
    uncConfigPath: string;
    updateFeed: string;
    updateMirror: string;
    retryIntervalMs: number;
  };
  export function getBootstrapPath(programDataDir: string): string;
  export function normalizeBootstrap(raw: any, defaults?: any): any;
  export function loadBootstrap(options?: any): any;
}

declare module '../../electron/configProvider.cjs' {
  export class ConfigError extends Error {
    code: string;
    details: Record<string, any>;
  }
  export function mapFsError(err: any): string;
  export function validateCorporateConfig(raw: any): any;
  export class UncConfigProvider {
    constructor(options: { configPath: string; readFile?: any; logger?: any });
    source: string;
    describe(): { source: string; target: string };
    getConfig(): Promise<any>;
    getVncSecret(): Promise<string>;
  }
  export class DevEnvConfigProvider {
    constructor(options?: { env?: any; localConfigPath?: string });
    source: string;
    describe(): { source: string; target: string };
    getConfig(): Promise<any>;
    getVncSecret(): Promise<string>;
  }
  export function createConfigProvider(bootstrapConfig: any, options?: any): any;
}

declare module '../../electron/migration.cjs' {
  export function getLegacyTargets(options: any): string[];
  export function migrateLegacyConfig(options?: any): { removed: string[] };
}
