import { describe, expect, it } from 'vitest';
import { classifyPingLine, sanitizePingText } from './pingLog';

describe('pingLog', () => {
  it.each([
    ['Estad\uFFFDsticas de ping', 'Estadísticas de ping'],
    ['M\uFFFDximo', 'Máximo'],
    ['M\uFFFDnimo', 'Mínimo'],
    ['milisegundos', 'milisegundos'],
    ['perdids', 'perdidos'],
    ['recibids', 'recibidos'],
    ['enviads', 'enviados'],
    ['aproximads', 'aproximados'],
  ])('sanitiza %s', (input, expected) => {
    expect(sanitizePingText(input)).toBe(expected);
    expect(sanitizePingText(expected)).toBe(expected);
  });

  it.each([
    ['Tiempo de espera agotado para esta solicitud.', 'warning'],
    ['Request timed out.', 'warning'],
    ['Se agotó el tiempo de espera.', 'warning'],
    ['Host inaccesible.', 'destructive'],
    ['Destination host unreachable.', 'destructive'],
    ['Error: fallo de red.', 'destructive'],
    ['100% perdidos', 'destructive'],
    ['0 errores', 'default'],
    ['inmediatamente', 'default'],
    ['Estadísticas de ping para 192.0.2.1:', 'info'],
    ['Mínimo = 12ms', 'info'],
    ['Media = 16ms', 'info'],
    ['Respuesta desde 192.0.2.1', 'default'],
  ])('clasifica %s como %s', (line, tone) => {
    expect(classifyPingLine(line)).toBe(tone);
  });
});
