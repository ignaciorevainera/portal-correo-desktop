import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_PING_MODE,
  PING_MODE_KEY,
  loadDefaultPingMode,
  saveDefaultPingMode,
} from "@/lib/preferences";

describe("preferencias del operador", () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("sin valor guardado usa el modo estándar", () => {
    expect(loadDefaultPingMode()).toBe("standard");
    expect(DEFAULT_PING_MODE).toBe("standard");
  });

  it("lee los dos modos válidos", () => {
    localStorage.setItem(PING_MODE_KEY, "infinite");
    expect(loadDefaultPingMode()).toBe("infinite");

    localStorage.setItem(PING_MODE_KEY, "standard");
    expect(loadDefaultPingMode()).toBe("standard");
  });

  it("ignora valores desconocidos y vuelve al estándar", () => {
    localStorage.setItem(PING_MODE_KEY, "continuo");
    expect(loadDefaultPingMode()).toBe("standard");
  });

  it("persiste el modo elegido con la clave existente", () => {
    saveDefaultPingMode("infinite");

    expect(localStorage.getItem("pcd_pref_ping_mode")).toBe("infinite");
    expect(loadDefaultPingMode()).toBe("infinite");
  });

  it("no rompe si localStorage no está disponible", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("sin almacenamiento");
    });
    expect(loadDefaultPingMode()).toBe("standard");

    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("sin almacenamiento");
    });
    expect(() => saveDefaultPingMode("infinite")).not.toThrow();
  });
});
