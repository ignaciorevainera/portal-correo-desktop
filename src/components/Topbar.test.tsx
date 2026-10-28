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
        <Topbar onSelectTerminal={handleSelect} />
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
        <Topbar onSelectTerminal={vi.fn()} />
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
        <Topbar onSelectTerminal={vi.fn()} />
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

  it("provides direct 1-click VNC and Ping actions on search suggestions from recent history", () => {
    localStorage.setItem(
      "cmda_recent_searches",
      JSON.stringify(["WS-DEMO-002", "WS-DEMO-003"]),
    );

    const handleSelect = vi.fn();
    const handleDirectVnc = vi.fn();
    const handleDirectPing = vi.fn();

    const { unmount } = render(
      <ThemeProvider>
        <Topbar
          onSelectTerminal={handleSelect}
          onDirectVnc={handleDirectVnc}
          onDirectPing={handleDirectPing}
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
    expect(vncQuickBtn).toBeInTheDocument();
    fireEvent.click(vncQuickBtn);
    expect(handleDirectVnc).toHaveBeenCalledWith("WS-DEMO-002");

    unmount();

    // Volver a renderizar para verificar acción Ping
    render(
      <ThemeProvider>
        <Topbar
          onSelectTerminal={handleSelect}
          onDirectVnc={handleDirectVnc}
          onDirectPing={handleDirectPing}
        />
      </ThemeProvider>,
    );
    const input2 = screen.getByPlaceholderText(/buscar terminal o ip/i);
    fireEvent.change(input2, { target: { value: "WS-DEMO" } });

    const pingQuickBtn = screen.getByRole("button", {
      name: /ping a ws-demo-002/i,
    });
    expect(pingQuickBtn).toBeInTheDocument();
    fireEvent.click(pingQuickBtn);
    expect(handleDirectPing).toHaveBeenCalledWith("WS-DEMO-002");
  });

  it("renders topbar with expanded h-14 dimensions, h-10 input and grouped action buttons", () => {
    const { container } = render(
      <ThemeProvider>
        <Topbar onSelectTerminal={vi.fn()} />
      </ThemeProvider>,
    );

    const header = container.querySelector("header");
    expect(header?.className).toContain("h-14");

    const input = screen.getByPlaceholderText(/buscar terminal o ip/i);
    expect(input.className).toContain("h-10");

    const portalBtn = screen.getByRole("button", { name: /portal mda/i });
    expect(portalBtn).toBeInTheDocument();

    const buttonGroup = container.querySelector('[data-slot="button-group"]');
    expect(buttonGroup).toBeInTheDocument();
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
