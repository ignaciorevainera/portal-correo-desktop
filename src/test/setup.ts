import '@testing-library/jest-dom';

// jsdom no implementa ResizeObserver y el posicionamiento de Radix (popovers,
// menús) lo requiere apenas se monta un contenido abierto.
if (!('ResizeObserver' in globalThis)) {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Object.defineProperty(globalThis, 'ResizeObserver', {
    writable: true,
    configurable: true,
    value: ResizeObserverStub,
  });
}

// jsdom tampoco implementa scrollIntoView; cmdk lo llama al montar una lista
// que ya tiene una opción activa (por ejemplo al reabrir con una flecha).
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
