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

  it("el CLI de shadcn ya no está instalado", () => {
    const pkg = readJson("package.json");
    expect(pkg.dependencies?.shadcn).toBeUndefined();
    expect(pkg.devDependencies?.shadcn).toBeUndefined();
    expect(allDeps()["shadcn"]).toBeUndefined();
  });

  it("next-themes ya no está declarado", () => {
    expect(allDeps()["next-themes"]).toBeUndefined();
  });

  it("el style es exactamente radix-vega", () => {
    const config = readJson("components.json");
    expect(config.style).toBe("radix-vega");
  });

  it("radix-ui vive en dependencies, no en devDependencies", () => {
    const pkg = readJson("package.json");
    expect(pkg.dependencies["radix-ui"]).toBeTruthy();
    expect(pkg.devDependencies?.["radix-ui"]).toBeUndefined();
  });

  it("no queda ningún paquete @radix-ui/* declarado", () => {
    const offending = Object.keys(allDeps()).filter((dep) =>
      dep.startsWith("@radix-ui/"),
    );
    expect(offending).toEqual([]);
  });

  it("expone el token link en ambos temas", () => {
    const css = fs.readFileSync(path.resolve(root, "src/index.css"), "utf-8");
    expect(css.match(/--link:\s*oklch\(/g)?.length).toBe(2);
    expect(css).toContain("--color-link: var(--link);");
  });

  it("cmdk y la fuente mono siguen declaradas", () => {
    const deps = allDeps();
    expect(deps["cmdk"]).toBeTruthy();
    expect(deps["@fontsource-variable/geist-mono"]).toBeTruthy();
  });
});
