import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SettingsModal } from "./SettingsModal";
import * as electronClient from "../services/electronClient";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe("SettingsModal - estado de conexión", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("muestra el estado de conexión sin exponer el diagnóstico interno", async () => {
    vi.spyOn(electronClient, "checkBackendStatus").mockResolvedValue({
      connected: true,
      mode: "sql",
    });

    render(<SettingsModal isOpen onClose={vi.fn()} />);

    expect(await screen.findByText("SQL Online")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /reintentar conexión/i }),
    ).toBeEnabled();

    expect(screen.queryByText(/bootstrap/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/código/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/encontrado/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/AUTHORIZED/)).not.toBeInTheDocument();
  });

  it("permite reintentar la conexión y actualiza el estado", async () => {
    vi.spyOn(electronClient, "checkBackendStatus").mockResolvedValue({
      connected: false,
      mode: "mock",
    });
    const testConnection = vi
      .spyOn(electronClient, "testSqlConnection")
      .mockResolvedValue({ connected: true, mode: "sql" });

    render(<SettingsModal isOpen onClose={vi.fn()} />);

    expect(
      await screen.findByText("Modo Offline / Local"),
    ).toBeInTheDocument();

    const retryButton = screen.getByRole("button", {
      name: /reintentar conexión/i,
    });
    await waitFor(() => expect(retryButton).toBeEnabled());
    fireEvent.click(retryButton);

    await waitFor(() => expect(testConnection).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("SQL Online")).toBeInTheDocument();
    expect(
      screen.queryByText("Modo Offline / Local"),
    ).not.toBeInTheDocument();
  });
});
