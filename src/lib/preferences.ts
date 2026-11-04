/**
 * Preferencias del operador persistidas en `localStorage`.
 *
 * El modo de ping predeterminado se lee en cada carga de terminal, así que un
 * cambio en Ajustes aplica en la búsqueda siguiente sin recargar la ventana.
 */

export type PingMode = "standard" | "infinite";

export const PING_MODE_KEY = "pcd_pref_ping_mode";

export const DEFAULT_PING_MODE: PingMode = "standard";

function isPingMode(value: unknown): value is PingMode {
  return value === "standard" || value === "infinite";
}

export function loadDefaultPingMode(): PingMode {
  try {
    const stored = localStorage.getItem(PING_MODE_KEY);
    return isPingMode(stored) ? stored : DEFAULT_PING_MODE;
  } catch {
    return DEFAULT_PING_MODE;
  }
}

export function saveDefaultPingMode(mode: PingMode): void {
  try {
    localStorage.setItem(PING_MODE_KEY, mode);
  } catch {
    // Sin almacenamiento la preferencia no persiste, pero no rompe la sesión.
  }
}
