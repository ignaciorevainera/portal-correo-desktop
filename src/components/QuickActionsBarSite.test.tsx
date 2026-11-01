import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { QuickActionsBar } from "./QuickActionsBar";
import { TerminalData } from "../types/terminal";

const mockTerminal: TerminalData = {
  pc: "PC-TEST-01",
  ip: "10.66.10.15",
  mac: "00:11:22:33:44:55",
  sede: "Sucursal Centro",
  sedeDesc: "Centro",
  area: "Operaciones",
  userNt: "OPERADOR",
  build: "19045",
  sp: "10.0",
  so: "Windows 10",
  model: "OptiPlex 7080",
  ram: "16 GB",
  antivirus: "Defender",
  browser: "Chrome",
  uptimeText: "2d 4h",
  alerts: [],
};

describe("QuickActionsBar Site Link Buttons (.250 and .231)", () => {
  it("renders Router .250 and Servidor .231 split buttons when terminal has valid IP", () => {
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

  it("allows selecting continuous ping (-t) via dropdown", () => {
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

    const routerOptionsBtn = screen.getByRole("button", { name: /opciones de ping para router \.250/i });
    fireEvent.click(routerOptionsBtn);

    const continuousPingOption = screen.getByRole("button", { name: /ping continuo -t router \.250/i });
    expect(continuousPingOption).toBeInTheDocument();

    fireEvent.click(continuousPingOption);
    expect(onLaunchSitePing).toHaveBeenCalledWith("router", "infinite");
  });
});
