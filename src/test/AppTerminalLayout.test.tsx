import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../App";

const terminal = {
  pc: "WS-CORP-100",
  ip: "192.0.2.100",
  mac: "00:00:5E:00:53:99",
  os: "Windows 11 Enterprise",
  servicePack: "22631.3007",
  cpuModel: "Intel Core i7",
  ram: "16.384 MB",
  antivirusVersion: "Endpoint Protection 14.3",
  ieVersion: "N/A (Edge)",
  userNt: "soportecentral",
  architecture: "x64-based PC",
  surveyDate: "25/10/2026",
  uptimeText: "3 day(s), 2 hour(s)",
  location: "Sede Central",
  costCenter: "CC 100",
  alerts: [],
  resetHistory: [],
};

async function renderLoadedApp() {
  const { container } = render(<App />);
  const input = screen.getByPlaceholderText(/buscar terminal/i);

  fireEvent.change(input, { target: { value: "WS-CORP-100" } });
  fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

  await waitFor(() =>
    expect(screen.getByTestId("terminal-identity")).toBeInTheDocument(),
  );

  return { container, input };
}

describe("App terminal layout", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    (window as any).electronAPI = {
      checkStatus: vi
        .fn()
        .mockResolvedValue({ connected: true, mode: "sql", server: "srv" }),
      searchTerminal: vi
        .fn()
        .mockResolvedValue({ source: "sql", data: terminal }),
      ping: vi.fn(),
      stopPing: vi.fn(),
      onPingData: vi.fn().mockReturnValue(() => {}),
      onPingEnd: vi.fn().mockReturnValue(() => {}),
    };
  });

  it("orders identity, console, details and activity", async () => {
    await renderLoadedApp();

    const assertOrder = (testIds: string[]) => {
      const ordered = testIds.map((id) => screen.getByTestId(id));

      for (let index = 0; index < ordered.length - 1; index += 1) {
        const relation = ordered[index].compareDocumentPosition(
          ordered[index + 1],
        );
        expect(relation & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      }
    };

    assertOrder([
      "terminal-identity",
      "live-ping-console",
      "terminal-details",
      "activity-panel",
    ]);

    // La consola arranca abierta, así que el viewport ya está montado.
    expect(
      screen.getByRole("button", { name: /consola/i }),
    ).toHaveAttribute("aria-expanded", "true");

    assertOrder([
      "terminal-identity",
      "terminal-scroll-container",
      "terminal-details",
      "activity-panel",
    ]);
  });

  it("arranca con la consola abierta tras el ping automático y se puede colapsar", async () => {
    await renderLoadedApp();

    const consoleTrigger = screen.getByRole("button", { name: /consola/i });
    expect(consoleTrigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByTestId("terminal-scroll-container")).toBeInTheDocument();

    // La cabecera de la consola sigue visible y accesible tras el colapso manual.
    fireEvent.click(consoleTrigger);
    expect(consoleTrigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByTestId("terminal-scroll-container")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Consola de 192.0.2.100" }),
    ).toBeInTheDocument();

    // Detener el ping automático no debe reabrir la consola.
    fireEvent.click(
      screen.getByRole("button", { name: "Detener Ping en vivo" }),
    );
    expect(consoleTrigger).toHaveAttribute("aria-expanded", "false");

    // Iniciar un ping desde la barra sí es una acción del operador.
    fireEvent.click(screen.getByRole("button", { name: "Iniciar Ping" }));

    await waitFor(() =>
      expect(consoleTrigger).toHaveAttribute("aria-expanded", "true"),
    );
    expect(screen.getByTestId("terminal-scroll-container")).toBeInTheDocument();
  });

  it("refresca el uptime desde el menú Más y actualiza el chip", async () => {
    const updated = { ...terminal, uptimeText: "4 day(s), 1 hour(s)" };
    (window as any).electronAPI.searchTerminal = vi
      .fn()
      .mockResolvedValueOnce({ source: "sql", data: terminal })
      .mockResolvedValue({ source: "sql", data: updated });

    await renderLoadedApp();

    fireEvent.click(screen.getByRole("button", { name: /más acciones/i }));
    fireEvent.click(screen.getByRole("button", { name: /refrescar uptime/i }));

    await waitFor(() =>
      expect((window as any).electronAPI.searchTerminal).toHaveBeenCalledTimes(
        2,
      ),
    );
    await waitFor(() =>
      expect(screen.getByTitle(/Uptime: 4 day/i)).toBeInTheDocument(),
    );
    expect(screen.queryByText(/Uptime actualizado:/i)).toBeNull();
  });

  it("does not hijack the native context menu inside the search input", async () => {
    const { input } = await renderLoadedApp();

    fireEvent.contextMenu(input);

    expect(screen.queryByText("Copiar IP")).not.toBeInTheDocument();
  });

  it("keeps the operator context menu outside editable fields", async () => {
    await renderLoadedApp();

    fireEvent.contextMenu(screen.getByTestId("terminal-identity"));

    expect(screen.getByText("Copiar IP")).toBeInTheDocument();
  });

  it("does not disable text selection globally", async () => {
    const { container } = await renderLoadedApp();

    expect(container.firstChild).not.toHaveClass("select-none");
  });
});
