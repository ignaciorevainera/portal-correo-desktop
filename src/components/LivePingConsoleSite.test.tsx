import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import React from "react";
import { LivePingConsole } from "./LivePingConsole";

const mockSubscribeToPing = vi.fn();
vi.mock("../services/electronClient", () => ({
  subscribeToPing: (...args: any[]) => mockSubscribeToPing(...args),
  subscribeToDiagnosticCommand: vi.fn(() => () => {}),
}));

describe("LivePingConsole with site targets and prefix labels", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prefixes only the first command header with [ROUTER .250] and leaves intermediate/final lines clean", () => {
    let pingCallback: (text: string) => void = () => {};
    let doneCallback: (code: number) => void = () => {};
    mockSubscribeToPing.mockImplementation((ip, onData, onDone) => {
      pingCallback = onData;
      doneCallback = onDone;
      return () => {};
    });

    render(
      <LivePingConsole
        ip="10.66.10.250"
        isPinging={true}
        linePrefix="[ROUTER .250]"
        onTogglePing={() => {}}
      />
    );

    // Initial header contains prefix
    expect(screen.getByText(/\[ROUTER \.250\] ping -n 4 10\.66\.10\.250/)).toBeInTheDocument();

    // Intermediate lines do not repeat prefix
    act(() => {
      pingCallback("Respuesta desde 10.66.10.250: bytes=32 tiempo=15ms TTL=64\n");
    });

    expect(screen.getByText(/^Respuesta desde 10\.66\.10\.250/)).toBeInTheDocument();
    expect(screen.queryByText(/\[ROUTER \.250\] Respuesta desde/)).toBeNull();

    // Final line does not repeat prefix
    act(() => {
      doneCallback(0);
    });

    expect(screen.getByText(/Proceso ping finalizado \(código: 0\)/)).toBeInTheDocument();
    expect(screen.queryByText(/\[ROUTER \.250\] Proceso ping finalizado/)).toBeNull();
  });

  it("prefixes only the first command header with [SERVIDOR .231] and leaves intermediate lines clean", () => {
    let pingCallback: (text: string) => void = () => {};
    mockSubscribeToPing.mockImplementation((ip, onData, onDone) => {
      pingCallback = onData;
      return () => {};
    });

    render(
      <LivePingConsole
        ip="10.66.10.231"
        isPinging={true}
        linePrefix="[SERVIDOR .231]"
        onTogglePing={() => {}}
      />
    );

    // Initial header contains prefix
    expect(screen.getByText(/\[SERVIDOR \.231\] ping -n 4 10\.66\.10\.231/)).toBeInTheDocument();

    act(() => {
      pingCallback("Respuesta desde 10.66.10.231: bytes=32 tiempo=10ms TTL=128\n");
    });

    expect(screen.getByText(/^Respuesta desde 10\.66\.10\.231/)).toBeInTheDocument();
    expect(screen.queryByText(/\[SERVIDOR \.231\] Respuesta desde/)).toBeNull();
  });
});
