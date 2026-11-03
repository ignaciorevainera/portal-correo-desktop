import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const readJson = (file: string) =>
  JSON.parse(fs.readFileSync(path.resolve(root, file), "utf-8"));

function allDeps(): Record<string, string> {
  const pkg = readJson("package.json");
  return { ...pkg.dependencies, ...pkg.devDependencies };
}

describe("Configuración shadcn: base Radix declarada", () => {
  it("components.json declara un style con prefijo radix-", () => {
    const config = readJson("components.json");
    expect(config.style).toMatch(/^radix-/);
  });

  it("no hay dependencias de Base UI", () => {
    const offending = Object.keys(allDeps()).filter((dep) => dep.includes("base-ui"));
    expect(offending).toEqual([]);
  });

  it("el paquete unificado radix-ui está instalado", () => {
    expect(allDeps()["radix-ui"]).toBeTruthy();
  });

  it("el CLI de shadcn está en devDependencies y no en producción", () => {
    const pkg = readJson("package.json");
    expect(pkg.dependencies?.shadcn).toBeUndefined();
    expect(pkg.devDependencies?.shadcn).toBeTruthy();
  });

  it("next-themes ya no está declarado", () => {
    expect(allDeps()["next-themes"]).toBeUndefined();
  });

  it("el CLI de shadcn está pinneado a una versión exacta", () => {
    const pkg = readJson("package.json");
    expect(pkg.devDependencies.shadcn).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
