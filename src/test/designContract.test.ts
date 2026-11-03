import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const SRC = path.resolve(process.cwd(), "src");
const UI = path.join(SRC, "components", "ui");
const CSS = path.join(SRC, "index.css");

function readAll(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) readAll(full, out);
    else if (/\.tsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

const appFiles = readAll(path.join(SRC, "components"))
  .concat(readAll(path.join(SRC, "context")), readAll(path.join(SRC, "hooks")))
  .filter((file) => !file.startsWith(UI) && !/\.test\./.test(file))
  .concat([path.join(SRC, "App.tsx")]);

function count(pattern: RegExp): number {
  return appFiles.reduce((total, file) => {
    const matches = fs.readFileSync(file, "utf-8").match(pattern);
    return total + (matches ? matches.length : 0);
  }, 0);
}

// Ratchet: solo puede bajar. Fase 2 completa el mapeo: paleta, elevación y radios en 0.
const BASELINE = {
  palette: 0,
  shadow: 0,
  rounded: 0,
  zIndex: 4,
};

describe("contrato de diseno", () => {
  it("no crece la paleta fija fuera de tokens", () => {
    expect(
      count(
        /\b(?:text|bg|border|ring)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/g,
      ),
    ).toBeLessThanOrEqual(BASELINE.palette);
  });

  it("no crece la elevacion propia", () => {
    expect(
      count(/\bshadow-(?:2xs|xs|sm|md|lg|xl|2xl)\b/g),
    ).toBeLessThanOrEqual(BASELINE.shadow);
  });

  it("no crece el uso de radios arbitrarios", () => {
    expect(
      count(/\brounded-\[|\brounded\b(?!-)/g),
    ).toBeLessThanOrEqual(BASELINE.rounded);
  });

  it("no hay degradados ni Base UI", () => {
    expect(count(/\bbg-gradient-|\b@base-ui\b/g)).toBe(0);
  });

  it("no crece el z-index manual", () => {
    expect(count(/\bz-50\b/g)).toBeLessThanOrEqual(BASELINE.zIndex);
  });

  it("la consola es invariante al tema (sin tokens --console- en .dark)", () => {
    const css = fs.readFileSync(CSS, "utf-8");
    const start = css.indexOf(".dark {");
    expect(start).toBeGreaterThanOrEqual(0);
    const end = css.indexOf("}", start);
    expect(end).toBeGreaterThan(start);
    expect(css.slice(start, end)).not.toMatch(/--console-[\w-]+\s*:/);
  });
});
