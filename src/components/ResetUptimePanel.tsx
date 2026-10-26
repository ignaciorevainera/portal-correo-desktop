import React, { useState } from "react";
import { TerminalData } from "../types/terminal";
import { ShieldAlert, CheckCircle2, History, User } from "lucide-react";
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
          Reseteo de Cuentas AD
        </h2>
        <p className="text-xs text-muted-foreground">
          Solicitud de reseteo en Active Directory e historial de operaciones previas.
        </p>
      </div>

      {/* Card Reset Request Compacta */}
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

      {/* Historial de Reseteos en Tabla Idéntica a Alertas */}
      <Card size="sm" className="rounded-lg border-border bg-card shadow-xs">
        <CardHeader className="pb-1 border-b border-border/50">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <History className="h-4 w-4 text-primary shrink-0" /> Historial de Reseteos Previos
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          {!terminal.resetHistory || terminal.resetHistory.length === 0 ? (
            <div className="p-4 text-xs text-muted-foreground italic text-center">
              No hay historial de reseteos registrado para este equipo.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-[11px] font-semibold text-muted-foreground">
                    <th className="py-2 px-3">Estado</th>
                    <th className="py-2 px-3">Motivo</th>
                    <th className="py-2 px-3">Operador</th>
                    <th className="py-2 px-3 text-right">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {terminal.resetHistory.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <td className="py-2 px-3 whitespace-nowrap">
                        <Badge
                          variant="outline"
                          className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border-emerald-500/20 font-bold text-[10px]"
                        >
                          {item.result}
                        </Badge>
                      </td>
                      <td className="py-2 px-3">
                        <span className="font-medium text-foreground text-xs">
                          {item.reason}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-muted-foreground font-mono whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3 opacity-60" />
                          <span>{item.operator}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-right text-muted-foreground font-mono whitespace-nowrap text-[11px]">
                        {item.date}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
