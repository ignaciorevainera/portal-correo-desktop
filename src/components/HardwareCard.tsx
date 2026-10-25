import React, { useState } from 'react';
import { TerminalData } from '../types/terminal';
import { Cpu, HardDrive, Shield, Globe, Calendar, Layers, Copy, Check } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardAction, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export function HardwareCard({ terminal }: { terminal: TerminalData }): React.JSX.Element {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {}
  };

  return (
    <Card size="sm" className="rounded-lg border-border bg-card shadow-xs">
      <CardHeader className="border-b border-border/60 pb-2">
        <CardTitle className="text-xs font-bold font-heading uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Cpu className="h-3.5 w-3.5 text-primary" />
          Ficha Técnica & Sistema
        </CardTitle>
        <CardAction>
          <Badge
            variant="outline"
            className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-muted text-muted-foreground border-border font-medium h-5"
          >
            {terminal.architecture}
          </Badge>
        </CardAction>
      </CardHeader>

      <CardContent className="pt-1">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
          <div className="space-y-0.5">
            <span className="text-muted-foreground font-medium flex items-center gap-1 text-[11px]">
              <Layers className="h-3 w-3 text-muted-foreground" /> Sistema Operativo
            </span>
            <p className="font-semibold text-foreground text-xs">{terminal.os}</p>
            <p className="font-mono text-[10px] text-muted-foreground truncate" title={terminal.servicePack}>
              Build: {terminal.servicePack}
            </p>
          </div>

          <div className="space-y-0.5">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground font-medium flex items-center gap-1 text-[11px]">
                <Cpu className="h-3 w-3 text-muted-foreground" /> Modelo y CPU
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => handleCopy('cpu', terminal.cpuModel)}
                aria-label="Copiar Modelo y CPU"
                title={copiedKey === 'cpu' ? 'Copiado al portapapeles' : 'Copiar especificación de CPU'}
                className="h-5 w-5 shrink-0 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                {copiedKey === 'cpu' ? (
                  <Check className="h-3 w-3 text-emerald-500 animate-in zoom-in-75 duration-150" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
                {copiedKey === 'cpu' && <span className="sr-only">Copiado</span>}
              </Button>
            </div>
            <p className="text-foreground font-mono text-[11px] line-clamp-2" title={terminal.cpuModel}>
              {terminal.cpuModel}
            </p>
          </div>

          <div className="space-y-0.5">
            <span className="text-muted-foreground font-medium flex items-center gap-1 text-[11px]">
              <HardDrive className="h-3 w-3 text-muted-foreground" /> Memoria RAM
            </span>
            <p className="font-mono font-bold text-foreground text-xs">{terminal.ram}</p>
          </div>

          <div className="space-y-0.5">
            <span className="text-muted-foreground font-medium flex items-center gap-1 text-[11px]">
              <Shield className="h-3 w-3 text-emerald-500" /> Antivirus
            </span>
            <p className="font-mono font-medium text-foreground text-xs">{terminal.antivirusVersion}</p>
          </div>

          <div className="space-y-0.5">
            <span className="text-muted-foreground font-medium flex items-center gap-1 text-[11px]">
              <Globe className="h-3 w-3 text-blue-500" /> Internet Explorer / Navegador
            </span>
            <p className="font-mono text-foreground text-xs">{terminal.ieVersion}</p>
          </div>

          <div className="space-y-0.5">
            <span className="text-muted-foreground font-medium flex items-center gap-1 text-[11px]">
              <Calendar className="h-3 w-3 text-muted-foreground" /> Fecha de Relevamiento
            </span>
            <p className="font-mono text-foreground text-xs">{terminal.surveyDate}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
