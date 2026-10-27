import React, { useMemo, useState } from "react";
import { CheckCircle2, ChevronRight, PlusCircle, RotateCcw } from "lucide-react";
import { TerminalAlert, TerminalData } from "../types/terminal";
import { Button } from "@/components/ui/button";
import { StatusBadge, StatusTone } from "@/components/StatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  CloseAlertDialog,
  NewAlertDialog,
  RequestResetDialog,
} from "./ActivityDialogs";

export type ActivityKind = "alert" | "reset";
export type ActivityStatus = "Activa" | "Cerrada" | "Pendiente" | "OK";

export interface ActivityRow {
  id: string;
  kind: ActivityKind;
  title: string;
  description: string;
  status: ActivityStatus;
  operator: string;
  date: string;
  resolution?: string;
}

const STATUS_TONE: Record<ActivityStatus, StatusTone> = {
  Activa: "warning",
  Cerrada: "success",
  Pendiente: "info",
  OK: "success",
};

export function parseActivityDate(value: string): number {
  const text = value?.trim();
  if (!text) return Number.NEGATIVE_INFINITY;

  const iso = text.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/,
  );
  if (iso) {
    const [, year, month, day, hours = "00", minutes = "00", seconds = "00"] =
      iso;
    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hours),
      Number(minutes),
      Number(seconds),
    ).getTime();
  }

  const dmy = text.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[,\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/,
  );
  if (dmy) {
    const [, day, month, year, hours = "00", minutes = "00", seconds = "00"] =
      dmy;
    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hours),
      Number(minutes),
      Number(seconds),
    ).getTime();
  }

  const parsed = Date.parse(text);
  return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed;
}

export function buildActivityRows(terminal: TerminalData): ActivityRow[] {
  const alerts: ActivityRow[] = terminal.alerts.map((alert) => ({
    id: alert.id,
    kind: "alert",
    title: alert.title,
    description: alert.description,
    status: alert.active ? "Activa" : "Cerrada",
    operator: alert.operator,
    date: alert.date,
    resolution: alert.resolutionText,
  }));

  const resets: ActivityRow[] = terminal.resetHistory.map((reset) => ({
    id: reset.id,
    kind: "reset",
    title: reset.reason,
    description: reset.result,
    status: reset.result.toLowerCase().includes("pendiente")
      ? "Pendiente"
      : "OK",
    operator: reset.operator,
    date: reset.date,
  }));

  return [...alerts, ...resets].sort((a, b) => {
    const aTime = parseActivityDate(a.date);
    const bTime = parseActivityDate(b.date);
    if (aTime === bTime) return 0;
    return bTime - aTime;
  });
}

interface ActivityPanelProps {
  terminal: TerminalData;
  onAddAlert: (alert: {
    title: string;
    description: string;
    operator: string;
  }) => void;
  onCloseAlert: (alertId: string, resolution: string) => void;
  onRequestReset: (reason: string) => void;
}

export function ActivityPanel({
  terminal,
  onAddAlert,
  onCloseAlert,
  onRequestReset,
}: ActivityPanelProps): React.JSX.Element {
  const rows = useMemo(() => buildActivityRows(terminal), [terminal]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isNewAlertOpen, setIsNewAlertOpen] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [closingAlert, setClosingAlert] = useState<TerminalAlert | null>(null);

  const activeAlerts = terminal.alerts.filter((alert) => alert.active).length;

  return (
    <section
      data-testid="activity-panel"
      aria-labelledby="activity-panel-title"
      className="space-y-2"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
        <div className="min-w-0">
          <h2
            id="activity-panel-title"
            className="font-heading text-base font-semibold text-foreground"
          >
            Alertas y reseteos
          </h2>
          <p className="text-xs text-muted-foreground">
            {activeAlerts} activa(s) · {terminal.alerts.length} alerta(s) ·{" "}
            {terminal.resetHistory.length} reseteo(s)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => setIsNewAlertOpen(true)}
          >
            <PlusCircle className="h-3.5 w-3.5" />
            Nueva alerta
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => setIsResetOpen(true)}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Pedir reset
          </Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-3 text-xs text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 text-success" />
          Sin alertas ni reseteos registrados.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-20">Tipo</TableHead>
                <TableHead className="w-24">Estado</TableHead>
                <TableHead>Detalle</TableHead>
                <TableHead className="w-24">Operador</TableHead>
                <TableHead className="w-28">Fecha</TableHead>
                <TableHead className="w-16 text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {rows.map((row) => {
                const isExpanded = expandedId === row.id;
                const detailId = `activity-detail-${row.id}`;

                return (
                  <React.Fragment key={`${row.kind}-${row.id}`}>
                    <TableRow>
                      <TableCell>
                        <StatusBadge
                          tone={row.kind === "alert" ? "warning" : "info"}
                        >
                          {row.kind === "alert" ? "Alerta" : "Reseteo"}
                        </StatusBadge>
                      </TableCell>

                      <TableCell>
                        <StatusBadge tone={STATUS_TONE[row.status]}>
                          {row.status}
                        </StatusBadge>
                      </TableCell>

                      <TableCell className="max-w-0">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedId(isExpanded ? null : row.id)
                          }
                          aria-expanded={isExpanded}
                          aria-controls={detailId}
                          className="flex w-full items-center gap-1.5 text-left"
                        >
                          <ChevronRight
                            className={cn(
                              "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform",
                              isExpanded && "rotate-90",
                            )}
                            aria-hidden="true"
                          />
                          <span className="truncate text-sm font-medium text-foreground">
                            {row.title}
                          </span>
                        </button>
                      </TableCell>

                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {row.operator}
                      </TableCell>

                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {row.date}
                      </TableCell>

                      <TableCell className="text-right">
                        {row.kind === "alert" && row.status === "Activa" ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="xs"
                            className="h-7 px-2 text-xs"
                            onClick={() => {
                              const alert = terminal.alerts.find(
                                (item) => item.id === row.id,
                              );
                              if (alert) setClosingAlert(alert);
                            }}
                          >
                            Cerrar
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>

                    {isExpanded && (
                      <TableRow className="hover:bg-transparent">
                        <TableCell
                          id={detailId}
                          colSpan={6}
                          className="bg-muted/30 px-3 py-2 text-sm leading-relaxed text-foreground"
                        >
                          <p>{row.description}</p>
                          {row.resolution && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              Resolución: {row.resolution}
                            </p>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <NewAlertDialog
        open={isNewAlertOpen}
        onOpenChange={setIsNewAlertOpen}
        onSubmit={onAddAlert}
      />
      <RequestResetDialog
        open={isResetOpen}
        onOpenChange={setIsResetOpen}
        onSubmit={onRequestReset}
      />
      <CloseAlertDialog
        open={closingAlert !== null}
        alertTitle={closingAlert?.title ?? ""}
        onOpenChange={(open) => {
          if (!open) setClosingAlert(null);
        }}
        onConfirm={(resolution) => {
          if (closingAlert) onCloseAlert(closingAlert.id, resolution);
          setClosingAlert(null);
        }}
      />
    </section>
  );
}
