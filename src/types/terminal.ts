export interface TerminalAlert {
  id: string;
  title: string;
  description: string;
  operator: string;
  date: string;
  active: boolean;
  resolutionText?: string;
  resolutionDate?: string;
}

export interface TerminalResetRecord {
  id: string;
  date: string;
  operator: string;
  reason: string;
  result: string;
}

export interface TerminalData {
  pc: string;
  ip: string;
  mac: string;
  os: string;
  servicePack: string;
  cpuModel: string;
  ram: string;
  antivirusVersion: string;
  ieVersion: string;
  userNt: string;
  architecture: string;
  surveyDate: string;
  uptimeText: string;
  location?: string;
  costCenter?: string;
  alerts: TerminalAlert[];
  resetHistory: TerminalResetRecord[];
}
