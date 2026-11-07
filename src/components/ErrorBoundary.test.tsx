import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { ErrorBoundary } from "./ErrorBoundary";

function Boom(): React.JSX.Element {
  throw new Error("fallo interno /ruta/secreta/app.js");
}

describe("ErrorBoundary", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("muestra un mensaje amigable sin stack ni rutas internas", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );

    expect(
      screen.getByRole("heading", { name: /no pudimos iniciar la aplicación/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/qué podés hacer/i)).toBeInTheDocument();
    expect(screen.queryByText(/ruta\/secreta/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/fallo interno/i)).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /reintentar/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /recargar app/i }),
    ).toBeInTheDocument();
  });
});
