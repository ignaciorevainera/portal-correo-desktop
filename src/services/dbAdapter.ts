import { TerminalData } from '../types/terminal';
import { findTerminalByQuery } from './terminalService';

export function isIpAddress(query: string): boolean {
  if (!query) return false;
  const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
  if (!ipRegex.test(query.trim())) return false;
  const parts = query.trim().split('.').map(Number);
  return parts.every((p) => p >= 0 && p <= 255);
}

export function mapSqlRecordToTerminal(record: any): TerminalData {
  return {
    pc: record.pc || '',
    ip: record.ip || '',
    mac: record.Macadrress || record.mac || '',
    os: record.Sist_operativo || record.os || '',
    servicePack: record.ServPack || record.servicePack || '',
    cpuModel: record.ModeloYprocesador || record.cpuModel || '',
    ram: record.ram || '',
    antivirusVersion: record.version_AV || record.antivirusVersion || '',
    ieVersion: record.IE || record.ieVersion || '',
    userNt: record.userNt || '',
    architecture: record.Arquitectura || record.architecture || '',
    surveyDate: record.Fecha_Relevada || record.surveyDate || '',
    uptimeText: record.uptimeText || 'Sin registro en vivo',
    location: record.location || '',
    costCenter: record.costCenter || '',
    alerts: record.alerts || [],
    resetHistory: record.resetHistory || [],
  };
}

export async function resolveTerminalHybrid(
  query: string,
  sqlExecutor?: (sql: string, params?: any) => Promise<any>
): Promise<{ data: TerminalData | null; source: 'sql' | 'mock' }> {
  if (sqlExecutor) {
    try {
      const res = await sqlExecutor(query);
      if (res && res.recordset && res.recordset.length > 0) {
        return {
          data: mapSqlRecordToTerminal(res.recordset[0]),
          source: 'sql',
        };
      }
    } catch {
      // Offline or SQL error -> Fallback to mock
    }
  }

  const mock = findTerminalByQuery(query);
  return {
    data: mock,
    source: 'mock',
  };
}
