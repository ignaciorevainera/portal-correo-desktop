import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Topbar } from "./Topbar";
import { ThemeProvider } from "../context/ThemeContext";
import * as electronClient from "../services/electronClient";

describe("Topbar & Compact Unified Titlebar component", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders search input, brand and compact layout", () => {
    const handleSelect = vi.fn();
    render(
      <ThemeProvider>
        <Topbar onSelectTerminal={handleSelect} selectedPc="PC-DEMO-001" />
      </ThemeProvider>,
    );

    const input = screen.getByPlaceholderText(/buscar terminal o ip/i);
    expect(input).toBeInTheDocument();
    expect(screen.getByText(/portal correo desktop/i)).toBeInTheDocument();
  });

  it('renders "Portal MDA" button and calls openExternalUrl with exact URL', async () => {
    const openSpy = vi
      .spyOn(electronClient, "openExternalUrl")
      .mockResolvedValue();
    render(
      <ThemeProvider>
        <Topbar onSelectTerminal={vi.fn()} selectedPc="PC-DEMO-001" />
      </ThemeProvider>,
    );

    const portalBtn = screen.getByRole("button", { name: /portal mda/i });
    expect(portalBtn).toBeInTheDocument();

    fireEvent.click(portalBtn);
    expect(openSpy).toHaveBeenCalledWith(
      "https://mda.correo.local/inventario-terminales",
    );
  });

  it("renders window control buttons (minimizar and power to tray) and invokes IPC actions", async () => {
    const minSpy = vi
      .spyOn(electronClient, "minimizeWindow")
      .mockResolvedValue();
    const traySpy = vi.spyOn(electronClient, "hideToTray").mockResolvedValue();

    render(
      <ThemeProvider>
        <Topbar onSelectTerminal={vi.fn()} selectedPc="PC-DEMO-001" />
      </ThemeProvider>,
    );

    const minBtn = screen.getByRole("button", { name: /minimizar ventana/i });
    const powerBtn = screen.getByRole("button", {
      name: /minimizar a bandeja del sistema/i,
    });

    expect(minBtn).toBeInTheDocument();
    expect(powerBtn).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /maximizar ventana/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /cerrar ventana/i }),
    ).not.toBeInTheDocument();

    fireEvent.click(minBtn);
    expect(minSpy).toHaveBeenCalledTimes(1);

    fireEvent.click(powerBtn);
    expect(traySpy).toHaveBeenCalledTimes(1);
  });

  it("provides direct 1-click VNC and Ping actions on search suggestions", () => {
    const handleSelect = vi.fn();
    const handleDirectVnc = vi.fn();
    const handleDirectPing = vi.fn();

    render(
      <ThemeProvider>
        <Topbar
          onSelectTerminal={handleSelect}
          onDirectVnc={handleDirectVnc}
          onDirectPing={handleDirectPing}
          selectedPc=""
        />
      </ThemeProvider>,
    );

    const input = screen.getByPlaceholderText(/buscar terminal o ip/i);
    fireEvent.change(input, { target: { value: "WS-DEMO" } });

    const suggestion = screen.getByText(/WS-DEMO-002/i);
    expect(suggestion).toBeInTheDocument();

    const vncQuickBtn = screen.getByRole("button", {
      name: /conectar vnc a ws-demo-002/i,
    });
    const pingQuickBtn = screen.getByRole("button", {
      name: /ping a ws-demo-002/i,
    });

    expect(vncQuickBtn).toBeInTheDocument();
    expect(pingQuickBtn).toBeInTheDocument();

    fireEvent.click(vncQuickBtn);
    expect(handleDirectVnc).toHaveBeenCalledWith("WS-DEMO-002");

    fireEvent.click(pingQuickBtn);
    expect(handleDirectPing).toHaveBeenCalledWith("WS-DEMO-002");
  });

  it("renders topbar with expanded h-14 dimensions, h-10 input and high contrast Portal MDA CTA", () => {
    const { container } = render(
      <ThemeProvider>
        <Topbar onSelectTerminal={vi.fn()} selectedPc="PC-DEMO-001" />
      </ThemeProvider>,
    );

    const header = container.querySelector("header");
    expect(header?.className).toContain("h-14");

    const input = screen.getByPlaceholderText(/buscar terminal o ip/i);
    expect(input.className).toContain("h-10");

    const portalBtn = screen.getByRole("button", { name: /portal mda/i });
    expect(portalBtn.className).toContain("h-10");
  });
});

it("renders settings button in topbar and opens settings modal on click or F10 shortcut", () => {
  const handleOpenSettings = vi.fn();
  render(
    <ThemeProvider>
      <Topbar onSelectTerminal={vi.fn()} onOpenSettings={handleOpenSettings} />
    </ThemeProvider>,
  );

  const settingsBtn = screen.getByRole("button", {
    name: /abrir ajustes y configuración/i,
  });
  expect(settingsBtn).toBeInTheDocument();

  fireEvent.click(settingsBtn);
  expect(handleOpenSettings).toHaveBeenCalledTimes(1);

  fireEvent.keyDown(window, { key: "F10" });
  expect(handleOpenSettings).toHaveBeenCalledTimes(2);
});
