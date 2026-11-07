import { describe, expect, it } from "vitest";
import {
  getStartupErrorContent,
  STARTUP_ERRORS,
} from "./startupErrors";
import type { GateStatusCode } from "../services/electronClient";

const CODES: GateStatusCode[] = [
  "AUTHORIZED",
  "NO_LAN_DNS",
  "NO_LAN_ROUTE",
  "NO_LAN_TIMEOUT",
  "NO_PERMISSION",
  "NO_CONFIG",
  "BAD_CONFIG",
  "UNKNOWN",
];

describe("startupErrors", () => {
  it("define título, descripción y pasos para todos los códigos", () => {
    for (const code of CODES) {
      const content = getStartupErrorContent({ code });

      expect(content.title.length).toBeGreaterThan(0);
      if (code !== "AUTHORIZED") {
        expect(content.description.length).toBeGreaterThan(0);
        expect(content.steps.length).toBeGreaterThanOrEqual(2);
        for (const step of content.steps) {
          expect(step).not.toMatch(/[\\\\/]|\.json|\.cjs|bootstrap|UNC/i);
        }
      }
    }
  });

  it("no repite títulos entre errores visibles", () => {
    const titles = CODES.filter((code) => code !== "AUTHORIZED").map(
      (code) => getStartupErrorContent({ code }).title,
    );

    expect(new Set(titles).size).toBe(titles.length);
  });

  it("cae en UNKNOWN para un código desconocido", () => {
    expect(
      getStartupErrorContent({ code: "OTRO" as GateStatusCode }),
    ).toBe(STARTUP_ERRORS.UNKNOWN);
  });

  it("no resuelve claves heredadas del prototipo", () => {
    for (const code of ["constructor", "toString", "__proto__", "hasOwnProperty"]) {
      expect(getStartupErrorContent({ code: code as GateStatusCode })).toBe(
        STARTUP_ERRORS.UNKNOWN,
      );
    }
  });
});
