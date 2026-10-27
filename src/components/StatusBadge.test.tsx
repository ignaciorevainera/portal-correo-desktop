import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusBadge } from "./StatusBadge";

describe("StatusBadge", () => {
  it("renders the label and the semantic dot for each tone", () => {
    const { container, rerender } = render(
      <StatusBadge tone="success">Cerrada</StatusBadge>,
    );

    expect(screen.getByText("Cerrada")).toBeInTheDocument();
    expect(container.querySelector('[aria-hidden="true"]')).toHaveClass(
      "bg-success",
    );

    rerender(<StatusBadge tone="warning">Activa</StatusBadge>);
    expect(container.querySelector('[aria-hidden="true"]')).toHaveClass(
      "bg-warning",
    );

    rerender(<StatusBadge tone="info">Pendiente</StatusBadge>);
    expect(container.querySelector('[aria-hidden="true"]')).toHaveClass(
      "bg-info",
    );

    rerender(<StatusBadge tone="neutral">Sin estado</StatusBadge>);
    expect(container.querySelector('[aria-hidden="true"]')).toHaveClass(
      "bg-muted-foreground",
    );
  });
});
