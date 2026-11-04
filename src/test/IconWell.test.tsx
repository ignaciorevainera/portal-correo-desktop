import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Cpu } from "lucide-react";
import { IconWell } from "../components/IconWell";

describe("IconWell", () => {
  it("envuelve el icono con el tinte y el radio del tamaño pedido", () => {
    render(
      <IconWell size="sm" data-testid="well">
        <Cpu aria-hidden="true" />
      </IconWell>,
    );

    const well = screen.getByTestId("well");
    expect(well.className).toContain("bg-primary/10");
    expect(well.className).toContain("text-link");
    expect(well.className).toContain("rounded-md");
    expect(well.className).toContain("p-1");
    expect(well.querySelector("svg")).not.toBeNull();
  });

  it("usa el tamaño md por defecto y acepta clases extra", () => {
    render(
      <IconWell data-testid="well" className="border border-primary/20">
        <Cpu aria-hidden="true" />
      </IconWell>,
    );

    const well = screen.getByTestId("well");
    expect(well.className).toContain("rounded-lg");
    expect(well.className).toContain("p-2");
    expect(well.className).toContain("border-primary/20");
  });
});
