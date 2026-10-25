import { describe, it, expect, vi } from 'vitest';
import {
  isValidMacAddress,
  formatMacForWol,
  buildWolCommand,
  buildRunkbotCommand,
  executeWakeOnLan,
  executeRunkbotAction,
} from '../../electron/kaceBridge.cjs';

type KaceActionType = 'inventory' | 'cache' | 'config' | 'patch';

describe('KACE & Wake-on-LAN Bridge Service (PoC)', () => {
  describe('isValidMacAddress', () => {
    it('accepts valid colon-delimited and hyphen-delimited MAC addresses', () => {
      expect(isValidMacAddress('00:1A:2B:3C:4D:5E')).toBe(true);
      expect(isValidMacAddress('00-1a-2b-3c-4d-5e')).toBe(true);
      expect(isValidMacAddress('a1:b2:c3:d4:e5:f6')).toBe(true);
    });

    it('rejects invalid MAC addresses and command injection payloads', () => {
      expect(isValidMacAddress('invalid-mac')).toBe(false);
      expect(isValidMacAddress('00:11:22:33:44')).toBe(false);
      expect(isValidMacAddress('00:11:22:33:44:55:66')).toBe(false);
      expect(isValidMacAddress('00:11:22:33:44:55 & calc.exe')).toBe(false);
      expect(isValidMacAddress('00:11:22:33:44:55; whoami')).toBe(false);
    });
  });

  describe('formatMacForWol', () => {
    it('normalizes MAC address with hyphens and uppercase', () => {
      expect(formatMacForWol('00:1a:2b:3c:4d:5e')).toBe('00-1A-2B-3C-4D-5E');
      expect(formatMacForWol('00-1A-2B-3C-4D-5E')).toBe('00-1A-2B-3C-4D-5E');
    });

    it('throws error for invalid MAC address', () => {
      expect(() => formatMacForWol('bad-mac')).toThrow('Dirección MAC inválida');
    });
  });

  describe('buildWolCommand', () => {
    it('generates sanitized arguments for kwol.exe', () => {
      const cmd = buildWolCommand('00:1A:2B:3C:4D:5E', 'C:\\MDA\\KACE');
      expect(cmd.executable).toBe('C:\\MDA\\KACE\\kwol.exe');
      expect(cmd.args).toEqual(['00-1A-2B-3C-4D-5E']);
    });
  });

  describe('buildRunkbotCommand', () => {
    it('maps known KACE actions to their correct kbotid and version', () => {
      const inv = buildRunkbotCommand('inventory', 'C:\\MDA\\KACE');
      expect(inv.executable).toBe('C:\\MDA\\KACE\\runkbot.exe');
      expect(inv.args).toEqual(['4', '0']);

      const cache = buildRunkbotCommand('cache', 'C:\\MDA\\KACE');
      expect(cache.args).toEqual(['3', '0']);

      const config = buildRunkbotCommand('config', 'C:\\MDA\\KACE');
      expect(config.args).toEqual(['1', '0']);

      const patch = buildRunkbotCommand('patch', 'C:\\MDA\\KACE');
      expect(patch.args).toEqual(['6', '0']);
    });

    it('throws error for unknown KACE action', () => {
      expect(() => buildRunkbotCommand('unknown' as KaceActionType, 'C:\\MDA\\KACE')).toThrow('Acción KACE desconocida');
    });
  });

  describe('executeWakeOnLan', () => {
    it('returns error when MAC address is malformed', async () => {
      const result = await executeWakeOnLan('bad-mac', 'C:\\MDA\\KACE');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Dirección MAC inválida');
    });

    it('executes kwol.exe successfully when mock runner returns 0', async () => {
      const mockRunner = vi.fn().mockResolvedValue({ code: 0, stdout: 'Packet sent', stderr: '' });
      const result = await executeWakeOnLan('00:1A:2B:3C:4D:5E', 'C:\\MDA\\KACE', mockRunner);

      expect(mockRunner).toHaveBeenCalledWith('C:\\MDA\\KACE\\kwol.exe', ['00-1A-2B-3C-4D-5E']);
      expect(result.success).toBe(true);
      expect(result.targetMac).toBe('00-1A-2B-3C-4D-5E');
    });
  });

  describe('executeRunkbotAction', () => {
    it('executes runkbot.exe successfully for inventory sync', async () => {
      const mockRunner = vi.fn().mockResolvedValue({ code: 0, stdout: 'Inventory updated', stderr: '' });
      const result = await executeRunkbotAction('inventory', 'C:\\MDA\\KACE', mockRunner);

      expect(mockRunner).toHaveBeenCalledWith('C:\\MDA\\KACE\\runkbot.exe', ['4', '0']);
      expect(result.success).toBe(true);
      expect(result.action).toBe('inventory');
    });
  });
});
