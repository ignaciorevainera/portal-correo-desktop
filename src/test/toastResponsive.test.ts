import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const SRC = path.resolve(process.cwd(), "src");
const CSS = path.join(SRC, "index.css");
const SONNER = path.join(SRC, "components", "ui", "sonner.tsx");

// Quitamos comentarios y colapsamos espacios para poder afirmar reglas
// completas con un regex de una sola línea.
const css = fs
  .readFileSync(CSS, "utf-8")
  .replace(/\/\*[\s\S]*?\*\//g, " ")
  .replace(/\s+/g, " ");
const sonnerTsx = fs.readFileSync(SONNER, "utf-8");

/**
 * Sonner inyecta sus estilos en <head> después de index.css, por lo que
 * cualquier override necesita especificidad mayor que la de Sonner
 * ([data-sonner-toast][data-styled="true"] [data-content] = 0,3,0).
 * El prefijo [data-sonner-toaster] la sube a 0,4,0 y gana sin importar el
 * orden de carga; en el bloque mobile el prefijo `html` cumple ese rol.
 */
const TOAST = '[data-sonner-toaster] [data-sonner-toast][data-styled="true"]';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

describe("toasts responsivas (Sonner)", () => {
  it("acota el ancho del toast al viewport en cualquier ancho de ventana", () => {
    expect(sonnerTsx).toMatch(/max-w-\[calc\(100vw-1\.5rem\)\]/);
    expect(sonnerTsx).toMatch(/--width": "min\(340px, calc\(100vw - 1\.5rem\)\)"/);
  });

  it("permite que el CTA baje a su propia fila cuando el texto no entra", () => {
    expect(css).toContain(`${TOAST} { flex-wrap: wrap;`);
  });

  it("corta la fila en el ancho del texto (flex-basis auto, no 0%)", () => {
    expect(css).toContain(`${TOAST} [data-content] { flex: 1 1 auto;`);
  });

  it("reserva la columna del icono para que no quede solo en una fila", () => {
    expect(css).toContain(
      `${TOAST} [data-icon] + [data-content] { max-width: calc(100% - 1.5rem);`,
    );
  });

  it("los overrides usan especificidad mayor que la de Sonner", () => {
    const overrides =
      css.match(new RegExp(`${escapeRegExp(TOAST)}[^{]*\\{[^}]*\\}`, "g")) ?? [];
    expect(overrides.length).toBeGreaterThanOrEqual(3);
    for (const rule of overrides) {
      expect(rule.startsWith(TOAST)).toBe(true);
    }
  });

  it("conserva el anclaje nativo a la derecha por debajo de 600px", () => {
    // Sonner pasa a un layout mobile (16px por lado, ancho porcentual) que deja
    // el toast corrido a la izquierda con un hueco asimétrico a la derecha.
    expect(css).toContain("@media (max-width: 600px)");
    expect(css).toContain(
      'html [data-sonner-toaster][data-x-position="right"] { left: auto; right: var(--offset-right); width: var(--width);',
    );
    expect(css).toContain(
      'html [data-sonner-toaster][data-x-position="right"] [data-sonner-toast] { left: auto; right: 0; width: 100%;',
    );
    expect(css).toContain(
      'html [data-sonner-toaster][data-y-position="bottom"] { bottom: var(--offset-bottom);',
    );
  });

  it("no deja que el offset mobile de Sonner desplace el toast", () => {
    expect(css).not.toMatch(/--mobile-offset/);
  });
});
