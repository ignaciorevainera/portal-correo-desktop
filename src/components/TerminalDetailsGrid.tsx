import React from "react";
import { TerminalData } from "../types/terminal";
import { CopyValueButton } from "./CopyValueButton";
import { cn } from "@/lib/utils";

const FALLBACK = "No informado";

interface DetailField {
  label: string;
  value?: string;
  mono?: boolean;
  copyLabel?: string;
}

function buildFields(terminal: TerminalData): DetailField[] {
  return [
    {
      label: "Dirección MAC",
      value: terminal.mac,
      mono: true,
      copyLabel: "Copiar MAC",
    },
    { label: "Sistema operativo", value: terminal.os },
    { label: "Build / Service Pack", value: terminal.servicePack, mono: true },
    { label: "Procesador", value: terminal.cpuModel },
    { label: "Memoria RAM", value: terminal.ram, mono: true },
    { label: "Arquitectura", value: terminal.architecture },
    { label: "Último relevamiento", value: terminal.surveyDate, mono: true },
    { label: "Antivirus", value: terminal.antivirusVersion },
    { label: "Navegador", value: terminal.ieVersion },
    { label: "Centro de costo", value: terminal.costCenter },
  ];
}

export function TerminalDetailsGrid({
  terminal,
}: {
  terminal: TerminalData;
}): React.JSX.Element {
  const fields = buildFields(terminal);

  return (
    <section
      data-testid="terminal-details"
      aria-labelledby="terminal-details-title"
      className="rounded-lg border border-border bg-card px-3 py-2.5"
    >
      <h2
        id="terminal-details-title"
        className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
      >
        Datos del equipo
      </h2>

      <dl className="mt-2 grid grid-cols-1 gap-x-8 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {fields.map((field) => {
          const raw = field.value?.trim();
          const display = raw && raw.length > 0 ? raw : FALLBACK;
          const isEmpty = display === FALLBACK;

          return (
            <div key={field.label} className="min-w-0 space-y-0.5">
              <dt className="text-xs font-medium text-muted-foreground">
                {field.label}
              </dt>
              <dd
                className={cn(
                  "flex min-w-0 items-center gap-1 text-sm leading-snug text-foreground",
                  field.mono && !isEmpty && "font-mono tabular-nums",
                  isEmpty && "italic text-muted-foreground",
                )}
              >
                <span className="truncate" title={display}>
                  {display}
                </span>
                {!isEmpty && field.copyLabel && (
                  <CopyValueButton value={display} label={field.copyLabel} />
                )}
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
