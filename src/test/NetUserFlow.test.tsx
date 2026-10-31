import React from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
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
  userNt: "jperez",
  architecture: "x64-based PC",
  surveyDate: "25/10/2026",
  uptimeText: "3 day(s)",
  location: "Sede Central",
  costCenter: "CC 100",
  alerts: [],
  resetHistory: [],
};

function mockApi(searchResult: unknown) {
  const startCommand = vi.fn();
  const stopCommand = vi.fn();
  const searchTerminal = vi.fn().mockResolvedValue(searchResult);
  let commandEnd: ((code: number) => void) | null = null;

  (window as any).electronAPI = {
    checkStatus: vi
      .fn()
      .mockResolvedValue({ connected: true, mode: "sql", server: "srv" }),
    searchTerminal,
    ping: vi.fn(),
    stopPing: vi.fn(),
    onPingData: vi.fn().mockReturnValue(() => {}),
    onPingEnd: vi.fn().mockReturnValue(() => {}),
    startCommand,
    stopCommand,
    onCommandData: vi.fn().mockReturnValue(() => {}),
    onCommandEnd: vi.fn((callback: (code: number) => void) => {
      commandEnd = callback;
      return () => {};
    }),
  };

  return {
    startCommand,
    stopCommand,
    searchTerminal,
    emitCommandEnd: (code = 0) => commandEnd?.(code),
  };
}

async function search(query: string) {
  const input = screen.getByPlaceholderText(/buscar terminal/i);
  fireEvent.change(input, { target: { value: query } });
  fireEvent.keyDown(input, { key: "Enter", code: "Enter" });
}

describe("Net user flow", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("runs net user in the console from the identity button", async () => {
    const { startCommand } = mockApi({ source: "sql", data: terminal });
    render(<App />);
    await search("WS-CORP-100");

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Consultar cuenta AD" }),
      ).toBeInTheDocument(),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Consultar cuenta AD" }),
    );

    await waitFor(() =>
      expect(startCommand).toHaveBeenCalledWith(
        expect.objectContaining({ command: "netuser", target: "jperez" }),
      ),
    );
  });

  it("opens the chooser when the terminal has several users", async () => {
    const { startCommand } = mockApi({
      source: "sql",
      data: { ...terminal, userNt: "jperez | mgomez" },
    });
    render(<App />);
    await search("WS-CORP-100");

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Consultar cuenta AD" }),
      ).toBeInTheDocument(),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Consultar cuenta AD" }),
    );

    fireEvent.click(screen.getByLabelText("mgomez"));
    fireEvent.click(screen.getByRole("button", { name: "Consultar" }));

    await waitFor(() =>
      expect(startCommand).toHaveBeenCalledWith(
        expect.objectContaining({ command: "netuser", target: "mgomez" }),
      ),
    );
  });

  it("routes an account-like query straight to the account console", async () => {
    const { startCommand, searchTerminal } = mockApi({
      source: "sql",
      data: null,
    });
    render(<App />);
    await search("jperez");

    expect(await screen.findByText(/Cuenta AD · jperez/)).toBeInTheDocument();
    expect(searchTerminal).not.toHaveBeenCalled();
    expect(
      screen.queryByText(/No se encontró la terminal/i),
    ).not.toBeInTheDocument();

    await waitFor(() =>
      expect(startCommand).toHaveBeenCalledWith(
        expect.objectContaining({ command: "netuser", target: "jperez" }),
      ),
    );
  });

  it("falls back to the account console when a short username is not a terminal", async () => {
    const { startCommand, searchTerminal } = mockApi({
      source: "sql",
      data: null,
    });
    render(<App />);
    await search("juan");

    expect(searchTerminal).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/Cuenta AD · juan/)).toBeInTheDocument();
    expect(
      screen.queryByText(/No se encontró la terminal/i),
    ).not.toBeInTheDocument();

    await waitFor(() =>
      expect(startCommand).toHaveBeenCalledWith(
        expect.objectContaining({ command: "netuser", target: "juan" }),
      ),
    );
  });

  it("keeps the not-found state for invalid usernames", async () => {
    mockApi({ source: "sql", data: null });
    render(<App />);
    await search("operador.demo01");

    expect(
      await screen.findByText(/No se encontró la terminal/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Cuenta AD ·/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /como cuenta ad/i }),
    ).not.toBeInTheDocument();
  });

  it("re-runs the command from the console header", async () => {
    const { startCommand, emitCommandEnd } = mockApi({
      source: "sql",
      data: null,
    });
    render(<App />);
    await search("jperez");

    await waitFor(() =>
      expect(startCommand).toHaveBeenCalledTimes(1),
    );

    act(() => {
      emitCommandEnd(0);
    });

    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: /detener/i }),
      ).not.toBeInTheDocument(),
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Re-ejecutar consulta" }),
    );

    await waitFor(() =>
      expect(startCommand).toHaveBeenCalledTimes(2),
    );
  });

  it("does not render close or Volver and leaves by searching another target", async () => {
    mockApi({ source: "sql", data: null });
    render(<App />);
    await search("jperez");

    expect(await screen.findByText(/Cuenta AD · jperez/)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Volver" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /cerrar consulta/i }),
    ).not.toBeInTheDocument();

    await search("mgomez");

    expect(await screen.findByText(/Cuenta AD · mgomez/)).toBeInTheDocument();
    expect(screen.queryByText(/Cuenta AD · jperez/)).not.toBeInTheDocument();
  });

  it("hides Detener when net user completes", async () => {
    const { emitCommandEnd } = mockApi({ source: "sql", data: null });
    render(<App />);
    await search("jperez");

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /detener/i }),
      ).toBeInTheDocument(),
    );

    act(() => {
      emitCommandEnd(0);
    });

    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: /detener/i }),
      ).not.toBeInTheDocument(),
    );
  });
});
