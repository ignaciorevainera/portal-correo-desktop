import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  CloseAlertDialog,
  NewAlertDialog,
  RequestResetDialog,
} from "../components/ActivityDialogs";
import { NetUserChooserDialog } from "../components/NetUserChooserDialog";

const TITLE_ERROR = "El título debe tener al menos 3 caracteres.";

describe("ActivityDialogs accesibilidad", () => {
  it("el campo de título está cableado con label y descripción", () => {
    render(<NewAlertDialog open onOpenChange={vi.fn()} onSubmit={vi.fn()} />);

    const input = screen.getByLabelText("Título");
    expect(input).toHaveAttribute("aria-invalid", "false");
    expect(input).toHaveAttribute("aria-describedby", "new-alert-title-help");
    expect(input).toHaveAccessibleDescription(
      /como encabezado de la alerta en el panel de actividad/i,
    );
  });

  it("el título pasa a inválido con menos de 3 caracteres y se recupera", () => {
    render(<NewAlertDialog open onOpenChange={vi.fn()} onSubmit={vi.fn()} />);

    const input = screen.getByLabelText("Título");

    fireEvent.change(input, { target: { value: "Di" } });

    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute(
      "aria-describedby",
      "new-alert-title-help new-alert-title-error",
    );
    expect(input).toHaveAccessibleDescription(/al menos 3 caracteres/i);
    expect(screen.getByText(TITLE_ERROR)).toBeInTheDocument();

    fireEvent.change(input, { target: { value: "Disco" } });

    expect(input).toHaveAttribute("aria-invalid", "false");
    expect(input).toHaveAttribute("aria-describedby", "new-alert-title-help");
    expect(input).toHaveAccessibleDescription(
      /como encabezado de la alerta en el panel de actividad/i,
    );
    expect(screen.queryByText(TITLE_ERROR)).not.toBeInTheDocument();
  });

  it("descripción y operador conservan label y ayuda asociada", () => {
    render(<NewAlertDialog open onOpenChange={vi.fn()} onSubmit={vi.fn()} />);

    const description = screen.getByLabelText("Descripción");
    expect(description).toBeInTheDocument();
    expect(description).not.toHaveAttribute("aria-describedby");

    const operator = screen.getByLabelText("Operador");
    expect(operator).toHaveAttribute(
      "aria-describedby",
      "new-alert-operator-help",
    );
    expect(operator).toHaveAccessibleDescription(
      /cuenta de dominio del operador/i,
    );
  });

  it("el motivo del reseteo conserva su label y no inventa descripción", () => {
    render(
      <RequestResetDialog open onOpenChange={vi.fn()} onSubmit={vi.fn()} />,
    );

    const reason = screen.getByLabelText("Motivo del reseteo");
    expect(reason).toBeInTheDocument();
    expect(reason).not.toHaveAttribute("aria-describedby");
  });

  it("la resolución del cierre conserva su label y no inventa descripción", () => {
    render(
      <CloseAlertDialog
        open
        alertTitle="Disco lleno"
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    const resolution = screen.getByLabelText("Resolución");
    expect(resolution).toBeInTheDocument();
    expect(resolution).not.toHaveAttribute("aria-describedby");
  });
});

describe("NetUserChooserDialog accesibilidad", () => {
  it("mantiene los radios accesibles y despacha la opción elegida", () => {
    const onSubmit = vi.fn();
    render(
      <NetUserChooserDialog
        open
        users={["jperez", "mgomez"]}
        onOpenChange={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByLabelText("jperez")).toHaveAttribute("type", "radio");
    fireEvent.click(screen.getByLabelText("mgomez"));
    fireEvent.click(screen.getByRole("button", { name: "Consultar" }));

    expect(onSubmit).toHaveBeenCalledWith("mgomez");
  });

  it("asocia el error de usuario inválido y lo limpia al corregirlo", () => {
    render(
      <NetUserChooserDialog
        open
        users={[]}
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    const input = screen.getByLabelText("Usuario");
    expect(input).toHaveAttribute("aria-invalid", "false");
    expect(input).not.toHaveAttribute("aria-describedby");

    fireEvent.change(input, { target: { value: "operador.demo01" } });

    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription(/solo letras y números/i);
    expect(
      screen.getByText(/solo letras y números, sin dominio ni símbolos/i),
    ).toBeInTheDocument();

    fireEvent.change(input, { target: { value: "jperez" } });

    expect(input).toHaveAttribute("aria-invalid", "false");
    expect(input).not.toHaveAttribute("aria-describedby");
    expect(
      screen.queryByText(/solo letras y números, sin dominio ni símbolos/i),
    ).not.toBeInTheDocument();
  });
});
