const REPLY_RE =
  /(?:Respuesta desde|Reply from).*?(?:tiempo|time)\s*([=<])\s*(\d+(?:[.,]\d+)?)\s*ms/i;
const UNREACHABLE_RE =
  /Tiempo de espera agotado|Request timed out|Host de destino inaccesible|Red de destino inaccesible|Destination (?:host|net) unreachable/i;

/** Líneas del ping continuo actual: desde la última cabecera `ping -t`. */
export function currentPingLines(lines: string[]): string[] {
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = lines[index];
    if (line.startsWith("[") && /\bping\s+-t\b/.test(line)) {
      return lines.slice(index + 1);
    }
  }
  return lines;
}

/** Resumen sintético estilo Windows para un ping continuo detenido. */
export function summarizePingLogs(lines: string[], target: string): string | null {
  const times: number[] = [];
  let sent = 0;

  for (const line of lines) {
    if (UNREACHABLE_RE.test(line)) {
      sent += 1;
      continue;
    }

    const match = line.match(REPLY_RE);
    if (match) {
      sent += 1;
      const value =
        match[1] === "<" ? 0 : Number(match[2].replace(",", "."));
      times.push(Number.isFinite(value) ? value : 0);
    }
  }

  if (sent === 0) return null;

  const received = times.length;
  const lost = sent - received;
  const percentLost = Math.round((lost / sent) * 100);
  const min = received > 0 ? Math.min(...times) : 0;
  const max = received > 0 ? Math.max(...times) : 0;
  const avg =
    received > 0
      ? Math.round(times.reduce((total, value) => total + value, 0) / received)
      : 0;

  return [
    "",
    `Estadísticas de ping para ${target}:`,
    `    Paquetes: enviados = ${sent}, recibidos = ${received}, perdidos = ${lost}`,
    `    (${percentLost}% perdidos),`,
    "Tiempos aproximados de ida y vuelta en milisegundos:",
    `    Mínimo = ${min}ms, Máximo = ${max}ms, Media = ${avg}ms`,
  ].join("\n");
}
