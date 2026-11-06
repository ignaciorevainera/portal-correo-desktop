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
