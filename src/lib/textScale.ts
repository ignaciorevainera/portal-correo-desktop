import { TextScale } from "./preferences";

export const TEXT_SCALE_LEVELS: TextScale[] = ["100", "110", "120", "130"];

export function scaleToZoomFactor(scale: TextScale): number {
  switch (scale) {
    case "110":
      return 1.1;
    case "120":
      return 1.2;
    case "130":
      return 1.3;
    case "100":
    default:
      return 1.0;
  }
}

export function zoomFactorToScale(factor: number): TextScale {
  if (factor >= 1.25) return "130";
  if (factor >= 1.15) return "120";
  if (factor >= 1.05) return "110";
  return "100";
}

export function getNextTextScale(current: TextScale): TextScale {
  const index = TEXT_SCALE_LEVELS.indexOf(current);
  if (index === -1) return "100";
  const nextIndex = Math.min(index + 1, TEXT_SCALE_LEVELS.length - 1);
  return TEXT_SCALE_LEVELS[nextIndex];
}

export function getPrevTextScale(current: TextScale): TextScale {
  const index = TEXT_SCALE_LEVELS.indexOf(current);
  if (index === -1) return "100";
  const prevIndex = Math.max(index - 1, 0);
  return TEXT_SCALE_LEVELS[prevIndex];
}

/**
 * Aplica el zoom factor en Electron si webFrame está disponible,
 * o aplica zoom CSS en document.documentElement como fallback.
 */
export function applyTextScale(scale: TextScale): void {
  const factor = scaleToZoomFactor(scale);
  if (typeof window !== "undefined") {
    const api = (window as any).electronAPI;
    if (api && typeof api.setZoomFactor === "function") {
      api.setZoomFactor(factor);
    } else if (document && document.documentElement) {
      (document.documentElement.style as any).zoom = String(factor);
    }
  }
}
