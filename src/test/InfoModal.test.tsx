import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { InfoModal } from "../components/InfoModal";

describe("InfoModal Component", () => {
  it("does not render when isOpen is false", () => {
    const { container } = render(
      <InfoModal isOpen={false} onClose={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders minimal header with brand logo, title and app version", () => {
    render(<InfoModal isOpen={true} onClose={vi.fn()} appVersion="v2.1.0" />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Portal Correo Desktop")).toBeInTheDocument();
    expect(screen.getByText("v2.1.0")).toBeInTheDocument();
    expect(
      screen.getByText("Consola técnica de soporte y monitoreo corporativo"),
    ).toBeInTheDocument();
    expect(screen.getByAltText("Correo Argentino")).toBeInTheDocument();
  });

  it("renders key capabilities list including net user for username and shortcut kbd badge", () => {
    render(<InfoModal isOpen={true} onClose={vi.fn()} />);

    expect(
      screen.getByText("Búsqueda rápida de puestos de trabajo e IPs"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Consulta de cuenta Active Directory (net user) por username"),
    ).toBeInTheDocument();
    expect(screen.getByText("Ctrl + F")).toBeInTheDocument();
    expect(
      screen.getByText("Diagnóstico ICMP en vivo (estándar y continuo -t)"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Asistencia remota integrada (VNC Viewer y MSRA)"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Escaneo inteligente de subred y enlaces de sucursal"),
    ).toBeInTheDocument();

    // Verificamos que las secciones y textos eliminados no estén presentes
    expect(screen.queryByText(/gerencia de tecnología/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/plataforma:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/conectividad:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/políticas:/i)).not.toBeInTheDocument();
  });

  it("invokes onClose on Cerrar button click", () => {
    const handleClose = vi.fn();
    render(<InfoModal isOpen={true} onClose={handleClose} />);

    const closeButtons = screen.getAllByRole("button", { name: /cerrar/i });
    expect(closeButtons.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(closeButtons[0]);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
