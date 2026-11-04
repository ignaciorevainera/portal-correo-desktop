import React from "react";
import { MapPin, User, Users } from "lucide-react";
import { TerminalData } from "../types/terminal";
import { CopyValueButton } from "./CopyValueButton";
import { Button } from "@/components/ui/button";
import { splitUsernames } from "@/lib/usernames";

export function TerminalIdentity({
  terminal,
  onQueryAccount,
}: {
  terminal: TerminalData;
  onQueryAccount?: () => void;
}): React.JSX.Element {
  const hostname =
    terminal.pc?.trim() && terminal.pc !== terminal.ip
      ? terminal.pc
      : "No especificado";
  const hasHostname = hostname !== "No especificado";
  const validUsers = splitUsernames(terminal.userNt);

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
          {terminal.userNt?.trim() && (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label="Consultar cuenta AD"
              title={
                validUsers.length === 0
                  ? "El usuario NT contiene caracteres no permitidos"
                  : "Consultar cuenta AD"
              }
              disabled={validUsers.length === 0}
              onClick={() => onQueryAccount?.()}
              className="text-muted-foreground hover:text-foreground"
            >
              <Users className="h-3.5 w-3.5" />
            </Button>
          )}
        </span>
      </div>
    </section>
  );
}
