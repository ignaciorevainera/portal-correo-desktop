import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { InfoModal } from "./InfoModal";

vi.mock("../services/electronClient", () => ({
  openExternalUrl: vi.fn(),
}));

describe("InfoModal", () => {
  it("renders modal header and capabilities items properly", () => {
    render(<InfoModal isOpen={true} onClose={vi.fn()} appVersion="v1.2.0" />);

    expect(screen.getByText("Portal Correo Desktop")).toBeInTheDocument();
    expect(screen.getByText("v1.2.0")).toBeInTheDocument();
    expect(
      screen.getByText("Búsqueda rápida de puestos de trabajo e IPs")
    ).toBeInTheDocument();
    expect(screen.getByText("Ctrl + F")).toBeInTheDocument();
    expect(screen.getByText("Portal MDA")).toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", () => {
    const handleClose = vi.fn();
    render(<InfoModal isOpen={true} onClose={handleClose} />);

    const closeButtons = screen.getAllByRole("button", { name: "Cerrar" });
    expect(closeButtons.length).toBeGreaterThan(0);
    fireEvent.click(closeButtons[0]);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
