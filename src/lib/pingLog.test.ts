import { describe, expect, it } from 'vitest';
import { classifyPingLine, sanitizePingText } from './pingLog';

describe('pingLog', () => {
  it('sanitiza estadísticas con encoding roto', () => {
    expect(sanitizePingText('Estad�sticas de ping')).toBe(
      'Estadísticas de ping',
    );
  });

  it('clasifica timeouts, errores, encabezados y respuestas', () => {
    expect(
      classifyPingLine('Tiempo de espera agotado para esta solicitud.'),
    ).toBe('warning');
    expect(classifyPingLine('Host inaccesible.')).toBe('destructive');
    expect(
      classifyPingLine('Estadísticas de ping para 192.0.2.1:'),
    ).toBe('info');
    expect(classifyPingLine('Respuesta desde 192.0.2.1')).toBe('default');
  });
});
