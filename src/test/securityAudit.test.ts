import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

describe('Repository Zero-Secrets Security Audit', () => {
  const repoRoot = path.resolve(__dirname, '../..');
  const trackedFiles = execSync('git ls-files', { cwd: repoRoot, encoding: 'utf-8' })
    .split(/\r?\n/)
    .map((f) => f.trim())
    .filter(Boolean);

  it('does not track any .vnc, real .env, or local config files in Git', () => {
    const forbiddenFiles = trackedFiles.filter((file) => {
      const lower = file.toLowerCase();
      if (lower.endsWith('.vnc')) return true;
      if (lower.endsWith('.secure.dat')) return true;
      if (lower === '.env' || (lower.startsWith('.env.') && lower !== '.env.example')) return true;
      if (lower === 'cmda.config.json' || lower === 'cmda.config.local.json') return true;
      return false;
    });

    expect(forbiddenFiles).toEqual([]);
  });

  it('contains zero private 10.x.x.x corporate IPv4 addresses or legacy secrets in tracked text files', () => {
    const violations: string[] = [];
    const privateTenIpRegex = /\b10\.(?:254|220|210)\.[0-9]{1,3}\.[0-9]{1,3}\b/;
    const legacyVncHashRegex = new RegExp('0c3be231' + 'e53046e6', 'i');
    const legacySqlUserRegex = new RegExp('User_' + 'CMDA', 'i');
    const legacyDomainRegex = new RegExp('correo\\.' + 'local', 'i');
    const legacyHostRegex = new RegExp('B1842ZAC' + 'W1718|x0000' + 'w101|X5000ZAA' + 'W0254', 'i');

    for (const relPath of trackedFiles) {
      if (relPath.endsWith('.exe') || relPath.endsWith('.png') || relPath.endsWith('.ico')) {
        continue;
      }
      const fullPath = path.join(repoRoot, relPath);
      if (!fs.existsSync(fullPath)) continue;

      const content = fs.readFileSync(fullPath, 'utf-8');
      if (privateTenIpRegex.test(content)) {
        violations.push(`${relPath}: contains forbidden 10.x corporate IP`);
      }
      if (legacyVncHashRegex.test(content)) {
        violations.push(`${relPath}: contains forbidden VNC credential hash`);
      }
      if (legacySqlUserRegex.test(content)) {
        violations.push(`${relPath}: contains forbidden SQL username`);
      }
      if (legacyDomainRegex.test(content)) {
        violations.push(`${relPath}: contains forbidden internal AD domain`);
      }
      if (legacyHostRegex.test(content)) {
        violations.push(`${relPath}: contains forbidden real workstation hostname`);
      }
    }

    expect(violations).toEqual([]);
  });

  it('verifies that the entire Git branch commit history (HEAD) is purged of legacy secrets and IPs', () => {
    const historyLog = execSync('git log -p HEAD', {
      cwd: repoRoot,
      encoding: 'utf-8',
      maxBuffer: 50 * 1024 * 1024,
    });

    const privateTenIpRegex = /\b10\.(?:254|220|210)\.[0-9]{1,3}\.[0-9]{1,3}\b/;
    const legacyVncHashRegex = new RegExp('0c3be231' + 'e53046e6', 'i');
    const legacySqlUserRegex = new RegExp('User_' + 'CMDA', 'i');
    const legacyDomainRegex = new RegExp('correo\\.' + 'local', 'i');

    expect(privateTenIpRegex.test(historyLog)).toBe(false);
    expect(legacyVncHashRegex.test(historyLog)).toBe(false);
    expect(legacySqlUserRegex.test(historyLog)).toBe(false);
    expect(legacyDomainRegex.test(historyLog)).toBe(false);
  });
});
