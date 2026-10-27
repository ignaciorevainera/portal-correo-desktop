import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  ActivityPanel,
  buildActivityRows,
  parseActivityDate,
} from "./ActivityPanel";
import { TerminalData } from "../types/terminal";

const terminal: TerminalData = {
  pc: "SUC01-POS01",
  ip: "192.0.2.100",
  mac: "00:1A:2B:3C:4D:5E",
  os: "Windows 10 Pro",
  servicePack: "19045",
  cpuModel: "Intel Core i5-8500",
  ram: "16 GB",
  antivirusVersion: "Windows Defender",
  ieVersion: "11.0",
  userNt: "OPERADOR01",
  architecture: "x64",
  surveyDate: "2026-10-24",
  location: "Sucursal Central 01",
  costCenter: "CC-1044",
  uptimeText: "14 días",
  alerts: [
    {
      id: "al-1",
      title: "Falla térmica cooler",
      description: "Ruido excesivo y temperatura alta",
      date: "2026-10-24 14:30",
      operator: "JRevainera",
      active: true,
    },
    {
      id: "al-2",
      title: "Impresora térmica desconectada",
      description: "Se cambió el cable USB",
      date: "2026-10-20 09:15",
      operator: "MGomez",
      active: false,
      resolutionText: "Cable reemplazado",
    },
  ],
  resetHistory: [
    {
      id: "rs-1",
      date: "2026-10-22 11:00",
      operator: "admin.soporte",
      reason: "Desbloqueo de cuenta",
      result: "Pendiente de aprobación",
    },
  ],
};

function renderPanel(overrides: Partial<TerminalData> = {}) {
  const onAddAlert = vi.fn();
  const onCloseAlert = vi.fn();
  const onRequestReset = vi.fn();

  render(
    <ActivityPanel
      terminal={{ ...terminal, ...overrides }}
      onAddAlert={onAddAlert}
      onCloseAlert={onCloseAlert}
      onRequestReset={onRequestReset}
    />,
  );

  return { onAddAlert, onCloseAlert, onRequestReset };
}

describe("ActivityPanel", () => {
  it("parses ISO and es-AR dates and discards invalid ones", () => {
    expect(parseActivityDate("2026-10-24 14:30")).toBe(
      new Date(2026, 9, 24, 14, 30).getTime(),
    );
    expect(parseActivityDate("24/10/2026, 14:30")).toBe(
      new Date(2026, 9, 24, 14, 30).getTime(),
    );
    expect(parseActivityDate("10/10/2026 09:15")).toBe(
      new Date(2026, 9, 10, 9, 15).getTime(),
    );
    expect(parseActivityDate("sin fecha")).toBe(Number.NEGATIVE_INFINITY);
  });

  it("normalizes both kinds into one model sorted by date descending", () => {
    const rows = buildActivityRows(terminal);

    expect(rows.map((row) => row.kind)).toEqual(["alert", "reset", "alert"]);
    expect(rows.map((row) => row.status)).toEqual([
      "Activa",
      "Pendiente",
      "Cerrada",
    ]);
  });

  it("renders both kinds in a single table with the two header CTAs", () => {
    renderPanel();

    expect(
      screen.getByRole("heading", { name: /alertas y reseteos/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Falla térmica cooler")).toBeInTheDocument();
    expect(screen.getByText("Desbloqueo de cuenta")).toBeInTheDocument();
    expect(screen.getByText("Activa")).toBeInTheDocument();
    expect(screen.getByText("Pendiente")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /nueva alerta/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /pedir reset/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  it("expands a row with its detail using the keyboard-accessible button", () => {
    renderPanel();

    const rowButton = screen.getByRole("button", {
      name: /falla térmica cooler/i,
    });
    expect(rowButton).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(rowButton);

    expect(rowButton).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(/ruido excesivo/i)).toBeInTheDocument();
  });

  it("opens the new alert dialog and forwards the payload", () => {
    const { onAddAlert } = renderPanel();

    fireEvent.click(screen.getByRole("button", { name: /nueva alerta/i }));
    fireEvent.change(screen.getByLabelText(/título/i), {
      target: { value: "Sin red" },
    });
    fireEvent.change(screen.getByLabelText(/descripción/i), {
      target: { value: "No responde ping" },
    });
    fireEvent.click(screen.getByRole("button", { name: /registrar alerta/i }));

    expect(onAddAlert).toHaveBeenCalledWith({
      title: "Sin red",
      description: "No responde ping",
      operator: "OperadorActual",
    });
  });

  it("closes an active alert with a resolution", () => {
    const { onCloseAlert } = renderPanel();

    const row = screen.getByText("Falla térmica cooler").closest("tr");
    fireEvent.click(
      within(row as HTMLElement).getByRole("button", { name: "Cerrar" }),
    );

    fireEvent.change(screen.getByLabelText(/resolución/i), {
      target: { value: "Se limpió el cooler" },
    });
    fireEvent.click(screen.getByRole("button", { name: /confirmar cierre/i }));

    expect(onCloseAlert).toHaveBeenCalledWith("al-1", "Se limpió el cooler");
  });

  it("shows a compact empty state when there is no activity", () => {
    renderPanel({ alerts: [], resetHistory: [] });

    expect(
      screen.getByText(/sin alertas ni reseteos registrados/i),
    ).toBeInTheDocument();
  });
});
