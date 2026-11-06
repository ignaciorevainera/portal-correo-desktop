import { describe, expect, it } from "vitest";
import { currentPingLines, summarizePingLogs } from "./pingSummary";

describe("summarizePingLogs", () => {
  it("resume respuestas y timeouts con mínimo, máximo y media", () => {
    const lines = [
      "Haciendo ping a 192.0.2.103 con 32 bytes de datos:",
      "Respuesta desde 192.0.2.103: bytes=32 tiempo=13ms TTL=64",
      "Respuesta desde 192.0.2.103: bytes=32 tiempo=14ms TTL=64",
      "Respuesta desde 192.0.2.103: bytes=32 tiempo=13ms TTL=64",
      "Tiempo de espera agotado para esta solicitud.",
    ];

    expect(summarizePingLogs(lines, "192.0.2.103")).toBe(
      [
        "",
        "Estadísticas de ping para 192.0.2.103:",
        "    Paquetes: enviados = 4, recibidos = 3, perdidos = 1",
        "    (25% perdidos),",
        "Tiempos aproximados de ida y vuelta en milisegundos:",
        "    Mínimo = 13ms, Máximo = 14ms, Media = 13ms",
      ].join("\n"),
    );
  });

  it("acepta respuestas en inglés y tiempos menores a 1 ms", () => {
    const lines = [
      "Reply from 192.0.2.10: bytes=32 time<1ms TTL=128",
      "Reply from 192.0.2.10: bytes=32 time=2ms TTL=128",
    ];

    expect(summarizePingLogs(lines, "192.0.2.10")).toContain(
      "Mínimo = 0ms, Máximo = 2ms, Media = 1ms",
    );
  });

  it("devuelve null cuando todavía no hay paquetes", () => {
    expect(
      summarizePingLogs(["Haciendo ping a 10.0.0.1 con 32 bytes de datos:"], "10.0.0.1"),
    ).toBeNull();
  });

  it("aísla la sesión actual aunque la cabecera tenga prefijo", () => {
    const lines = [
      "[10:00:00] > ping -n 4 192.0.2.10",
      "Respuesta desde 192.0.2.10: bytes=32 tiempo=99ms TTL=64",
      "[10:01:00] > [ROUTER .250] ping -t 192.0.2.250",
      "Respuesta desde 192.0.2.250: bytes=32 tiempo=13ms TTL=64",
    ];

    expect(currentPingLines(lines)).toEqual([
      "Respuesta desde 192.0.2.250: bytes=32 tiempo=13ms TTL=64",
    ]);
  });

  it("cuenta destinos inaccesibles en español como paquetes perdidos", () => {
    const lines = [
      "Respuesta desde 192.0.2.50: Host de destino inaccesible.",
      "Red de destino inaccesible.",
    ];

    expect(summarizePingLogs(lines, "192.0.2.50")).toBe(
      [
        "",
        "Estadísticas de ping para 192.0.2.50:",
        "    Paquetes: enviados = 2, recibidos = 0, perdidos = 2",
        "    (100% perdidos),",
        "Tiempos aproximados de ida y vuelta en milisegundos:",
        "    Mínimo = 0ms, Máximo = 0ms, Media = 0ms",
      ].join("\n"),
    );
  });

  it("acepta tiempos con coma decimal", () => {
    const lines = [
      "Respuesta desde 192.0.2.60: bytes=32 tiempo=13,5ms TTL=64",
      "Respuesta desde 192.0.2.60: bytes=32 tiempo=14,5ms TTL=64",
    ];

    expect(summarizePingLogs(lines, "192.0.2.60")).toContain(
      "Mínimo = 13.5ms, Máximo = 14.5ms, Media = 14ms",
    );
  });
});
