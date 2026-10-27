import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TerminalDetailsGrid } from "./TerminalDetailsGrid";
import { getAllTerminals } from "../services/terminalService";
import { TerminalData } from "../types/terminal";

const emptyTerminal: TerminalData = {
  ...getAllTerminals()[0],
  mac: "",
  os: "",
  servicePack: "",
  cpuModel: "",
  ram: "",
  architecture: "",
  surveyDate: "",
  antivirusVersion: "",
  ieVersion: "",
  costCenter: "",
};

describe("TerminalDetailsGrid", () => {
  const terminal = getAllTerminals()[0];

  it("renders the remaining technical fields in a labelled grid", () => {
    render(<TerminalDetailsGrid terminal={terminal} />);

    expect(
      screen.getByRole("heading", { name: /datos del equipo/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Dirección MAC")).toBeInTheDocument();
    expect(screen.getByText(terminal.mac)).toBeInTheDocument();
    expect(screen.getByText(terminal.cpuModel)).toBeInTheDocument();
    expect(screen.getByText(terminal.antivirusVersion)).toBeInTheDocument();
    expect(screen.getByText(terminal.costCenter as string)).toBeInTheDocument();
  });

  it("falls back to 'No informado' for empty fields", () => {
    render(<TerminalDetailsGrid terminal={emptyTerminal} />);

    expect(screen.getAllByText("No informado").length).toBeGreaterThanOrEqual(6);
  });

  it("copies the MAC from a 24px target", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<TerminalDetailsGrid terminal={terminal} />);

    const button = screen.getByRole("button", { name: "Copiar MAC" });
    expect(button).toHaveClass("size-6");

    fireEvent.click(button);
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(terminal.mac));
  });
});
