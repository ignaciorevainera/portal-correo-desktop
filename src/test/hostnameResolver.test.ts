import { describe, it, expect, vi } from 'vitest';
import {
  normalizeHostname,
  parseNbtstatOutput,
  parsePingAResponse,
  resolveViaNetbios,
  resolveViaPingA,
  resolveHostname,
} from '../../electron/hostnameResolver.cjs';

const NBTSTAT_OUTPUT = `
NetBIOS remote machine name table

   Name               Type         Status
---------------------------------------------
PC-SUCURSAL-05  <00>  UNIQUE      Registered
PC-SUCURSAL-05  <20>  UNIQUE      Registered
WORKGROUP       <00>  GROUP       Registered
PC-SUCURSAL-05  <03>  UNIQUE      Registered
`;

describe('Hostname resolver chain', () => {
  it('normalizes names and rejects empty or IP values', () => {
    expect(normalizeHostname('  PC-TEST-01.dominio.ejemplo.local ')).toBe('PC-TEST-01');
    expect(normalizeHostname('192.0.2.10')).toBeNull();
    expect(normalizeHostname('')).toBeNull();
    expect(normalizeHostname(null)).toBeNull();
  });

  it('parses the unique workstation entry from nbtstat -A output', () => {
    expect(parseNbtstatOutput(NBTSTAT_OUTPUT)).toBe('PC-SUCURSAL-05');
    expect(parseNbtstatOutput('')).toBeNull();
    expect(parseNbtstatOutput('WORKGROUP <00> GROUP Registered')).toBeNull();
  });

  it('parses ping -a output in Spanish and English', () => {
    expect(parsePingAResponse('Haciendo ping a PC-TEST-01 [192.0.2.10] con 32 bytes:', '192.0.2.10')).toBe('PC-TEST-01');
    expect(parsePingAResponse('Pinging PC-TEST-01 [192.0.2.10] with 32 bytes of data:', '192.0.2.10')).toBe('PC-TEST-01');
    expect(parsePingAResponse('Haciendo ping a 192.0.2.11 [192.0.2.11] con 32 bytes:', '192.0.2.11')).toBeNull();
    expect(parsePingAResponse('Request timed out.', '192.0.2.10')).toBeNull();
  });

  it('runs resolvers in order and returns first real name', async () => {
    const db = vi.fn().mockResolvedValue(null);
    const dns = vi.fn().mockResolvedValue('192.0.2.10');
    const netbios = vi.fn().mockResolvedValue('PC-NETBIOS');

    const name = await resolveHostname('192.0.2.10', [db, dns, netbios]);

    expect(name).toBe('PC-NETBIOS');
    expect(db).toHaveBeenCalledWith('192.0.2.10');
    expect(dns).toHaveBeenCalledWith('192.0.2.10');
    expect(netbios).toHaveBeenCalledWith('192.0.2.10');
  });

  it('returns null when no resolver yields a name', async () => {
    const failing = vi.fn().mockRejectedValue(new Error('boom'));
    const selfIp = vi.fn().mockResolvedValue('192.0.2.10');

    await expect(resolveHostname('192.0.2.10', [failing, selfIp])).resolves.toBeNull();
    await expect(resolveHostname('192.0.2.10', [])).resolves.toBeNull();
  });

  it('skips command execution for invalid IPs', async () => {
    const execFileImpl = vi.fn();

    await expect(resolveViaNetbios('not-an-ip', { execFileImpl })).resolves.toBeNull();
    await expect(resolveViaPingA('not-an-ip', { execFileImpl })).resolves.toBeNull();
    expect(execFileImpl).not.toHaveBeenCalled();
  });
});
