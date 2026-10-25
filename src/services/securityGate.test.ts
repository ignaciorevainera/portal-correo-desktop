import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import configManager from '../../electron/configManager.cjs';
import securityGate from '../../electron/securityGate.cjs';

describe('securityGate (Candado Dual Adaptativo de Dominio AD y Red/VPN)', () => {
  const tempDir = path.join(os.tmpdir(), `cmda_gate_test_${Date.now()}`);

  beforeEach(() => {
    configManager.resetConfig();
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  });

  it('blocks access when application has no configuration loaded (Zero-Secrets default)', async () => {
    const status = await securityGate.evaluateSecurityGate({
      ignoreEnv: true,
      env: { USERDNSDOMAIN: '', USERDOMAIN: 'WORKGROUP' },
      probeFn: async () => ({ open: false }),
    });

    expect(status.authorized).toBe(false);
    expect(status.configured).toBe(false);
    expect(status.reason).toBe('UNCONFIGURED');
  });

  it('authorizes access when configured and workstation belongs to corporate AD domain', async () => {
    configManager.setConfig({
      dbServer: '192.0.2.50',
      dbDatabase: 'InventoryDB',
      dbUser: 'svc_user',
      dbPassword: 'svc_password',
      corporateDomain: 'corp.example.local',
    });

    const status = await securityGate.evaluateSecurityGate({
      env: { USERDNSDOMAIN: 'CORP.EXAMPLE.LOCAL', USERDOMAIN: 'CORP' },
      probeFn: async () => ({ open: false }),
    });

    expect(status.authorized).toBe(true);
    expect(status.configured).toBe(true);
    expect(status.domainMatched).toBe(true);
    expect(status.reason).toBe('AUTHORIZED');
  });

  it('authorizes access when outside AD domain if VPN/Corporate network server is reachable', async () => {
    configManager.setConfig({
      dbServer: '192.0.2.50',
      dbDatabase: 'InventoryDB',
      dbUser: 'svc_user',
      dbPassword: 'svc_password',
      corporateDomain: 'corp.example.local',
    });

    const status = await securityGate.evaluateSecurityGate({
      env: { USERDNSDOMAIN: '', USERDOMAIN: 'HOME-PC' },
      probeFn: async (host: string, port: number) => ({
        open: host === '192.0.2.50' && port === 1433,
      }),
    });

    expect(status.authorized).toBe(true);
    expect(status.domainMatched).toBe(false);
    expect(status.networkReachable).toBe(true);
    expect(status.reason).toBe('AUTHORIZED');
  });

  it('strictly blocks access when outside AD domain AND without VPN/Corporate network reachability', async () => {
    configManager.setConfig({
      dbServer: '192.0.2.50',
      dbDatabase: 'InventoryDB',
      dbUser: 'svc_user',
      dbPassword: 'svc_password',
      corporateDomain: 'corp.example.local',
    });

    const status = await securityGate.evaluateSecurityGate({
      env: { USERDNSDOMAIN: '', USERDOMAIN: 'EXTERNAL-PC' },
      probeFn: async () => ({ open: false }),
    });

    expect(status.authorized).toBe(false);
    expect(status.configured).toBe(true);
    expect(status.domainMatched).toBe(false);
    expect(status.networkReachable).toBe(false);
    expect(status.reason).toBe('OUTSIDE_CORPORATE_NETWORK');
  });

  it('unlocks application from encrypted config file and verifies corporate environment', async () => {
    const cfgPath = path.join(tempDir, 'cmda.config.json');
    configManager.saveEncryptedLocalConfig(
      cfgPath,
      {
        dbServer: '192.0.2.88',
        dbDatabase: 'CorpDB',
        dbUser: 'corp_user',
        dbPassword: 'corp_password',
        corporateDomain: 'intranet.example.local',
      },
      'SecretKey123'
    );

    const badUnlock = await securityGate.unlockApplication(cfgPath, 'WrongKey', {
      env: { USERDNSDOMAIN: 'intranet.example.local' },
      probeFn: async () => ({ open: true }),
    });
    expect(badUnlock.authorized).toBe(false);
    expect(badUnlock.reason).toBe('UNLOCK_ERROR');

    const goodUnlock = await securityGate.unlockApplication(cfgPath, 'SecretKey123', {
      env: { USERDNSDOMAIN: 'intranet.example.local' },
      probeFn: async () => ({ open: true }),
    });
    expect(goodUnlock.authorized).toBe(true);
    expect(goodUnlock.reason).toBe('AUTHORIZED');
  });
});
