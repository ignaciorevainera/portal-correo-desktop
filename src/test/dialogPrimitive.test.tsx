import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Dialog, DialogContent, DialogTitle } from "../components/ui/dialog";

describe("DialogContent compacto", () => {
  it("mantiene un margen de viewport bajo 640 px", () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Prueba</DialogTitle>
          Contenido
        </DialogContent>
      </Dialog>,
    );

    expect(screen.getByRole("dialog").className).toContain(
      "max-sm:max-w-[calc(100%-1.5rem)]",
    );
  });
});
