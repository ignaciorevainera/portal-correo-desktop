import React, { useState, useEffect, useId, useRef } from "react";
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
  Network,
  Route,
  Layers,
  Wifi,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Kbd } from "@/components/ui/kbd";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import {
  RemoteProbeResult,
  DiagnosticCommandType,
} from "../services/electronClient";
import { deriveSiteTargets } from "@/utils/siteTargets";

export interface ActionFeedbackState {
  type: "success" | "error" | "warning" | "info";
  message: string;
  fallbackAction?: {
    label: string;
    onClick: () => void;
  };
}

export interface QuickActionsBarProps {
  onOpenSubnetScanner?: () => void;
  onRefreshUptime?: () => void;
  isRefreshingUptime?: boolean;
  terminal: TerminalData;
  isPinging: boolean;
  pingMode?: "standard" | "infinite";
  pingTarget?: string;
  pingLinePrefix?: string;
  actionFeedback?: ActionFeedbackState | null;
  onLaunchVnc: () => void;
  onLaunchMsra: () => void;
  onTogglePing: () => void;
  onLaunchPingInfinite?: () => void;
  remoteProbe?: RemoteProbeResult | null;
  isProbingRemote?: boolean;
  onLaunchSmartRemote?: () => void;
  onReProbeRemote?: () => void;
  onRunDiagnostic?: (cmd: DiagnosticCommandType) => void;
  onLaunchSitePing?: (
    target: "router" | "server",
    mode: "standard" | "infinite",
  ) => void;
}

export function QuickActionsBar({
  onOpenSubnetScanner,
  onRefreshUptime,
  isRefreshingUptime = false,
  terminal,
  isPinging,
  pingMode = "standard",
  pingTarget,
  pingLinePrefix,
  actionFeedback,
  onLaunchVnc,
  onLaunchMsra,
  onTogglePing,
  onLaunchPingInfinite,
  remoteProbe,
  isProbingRemote = false,
  onLaunchSmartRemote,
  onReProbeRemote,
  onRunDiagnostic,
  onLaunchSitePing,
}: QuickActionsBarProps): React.JSX.Element {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const moreTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
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

  const handleAction = (_label: string, callback: () => void): void => {
    callback();
  };

  const handleMoreAction = (callback: () => void): void => {
    setIsMoreOpen(false);
    // Devuelve el foco al disparador al cerrar desde un ítem del menú
    moreTriggerRef.current?.focus();
    callback();
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

  let ctaIcon = <MonitorPlay className="h-3.5 w-3.5 shrink-0 text-link mr-1" />;
  let ctaLabel = `Conectar VNC :${remoteProbe?.vncPort || 5901}`;

  if (isProbingRemote) {
    ctaIcon = (
      <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground mr-1" />
    );
    ctaLabel = "Detectando acceso...";
  } else if (recommendedMethod === "msra") {
    ctaIcon = <HelpCircle className="h-3.5 w-3.5 shrink-0 text-link mr-1" />;
    ctaLabel = "Conectar MSRA";
  } else if (recommendedMethod === "none") {
    ctaIcon = <AlertCircle className="h-3.5 w-3.5 shrink-0 text-warning mr-1" />;
    ctaLabel = "Sin Acceso (Reintentar)";
  }

  const vncPortOpen = Boolean(
    remoteProbe?.port5901Open || remoteProbe?.port5900Open,
  );
  const msraOpen = Boolean(remoteProbe?.msraAvailable);

  const siteTargets = deriveSiteTargets(terminal.ip);
  const diagnosticSectionId = useId();
  const siteSectionId = useId();

  return (
    <div className="w-full flex flex-col gap-1">
      {/* Barra de Acciones Rápida y Adaptativa: Todos los botones y Uptime en el mismo contenedor */}
      <div className="flex items-center flex-wrap gap-1 w-full">
        {/* Split Button Inteligente de Conexión Remota con grow */}
        <div
          className="relative flex items-center min-w-[180px] flex-1 grow"
          ref={dropdownRef}
        >
          <div className="flex w-full rounded-md">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrimaryRemoteClick}
              aria-label="Conexión Remota Inteligente"
              title="Conectar automáticamente según puertos disponibles (Atajo F2)"
              className="flex-1 min-w-0 rounded-r-none text-xs font-semibold cursor-pointer h-8 px-2.5 bg-muted text-foreground border-border hover:bg-muted/80 justify-between"
            >
              <span className="flex items-center truncate mr-1 min-w-0">
                {ctaIcon}
                <span className="truncate">{ctaLabel}</span>
              </span>
              {!isProbingRemote && (
                <Kbd className="hidden md:inline-block ml-auto shrink-0">F2</Kbd>
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              aria-label="Opciones de conexión remota"
              title="Opciones manuales y estado de puertos"
              className="rounded-l-none px-1.5 cursor-pointer border-l-0 h-8 bg-muted text-foreground border-border hover:bg-muted/80 shrink-0"
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
            <div className="absolute top-full left-0 mt-1 w-72 p-2 bg-popover border border-border rounded-md ring-1 ring-foreground/10 z-50 flex flex-col gap-2 text-popover-foreground">
              {/* Resumen de puertos */}
              <div className="flex items-center justify-between gap-1 text-[11px] p-1.5 rounded-md bg-muted/60 border border-border">
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground font-medium">
                    5901/5900:
                  </span>
                  <Badge
                    variant={vncPortOpen ? "default" : "secondary"}
                    className="text-[10px] px-1 py-0 h-4"
                  >
                    {remoteProbe
                      ? vncPortOpen
                        ? "Abierto"
                        : "Cerrado"
                      : "Detectando"}
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground font-medium">
                    3389/135:
                  </span>
                  <Badge
                    variant={msraOpen ? "default" : "secondary"}
                    className="text-[10px] px-1 py-0 h-4"
                  >
                    {remoteProbe
                      ? msraOpen
                        ? "Abierto"
                        : "Cerrado"
                      : "Detectando"}
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
                  <HelpCircle className="h-3.5 w-3.5 text-link" />
                  <span>Forzar Asistencia MSRA</span>
                </span>
                <Kbd>F3</Kbd>
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

        {/* Split Button: Ping del equipo consultado con grow (Único botón con estado de activación) */}
        <div className="flex rounded-md flex-1 min-w-[110px] grow">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onTogglePing}
            aria-label={isPinging ? "Detener Ping en vivo" : "Iniciar Ping"}
            aria-pressed={isPinging}
            title="Iniciar Ping estándar (4 paquetes) (Atajo F4)"
            className={`flex-1 min-w-0 rounded-r-none h-8 px-2.5 text-xs font-semibold cursor-pointer justify-between border-border transition-colors ${
              isPinging
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90 animate-pulse"
                : "bg-muted text-foreground hover:bg-muted/80"
            }`}
          >
            <span className="flex items-center truncate mr-1 min-w-0">
              <Activity
                className={`h-3.5 w-3.5 shrink-0 mr-1.5 ${
                  isPinging
                    ? "animate-pulse"
                    : "text-success font-bold"
                }`}
              />
              <span className="truncate">{isPinging ? "Detener" : "Ping"}</span>
            </span>
            <Kbd className="hidden md:inline-block ml-auto shrink-0">F4</Kbd>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onLaunchPingInfinite?.()}
            aria-label="Iniciar Ping continuo -t"
            title="Ejecutar Ping infinito / continuo (-t)"
            className="rounded-l-none border-l-0 h-8 w-8 px-0 justify-center text-xs font-semibold cursor-pointer shrink-0 border-border bg-muted text-foreground hover:bg-muted/80 transition-colors"
          >
            <span className="font-mono text-[11px] font-semibold text-success">
              -t
            </span>
          </Button>
        </div>

        {/* Menú "Más": acciones secundarias agrupadas sin competir con las primarias */}
        <Popover open={isMoreOpen} onOpenChange={setIsMoreOpen}>
          <PopoverTrigger asChild>
            <Button
              ref={moreTriggerRef}
              type="button"
              variant="outline"
              size="sm"
              aria-label="Más acciones"
              title="Más acciones"
              className="h-8 px-2.5 text-xs font-semibold bg-muted text-foreground border-border hover:bg-muted/80 cursor-pointer gap-1 shrink-0"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
              <span>Más</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            aria-label="Más acciones"
            className="w-64 p-1 gap-1"
          >
            <div
              role="group"
              aria-labelledby={diagnosticSectionId}
              className="flex flex-col gap-1"
            >
              <div
                id={diagnosticSectionId}
                className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
              >
                Diagnóstico
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleMoreAction(() => onRunDiagnostic?.("nbtstat"))}
                aria-label="Ejecutar Nbtstat"
                className="justify-start text-xs w-full cursor-pointer h-8 px-2 hover:bg-muted"
              >
                <span className="flex items-center gap-2 w-full">
                  <Layers className="h-3.5 w-3.5 text-warning" />
                  <span className="font-mono text-[11px]">nbtstat -A</span>
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    (NetBIOS)
                  </span>
                </span>
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleMoreAction(() => onRunDiagnostic?.("tracert"))}
                aria-label="Ejecutar Tracert"
                className="justify-start text-xs w-full cursor-pointer h-8 px-2 hover:bg-muted"
              >
                <span className="flex items-center gap-2 w-full">
                  <Route className="h-3.5 w-3.5 text-success" />
                  <span className="font-mono text-[11px]">tracert -d</span>
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    (6 saltos)
                  </span>
                </span>
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleMoreAction(() => onRunDiagnostic?.("arp"))}
                aria-label="Ejecutar ARP"
                className="justify-start text-xs w-full cursor-pointer h-8 px-2 hover:bg-muted"
              >
                <span className="flex items-center gap-2 w-full">
                  <Network className="h-3.5 w-3.5 text-info" />
                  <span className="font-mono text-[11px]">arp -a</span>
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    (Física)
                  </span>
                </span>
              </Button>
            </div>

            {siteTargets.isValid && onLaunchSitePing && (
              <div
                role="group"
                aria-labelledby={siteSectionId}
                className="flex flex-col gap-1"
              >
                <div
                  id={siteSectionId}
                  className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
                >
                  Enlaces del sitio
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    handleMoreAction(() => onLaunchSitePing("router", "standard"))
                  }
                  aria-label="Hacer ping al router .250"
                  title={`Ping estándar (4 paquetes) a ${siteTargets.routerIp}`}
                  className="justify-start text-xs w-full cursor-pointer h-8 px-2 hover:bg-muted"
                >
                  <span className="flex items-center gap-2">
                    <Wifi className="h-3.5 w-3.5 text-link" />
                    <span className="font-mono text-[11px]">.250</span>
                    <span className="text-[10px] text-muted-foreground">
                      router
                    </span>
                  </span>
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    handleMoreAction(() => onLaunchSitePing("router", "infinite"))
                  }
                  aria-label="Ping continuo -t router .250"
                  title={`Ping continuo (-t) a ${siteTargets.routerIp}`}
                  className="justify-start text-xs w-full cursor-pointer h-8 px-2 hover:bg-muted"
                >
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-semibold text-link">
                      -t
                    </span>
                    <span className="font-mono text-[11px]">.250</span>
                  </span>
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    handleMoreAction(() => onLaunchSitePing("server", "standard"))
                  }
                  aria-label="Hacer ping al servidor .231"
                  title={`Ping estándar (4 paquetes) a ${siteTargets.serverIp}`}
                  className="justify-start text-xs w-full cursor-pointer h-8 px-2 hover:bg-muted"
                >
                  <span className="flex items-center gap-2">
                    <Layers className="h-3.5 w-3.5 text-warning" />
                    <span className="font-mono text-[11px]">.231</span>
                    <span className="text-[10px] text-muted-foreground">
                      servidor
                    </span>
                  </span>
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    handleMoreAction(() => onLaunchSitePing("server", "infinite"))
                  }
                  aria-label="Ping continuo -t servidor .231"
                  title={`Ping continuo (-t) a ${siteTargets.serverIp}`}
                  className="justify-start text-xs w-full cursor-pointer h-8 px-2 hover:bg-muted"
                >
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-semibold text-warning">
                      -t
                    </span>
                    <span className="font-mono text-[11px]">.231</span>
                  </span>
                </Button>
              </div>
            )}

            {(onOpenSubnetScanner || onRefreshUptime) && (
              <>
                <Separator className="my-1" />
                <div className="flex flex-col gap-1">
                  {onOpenSubnetScanner && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        handleMoreAction(onOpenSubnetScanner)
                      }
                      aria-label="Escanear Subred"
                      title="Escanear toda la subred de esta terminal"
                      className="justify-start text-xs w-full cursor-pointer h-8 px-2 hover:bg-muted"
                    >
                      <Network className="h-3.5 w-3.5 text-link" />
                      <span>Escanear Subred</span>
                    </Button>
                  )}

                  {onRefreshUptime && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMoreAction(onRefreshUptime)}
                      disabled={isRefreshingUptime}
                      aria-label="Refrescar Uptime"
                      title="Refrescar tiempo de actividad"
                      className="justify-start text-xs w-full cursor-pointer h-8 px-2 hover:bg-muted"
                    >
                      <RotateCcw
                        className={`h-3.5 w-3.5 text-muted-foreground ${
                          isRefreshingUptime ? "animate-spin" : ""
                        }`}
                      />
                      <span>Refrescar Uptime</span>
                    </Button>
                  )}
                </div>
              </>
            )}
          </PopoverContent>
        </Popover>

        {/* Chip de Uptime: sólo estado, el refresco vive en el menú "Más" */}
        <div
          className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50 border border-border/80 text-xs h-8 shrink-0"
          title={`Uptime: ${terminal.uptimeText || "N/D"}`}
          aria-busy={isRefreshingUptime}
        >
          {isRefreshingUptime ? (
            <RotateCcw className="h-3.5 w-3.5 animate-spin text-muted-foreground shrink-0" />
          ) : (
            <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          )}
          <span
            className="font-mono font-semibold text-foreground truncate max-w-[100px] text-[11px]"
          >
            {terminal.uptimeText || "N/D"}
          </span>
        </div>
      </div>

      {actionFeedback && (
        <div role="status" aria-live="polite" className="w-full">
          <Alert
            variant={
              actionFeedback.type === "error"
                ? "destructive"
                : actionFeedback.type === "warning"
                  ? "warning"
                  : actionFeedback.type === "success"
                    ? "success"
                    : "default"
            }
          >
            <AlertTitle>{actionFeedback.type === "error" ? "Error" : "Listo"}</AlertTitle>
            <AlertDescription>{actionFeedback.message}</AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );
}
