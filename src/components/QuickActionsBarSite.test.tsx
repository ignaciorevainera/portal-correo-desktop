import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { QuickActionsBar } from "./QuickActionsBar";
import { TerminalData } from "../types/terminal";

const mockTerminal: TerminalData = {
  pc: "PC-TEST-01",
  ip: "10.66.10.15",
  mac: "00:11:22:33:44:55",
  location: "Sucursal Centro",
  costCenter: "Centro",
  userNt: "OPERADOR",
  os: "Windows 10",
  servicePack: "10.0",
  cpuModel: "OptiPlex 7080",
  ram: "16 GB",
  antivirusVersion: "Defender",
  ieVersion: "Chrome",
  architecture: "64-bit",
  surveyDate: "2026-10-25",
  uptimeText: "2d 4h",
  alerts: [],
  resetHistory: [],
};

describe("QuickActionsBar Site Link Buttons (.250 and .231)", () => {
  it("renders Router .250 and Servidor .231 actions inside the Más menu when terminal has a valid IP", () => {
    const onLaunchSitePing = vi.fn();
    render(
      <QuickActionsBar
        terminal={mockTerminal}
        isPinging={false}
        onLaunchVnc={vi.fn()}
        onLaunchMsra={vi.fn()}
        onTogglePing={vi.fn()}
        onLaunchSitePing={onLaunchSitePing}
      />
    );

    // Las acciones del sitio viven en el menú "Más"
    fireEvent.click(screen.getByRole("button", { name: /más/i }));

    const routerBtn = screen.getByRole("button", { name: /hacer ping al router \.250/i });
    expect(routerBtn).toBeInTheDocument();

    // Trigger main click -> standard 4-packet ping
    fireEvent.click(routerBtn);
    expect(onLaunchSitePing).toHaveBeenCalledWith("router", "standard");

    // El menú se cierra tras actuar; se reabre para la segunda acción
    fireEvent.click(screen.getByRole("button", { name: /más/i }));
    const serverBtn = screen.getByRole("button", { name: /hacer ping al servidor \.231/i });
    expect(serverBtn).toBeInTheDocument();

    fireEvent.click(serverBtn);
    expect(onLaunchSitePing).toHaveBeenCalledWith("server", "standard");
  });

  it("runs continuous ping (-t) for router and server from the Más menu", () => {
    const onLaunchSitePing = vi.fn();
    render(
      <QuickActionsBar
        terminal={mockTerminal}
        isPinging={false}
        onLaunchVnc={vi.fn()}
        onLaunchMsra={vi.fn()}
        onTogglePing={vi.fn()}
        onLaunchSitePing={onLaunchSitePing}
      />
    );

    // Direct 1-click -t buttons, ahora dentro del menú "Más"
    fireEvent.click(screen.getByRole("button", { name: /más/i }));

    const routerInfiniteBtn = screen.getByRole("button", { name: /ping continuo -t router \.250/i });
    expect(routerInfiniteBtn).toBeInTheDocument();
    fireEvent.click(routerInfiniteBtn);
    expect(onLaunchSitePing).toHaveBeenCalledWith("router", "infinite");

    fireEvent.click(screen.getByRole("button", { name: /más/i }));
    const serverInfiniteBtn = screen.getByRole("button", { name: /ping continuo -t servidor \.231/i });
    expect(serverInfiniteBtn).toBeInTheDocument();
    fireEvent.click(serverInfiniteBtn);
    expect(onLaunchSitePing).toHaveBeenCalledWith("server", "infinite");
  });

  it("renders Wifi icon on .250 button and Layers icon on diagnostic item", () => {
    render(
      <QuickActionsBar
        terminal={mockTerminal}
        isPinging={false}
        onLaunchVnc={vi.fn()}
        onLaunchMsra={vi.fn()}
        onTogglePing={vi.fn()}
        onLaunchSitePing={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /más/i }));

    const routerBtn = screen.getByRole("button", { name: /hacer ping al router \.250/i });
    expect(routerBtn.querySelector(".lucide-wifi")).not.toBeNull();

    const diagBtn = screen.getByRole("button", { name: /ejecutar nbtstat/i });
    expect(diagBtn.querySelector(".lucide-layers")).not.toBeNull();
  });

  it("ensures only the Ping button has activation state while .250, .231, and -t remain non-activated", () => {
    // 1. When isPinging is true (even if targeting .250), only the Ping button pulses/activates
    const { rerender } = render(
      <QuickActionsBar
        terminal={mockTerminal}
        isPinging={true}
        pingTarget="10.66.10.250"
        pingMode="standard"
        onLaunchVnc={vi.fn()}
        onLaunchMsra={vi.fn()}
        onTogglePing={vi.fn()}
        onLaunchSitePing={vi.fn()}
      />
    );

    // Primary Ping button is the ONLY activated button
    const pingBtn = screen.getByRole("button", { name: /detener ping en vivo/i });
    expect(pingBtn).toBeInTheDocument();
    expect(pingBtn.className).toContain("animate-pulse");

    // Las acciones del sitio viven en el menú "Más"
    fireEvent.click(screen.getByRole("button", { name: /más/i }));

    // Router .250 buttons do NOT have active/pulse state
    const routerStandardBtn = screen.getByRole("button", { name: /hacer ping al router \.250/i });
    expect(routerStandardBtn.getAttribute("aria-pressed")).toBeNull();
    expect(routerStandardBtn.className).not.toContain("animate-pulse");

    const routerInfiniteBtn = screen.getByRole("button", { name: /ping continuo -t router \.250/i });
    expect(routerInfiniteBtn.getAttribute("aria-pressed")).toBeNull();
    expect(routerInfiniteBtn.className).not.toContain("animate-pulse");

    // 2. Server .231 target active -> still only Ping button is activated
    rerender(
      <QuickActionsBar
        terminal={mockTerminal}
        isPinging={true}
        pingTarget="10.66.10.231"
        pingMode="infinite"
        onLaunchVnc={vi.fn()}
        onLaunchMsra={vi.fn()}
        onTogglePing={vi.fn()}
        onLaunchSitePing={vi.fn()}
      />
    );

    const serverStandardBtn = screen.getByRole("button", { name: /hacer ping al servidor \.231/i });
    expect(serverStandardBtn.getAttribute("aria-pressed")).toBeNull();
    expect(serverStandardBtn.className).not.toContain("animate-pulse");

    const serverInfiniteBtn = screen.getByRole("button", { name: /ping continuo -t servidor \.231/i });
    expect(serverInfiniteBtn.getAttribute("aria-pressed")).toBeNull();
    expect(serverInfiniteBtn.className).not.toContain("animate-pulse");

    // Terminal -t button also does not have pulse state
    const terminalInfiniteBtn = screen.getByRole("button", { name: /iniciar ping continuo -t/i });
    expect(terminalInfiniteBtn.getAttribute("aria-pressed")).toBeNull();
    expect(terminalInfiniteBtn.className).not.toContain("animate-pulse");
  });
});
