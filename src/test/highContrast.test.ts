import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  applyHighContrastClass,
  isHighContrastActive,
} from '@/lib/highContrast';

describe('soporte de clase y estilos de Alto Contraste', () => {
  beforeEach(() => {
    document.documentElement.classList.remove('high-contrast');
  });

  afterEach(() => {
    document.documentElement.classList.remove('high-contrast');
  });

  it('detecta si la clase high-contrast está activa en documentElement', () => {
    expect(isHighContrastActive()).toBe(false);

    document.documentElement.classList.add('high-contrast');
    expect(isHighContrastActive()).toBe(true);
  });

  it('agrega o remueve la clase high-contrast según el parámetro booleano', () => {
    applyHighContrastClass(true);
    expect(document.documentElement.classList.contains('high-contrast')).toBe(true);
    expect(isHighContrastActive()).toBe(true);

    applyHighContrastClass(false);
    expect(document.documentElement.classList.contains('high-contrast')).toBe(false);
    expect(isHighContrastActive()).toBe(false);
  });
});
