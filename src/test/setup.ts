import '@testing-library/jest-dom';

// jsdom no implementa ResizeObserver y el posicionamiento de Radix (tooltips,
// popovers) lo requiere apenas se monta un contenido abierto.
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
