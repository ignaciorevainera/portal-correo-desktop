import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Hint } from "../components/Hint";

function renderHint(): HTMLButtonElement {
  render(
    <Hint label="Copiar logs completos">
      <button type="button" aria-label="Copiar logs">Copiar</button>
    </Hint>,
  );
  return screen.getByRole("button", { name: "Copiar logs" });
}

describe("Hint", () => {
  it("se monta sin provider externo y describe al hijo", async () => {
    const button = renderHint();
    expect(button).toHaveAccessibleName("Copiar logs");

    fireEvent.focus(button);
    const tooltip = await screen.findByRole("tooltip");
    expect(tooltip).toHaveTextContent("Copiar logs completos");
    expect(button).toHaveAccessibleDescription("Copiar logs completos");
  });

  it("la descripción desaparece al salir con el foco", async () => {
    const button = renderHint();
    fireEvent.focus(button);
    await screen.findByRole("tooltip");
    fireEvent.blur(button);
    expect(screen.queryByRole("tooltip")).toBeNull();
    expect(button).not.toHaveAttribute("aria-describedby");
  });
});
