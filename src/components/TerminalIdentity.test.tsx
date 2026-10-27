import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TerminalIdentity } from "./TerminalIdentity";
import { getAllTerminals } from "../services/terminalService";

describe("TerminalIdentity", () => {
  const terminal = getAllTerminals()[0];

  it("shows hostname, IP, sede and user as the identity block", () => {
    render(<TerminalIdentity terminal={terminal} />);

    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      terminal.pc,
    );
    expect(screen.getByText(terminal.ip)).toBeInTheDocument();
    expect(screen.getByText(terminal.location as string)).toBeInTheDocument();
    expect(screen.getByText(terminal.userNt)).toBeInTheDocument();
  });

  it("copies the IP from a 24px target", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<TerminalIdentity terminal={terminal} />);

    const button = screen.getByRole("button", { name: "Copiar IP" });
    expect(button).toHaveClass("size-6");

    fireEvent.click(button);
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(terminal.ip));
  });

  it("falls back when the hostname is missing or equals the IP", () => {
    render(<TerminalIdentity terminal={{ ...terminal, pc: terminal.ip }} />);

    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "No especificado",
    );
  });
});
