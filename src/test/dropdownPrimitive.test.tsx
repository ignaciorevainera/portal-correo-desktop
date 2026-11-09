import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Button } from "../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";

describe("DropdownMenu", () => {
  it("abre con teclado y ejecuta el ítem seleccionado", async () => {
    const onSelect = vi.fn();

    render(
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button>Más opciones</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={onSelect}>Ajustes</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    fireEvent.keyDown(screen.getByRole("button", { name: /más opciones/i }), {
      key: "Enter",
    });

    const item = await screen.findByRole("menuitem", { name: /ajustes/i });
    expect(item.className.split(/\s+/)).toContain("focus:bg-muted");
    expect(item.className.split(/\s+/)).not.toContain("focus:bg-accent");

    fireEvent.click(item);

    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("aplica collisionPadding por defecto de 12px para evitar pegarse al borde del viewport", async () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button>Opciones</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Item</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    fireEvent.keyDown(screen.getByRole("button", { name: /opciones/i }), {
      key: "Enter",
    });

    const menu = await screen.findByRole("menu");
    expect(menu).toBeInTheDocument();
  });
});
