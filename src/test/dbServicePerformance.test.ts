import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'path';

describe('dbService Performance and Parallelization', () => {
  let dbService: any;

  beforeEach(() => {
    delete require.cache[require.resolve('../../electron/dbService.cjs')];
    dbService = require('../../electron/dbService.cjs');
  });

  afterEach(() => {
    if (dbService && dbService.resetPool) {
      dbService.resetPool();
    }
  });

  it('executes secondary stored procedures concurrently in parallel via Promise.allSettled', async () => {
    const activeRequests: string[] = [];
    const maxConcurrentSecondaryRequests: number[] = [];
    let currentConcurrent = 0;

    const mockPool = {
      connected: true,
      request: () => {
        let inputParams: Record<string, any> = {};
        return {
          input: (name: string, _type: any, val: any) => {
            inputParams[name] = val;
            return this;
          },
          execute: vi.fn(async (spName: string) => {
            if (spName === 'CMDA_Trae_Info_DE_PC_PARAmesa_T') {
              return {
                recordset: [{
                  pc: 'PC-TEST-001',
                  ip: '10.0.0.50',
                  Sist_operativo: 'Windows 10 Pro',
                }],
              };
            }

            // For secondary SPs, track concurrency
            activeRequests.push(spName);
            currentConcurrent++;
            maxConcurrentSecondaryRequests.push(currentConcurrent);

            // Simulate realistic IO latency so that concurrent executions overlap
            await new Promise((resolve) => setTimeout(resolve, 30));

            currentConcurrent--;

            if (spName === 'Cmda_Trae_Datos_De_Ubicacion_Y_cpa_centro_Costo_T') {
              return { recordset: [{ Ubicacion: 'Sede Central', Centro_Costo: 'CC-100' }] };
            }
            if (spName === 'cmda_Busca_SI_HAY_ALERTA_Activa_para_terminal_T') {
              return { recordset: [{ id: 'alt-1', Titulo: 'Alerta Test', Descripcion: 'Desc', Operador: 'Op' }] };
            }
            if (spName === 'CMDA_Trae_historial_De_REset_DE_UNA_PC_T') {
              return { recordset: [{ id: 'rst-1', Motivo: 'Reset Test', Resultado: 'OK' }] };
            }
            if (spName === 'Cmda_trae_historial_UptimeXterminal_T') {
              return { recordset: [{ Uptime: '10 days' }] };
            }

            return { recordset: [] };
          }),
        };
      },
    };

    dbService.setPool(mockPool);
    // Pre-initialize SQL module so require('mssql') IO is not counted in query execution time
    dbService.getSqlModule();

    const startTime = Date.now();
    const result = await dbService.getTerminalInfo('PC-TEST-001');
    const elapsed = Date.now() - startTime;

    expect(result).not.toBeNull();
    expect(result.pc).toBe('PC-TEST-001');
    expect(result.location).toBe('Sede Central');
    expect(result.costCenter).toBe('CC-100');
    expect(result.alerts).toHaveLength(1);
    expect(result.resetHistory).toHaveLength(1);
    expect(result.uptimeText).toBe('10 days');

    // All 4 secondary procedures should have been called
    expect(activeRequests).toContain('Cmda_Trae_Datos_De_Ubicacion_Y_cpa_centro_Costo_T');
    expect(activeRequests).toContain('cmda_Busca_SI_HAY_ALERTA_Activa_para_terminal_T');
    expect(activeRequests).toContain('CMDA_Trae_historial_De_REset_DE_UNA_PC_T');
    expect(activeRequests).toContain('Cmda_trae_historial_UptimeXterminal_T');

    // Peak concurrency for secondary SPs MUST be > 1 (parallel execution)
    const peakConcurrency = Math.max(...maxConcurrentSecondaryRequests);
    expect(peakConcurrency).toBeGreaterThan(1);
    expect(peakConcurrency).toBe(4);

    // If sequential: 4 * 30ms = 120ms. In parallel: ~30-50ms.
    expect(elapsed).toBeLessThan(100);
  });

  it('resiliently handles partial failures in secondary stored procedures without failing terminal lookup', async () => {
    const mockPool = {
      connected: true,
      request: () => ({
        input: () => {},
        execute: async (spName: string) => {
          if (spName === 'CMDA_Trae_Info_DE_PC_PARAmesa_T') {
            return {
              recordset: [{
                pc: 'PC-TEST-002',
                ip: '10.0.0.51',
              }],
            };
          }
          if (spName === 'Cmda_Trae_Datos_De_Ubicacion_Y_cpa_centro_Costo_T') {
            throw new Error('Timeout or SP failed');
          }
          if (spName === 'cmda_Busca_SI_HAY_ALERTA_Activa_para_terminal_T') {
            return { recordset: [] };
          }
          if (spName === 'CMDA_Trae_historial_De_REset_DE_UNA_PC_T') {
            throw new Error('Database locked');
          }
          if (spName === 'Cmda_trae_historial_UptimeXterminal_T') {
            return { recordset: [{ Uptime: '2 days' }] };
          }
          return { recordset: [] };
        },
      }),
    };

    dbService.setPool(mockPool);
    const result = await dbService.getTerminalInfo('PC-TEST-002');

    expect(result).not.toBeNull();
    expect(result.pc).toBe('PC-TEST-002');
    expect(result.location).toBe('');
    expect(result.alerts).toEqual([]);
    expect(result.resetHistory).toEqual([]);
    expect(result.uptimeText).toBe('2 days');
  });

  it('defers mssql loading (lazy require) so requiring dbService does not eagerly pull mssql until needed', () => {
    expect(typeof dbService.getTerminalInfo).toBe('function');
    expect(typeof dbService.isMssqlLoaded).toBe('function');
    // Initially before connecting or using mssql types, isMssqlLoaded should be false
    expect(dbService.isMssqlLoaded()).toBe(false);
  });
});
