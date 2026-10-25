import React from 'react';
import { TerminalData } from '../types/terminal';
import { Network, UserCheck, MapPin, Building, Key } from 'lucide-react';

export function NetworkAdCard({ terminal }: { terminal: TerminalData }): React.JSX.Element {
  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4 shadow-sm">
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <h2 className="text-sm font-semibold font-heading text-foreground flex items-center gap-2">
          <Network className="h-4 w-4 text-primary" />
          Red, Ubicación y Active Directory
        </h2>
        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-medium">
          Activo
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        <div className="space-y-1">
          <span className="text-muted-foreground font-medium">Dirección IPv4</span>
          <p className="font-mono text-sm font-bold text-foreground">{terminal.ip}</p>
        </div>

        <div className="space-y-1">
          <span className="text-muted-foreground font-medium">Dirección MAC</span>
          <p className="font-mono text-foreground">{terminal.mac}</p>
        </div>

        <div className="space-y-1 md:col-span-2">
          <span className="text-muted-foreground font-medium flex items-center gap-1.5">
            <UserCheck className="h-3.5 w-3.5 text-primary" /> Usuarios de Dominio (UserNT)
          </span>
          <div className="p-2 rounded bg-muted/60 border border-border font-mono text-xs text-foreground">
            {terminal.userNt}
          </div>
        </div>

        {terminal.location && (
          <div className="space-y-1">
            <span className="text-muted-foreground font-medium flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" /> Ubicación Física
            </span>
            <p className="text-foreground">{terminal.location}</p>
          </div>
        )}

        {terminal.costCenter && (
          <div className="space-y-1">
            <span className="text-muted-foreground font-medium flex items-center gap-1.5">
              <Building className="h-3.5 w-3.5 text-muted-foreground" /> Centro de Costos
            </span>
            <p className="text-foreground">{terminal.costCenter}</p>
          </div>
        )}
      </div>
    </div>
  );
}
