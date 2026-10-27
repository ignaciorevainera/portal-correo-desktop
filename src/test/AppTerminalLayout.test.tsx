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
  userNt: "soporte.central",
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
  const input = screen.getByPlaceholderText(/buscar terminal o ip/i);

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

    const ordered = [
      screen.getByTestId("terminal-identity"),
      screen.getByTestId("terminal-scroll-container"),
      screen.getByTestId("terminal-details"),
      screen.getByTestId("activity-panel"),
    ];

    for (let index = 0; index < ordered.length - 1; index += 1) {
      const relation = ordered[index].compareDocumentPosition(
        ordered[index + 1],
      );
      expect(relation & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
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
