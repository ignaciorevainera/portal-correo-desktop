import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_PING_MODE,
  PING_MODE_KEY,
  loadDefaultPingMode,
  saveDefaultPingMode,
  DEFAULT_TEXT_SCALE,
  TEXT_SCALE_KEY,
  HIGH_CONTRAST_KEY,
  CONSOLE_WRAP_KEY,
  DEFAULT_CONSOLE_WRAP,
  loadDefaultTextScale,
  saveDefaultTextScale,
  loadDefaultHighContrast,
  saveDefaultHighContrast,
  loadDefaultConsoleWrap,
  saveDefaultConsoleWrap,
  CONSOLE_WRAP_EVENT,
  TextScale,
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

  it("sin valor guardado usa la escala de texto por defecto 100", () => {
    expect(loadDefaultTextScale()).toBe("100");
    expect(DEFAULT_TEXT_SCALE).toBe("100");
  });

  it("lee las escalas válidas", () => {
    const scales: TextScale[] = ["100", "110", "120", "130"];
    for (const scale of scales) {
      localStorage.setItem(TEXT_SCALE_KEY, scale);
      expect(loadDefaultTextScale()).toBe(scale);
    }
  });

  it("ignora escala inválida y retorna 100", () => {
    localStorage.setItem(TEXT_SCALE_KEY, "150");
    expect(loadDefaultTextScale()).toBe("100");
  });

  it("persiste la escala de texto", () => {
    saveDefaultTextScale("120");
    expect(localStorage.getItem(TEXT_SCALE_KEY)).toBe("120");
    expect(loadDefaultTextScale()).toBe("120");
  });

  it("sin valor guardado usa alto contraste en false", () => {
    expect(loadDefaultHighContrast()).toBe(false);
  });

  it("persiste y lee el modo de alto contraste", () => {
    saveDefaultHighContrast(true);
    expect(localStorage.getItem(HIGH_CONTRAST_KEY)).toBe("true");
    expect(loadDefaultHighContrast()).toBe(true);

    saveDefaultHighContrast(false);
    expect(localStorage.getItem(HIGH_CONTRAST_KEY)).toBe("false");
    expect(loadDefaultHighContrast()).toBe(false);
  });

  it("sin valor guardado usa consoleWrap en false por defecto", () => {
    expect(loadDefaultConsoleWrap()).toBe(false);
    expect(DEFAULT_CONSOLE_WRAP).toBe(false);
  });

  it("persiste y lee el ajuste de consoleWrap y dispara el evento reactivo", () => {
    const eventHandler = vi.fn();
    window.addEventListener(CONSOLE_WRAP_EVENT, eventHandler);

    saveDefaultConsoleWrap(true);
    expect(localStorage.getItem(CONSOLE_WRAP_KEY)).toBe("true");
    expect(loadDefaultConsoleWrap()).toBe(true);
    expect(eventHandler).toHaveBeenCalledTimes(1);
    expect(eventHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: { consoleWrap: true },
      })
    );

    saveDefaultConsoleWrap(false);
    expect(localStorage.getItem(CONSOLE_WRAP_KEY)).toBe("false");
    expect(loadDefaultConsoleWrap()).toBe(false);
    expect(eventHandler).toHaveBeenCalledTimes(2);
    expect(eventHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: { consoleWrap: false },
      })
    );

    window.removeEventListener(CONSOLE_WRAP_EVENT, eventHandler);
  });

  it("no rompe si localStorage no está disponible", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("sin almacenamiento");
    });
    expect(loadDefaultPingMode()).toBe("standard");
    expect(loadDefaultTextScale()).toBe("100");
    expect(loadDefaultHighContrast()).toBe(false);
    expect(loadDefaultConsoleWrap()).toBe(false);

    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("sin almacenamiento");
    });
    expect(() => saveDefaultPingMode("infinite")).not.toThrow();
    expect(() => saveDefaultTextScale("120")).not.toThrow();
    expect(() => saveDefaultHighContrast(true)).not.toThrow();
    expect(() => saveDefaultConsoleWrap(true)).not.toThrow();
  });
});
