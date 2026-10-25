import React from 'react';
import { TerminalData } from '../types/terminal';
import { Cpu, HardDrive, Shield, Globe, Calendar, Layers } from 'lucide-react';

export function HardwareCard({ terminal }: { terminal: TerminalData }): React.JSX.Element {
  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4 shadow-sm">
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <h2 className="text-sm font-semibold font-heading text-foreground flex items-center gap-2">
          <Cpu className="h-4 w-4 text-primary" />
          Ficha Técnica & Sistema
        </h2>
        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">
          {terminal.architecture}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        <div className="space-y-1">
          <span className="text-muted-foreground font-medium flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-muted-foreground" /> Sistema Operativo
          </span>
          <p className="font-semibold text-foreground">{terminal.os}</p>
          <p className="font-mono text-[11px] text-muted-foreground truncate" title={terminal.servicePack}>
            Build: {terminal.servicePack}
          </p>
        </div>

        <div className="space-y-1">
          <span className="text-muted-foreground font-medium flex items-center gap-1.5">
            <Cpu className="h-3.5 w-3.5 text-muted-foreground" /> Modelo y CPU
          </span>
          <p className="text-foreground font-mono text-[11px] line-clamp-2" title={terminal.cpuModel}>
            {terminal.cpuModel}
          </p>
        </div>

        <div className="space-y-1">
          <span className="text-muted-foreground font-medium flex items-center gap-1.5">
            <HardDrive className="h-3.5 w-3.5 text-muted-foreground" /> Memoria RAM
          </span>
          <p className="font-mono font-semibold text-foreground">{terminal.ram}</p>
        </div>

        <div className="space-y-1">
          <span className="text-muted-foreground font-medium flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-emerald-500" /> Antivirus
          </span>
          <p className="font-mono text-foreground">{terminal.antivirusVersion}</p>
        </div>

        <div className="space-y-1">
          <span className="text-muted-foreground font-medium flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5 text-blue-500" /> Internet Explorer
          </span>
          <p className="font-mono text-foreground">{terminal.ieVersion}</p>
        </div>

        <div className="space-y-1">
          <span className="text-muted-foreground font-medium flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" /> Fecha de Relevamiento
          </span>
          <p className="font-mono text-foreground">{terminal.surveyDate}</p>
        </div>
      </div>
    </div>
  );
}
