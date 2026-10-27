import React from "react";
import { MapPin, User } from "lucide-react";
import { TerminalData } from "../types/terminal";
import { CopyValueButton } from "./CopyValueButton";

export function TerminalIdentity({
  terminal,
}: {
  terminal: TerminalData;
}): React.JSX.Element {
  const hostname =
    terminal.pc?.trim() && terminal.pc !== terminal.ip
      ? terminal.pc
      : "No especificado";
  const hasHostname = hostname !== "No especificado";

  return (
    <section
      data-testid="terminal-identity"
      aria-labelledby="terminal-identity-title"
      className="space-y-1 px-0.5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1">
          <h2
            id="terminal-identity-title"
            className="truncate font-heading text-lg font-bold leading-tight text-foreground"
            title={hostname}
          >
            {hostname}
          </h2>
          {hasHostname && (
            <CopyValueButton value={terminal.pc} label="Copiar hostname" />
          )}
        </div>

        <div className="flex items-center gap-1">
          <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
            {terminal.ip || "Sin IP"}
          </span>
          {terminal.ip && <CopyValueButton value={terminal.ip} label="Copiar IP" />}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">
            {terminal.location?.trim() || "Sede no especificada"}
          </span>
        </span>
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <User className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate font-mono">
            {terminal.userNt?.trim() || "Sin sesión"}
          </span>
        </span>
      </div>
    </section>
  );
}
