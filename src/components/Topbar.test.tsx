import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Topbar } from "./Topbar";
import { ThemeProvider } from "../context/ThemeContext";
import * as electronClient from "../services/electronClient";

describe("Topbar & Compact Unified Titlebar component", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("renders search input, brand and compact layout", () => {
    const handleSelect = vi.fn();
    render(
      <ThemeProvider>
        <Topbar onSelectTerminal={handleSelect} />
      </ThemeProvider>,
    );

    const input = screen.getByPlaceholderText(/buscar terminal/i);
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

  it("provides direct 1-click VNC action on terminal suggestions and omits redundant inline ping or AD consult buttons", () => {
    localStorage.setItem(
      "pcd_recent_searches",
      JSON.stringify([
        { value: "WS-DEMO-002", kind: "terminal" },
        { value: "jperez", kind: "account" },
      ]),
    );

    const handleSelect = vi.fn();
    const handleDirectVnc = vi.fn();

    render(
      <ThemeProvider>
        <Topbar
          onSelectTerminal={handleSelect}
          onDirectVnc={handleDirectVnc}
        />
      </ThemeProvider>,
    );

    const input = screen.getByPlaceholderText(/buscar terminal/i);
    fireEvent.focus(input);

    const termSuggestion = screen.getByText("WS-DEMO-002");
    expect(termSuggestion).toBeInTheDocument();

    const vncQuickBtn = screen.getByRole("button", {
      name: /conectar vnc a ws-demo-002/i,
    });
    expect(vncQuickBtn).toBeInTheDocument();
    fireEvent.click(vncQuickBtn);
    expect(handleDirectVnc).toHaveBeenCalledWith("WS-DEMO-002");

    // Botones redundantes no deben existir en el menú
    expect(
      screen.queryByRole("button", { name: /ping a ws-demo-002/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /consultar cuenta ad/i }),
    ).not.toBeInTheDocument();
  });

  it("renders topbar with expanded h-14 dimensions, h-10 input and grouped action buttons", () => {
    const { container } = render(
      <ThemeProvider>
        <Topbar onSelectTerminal={vi.fn()} />
      </ThemeProvider>,
    );

    const header = container.querySelector("header");
    expect(header?.className).toContain("h-14");

    const input = screen.getByPlaceholderText(/buscar terminal/i);
    expect(input.className).toContain("h-10");

    const portalBtn = screen.getByRole("button", { name: /portal mda/i });
    expect(portalBtn).toBeInTheDocument();

    const buttonGroup = container.querySelector('[data-slot="button-group"]');
    expect(buttonGroup).toBeInTheDocument();
    expect(header?.className).not.toContain("border-b");
  });

  it("renders a connected badge with the same height as the search bar", () => {
    render(
      <ThemeProvider>
        <Topbar onSelectTerminal={vi.fn()} backendMode="sql" />
      </ThemeProvider>,
    );

    expect(screen.getByText("Conectado")).toBeInTheDocument();

    const badge = screen.getByTitle("Modo actual");
    expect(badge.className).toContain("h-10");
    expect(badge.className).not.toContain("h-8");
  });

  it("shows account recents without remote actions and activates them", () => {
    localStorage.setItem(
      "pcd_recent_searches",
      JSON.stringify([
        { value: "jperez", kind: "account" },
        { value: "WS-DEMO-002", kind: "terminal" },
      ]),
    );

    const handleAccount = vi.fn();
    render(
      <ThemeProvider>
        <Topbar onSelectTerminal={vi.fn()} onSelectAccount={handleAccount} />
      </ThemeProvider>,
    );

    const input = screen.getByPlaceholderText(/buscar terminal/i);
    fireEvent.focus(input);

    expect(screen.getByText("Búsquedas recientes")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /conectar vnc a jperez/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /ping a jperez/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /conectar vnc a ws-demo-002/i }),
    ).toBeInTheDocument();

    expect(
      screen.queryByRole("button", { name: /consultar cuenta ad a jperez/i }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "jperez" }));
    expect(handleAccount).toHaveBeenCalledWith("jperez");
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
