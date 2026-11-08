import { describe, expect, it } from 'vitest';
import {
  TEXT_SCALE_LEVELS,
  getNextTextScale,
  getPrevTextScale,
  scaleToZoomFactor,
  zoomFactorToScale,
} from '@/lib/textScale';

describe('utilidad de escala de texto y atajos', () => {
  it('contiene los 4 niveles discretos de escala', () => {
    expect(TEXT_SCALE_LEVELS).toEqual(['100', '110', '120', '130']);
  });

  it('calcula el zoom factor correcto para cada nivel', () => {
    expect(scaleToZoomFactor('100')).toBe(1.0);
    expect(scaleToZoomFactor('110')).toBe(1.1);
    expect(scaleToZoomFactor('120')).toBe(1.2);
    expect(scaleToZoomFactor('130')).toBe(1.3);
  });

  it('obtiene el siguiente nivel de escala hasta el tope (130)', () => {
    expect(getNextTextScale('100')).toBe('110');
    expect(getNextTextScale('110')).toBe('120');
    expect(getNextTextScale('120')).toBe('130');
    expect(getNextTextScale('130')).toBe('130');
  });

  it('obtiene el nivel anterior de escala hasta el piso (100)', () => {
    expect(getPrevTextScale('130')).toBe('120');
    expect(getPrevTextScale('120')).toBe('110');
    expect(getPrevTextScale('110')).toBe('100');
    expect(getPrevTextScale('100')).toBe('100');
  });

  it('mapea zoom factor aproximado a la escala más cercana', () => {
    expect(zoomFactorToScale(1.0)).toBe('100');
    expect(zoomFactorToScale(1.09)).toBe('110');
    expect(zoomFactorToScale(1.21)).toBe('120');
    expect(zoomFactorToScale(1.3)).toBe('130');
  });
});
