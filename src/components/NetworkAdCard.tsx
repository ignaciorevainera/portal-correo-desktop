import React, { useState } from 'react';
import { TerminalData } from '../types/terminal';
import { Network, UserCheck, MapPin, Building, Copy, Check } from 'lucide-react';

export function NetworkAdCard({ terminal }: { terminal: TerminalData }): React.JSX.Element {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {}
  };

  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-3 shadow-xs">
      <div className="flex items-center justify-between border-b border-border/60 pb-2">
        <h2 className="text-xs font-bold font-heading uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Network className="h-3.5 w-3.5 text-primary" />
          Red, Ubicación y Active Directory
        </h2>
        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 font-bold">
          En Línea
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
        {/* IPv4 */}
        <div className="space-y-0.5">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground font-medium text-[11px]">Dirección IPv4</span>
            <button
              type="button"
              onClick={() => handleCopy('ip', terminal.ip)}
              aria-label="Copiar Dirección IPv4"
              title="Copiar dirección IP al portapapeles"
              className="text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1 p-0.5 rounded hover:bg-muted transition-colors cursor-pointer"
            >
              {copiedKey === 'ip' ? <Check className="h-2.5 w-2.5 text-emerald-500" /> : <Copy className="h-2.5 w-2.5" />}
              {copiedKey === 'ip' && <span className="text-[9px] text-emerald-500">Copiado</span>}
            </button>
          </div>
          <p className="font-mono text-xs font-bold text-foreground bg-muted/40 px-2 py-0.5 rounded border border-border/50">
            {terminal.ip}
          </p>
        </div>

        {/* MAC */}
        <div className="space-y-0.5">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground font-medium text-[11px]">Dirección MAC</span>
            <button
              type="button"
              onClick={() => handleCopy('mac', terminal.mac)}
              aria-label="Copiar Dirección MAC"
              title="Copiar MAC al portapapeles"
              className="text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1 p-0.5 rounded hover:bg-muted transition-colors cursor-pointer"
            >
              {copiedKey === 'mac' ? <Check className="h-2.5 w-2.5 text-emerald-500" /> : <Copy className="h-2.5 w-2.5" />}
              {copiedKey === 'mac' && <span className="text-[9px] text-emerald-500">Copiado</span>}
            </button>
          </div>
          <p className="font-mono text-xs text-foreground bg-muted/40 px-2 py-0.5 rounded border border-border/50">
            {terminal.mac}
          </p>
        </div>

        {/* UserNT */}
        <div className="space-y-0.5 md:col-span-2">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground font-medium flex items-center gap-1 text-[11px]">
              <UserCheck className="h-3 w-3 text-primary" /> Usuarios de Dominio (UserNT)
            </span>
            <button
              type="button"
              onClick={() => handleCopy('user', terminal.userNt)}
              aria-label="Copiar Usuario NT"
              title="Copiar usuario(s) de dominio"
              className="text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1 p-0.5 rounded hover:bg-muted transition-colors cursor-pointer"
            >
              {copiedKey === 'user' ? <Check className="h-2.5 w-2.5 text-emerald-500" /> : <Copy className="h-2.5 w-2.5" />}
              {copiedKey === 'user' && <span className="text-[9px] text-emerald-500">Copiado</span>}
            </button>
          </div>
          <div className="px-2.5 py-1.5 rounded bg-muted/50 border border-border font-mono text-xs text-foreground font-medium break-all">
            {terminal.userNt}
          </div>
        </div>

        {terminal.location && (
          <div className="space-y-0.5">
            <span className="text-muted-foreground font-medium flex items-center gap-1 text-[11px]">
              <MapPin className="h-3 w-3 text-muted-foreground" /> Ubicación Física
            </span>
            <p className="text-foreground text-xs font-medium">{terminal.location}</p>
          </div>
        )}

        {terminal.costCenter && (
          <div className="space-y-0.5">
            <span className="text-muted-foreground font-medium flex items-center gap-1 text-[11px]">
              <Building className="h-3 w-3 text-muted-foreground" /> Centro de Costos
            </span>
            <p className="text-foreground text-xs font-medium">{terminal.costCenter}</p>
          </div>
        )}
      </div>
    </div>
  );
}
