import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const config = JSON.parse(
  fs.readFileSync(path.resolve(process.cwd(), "tsconfig.json"), "utf-8"),
) as { compilerOptions?: Record<string, unknown> };

const options = config.compilerOptions ?? {};

describe("tsconfig sin opciones removidas", () => {
  it("no declara opciones que TypeScript 7 ya no acepta", () => {
    // El editor usa su propio TypeScript (7.x) y marcaba estas tres como
    // errores TS5102/TS5108.
    expect(options).not.toHaveProperty("baseUrl");
    expect(options).not.toHaveProperty("esModuleInterop");
    expect(options).not.toHaveProperty("importsNotUsedAsValues");
    expect(options).not.toHaveProperty("preserveValueImports");
  });

  it("resuelve los alias con un modo de módulos vigente", () => {
    const moduleResolution = options.moduleResolution as string;

    expect(moduleResolution).not.toMatch(/^node(10)?$/i);
    expect(["Bundler", "Node16", "Node20", "NodeNext"]).toContain(
      moduleResolution,
    );
  });

  it("mantiene los paths relativos al propio tsconfig", () => {
    const paths = options.paths as Record<string, string[]> | undefined;

    expect(paths).toBeDefined();
    for (const targets of Object.values(paths ?? {})) {
      for (const target of targets) {
        expect(target.startsWith("./")).toBe(true);
      }
    }
  });
});
