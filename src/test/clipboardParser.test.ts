import { describe, it, expect } from 'vitest';
// @ts-expect-error - CJS module in electron
import { parseClipboardQuery } from '../../electron/clipboardParser.cjs';

describe('Clipboard Parser (Global Hotkey Autofill)', () => {
  it('should detect valid IPv4 addresses', () => {
    const res = parseClipboardQuery('192.0.2.15');
    expect(res).toEqual({
      isValid: true,
      query: '192.0.2.15',
      type: 'ip',
      autoSearch: true,
    });
  });

  it('should trim surrounding whitespace and newlines from IP', () => {
    const res = parseClipboardQuery('  \n 198.51.100.22 \t ');
    expect(res).toEqual({
      isValid: true,
      query: '198.51.100.22',
      type: 'ip',
      autoSearch: true,
    });
  });

  it('should detect standard corporate hostnames (PC-*, SRV-*, terminal IDs)', () => {
    const res = parseClipboardQuery('PC-CORREO-102');
    expect(res).toEqual({
      isValid: true,
      query: 'PC-CORREO-102',
      type: 'hostname',
      autoSearch: true,
    });
  });

  it('should detect short machine names like PC123 or DEMO-HOST', () => {
    const res = parseClipboardQuery('DEMO-HOST-01');
    expect(res.isValid).toBe(true);
    expect(res.type).toBe('hostname');
    expect(res.autoSearch).toBe(true);
  });

  it('should reject invalid or excessive texts (e.g. paragraphs, URLs, code snippets)', () => {
    expect(parseClipboardQuery('https://google.com')).toEqual({
      isValid: false,
      query: '',
      type: 'none',
      autoSearch: false,
    });

    expect(parseClipboardQuery('Este es un texto largo que el operador copio de un correo')).toEqual({
      isValid: false,
      query: '',
      type: 'none',
      autoSearch: false,
    });

    expect(parseClipboardQuery('SELECT * FROM users WHERE id = 1')).toEqual({
      isValid: false,
      query: '',
      type: 'none',
      autoSearch: false,
    });
  });

  it('should reject empty or whitespace-only input', () => {
    expect(parseClipboardQuery('')).toEqual({
      isValid: false,
      query: '',
      type: 'none',
      autoSearch: false,
    });
    expect(parseClipboardQuery('   \t\n  ')).toEqual({
      isValid: false,
      query: '',
      type: 'none',
      autoSearch: false,
    });
    expect(parseClipboardQuery(null)).toEqual({
      isValid: false,
      query: '',
      type: 'none',
      autoSearch: false,
    });
  });
});
