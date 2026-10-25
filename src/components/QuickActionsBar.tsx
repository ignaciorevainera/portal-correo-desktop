import React from "react";
import { TerminalData } from "../types/terminal";
import {
  MonitorPlay,
  HelpCircle,
  Activity,
  Clock,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { toast } from "sonner";

export interface ActionFeedbackState {
  type: "success" | "error" | "warning" | "info";
  message: string;
  fallbackAction?: {
    label: string;
    onClick: () => void;
  };
}

interface QuickActionsBarProps {
  terminal: TerminalData;
  isPinging: boolean;
  actionFeedback?: ActionFeedbackState | null;
  onLaunchVnc: () => void;
  onLaunchMsra: () => void;
  onTogglePing: () => void;
  onLaunchPingInfinite?: () => void;
}

export function QuickActionsBar({
  terminal,
  isPinging,
  actionFeedback,
  onLaunchVnc,
  onLaunchMsra,
  onTogglePing,
  onLaunchPingInfinite,
}: QuickActionsBarProps): React.JSX.Element {
  const handleAction = (label: string, callback: () => void): void => {
    callback();
    toast.info(`Acción disparada: ${label} para ${terminal.pc}`);
  };

  return (
    <div className="w-full flex flex-col gap-2">
      {/* Acciones principales en contenedor minimalista directo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full">
        <Button
          type="button"
          variant="default"
          size="sm"
          onClick={() => handleAction("VNC Viewer", onLaunchVnc)}
          aria-label="Conectar por VNC Viewer"
          title="Conectar por VNC (Atajo F2)"
          className="text-xs font-semibold shadow-xs cursor-pointer"
        >
          <MonitorPlay className="h-4 w-4" />
          <span>VNC Viewer</span>
          <Kbd className="hidden md:inline-block ml-1">F2</Kbd>
        </Button>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => handleAction("Asistencia Remota MSRA", onLaunchMsra)}
          aria-label="Iniciar Asistencia MSRA"
          title="Iniciar Asistencia MSRA (Atajo F4)"
          className="text-xs font-semibold border border-border cursor-pointer"
        >
          <HelpCircle className="h-4 w-4 text-blue-500" />
          <span>Asistencia MSRA</span>
          <Kbd className="hidden md:inline-block ml-1">F4</Kbd>
        </Button>

        {/* Grupo Ping 2:1 (Ping 4 paquetes + Ping -t continuo) */}
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant={isPinging ? "destructive" : "outline"}
            size="sm"
            onClick={onTogglePing}
            aria-label={isPinging ? "Detener Ping en vivo" : "Iniciar Ping"}
            title="Iniciar Ping estándar (4 paquetes) (Atajo F3)"
            className={`flex-2 text-xs font-semibold cursor-pointer ${
              isPinging
                ? "animate-pulse"
                : "bg-muted text-foreground border-border hover:bg-muted/80"
            }`}
          >
            <Activity
              className={`h-3.5 w-3.5 ${isPinging ? "animate-pulse" : "text-emerald-500"}`}
            />
            <span>{isPinging ? "Detener" : "Ping"}</span>
            <Kbd className="hidden md:inline-block ml-0.5">F3</Kbd>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onLaunchPingInfinite?.()}
            aria-label="Iniciar Ping continuo -t"
            title="Ejecutar Ping infinito / continuo (-t)"
            className="flex-1 px-1.5 text-xs font-semibold bg-muted text-foreground border-border hover:bg-muted/80 cursor-pointer"
          >
            <span className="font-mono text-[11px] font-bold">-t</span>
          </Button>
        </div>

        <div className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-muted/60 border border-border text-xs h-8">
          <span className="text-muted-foreground flex items-center gap-1 text-[11px] font-medium">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" /> Uptime
          </span>
          <span
            className="font-mono font-semibold text-foreground truncate max-w-30 text-[11px]"
            title={terminal.uptimeText}
          >
            {terminal.uptimeText}
          </span>
        </div>
      </div>
    </div>
  );
}
