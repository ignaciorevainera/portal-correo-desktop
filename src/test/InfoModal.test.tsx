import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { InfoModal } from "../components/InfoModal";
import * as electronClient from "../services/electronClient";

describe("InfoModal Component", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
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
    const desc = screen.getByText("Consola técnica de soporte y monitoreo corporativo");
    expect(desc).toBeInTheDocument();
    expect(desc.className).not.toContain("truncate");
    expect(desc.className).toContain("wrap-break-word");

    const logo = screen.getByAltText("Correo Argentino");
    expect(logo).toBeInTheDocument();
    const logoContainer = logo.parentElement;
    expect(logoContainer?.className).toContain("hidden");
    expect(logoContainer?.className).toContain("sm:flex");
    expect(screen.getByRole("dialog").className).toContain(
      "max-sm:max-w-[calc(100vw-1.5rem)]",
    );
  });

  it("renders key capabilities list including floating monitors, net user and keyboard shortcuts", () => {
    render(<InfoModal isOpen={true} onClose={vi.fn()} />);

    expect(
      screen.getByText("Búsqueda rápida de puestos de trabajo e IPs"),
    ).toBeInTheDocument();
    expect(screen.getByText("Ctrl + F")).toBeInTheDocument();

    expect(
      screen.getByText(
        "Monitores flotantes independientes de diagnóstico (hasta 4 ventanas)",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Ctrl + Shift + Espacio")).toBeInTheDocument();

    expect(
      screen.getByText(
        "Consulta de cuenta Active Directory (net user) por username",
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        "Diagnóstico ICMP en vivo (estándar, continuo -t y enlaces de sucursal)",
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByText("Asistencia remota integrada (VNC Viewer y MSRA)"),
    ).toBeInTheDocument();

    expect(
      screen.getByText("Escaneo inteligente de subred y enlaces de sucursal"),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        "Accesibilidad y visualización (Alto Contraste y escala de texto)",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Ctrl + / -")).toBeInTheDocument();

    expect(
      screen.getByText("Ajustes del aplicativo y diagnóstico corporativo"),
    ).toBeInTheDocument();
    expect(screen.getByText("F10")).toBeInTheDocument();

    // Verificamos que las secciones y textos eliminados no estén presentes
    expect(screen.queryByText(/gerencia de tecnología/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/plataforma:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/conectividad:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/políticas:/i)).not.toBeInTheDocument();
  });

  it("abre el Portal MDA desde la sección de acceso directo y cierra el diálogo", async () => {
    const openSpy = vi
      .spyOn(electronClient, "openExternalUrl")
      .mockResolvedValue();
    const handleClose = vi.fn();

    render(<InfoModal isOpen={true} onClose={handleClose} />);

    expect(screen.getByText(/acceso directo/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /abrir portal mda/i }));

    await waitFor(() => {
      expect(openSpy).toHaveBeenCalledWith(
        "https://mda.correo.local/inventario-terminales",
      );
    });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("invokes onClose on Cerrar button click", () => {
    const handleClose = vi.fn();
    render(<InfoModal isOpen={true} onClose={handleClose} />);

    const closeButtons = screen.getAllByRole("button", { name: /cerrar/i });
    expect(closeButtons.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(closeButtons[0]);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
  it("garantiza contención en viewport y scroll adaptativo en pantallas reducidas o zoom alto", () => {
    const { container } = render(<InfoModal isOpen={true} onClose={vi.fn()} />);

    const dialog = screen.getByRole("dialog");
    expect(dialog.className).toContain("max-h-[calc(100vh-2rem)]");
    expect(dialog.className).toContain("flex");
    expect(dialog.className).toContain("flex-col");
    expect(dialog.className).toContain("overflow-hidden");

    const scrollContainer = dialog.querySelector(".overflow-y-auto");
    expect(scrollContainer).toBeInTheDocument();
    expect(scrollContainer?.className).toContain("flex-1");
  });
});