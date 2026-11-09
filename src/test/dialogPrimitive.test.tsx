import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Dialog, DialogContent, DialogTitle } from "../components/ui/dialog";

describe("DialogContent compacto", () => {
  it("mantiene un margen de viewport bajo 640 px y resguardo vertical en pantalla", () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Prueba</DialogTitle>
          Contenido
        </DialogContent>
      </Dialog>,
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog.className).toContain("max-sm:max-w-[calc(100%-1.5rem)]");
    expect(dialog.className).toContain("max-h-[calc(100vh-2rem)]");
  });
});
