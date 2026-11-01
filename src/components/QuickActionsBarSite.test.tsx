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
  it("renders Router .250 and Servidor .231 split buttons when terminal has valid IP with direct 1-click -4 actions", () => {
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

    const routerBtn = screen.getByRole("button", { name: /hacer ping al router \.250/i });
    expect(routerBtn).toBeInTheDocument();

    const serverBtn = screen.getByRole("button", { name: /hacer ping al servidor \.231/i });
    expect(serverBtn).toBeInTheDocument();

    // Trigger main click -> standard 4-packet ping
    fireEvent.click(routerBtn);
    expect(onLaunchSitePing).toHaveBeenCalledWith("router", "standard");

    fireEvent.click(serverBtn);
    expect(onLaunchSitePing).toHaveBeenCalledWith("server", "standard");
  });

  it("allows direct 1-click continuous ping (-t) without submenu", () => {
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

    // Direct 1-click -t buttons
    const routerInfiniteBtn = screen.getByRole("button", { name: /ping continuo -t router \.250/i });
    expect(routerInfiniteBtn).toBeInTheDocument();
    fireEvent.click(routerInfiniteBtn);
    expect(onLaunchSitePing).toHaveBeenCalledWith("router", "infinite");

    const serverInfiniteBtn = screen.getByRole("button", { name: /ping continuo -t servidor \.231/i });
    expect(serverInfiniteBtn).toBeInTheDocument();
    fireEvent.click(serverInfiniteBtn);
    expect(onLaunchSitePing).toHaveBeenCalledWith("server", "infinite");
  });

  it("renders Wifi icon on .250 button and Terminal icon on diagnostic menu", () => {
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

    const routerBtn = screen.getByRole("button", { name: /hacer ping al router \.250/i });
    expect(routerBtn.querySelector(".lucide-wifi")).not.toBeNull();

    const diagBtn = screen.getByRole("button", { name: /menú de diagnóstico de red/i });
    expect(diagBtn.querySelector(".lucide-terminal")).not.toBeNull();
  });
});
