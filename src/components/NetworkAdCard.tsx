import React, { useState } from 'react';
import { TerminalData } from '../types/terminal';
import { Network, UserCheck, MapPin, Building, Copy, Check } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

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
    <Card size="sm" className="rounded-lg border border-border bg-card p-3 space-y-3 shadow-xs gap-0 py-3">
      <div className="flex items-center justify-between border-b border-border/60 pb-2">
        <h2 className="text-xs font-bold font-heading uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Network className="h-3.5 w-3.5 text-primary" />
          Red, Ubicación y Active Directory
        </h2>
        <Badge
          variant="outline"
          className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25 font-bold h-5"
        >
          En Línea
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
        {/* IPv4 */}
        <div className="space-y-0.5">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground font-medium text-[11px]">Dirección IPv4</span>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => handleCopy('ip', terminal.ip)}
              aria-label="Copiar Dirección IPv4"
              title={copiedKey === 'ip' ? 'Copiado al portapapeles' : 'Copiar dirección IP al portapapeles'}
              className="h-5 w-5 shrink-0 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              {copiedKey === 'ip' ? (
                <Check className="h-3 w-3 text-emerald-500 animate-in zoom-in-75 duration-150" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
              {copiedKey === 'ip' && <span className="sr-only">Copiado</span>}
            </Button>
          </div>
          <p className="font-mono text-xs font-bold text-foreground bg-muted/40 px-2 py-0.5 rounded border border-border/50">
            {terminal.ip}
          </p>
        </div>

        {/* MAC */}
        <div className="space-y-0.5">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground font-medium text-[11px]">Dirección MAC</span>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => handleCopy('mac', terminal.mac)}
              aria-label="Copiar Dirección MAC"
              title={copiedKey === 'mac' ? 'Copiado al portapapeles' : 'Copiar MAC al portapapeles'}
              className="h-5 w-5 shrink-0 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              {copiedKey === 'mac' ? (
                <Check className="h-3 w-3 text-emerald-500 animate-in zoom-in-75 duration-150" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
              {copiedKey === 'mac' && <span className="sr-only">Copiado</span>}
            </Button>
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
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => handleCopy('user', terminal.userNt)}
              aria-label="Copiar Usuario NT"
              title={copiedKey === 'user' ? 'Copiado al portapapeles' : 'Copiar usuario(s) de dominio'}
              className="h-5 w-5 shrink-0 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              {copiedKey === 'user' ? (
                <Check className="h-3 w-3 text-emerald-500 animate-in zoom-in-75 duration-150" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
              {copiedKey === 'user' && <span className="sr-only">Copiado</span>}
            </Button>
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
    </Card>
  );
}
