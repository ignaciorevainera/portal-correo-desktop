import React, { useState, useEffect, useRef } from "react";
import { TerminalData } from "../types/terminal";
import {
  MonitorPlay,
  HelpCircle,
  Activity,
  Clock,
  Loader2,
  ChevronDown,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Kbd } from "@/components/ui/kbd";
import { toast } from "sonner";
import { RemoteProbeResult } from "../services/electronClient";

export interface ActionFeedbackState {
  type: "success" | "error" | "warning" | "info";
  message: string;
  fallbackAction?: {
    label: string;
    onClick: () => void;
  };
}

export interface QuickActionsBarProps {
  terminal: TerminalData;
  isPinging: boolean;
  actionFeedback?: ActionFeedbackState | null;
  onLaunchVnc: () => void;
  onLaunchMsra: () => void;
  onTogglePing: () => void;
  onLaunchPingInfinite?: () => void;
  remoteProbe?: RemoteProbeResult | null;
  isProbingRemote?: boolean;
  onLaunchSmartRemote?: () => void;
  onReProbeRemote?: () => void;
}

export function QuickActionsBar({
  terminal,
  isPinging,
  actionFeedback,
  onLaunchVnc,
  onLaunchMsra,
  onTogglePing,
  onLaunchPingInfinite,
  remoteProbe,
  isProbingRemote = false,
  onLaunchSmartRemote,
  onReProbeRemote,
}: QuickActionsBarProps): React.JSX.Element {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  const handleAction = (label: string, callback: () => void): void => {
    callback();
    toast.info(`Acción disparada: ${label} para ${terminal.pc}`);
  };

  const handlePrimaryRemoteClick = (): void => {
    if (onLaunchSmartRemote) {
      handleAction("Conexión Remota Inteligente", onLaunchSmartRemote);
    } else {
      handleAction("VNC Viewer", onLaunchVnc);
    }
  };

  // Determine Primary CTA visual state
  const recommendedMethod = remoteProbe?.recommendedMethod ?? "vnc";

  let ctaVariant: "default" | "secondary" | "outline" = "default";
  let ctaIcon = <MonitorPlay className="h-4 w-4" />;
  let ctaLabel = `Conectar VNC :${remoteProbe?.vncPort || 5901}`;

  if (isProbingRemote) {
    ctaVariant = "outline";
    ctaIcon = <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
    ctaLabel = "Detectando acceso...";
  } else if (recommendedMethod === "msra") {
    ctaVariant = "secondary";
    ctaIcon = <HelpCircle className="h-4 w-4 text-blue-500" />;
    ctaLabel = "Conectar MSRA";
  } else if (recommendedMethod === "none") {
    ctaVariant = "outline";
    ctaIcon = <AlertCircle className="h-4 w-4 text-amber-500" />;
    ctaLabel = "Sin Acceso (Reintentar)";
  }

  const vncPortOpen = Boolean(remoteProbe?.port5901Open || remoteProbe?.port5900Open);
  const msraOpen = Boolean(remoteProbe?.msraAvailable);

  return (
    <div className="w-full flex flex-col gap-2">
      {/* Grilla principal de 3 columnas para evitar truncamientos */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full">
        {/* Columna 1: Split Button Inteligente de Conexión Remota */}
        <div className="relative flex items-center w-full" ref={dropdownRef}>
          <div className="flex w-full rounded-md shadow-xs">
            <Button
              type="button"
              variant={ctaVariant}
              size="sm"
              onClick={handlePrimaryRemoteClick}
              aria-label="Conexión Remota Inteligente"
              title="Conectar automáticamente según puertos disponibles (Atajo F2)"
              className="flex-1 rounded-r-none border-r border-primary-foreground/20 text-xs font-semibold cursor-pointer truncate"
            >
              {ctaIcon}
              <span className="truncate">{ctaLabel}</span>
              {!isProbingRemote && (
                <Kbd className="hidden md:inline-block ml-1">F2</Kbd>
              )}
            </Button>

            <Button
              type="button"
              variant={ctaVariant}
              size="sm"
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              aria-label="Opciones de conexión remota"
              title="Opciones manuales y estado de puertos"
              className="rounded-l-none px-2 cursor-pointer border-l-0"
            >
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${
                  isDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </Button>
          </div>

          {/* Menú Desplegable con Diagnóstico en Vivo y Opciones Forzadas */}
          {isDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 w-72 p-2 bg-popover border border-border rounded-md shadow-lg z-50 flex flex-col gap-2 text-popover-foreground">
              {/* Resumen de puertos */}
              <div className="flex items-center justify-between gap-1 text-[11px] p-1.5 rounded bg-muted/60 border border-border">
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground font-medium">5901/5900:</span>
                  <Badge
                    variant={vncPortOpen ? "default" : "secondary"}
                    className="text-[10px] px-1 py-0 h-4"
                  >
                    {remoteProbe ? (vncPortOpen ? "Abierto" : "Cerrado") : "Detectando"}
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground font-medium">3389/135:</span>
                  <Badge
                    variant={msraOpen ? "default" : "secondary"}
                    className="text-[10px] px-1 py-0 h-4"
                  >
                    {remoteProbe ? (msraOpen ? "Abierto" : "Cerrado") : "Detectando"}
                  </Badge>
                </div>
              </div>

              {/* Botón Forzar VNC */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsDropdownOpen(false);
                  handleAction("VNC Viewer", onLaunchVnc);
                }}
                aria-label="Conectar por VNC Viewer"
                className="justify-between text-xs w-full cursor-pointer h-8 px-2 hover:bg-muted"
              >
                <span className="flex items-center gap-1.5">
                  <MonitorPlay className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Forzar VNC Viewer</span>
                </span>
                <Kbd>F2</Kbd>
              </Button>

              {/* Botón Forzar MSRA */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsDropdownOpen(false);
                  handleAction("Asistencia Remota MSRA", onLaunchMsra);
                }}
                aria-label="Iniciar Asistencia MSRA"
                className="justify-between text-xs w-full cursor-pointer h-8 px-2 hover:bg-muted"
              >
                <span className="flex items-center gap-1.5">
                  <HelpCircle className="h-3.5 w-3.5 text-blue-500" />
                  <span>Forzar Asistencia MSRA</span>
                </span>
                <Kbd>F4</Kbd>
              </Button>

              {/* Botón Re-verificar */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsDropdownOpen(false);
                  onReProbeRemote?.();
                }}
                aria-label="Re-verificar puertos"
                className="justify-center text-xs w-full cursor-pointer h-7 text-muted-foreground hover:text-foreground mt-0.5"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                <span>Re-verificar puertos</span>
              </Button>
            </div>
          )}
        </div>

        {/* Columna 2: Grupo Ping 2:1 (Ping 4 paquetes + Ping -t continuo) */}
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant={isPinging ? "destructive" : "outline"}
            size="sm"
            onClick={onTogglePing}
            aria-label={isPinging ? "Detener Ping en vivo" : "Iniciar Ping"}
            title="Iniciar Ping estándar (4 paquetes) (Atajo F3)"
            className={`flex-[2] text-xs font-semibold cursor-pointer ${
              isPinging
                ? "animate-pulse"
                : "bg-muted text-foreground border-border hover:bg-muted/80"
            }`}
          >
            <Activity
              className={`h-3.5 w-3.5 ${
                isPinging ? "animate-pulse" : "text-emerald-500"
              }`}
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

        {/* Columna 3: Tarjeta de Uptime */}
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
