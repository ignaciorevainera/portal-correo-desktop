/**
 * Gestión de la clase `high-contrast` en el elemento raíz (`document.documentElement`).
 * Permite elevar el contraste visual en monitores de baja fidelidad o para
 * operadores que requieran bordes más nítidos y mayor diferenciación de texto.
 */

export function isHighContrastActive(): boolean {
  if (typeof document === 'undefined') return false;
  return document.documentElement.classList.contains('high-contrast');
}

export function applyHighContrastClass(enabled: boolean): void {
  if (typeof document === 'undefined') return;
  if (enabled) {
    document.documentElement.classList.add('high-contrast');
  } else {
    document.documentElement.classList.remove('high-contrast');
  }
}
