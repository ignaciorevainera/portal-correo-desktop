import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TerminalDetailsGrid } from "@/components/TerminalDetailsGrid";
import { TerminalData } from "@/types/terminal";
import { getAllTerminals } from "@/services/terminalService";

const terminal = getAllTerminals()[0] as TerminalData;

describe("superficies con Card", () => {
  it("la grilla de datos usa la primitiva Card", () => {
    const { container } = render(<TerminalDetailsGrid terminal={terminal} />);
    expect(container.querySelectorAll('[data-slot="card"]').length).toBe(1);
    expect(container.querySelector('[data-slot="card-title"]')).not.toBeNull();

    // La Card conserva el landmark que tenía el <section aria-labelledby>.
    expect(
      screen.getByRole("region", { name: /datos del equipo/i }),
    ).toBeInTheDocument();
  });
});
