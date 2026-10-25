import React, { useState } from 'react';
import { TerminalData } from '../types/terminal';
import { RotateCcw, Clock, ShieldAlert, CheckCircle2, History } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export function ResetUptimePanel({ terminal }: { terminal: TerminalData }): React.JSX.Element {
  const [resetRequested, setResetRequested] = useState(false);
  const [reason, setReason] = useState('Desbloqueo / Sincronización de cuenta AD');

  const handleRequestReset = (): void => {
    setResetRequested(true);
    setTimeout(() => setResetRequested(false), 4000);
  };

  return (
    <div className="space-y-4">
      <div className="border-b border-border pb-3">
        <h2 className="text-base font-semibold font-heading text-foreground flex items-center gap-2">
          <RotateCcw className="h-4 w-4 text-primary" />
          Reseteo de Cuentas & Historial de Uptime ({terminal.pc})
        </h2>
        <p className="text-xs text-muted-foreground">
          Gestión de solicitudes de reseteo en Active Directory y métricas de tiempo de actividad.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card Uptime */}
        <Card size="sm" className="p-4 rounded-lg border border-border bg-card space-y-3 shadow-xs gap-0 py-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Clock className="h-4 w-4 text-emerald-500" />
            Tiempo de Actividad Registrado
          </div>
          <div className="p-3 rounded bg-muted/60 border border-border font-mono text-sm font-bold text-foreground">
            {terminal.uptimeText}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Métrica obtenida vía registro de uptime de SQL Server (`Cmda_trae_historial_UptimeXterminal`).
          </p>
        </Card>

        {/* Card Reset Request */}
        <Card size="sm" className="p-4 rounded-lg border border-border bg-card space-y-3 shadow-xs gap-0 py-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <ShieldAlert className="h-4 w-4 text-amber-500" />
            Solicitar Reseteo de Cuenta AD
          </div>
          <div className="space-y-2 text-xs">
            <label className="text-muted-foreground font-medium">Motivo del Reseteo</label>
            <Input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="h-8 text-xs bg-muted/60"
            />
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleRequestReset}
              className="w-full bg-amber-600 text-white font-semibold text-xs hover:bg-amber-500 cursor-pointer"
            >
              Enviar Solicitud de Reset
            </Button>
          </div>

          {resetRequested && (
            <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2 animate-fade-in font-medium">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Solicitud de reset en cola procesada con éxito (`CMDA_solicitud_De_Reset`).
            </div>
          )}
        </Card>
      </div>

      {/* Historial de Reseteos */}
      <Card size="sm" className="p-4 rounded-lg border border-border bg-card space-y-3 shadow-xs gap-0 py-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <History className="h-3.5 w-3.5" /> Historial de Reseteos Previos
        </h3>

        {(!terminal.resetHistory || terminal.resetHistory.length === 0) ? (
          <p className="text-xs text-muted-foreground italic">No hay historial de reseteos registrado para este equipo.</p>
        ) : (
          <div className="divide-y divide-border/50 text-xs font-mono">
            {(terminal.resetHistory || []).map((item) => (
              <div key={item.id} className="py-2.5 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="font-semibold text-foreground">{item.reason}</div>
                  <div className="text-[11px] text-muted-foreground">Operador: {item.operator}</div>
                </div>
                <div className="text-right space-y-0.5">
                  <Badge
                    variant="outline"
                    className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border-emerald-500/20 font-bold text-[10px] h-5"
                  >
                    {item.result}
                  </Badge>
                  <div className="text-[11px] text-muted-foreground">{item.date}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
