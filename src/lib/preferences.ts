/**
 * Preferencias del operador persistidas en `localStorage`.
 *
 * El modo de ping predeterminado se lee en cada carga de terminal, así que un
 * cambio en Ajustes aplica en la búsqueda siguiente sin recargar la ventana.
 *
 * La escala de texto, el modo de alto contraste y el wrap de consola se respaldan aquí para respuesta
 * inmediata y se sincronizan con `uiPreferences` de Electron para persistencia global.
 */

export type PingMode = "standard" | "infinite";
export type TextScale = "100" | "110" | "120" | "130";

export const PING_MODE_KEY = "pcd_pref_ping_mode";
export const TEXT_SCALE_KEY = "pcd_pref_text_scale";
export const HIGH_CONTRAST_KEY = "pcd_pref_high_contrast";
export const CONSOLE_WRAP_KEY = "pcd_pref_console_wrap";

export const DEFAULT_PING_MODE: PingMode = "standard";
export const DEFAULT_TEXT_SCALE: TextScale = "100";
export const DEFAULT_HIGH_CONTRAST: boolean = false;
export const DEFAULT_CONSOLE_WRAP: boolean = false;

export const CONSOLE_WRAP_EVENT = "pcd:console-wrap-changed";

function isPingMode(value: unknown): value is PingMode {
  return value === "standard" || value === "infinite";
}

function isTextScale(value: unknown): value is TextScale {
  return value === "100" || value === "110" || value === "120" || value === "130";
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

export function loadDefaultTextScale(): TextScale {
  try {
    const stored = localStorage.getItem(TEXT_SCALE_KEY);
    return isTextScale(stored) ? stored : DEFAULT_TEXT_SCALE;
  } catch {
    return DEFAULT_TEXT_SCALE;
  }
}

export function saveDefaultTextScale(scale: TextScale): void {
  try {
    localStorage.setItem(TEXT_SCALE_KEY, scale);
  } catch {
    // Sin almacenamiento la preferencia no persiste, pero no rompe la sesión.
  }
}

export function loadDefaultHighContrast(): boolean {
  try {
    const stored = localStorage.getItem(HIGH_CONTRAST_KEY);
    if (stored !== null) return stored === "true";
    return DEFAULT_HIGH_CONTRAST;
  } catch {
    return DEFAULT_HIGH_CONTRAST;
  }
}

export function saveDefaultHighContrast(enabled: boolean): void {
  try {
    localStorage.setItem(HIGH_CONTRAST_KEY, String(enabled));
  } catch {
    // Sin almacenamiento la preferencia no persiste, pero no rompe la sesión.
  }
}

export function loadDefaultConsoleWrap(): boolean {
  try {
    const stored = localStorage.getItem(CONSOLE_WRAP_KEY);
    if (stored !== null) return stored === "true";
    return DEFAULT_CONSOLE_WRAP;
  } catch {
    return DEFAULT_CONSOLE_WRAP;
  }
}

export function saveDefaultConsoleWrap(enabled: boolean): void {
  try {
    localStorage.setItem(CONSOLE_WRAP_KEY, String(enabled));
  } catch {
    // Sin almacenamiento la preferencia no persiste, pero no rompe la sesión.
  }

  if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
    try {
      window.dispatchEvent(
        new CustomEvent(CONSOLE_WRAP_EVENT, {
          detail: { consoleWrap: enabled },
        })
      );
    } catch {
      // Entornos de prueba o ventanas sin soporte de CustomEvent
    }
  }
}
