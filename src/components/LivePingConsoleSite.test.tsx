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

  it("prefixes output lines with [ROUTER .250] when linePrefix is set", () => {
    let pingCallback: (text: string) => void = () => {};
    mockSubscribeToPing.mockImplementation((ip, onData, onDone) => {
      pingCallback = onData;
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

    act(() => {
      pingCallback("Respuesta desde 10.66.10.250: bytes=32 tiempo=15ms TTL=64\n");
    });

    expect(screen.getByText(/\[ROUTER \.250\] Respuesta desde 10\.66\.10\.250/)).toBeDefined();
  });

  it("prefixes output lines with [SERVIDOR .231] when linePrefix is set", () => {
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

    act(() => {
      pingCallback("Respuesta desde 10.66.10.231: bytes=32 tiempo=10ms TTL=128\n");
    });

    expect(screen.getByText(/\[SERVIDOR \.231\] Respuesta desde 10\.66\.10\.231/)).toBeDefined();
  });
});
