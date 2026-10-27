import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NetUserChooserDialog } from "./NetUserChooserDialog";

describe("NetUserChooserDialog", () => {
  it("selects one of the suggested users and submits it", () => {
    const onSubmit = vi.fn();

    render(
      <NetUserChooserDialog
        open
        users={["jperez", "mgomez"]}
        onOpenChange={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.click(screen.getByLabelText("mgomez"));
    fireEvent.click(screen.getByRole("button", { name: "Consultar" }));

    expect(onSubmit).toHaveBeenCalledWith("mgomez");
  });

  it("allows typing another alphanumeric user", () => {
    const onSubmit = vi.fn();

    render(
      <NetUserChooserDialog
        open
        users={[]}
        onOpenChange={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText(/usuario/i), {
      target: { value: "jperez" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Consultar" }));

    expect(onSubmit).toHaveBeenCalledWith("jperez");
  });

  it("disables submit for invalid characters", () => {
    render(
      <NetUserChooserDialog
        open
        users={[]}
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText(/usuario/i), {
      target: { value: "operador.demo01" },
    });

    expect(screen.getByRole("button", { name: "Consultar" })).toBeDisabled();
    expect(
      screen.getByText(/solo letras y números/i),
    ).toBeInTheDocument();
  });
});
