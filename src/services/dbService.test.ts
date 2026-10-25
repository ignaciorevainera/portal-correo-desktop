import { describe, it, expect, vi, beforeEach } from 'vitest';
import configManager from '../../electron/configManager.cjs';
import dbService from '../../electron/dbService.cjs';

describe('dbService (Electron node SQL service - Zero-Secrets)', () => {
  beforeEach(() => {
    configManager.resetConfig();
    dbService.resetPool();
    vi.restoreAllMocks();
  });

  it('contains zero hardcoded credentials or server IPs when unconfigured', () => {
    const rawCfg = dbService.getSqlConfig({ ignoreEnv: true, skipLocalFiles: true });
    expect(rawCfg.server).toBe('');
    expect(rawCfg.database).toBe('');
    expect(rawCfg.user).toBe('');
    expect(rawCfg.password).toBe('');
  });

  it('uses runtime configuration provided by configManager', () => {
    configManager.setConfig({
      dbServer: '192.0.2.50',
      dbDatabase: 'SyntheticInventoryDB',
      dbUser: 'svc_test_user',
      dbPassword: 'svc_test_password',
      dbPort: 1433,
    });

    expect(dbService.config.server).toBe('192.0.2.50');
    expect(dbService.config.database).toBe('SyntheticInventoryDB');
    expect(dbService.config.user).toBe('svc_test_user');
    expect(dbService.config.password).toBe('svc_test_password');
  });

  it('reports offline status cleanly when connection fails', async () => {
    vi.spyOn(dbService, 'getPool').mockRejectedValue(new Error('ETIMEDOUT'));

    const status = await dbService.checkStatus();
    expect(status.connected).toBe(false);
    expect(status.mode).toBe('mock');
    expect(status.error).toContain('ETIMEDOUT');
  });

  it('executes parameterized query for terminal using synthetic test data', async () => {
    const mockExecute = vi.fn().mockResolvedValue({
      recordset: [
        {
          pc: 'PC-DEMO-001',
          ip: '192.0.2.101',
          Macadrress: '00:00:5E:00:53:01',
          Sist_operativo: 'W-10',
        },
      ],
    });

    const mockRequest = {
      input: vi.fn().mockReturnThis(),
      execute: mockExecute,
      query: vi.fn().mockResolvedValue({ recordset: [] }),
    };

    const mockPool = {
      connected: true,
      request: vi.fn().mockReturnValue(mockRequest),
    };

    vi.spyOn(dbService, 'getPool').mockResolvedValue(mockPool as any);

    const result = await dbService.getTerminalInfo('PC-DEMO-001');
    expect(result).not.toBeNull();
    expect(result.pc).toBe('PC-DEMO-001');
    expect(result.ip).toBe('192.0.2.101');
    expect(mockRequest.input).toHaveBeenCalledWith('pc', expect.anything(), 'PC-DEMO-001');
  });
});
