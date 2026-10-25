import { describe, it, expect, vi } from 'vitest';
import {
  mapSqlRecordToTerminal,
  isIpAddress,
  resolveTerminalHybrid,
} from './dbAdapter';

describe('dbAdapter & SQL mapping', () => {
  it('detects valid IPv4 addresses', () => {
    expect(isIpAddress('192.0.2.101')).toBe(true);
    expect(isIpAddress('198.51.100.1')).toBe(true);
    expect(isIpAddress('WS-DEMO-002')).toBe(false);
    expect(isIpAddress('PC-DEMO-001')).toBe(false);
  });

  it('correctly maps raw SQL recordset from CMDA_Trae_Info_DE_PC_PARAmesa_T', () => {
    const rawSql = {
      pc: 'PC-DEMO-001',
      ip: '192.0.2.101',
      Macadrress: '00:00:5E:00:53:01',
      Sist_operativo: 'W-10',
      ServPack: '19045.4046',
      ModeloYprocesador: 'Intel Core i5 ~2400 Mhz',
      ram: '8.192 MB',
      version_AV: '12.0',
      IE: '11.0',
      userNt: 'operador.demo01 | operador.demo02',
      Arquitectura: 'x64-based PC',
      Fecha_Relevada: '01/01/2026',
    };

    const terminal = mapSqlRecordToTerminal(rawSql);
    expect(terminal.pc).toBe('PC-DEMO-001');
    expect(terminal.ip).toBe('192.0.2.101');
    expect(terminal.mac).toBe('00:00:5E:00:53:01');
    expect(terminal.os).toBe('W-10');
    expect(terminal.userNt).toBe('operador.demo01 | operador.demo02');
    expect(terminal.alerts).toEqual([]);
    expect(terminal.resetHistory).toEqual([]);
  });

  it('falls back to Mock repository when SQL client throws or is offline', async () => {
    const mockSqlExecutor = vi.fn().mockRejectedValue(new Error('Connection timeout to SQL Server'));
    const result = await resolveTerminalHybrid('WS-DEMO-002', mockSqlExecutor);

    expect(result.source).toBe('mock');
    expect(result.data).toBeDefined();
    expect(result.data?.pc).toBe('WS-DEMO-002');
  });

  it('uses SQL data when executor succeeds', async () => {
    const mockSqlExecutor = vi.fn().mockResolvedValue({
      recordset: [
        {
          pc: 'TEST_PC_SQL',
          ip: '192.0.2.200',
          Macadrress: '00:00:5E:00:53:99',
          Sist_operativo: 'Windows 11',
          ServPack: '22631',
          ModeloYprocesador: 'AMD Ryzen 7',
          ram: '16.384 MB',
          version_AV: '12.0',
          IE: '11.0',
          userNt: 'testUser',
          Arquitectura: 'x64-based PC',
          Fecha_Relevada: '24/10/2026',
        },
      ],
    });

    const result = await resolveTerminalHybrid('TEST_PC_SQL', mockSqlExecutor);
    expect(result.source).toBe('sql');
    expect(result.data?.pc).toBe('TEST_PC_SQL');
    expect(result.data?.ip).toBe('192.0.2.200');
  });
});
