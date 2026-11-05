import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const MAIN = path.resolve(process.cwd(), 'electron/main.cjs');
const source = fs.readFileSync(MAIN, 'utf-8');

describe('tamaño de ventana', () => {
  it('permite el ancho compacto de 425 px', () => {
    expect(source).toMatch(/minWidth:\s*420/);
  });

  it('mantiene el alto y el ancho máximo actuales', () => {
    expect(source).toMatch(/minHeight:\s*600/);
    expect(source).toMatch(/maxHeight:\s*800/);
    expect(source).toMatch(/maxWidth:\s*1200/);
  });

  it('sigue siendo redimensionable', () => {
    expect(source).toMatch(/resizable:\s*true/);
  });
});
