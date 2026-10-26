import React, { useState } from "react";
import { TerminalData } from "../types/terminal";
import { Clock, ShieldAlert, CheckCircle2, History } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function ResetUptimePanel({
  terminal,
}: {
  terminal: TerminalData;
}): React.JSX.Element {
  const [resetRequested, setResetRequested] = useState(false);
  const [reason, setReason] = useState(
    "Desbloqueo / Sincronización de cuenta AD",
  );

  const handleRequestReset = (): void => {
    setResetRequested(true);
    setTimeout(() => setResetRequested(false), 4000);
  };

  return (
    <div className="space-y-3">
      {/* Encabezado sin icono decorativo */}
      <div className="border-b border-border pb-2.5">
        <h2 className="text-base font-semibold font-heading text-foreground">
          Reseteo de Cuentas & Historial de Uptime
        </h2>
        <p className="text-xs text-muted-foreground">
          Gestión de solicitudes de reseteo en Active Directory y métricas de
          tiempo de actividad.
        </p>
      </div>

      {/* Grilla Compacta Uptime & Solicitud en un solo bloque visual */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Card Uptime Compacta */}
        <Card
          size="sm"
          className="rounded-lg border-border bg-card shadow-xs flex flex-col justify-between"
        >
          <CardHeader className="pb-1">
            <CardTitle className="flex items-center gap-2 text-xs font-semibold text-foreground uppercase tracking-wider">
              <Clock className="h-4 w-4 text-emerald-500 shrink-0" />
              Tiempo de Actividad Registrado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-1.5 flex-1 flex flex-col justify-between">
            <div className="p-2.5 rounded bg-muted/60 border border-border font-mono text-xs font-bold text-foreground">
              {terminal.uptimeText}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Métrica obtenida vía registro de uptime de SQL Server
              (`Cmda_trae_historial_UptimeXterminal`).
            </p>
          </CardContent>
        </Card>

        {/* Card Reset Request Compacta con Formulario en Línea */}
        <Card size="sm" className="rounded-lg border-border bg-card shadow-xs">
          <CardHeader className="pb-1">
            <CardTitle className="flex items-center gap-2 text-xs font-semibold text-foreground uppercase tracking-wider">
              <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0" />
              Solicitar Reseteo de Cuenta AD
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs pt-1.5">
            <div className="space-y-1">
              <Label
                htmlFor="reset-reason-input"
                className="text-muted-foreground font-medium text-[11px]"
              >
                Motivo del Reseteo
              </Label>
              <div className="flex gap-2">
                <Input
                  id="reset-reason-input"
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="h-8 text-xs bg-muted/60 flex-1"
                />
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={handleRequestReset}
                  className="h-8 px-3 font-semibold text-xs cursor-pointer shrink-0"
                >
                  Enviar
                </Button>
              </div>
            </div>

            {resetRequested && (
              <Alert
                variant="success"
                className="p-2 flex items-center gap-2 animate-fade-in"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <AlertDescription className="text-xs font-medium text-current">
                  Solicitud enviada a la cola (`CMDA_solicitud_De_Reset`).
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Historial de Reseteos Compacto */}
      <Card size="sm" className="rounded-lg border-border bg-card shadow-xs">
        <CardHeader className="pb-1 border-b border-border/50">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <History className="h-4 w-4 text-primary shrink-0" /> Historial de
            Reseteos Previos
          </CardTitle>
        </CardHeader>

        <CardContent className="pt-2">
          {!terminal.resetHistory || terminal.resetHistory.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-1">
              No hay historial de reseteos registrado para este equipo.
            </p>
          ) : (
            <div className="divide-y divide-border/50 text-xs font-mono">
              {(terminal.resetHistory || []).map((item) => (
                <div
                  key={item.id}
                  className="py-2 flex items-center justify-between"
                >
                  <div className="space-y-0.5">
                    <div className="font-semibold text-foreground text-xs">
                      {item.reason}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Operador: {item.operator}
                    </div>
                  </div>
                  <div className="text-right space-y-0.5">
                    <Badge
                      variant="outline"
                      className="px-2 py-0.2 rounded bg-emerald-500/10 text-emerald-500 border-emerald-500/20 font-bold text-[10px] h-5"
                    >
                      {item.result}
                    </Badge>
                    <div className="text-[11px] text-muted-foreground">
                      {item.date}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
