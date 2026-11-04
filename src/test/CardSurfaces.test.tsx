import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TerminalDetailsGrid } from "@/components/TerminalDetailsGrid";
import { LivePingConsole } from "@/components/LivePingConsole";
import { ActivityPanel } from "@/components/ActivityPanel";
import { TerminalData } from "@/types/terminal";
import { getAllTerminals } from "@/services/terminalService";

const terminal = getAllTerminals()[0] as TerminalData;

const CARD_CHROME = ["bg-card", "ring-1", "rounded-xl", "shadow-xs"];

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

  it("la consola usa la misma Card y una cabecera sin tinte propio", () => {
    const { container } = render(
      <LivePingConsole ip="192.0.2.100" isPinging={false} onTogglePing={vi.fn()} />,
    );

    const card = container.querySelector('[data-slot="card"]');
    expect(card).not.toBeNull();
    expect(card).toHaveClass(...CARD_CHROME);

    const header = screen.getByTestId("console-header");
    expect(header).toHaveClass("border-b", "px-3", "py-2.5");
    expect(header.className).not.toContain("bg-muted");
  });

  it("la tabla de alertas vive en la misma Card y su cabecera tampoco tiene tinte", () => {
    const { container } = render(
      <ActivityPanel
        terminal={terminal}
        onAddAlert={vi.fn()}
        onCloseAlert={vi.fn()}
        onRequestReset={vi.fn()}
      />,
    );

    const card = container.querySelector('[data-slot="card"]');
    expect(card).not.toBeNull();
    expect(card).toHaveClass(...CARD_CHROME);
    expect(screen.getByRole("region", { name: /alertas y reseteos/i })).toBe(
      card,
    );

    const header = screen.getByTestId("activity-header");
    expect(header).toHaveClass("border-b", "px-3", "py-2.5");
    expect(header.className).not.toContain("bg-muted");
  });
});
