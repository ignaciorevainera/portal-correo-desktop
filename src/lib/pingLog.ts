export function sanitizePingText(text: string): string {
  if (!text) return '';
  return text
    .replace(/Estad[\ufffd\?s]?sticas/gi, 'Estadísticas')
    .replace(/M[\ufffd\?a]?ximo/gi, 'Máximo')
    .replace(/M[\ufffd\?i]?nimo/gi, 'Mínimo')
    .replace(/milise[\ufffd\?]?gundos/gi, 'milisegundos')
    .replace(/perdid[\ufffd\?]?s/gi, 'perdidos')
    .replace(/recibid[\ufffd\?]?s/gi, 'recibidos')
    .replace(/enviad[\ufffd\?]?s/gi, 'enviados')
    .replace(/aproximad[\ufffd\?]?s/gi, 'aproximados');
}

export type PingLineTone = 'default' | 'info' | 'warning' | 'destructive';

export function classifyPingLine(line: string): PingLineTone {
  if (!line) return 'default';
  if (/100% perdidos|inaccesible|error/i.test(line)) return 'destructive';
  if (/tiempo de espera agotado|request timed out|agotado/i.test(line)) {
    return 'warning';
  }
  if (/estad[ií]sticas|m[ií]nimo|m[aá]ximo|media|ping -t/i.test(line)) {
    return 'info';
  }
  return 'default';
}
