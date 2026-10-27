import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  CloseAlertDialog,
  NewAlertDialog,
  RequestResetDialog,
} from "./ActivityDialogs";

describe("ActivityDialogs", () => {
  it("submits a new alert with title, description and operator", () => {
    const onSubmit = vi.fn();
    render(<NewAlertDialog open onOpenChange={vi.fn()} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/título/i), {
      target: { value: "Disco lleno" },
    });
    fireEvent.change(screen.getByLabelText(/descripción/i), {
      target: { value: "C: al 98%" },
    });
    fireEvent.click(screen.getByRole("button", { name: /registrar alerta/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      title: "Disco lleno",
      description: "C: al 98%",
      operator: "OperadorActual",
    });
  });

  it("submits a reset request with its reason", () => {
    const onSubmit = vi.fn();
    render(
      <RequestResetDialog open onOpenChange={vi.fn()} onSubmit={onSubmit} />,
    );

    fireEvent.change(screen.getByLabelText(/motivo/i), {
      target: { value: "Cuenta bloqueada" },
    });
    fireEvent.click(screen.getByRole("button", { name: /enviar solicitud/i }));

    expect(onSubmit).toHaveBeenCalledWith("Cuenta bloqueada");
  });

  it("submits the resolution when closing an alert", () => {
    const onConfirm = vi.fn();
    render(
      <CloseAlertDialog
        open
        alertTitle="Disco lleno"
        onOpenChange={vi.fn()}
        onConfirm={onConfirm}
      />,
    );

    fireEvent.change(screen.getByLabelText(/resolución/i), {
      target: { value: "Se liberó espacio" },
    });
    fireEvent.click(screen.getByRole("button", { name: /confirmar cierre/i }));

    expect(onConfirm).toHaveBeenCalledWith("Se liberó espacio");
  });
});
