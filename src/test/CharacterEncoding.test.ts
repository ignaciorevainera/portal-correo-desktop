import { describe, it, expect } from 'vitest';
// @ts-expect-error - CJS module in electron dir
import systemTools from '../../electron/systemTools.cjs';

describe('Character Encoding & Subprocess Output Sanitization', () => {
  it('correctly decodes CP850 bytes from Windows command prompt (Estadísticas, Mínimo, Máximo)', () => {
    // CP850 bytes:
    // "Estadísticas": 0x45, 0x73, 0x74, 0x61, 0x64, 0xa1, 0x73, 0x74, 0x69, 0x63, 0x61, 0x73
    // "Mínimo": 0x4d, 0xa1, 0x6e, 0x69, 0x6d, 0x6f
    // "Máximo": 0x4d, 0xa0, 0x78, 0x69, 0x6d, 0x6f
    const cp850Buffer = Buffer.from([
      0x45, 0x73, 0x74, 0x61, 0x64, 0xa1, 0x73, 0x74, 0x69, 0x63, 0x61, 0x73, // Estadísticas
      0x20, // space
      0x4d, 0xa1, 0x6e, 0x69, 0x6d, 0x6f, // Mínimo
      0x20,
      0x4d, 0xa0, 0x78, 0x69, 0x6d, 0x6f, // Máximo
    ]);

    const decoded = systemTools.decodeSubprocessOutput(cp850Buffer);
    expect(decoded).toContain('Estadísticas');
    expect(decoded).toContain('Mínimo');
    expect(decoded).toContain('Máximo');
    expect(decoded).not.toContain('\ufffd');
  });

  it('handles strings with replacement characters from broken decodes', () => {
    const corruptText = 'Estad\ufffdsticas de ping para 192.0.2.101:\n    M\ufffdnimo = 14ms, M\ufffdximo = 14ms';
    const cleaned = systemTools.sanitizePingOutput(corruptText);
    expect(cleaned).toContain('Estadísticas');
    expect(cleaned).toContain('Mínimo');
    expect(cleaned).toContain('Máximo');
  });
});
