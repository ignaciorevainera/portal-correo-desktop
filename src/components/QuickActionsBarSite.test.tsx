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

  it("shows active/selected visual indicators on .250 and .231 buttons when pinging them", () => {
    // 1. Router standard ping active (10.66.10.250)
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

    const routerStandardBtn = screen.getByRole("button", { name: /hacer ping al router \.250/i });
    expect(routerStandardBtn.getAttribute("aria-pressed")).toBe("true");
    expect(routerStandardBtn.className).toContain("animate-pulse");

    // 2. Router -t infinite ping active
    rerender(
      <QuickActionsBar
        terminal={mockTerminal}
        isPinging={true}
        pingTarget="10.66.10.250"
        pingMode="infinite"
        onLaunchVnc={vi.fn()}
        onLaunchMsra={vi.fn()}
        onTogglePing={vi.fn()}
        onLaunchSitePing={vi.fn()}
      />
    );

    const routerInfiniteBtn = screen.getByRole("button", { name: /ping continuo -t router \.250/i });
    expect(routerInfiniteBtn.getAttribute("aria-pressed")).toBe("true");
    expect(routerInfiniteBtn.className).toContain("animate-pulse");

    // The terminal -t button must NOT be active or green when router -t is running
    const terminalInfiniteBtnWhenRouter = screen.getByRole("button", { name: /iniciar ping continuo -t/i });
    expect(terminalInfiniteBtnWhenRouter.getAttribute("aria-pressed")).toBe("false");
    expect(terminalInfiniteBtnWhenRouter.className).not.toContain("bg-emerald-500/20");

    // 3. Server standard ping active (10.66.10.231)
    rerender(
      <QuickActionsBar
        terminal={mockTerminal}
        isPinging={true}
        pingTarget="10.66.10.231"
        pingMode="standard"
        onLaunchVnc={vi.fn()}
        onLaunchMsra={vi.fn()}
        onTogglePing={vi.fn()}
        onLaunchSitePing={vi.fn()}
      />
    );

    const serverStandardBtn = screen.getByRole("button", { name: /hacer ping al servidor \.231/i });
    expect(serverStandardBtn.getAttribute("aria-pressed")).toBe("true");
    expect(serverStandardBtn.className).toContain("animate-pulse");

    // 4. Server -t infinite ping active
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

    const serverInfiniteBtn = screen.getByRole("button", { name: /ping continuo -t servidor \.231/i });
    expect(serverInfiniteBtn.getAttribute("aria-pressed")).toBe("true");
    expect(serverInfiniteBtn.className).toContain("animate-pulse");

    // 5. Terminal -t infinite ping active
    rerender(
      <QuickActionsBar
        terminal={mockTerminal}
        isPinging={true}
        pingTarget={mockTerminal.ip}
        pingMode="infinite"
        onLaunchVnc={vi.fn()}
        onLaunchMsra={vi.fn()}
        onTogglePing={vi.fn()}
        onLaunchSitePing={vi.fn()}
      />
    );

    const terminalInfiniteBtn = screen.getByRole("button", { name: /iniciar ping continuo -t/i });
    expect(terminalInfiniteBtn.getAttribute("aria-pressed")).toBe("true");
    expect(terminalInfiniteBtn.className).toContain("animate-pulse");
  });
});
