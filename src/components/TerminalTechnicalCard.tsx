import React, { useState } from 'react';
import { TerminalData } from '../types/terminal';
import {
  Layers,
  HardDrive,
  Shield,
  Globe,
  Calendar,
  Building,
  UserCheck,
  Copy,
  Check,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardAction, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Network } from 'lucide-react';

export function TerminalTechnicalCard({
  terminal,
  onOpenSubnetScanner,
}: {
  terminal: TerminalData;
  onOpenSubnetScanner?: () => void;
}): React.JSX.Element {
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
        <div>
          <CardTitle className="text-xs font-bold font-heading uppercase tracking-wider text-muted-foreground">
            Ficha Técnica, Red y Sistema
          </CardTitle>
          <p className="text-[11px] text-muted-foreground">
            Especificaciones consolidadas de hardware, red corporativa y Active Directory.
          </p>
        </div>
        <CardAction className="flex items-center gap-1.5">
          {onOpenSubnetScanner && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenSubnetScanner}
              className="h-6 text-[10px] px-2 font-mono gap-1 text-primary border-primary/30 hover:bg-primary/10 cursor-pointer"
              title="Escanear toda la subred de esta terminal"
            >
              <Network className="h-3 w-3" />
              <span>Escanear Subred</span>
            </Button>
          )}
          <Badge
            variant="outline"
            className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25 font-bold h-5"
          >
            En Línea
          </Badge>
          <Badge
            variant="outline"
            className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-muted text-muted-foreground border-border font-medium h-5"
          >
            {terminal.architecture}
          </Badge>
        </CardAction>
      </CardHeader>

      <CardContent className="pt-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Bloque 1: Conectividad de Red */}
          <div className="p-2.5 rounded-md bg-muted/40 border border-border/60 space-y-2">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
              Conectividad & Red
            </span>

            {/* IPv4 */}
            <div className="space-y-0.5">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-[11px] font-medium">Dirección IPv4</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => handleCopy('ip', terminal.ip)}
                  aria-label="Copiar Dirección IPv4"
                  title="Copiar IP al portapapeles"
                  className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {copiedKey === 'ip' ? (
                    <Check className="h-2.5 w-2.5 text-emerald-500" />
                  ) : (
                    <Copy className="h-2.5 w-2.5" />
                  )}
                </Button>
              </div>
              <p className="font-mono font-bold text-foreground text-xs">{terminal.ip}</p>
            </div>

            {/* MAC */}
            <div className="space-y-0.5">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-[11px] font-medium">Dirección MAC</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => handleCopy('mac', terminal.mac)}
                  aria-label="Copiar Dirección MAC"
                  title="Copiar MAC al portapapeles"
                  className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {copiedKey === 'mac' ? (
                    <Check className="h-2.5 w-2.5 text-emerald-500" />
                  ) : (
                    <Copy className="h-2.5 w-2.5" />
                  )}
                </Button>
              </div>
              <p className="font-mono text-xs font-semibold text-foreground truncate">{terminal.mac}</p>
            </div>
          </div>

          {/* Bloque 2: Sistema Operativo y Build */}
          <div className="p-2.5 rounded-md bg-muted/40 border border-border/60 space-y-2">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
              Sistema Operativo
            </span>

            <div className="space-y-0.5">
              <span className="text-muted-foreground text-[11px] font-medium flex items-center gap-1">
                <Layers className="h-3 w-3 text-muted-foreground" /> Sistema
              </span>
              <p className="font-semibold text-foreground text-xs">{terminal.os}</p>
              <p className="font-mono text-[10px] text-muted-foreground truncate" title={terminal.servicePack}>
                Build: {terminal.servicePack}
              </p>
            </div>

            <div className="space-y-0.5">
              <span className="text-muted-foreground text-[11px] font-medium flex items-center gap-1">
                <Calendar className="h-3 w-3 text-muted-foreground" /> Último Relevamiento
              </span>
              <p className="font-mono text-xs text-foreground">{terminal.surveyDate}</p>
            </div>
          </div>

          {/* Bloque 3: Procesador y Memoria */}
          <div className="p-2.5 rounded-md bg-muted/40 border border-border/60 space-y-2">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
              Hardware Principal
            </span>

            <div className="space-y-0.5">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-[11px] font-medium">Procesador / CPU</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => handleCopy('cpu', terminal.cpuModel)}
                  aria-label="Copiar Modelo y CPU"
                  title="Copiar CPU al portapapeles"
                  className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {copiedKey === 'cpu' ? (
                    <Check className="h-2.5 w-2.5 text-emerald-500" />
                  ) : (
                    <Copy className="h-2.5 w-2.5" />
                  )}
                </Button>
              </div>
              <p className="font-semibold text-foreground text-xs truncate" title={terminal.cpuModel}>
                {terminal.cpuModel}
              </p>
            </div>

            <div className="space-y-0.5">
              <span className="text-muted-foreground text-[11px] font-medium flex items-center gap-1">
                <HardDrive className="h-3 w-3 text-muted-foreground" /> Memoria RAM
              </span>
              <p className="font-mono text-xs font-semibold text-foreground">{terminal.ram}</p>
            </div>
          </div>

          {/* Bloque 4: Active Directory y Entorno */}
          <div className="p-2.5 rounded-md bg-muted/40 border border-border/60 space-y-2">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
              Active Directory & Sede
            </span>

            <div className="space-y-0.5">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-[11px] font-medium flex items-center gap-1">
                  <UserCheck className="h-3 w-3 text-muted-foreground" /> Usuario NT
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => handleCopy('user', terminal.userNt)}
                  aria-label="Copiar Usuario NT"
                  title="Copiar Usuario NT al portapapeles"
                  className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {copiedKey === 'user' ? (
                    <Check className="h-2.5 w-2.5 text-emerald-500" />
                  ) : (
                    <Copy className="h-2.5 w-2.5" />
                  )}
                </Button>
              </div>
              <p className="font-mono text-xs font-semibold text-foreground truncate" title={terminal.userNt}>
                {terminal.userNt}
              </p>
            </div>

            <div className="space-y-0.5">
              <span className="text-muted-foreground text-[11px] font-medium flex items-center gap-1">
                <Building className="h-3 w-3 text-muted-foreground" /> Ubicación
              </span>
              <p className="text-xs text-foreground truncate font-medium" title={terminal.location}>
                {terminal.location}
              </p>
            </div>
          </div>
        </div>

        {/* Fila secundaria de seguridad y explorador */}
        <div className="mt-2.5 pt-2 border-t border-border/50 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Shield className="h-3 w-3 text-emerald-500" /> Antivirus: <strong className="text-foreground">{terminal.antivirusVersion}</strong>
            </span>
            <span className="flex items-center gap-1">
              <Globe className="h-3 w-3 text-blue-500" /> Navegador: <strong className="text-foreground">{terminal.ieVersion}</strong>
            </span>
          </div>
          {copiedKey && (
            <span className="text-emerald-500 font-mono text-[10px] font-semibold flex items-center gap-1">
              <Check className="h-3 w-3" /> ¡Copiado al portapapeles!
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
