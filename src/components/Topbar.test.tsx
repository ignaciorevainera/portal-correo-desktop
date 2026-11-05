import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react";
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

  it("compacta la identidad y el buscador por debajo de 640 px", () => {
    const { container } = render(
      <ThemeProvider>
        <Topbar onSelectTerminal={vi.fn()} />
      </ThemeProvider>,
    );

    const title = screen.getByRole("heading", {
      name: /portal correo desktop/i,
    });
    expect(title.className).toContain("max-sm:sr-only");

    const searchWrapper = container.querySelector("div.max-w-md");
    expect(searchWrapper?.className).toContain("min-w-0");

    expect(container.querySelector("header")?.className).toContain("h-14");
    expect(container.querySelector("header")?.className).toContain("px-3.5");
  });

  it("no renderiza el acceso al Portal MDA: vive en el diálogo de información", () => {
    render(
      <ThemeProvider>
        <Topbar onSelectTerminal={vi.fn()} />
      </ThemeProvider>,
    );

    expect(
      screen.queryByRole("button", { name: /portal mda/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /abrir información del sistema/i }),
    ).toBeInTheDocument();
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
    // Gutter lateral único: 14 px, igual que la barra de acciones y <main>.
    expect(header?.className).toContain("px-3.5");

    const input = screen.getByPlaceholderText(/buscar terminal/i);
    // La altura vive en el InputGroup que agrupa el control de búsqueda.
    expect(
      input.closest('[data-slot="input-group"]')?.className,
    ).toContain("h-10");

    const infoBtn = screen.getByRole("button", {
      name: /abrir información del sistema/i,
    });
    expect(infoBtn).toBeInTheDocument();

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
        <Topbar
          onSelectTerminal={vi.fn()}
          onSelectAccount={handleAccount}
          onDirectVnc={vi.fn()}
        />
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

    fireEvent.click(screen.getByRole("option", { name: /jperez/i }));
    expect(handleAccount).toHaveBeenCalledWith("jperez");
  });

  it("agrupa ajustes, información y tema en un menú bajo 640 px", () => {
    render(
      <ThemeProvider>
        <Topbar onSelectTerminal={vi.fn()} />
      </ThemeProvider>,
    );

    for (const name of [
      /abrir ajustes y configuración/i,
      /abrir información del sistema/i,
      /cambiar tema de interfaz/i,
    ]) {
      expect(screen.getByRole("button", { name }).className).toContain(
        "max-sm:hidden",
      );
    }

    const trigger = screen.getByRole("button", {
      name: /más opciones de la aplicación/i,
    });
    expect(trigger.className).toContain("max-sm:inline-flex");
    expect(trigger).toHaveAttribute("aria-haspopup", "menu");
  });

  it("abre ajustes desde el menú compacto", async () => {
    const onOpenSettings = vi.fn();
    render(
      <ThemeProvider>
        <Topbar
          onSelectTerminal={vi.fn()}
          onOpenSettings={onOpenSettings}
        />
      </ThemeProvider>,
    );

    fireEvent.keyDown(
      screen.getByRole("button", { name: /más opciones de la aplicación/i }),
      { key: "Enter" },
    );
    fireEvent.click(
      await screen.findByRole("menuitem", { name: /ajustes y configuración/i }),
    );

    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });

  it("abre información desde el menú compacto", async () => {
    render(
      <ThemeProvider>
        <Topbar onSelectTerminal={vi.fn()} />
      </ThemeProvider>,
    );

    fireEvent.keyDown(
      screen.getByRole("button", { name: /más opciones de la aplicación/i }),
      { key: "Enter" },
    );
    fireEvent.click(
      await screen.findByRole("menuitem", {
        name: /información y características/i,
      }),
    );

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });

  it("cambia el tema desde el menú compacto", async () => {
    render(
      <ThemeProvider>
        <Topbar onSelectTerminal={vi.fn()} />
      </ThemeProvider>,
    );

    fireEvent.keyDown(
      screen.getByRole("button", { name: /más opciones de la aplicación/i }),
      { key: "Enter" },
    );
    fireEvent.click(
      await screen.findByRole("menuitem", { name: /cambiar a modo claro/i }),
    );

    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("cierra el menú con Escape y devuelve el foco al disparador", async () => {
    render(
      <ThemeProvider>
        <Topbar onSelectTerminal={vi.fn()} />
      </ThemeProvider>,
    );

    const trigger = screen.getByRole("button", {
      name: /más opciones de la aplicación/i,
    });

    fireEvent.keyDown(trigger, { key: "Enter" });
    await screen.findByRole("menuitem", { name: /ajustes y configuración/i });
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    fireEvent.keyDown(document.activeElement ?? document.body, {
      key: "Escape",
    });

    await waitFor(() => {
      expect(trigger).toHaveAttribute("aria-expanded", "false");
    });
    expect(document.activeElement).toBe(trigger);
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
