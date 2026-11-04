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

  it("renders the account button for valid users and calls the handler", () => {
    const onQueryAccount = vi.fn();
    render(
      <TerminalIdentity
        terminal={{ ...terminal, userNt: "jperez" }}
        onQueryAccount={onQueryAccount}
      />,
    );

    const button = screen.getByRole("button", { name: "Consultar cuenta AD" });

    // Un único botón: el icono de la izquierda del usuario es la acción, con
    // fondo propio para leerse como clicable.
    expect(
      screen.getAllByRole("button", { name: "Consultar cuenta AD" }),
    ).toHaveLength(1);
    expect(button).toHaveClass("bg-secondary");
    expect(button.querySelector("svg")).not.toBeNull();

    const userLabel = screen.getByText("jperez");
    expect(
      button.compareDocumentPosition(userLabel) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    fireEvent.click(button);
    expect(onQueryAccount).toHaveBeenCalledTimes(1);
  });

  it("disables the account button when the NT user has invalid characters", () => {
    render(
      <TerminalIdentity
        terminal={{ ...terminal, userNt: "operador.demo01" }}
        onQueryAccount={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Consultar cuenta AD" }),
    ).toBeDisabled();
  });

  it("does not render the account button without a user", () => {
    render(
      <TerminalIdentity
        terminal={{ ...terminal, userNt: "" }}
        onQueryAccount={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Consultar cuenta AD" }),
    ).not.toBeInTheDocument();
  });
});
