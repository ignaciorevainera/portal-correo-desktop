import { describe, expect, it } from "vitest";
import pkg from "../../package.json";
import { APP_VERSION, APP_VERSION_LABEL } from "@/lib/appVersion";

describe("versión de la aplicación", () => {
  it("toma la versión de package.json como única fuente", () => {
    expect(APP_VERSION).toBe(pkg.version);
    expect(APP_VERSION_LABEL).toBe(`v${pkg.version}`);
  });

  it("es una versión semántica", () => {
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+(?:[-+].+)?$/);
  });
});
