import React, { useState, useEffect, useRef } from "react";
import { ThemeProvider } from "./context/ThemeContext";
import { Topbar } from "./components/Topbar";
import { TerminalTechnicalCard } from "./components/TerminalTechnicalCard";
import {
  QuickActionsBar,
  ActionFeedbackState,
} from "./components/QuickActionsBar";
import {
  LivePingConsole,
  DiagnosticCommandEvent,
} from "./components/LivePingConsole";
import { AlertsPanel } from "./components/AlertsPanel";
import { ResetUptimePanel } from "./components/ResetUptimePanel";
import { OperatorContextMenu } from "./components/OperatorContextMenu";
import { SubnetScannerDrawer } from "./components/SubnetScannerDrawer";
import { SettingsModal } from "./components/SettingsModal";
import {
  getAllTerminals,
  addAlertToTerminal,
  closeAlertOnTerminal,
} from "./services/terminalService";
import {
  checkBackendStatus,
  searchTerminalUnified,
  launchVncClient,
  launchMsraClient,
  probeRemoteStatus,
  launchSmartRemoteClient,
  RemoteProbeResult,
  openExternalUrl,
  BackendStatus,
  subscribeToAutofocusSearch,
  stopDiagnosticCommand,
  DiagnosticCommandType,
} from "./services/electronClient";
import { TerminalData } from "./types/terminal";
import { Search, SearchX, RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { Kbd } from "@/components/ui/kbd";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function App(): React.JSX.Element {
  const [selectedPc, setSelectedPc] = useState<string>("");
  const [terminal, setTerminal] = useState<TerminalData | null>(null);
  const [notFoundTerm, setNotFoundTerm] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isPinging, setIsPinging] = useState(false);
  const [pingMode, setPingMode] = useState<"standard" | "infinite">("standard");
  const [activeDiagnostic, setActiveDiagnostic] =
    useState<DiagnosticCommandEvent | null>(null);
  const [isRefreshingUptime, setIsRefreshingUptime] = useState(false);
  const [status, setStatus] = useState<BackendStatus>({
    connected: false,
    mode: "mock",
  });
  const [actionFeedback, setActionFeedback] =
    useState<ActionFeedbackState | null>(null);
  const [remoteProbe, setRemoteProbe] = useState<RemoteProbeResult | null>(
    null,
  );
  const [isProbingRemote, setIsProbingRemote] = useState<boolean>(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [isSubnetDrawerOpen, setIsSubnetDrawerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  const allTerminals = getAllTerminals();

  useEffect(() => {
    checkBackendStatus()
      .then(setStatus)
      .catch(() => {});

    // Listen to Global Hotkey Autofocus Search (Ctrl+Space from background)
    const unsubHotkey = subscribeToAutofocusSearch((payload) => {
      window.dispatchEvent(
        new CustomEvent("cmda:app-autofocus-search", { detail: payload }),
      );
      if (payload.autoSearch && payload.query) {
        handleSelectTerminal(payload.query);
      }
    });

    return () => {
      unsubHotkey();
    };
  }, []);

  const handleProbeRemote = async (ipOrHost: string) => {
    setIsProbingRemote(true);
    try {
      const probeRes = await probeRemoteStatus(ipOrHost);
      setRemoteProbe(probeRes);
    } catch {
      setRemoteProbe(null);
    } finally {
      setIsProbingRemote(false);
    }
  };

  useEffect(() => {
    if (!selectedPc) {
      setTerminal(null);
      setNotFoundTerm(null);
      setRemoteProbe(null);
      setActiveDiagnostic(null);
      setIsPinging(false);
      return;
    }
    setIsLoading(true);
    setActiveDiagnostic(null);
    setNotFoundTerm(null);

    searchTerminalUnified(selectedPc)
      .then((res) => {
        setTerminal(res.data);
        if (!res.data) {
          setNotFoundTerm(selectedPc);
          setRemoteProbe(null);
          setIsPinging(false);
        }
        setIsLoading(false);
        if (mainRef.current) {
          mainRef.current.scrollTop = 0;
        }
        if (res.data?.ip) {
          setPingMode("standard");
          setIsPinging(true);
          handleProbeRemote(res.data.ip);
        } else {
          setRemoteProbe(null);
          setIsPinging(false);
        }
      })
      .catch(() => {
        setTerminal(null);
        setNotFoundTerm(selectedPc);
        setIsLoading(false);
        setRemoteProbe(null);
        setIsPinging(false);
      });
  }, [selectedPc]);

  const handleClearSearch = (): void => {
    setSelectedPc("");
    setTerminal(null);
    setNotFoundTerm(null);
    setIsPinging(false);
    setActiveDiagnostic(null);
    setActionFeedback(null);
    setRemoteProbe(null);
    setIsProbingRemote(false);
  };

  const handleStartPing = (mode: "standard" | "infinite" = "standard") => {
    setActiveDiagnostic(null);
    setPingMode(mode);
    setIsPinging(true);
  };

  const handleRunDiagnostic = (cmd: DiagnosticCommandType) => {
    if (!terminal?.ip) return;
    setIsPinging(false);
    stopDiagnosticCommand().catch(() => {});

    let argsText = `${cmd} ${terminal.ip}`;
    let options: any = undefined;

    if (cmd === "nbtstat") {
      argsText = `nbtstat -A ${terminal.ip}`;
    } else if (cmd === "tracert") {
      argsText = `tracert -d -h 6 ${terminal.ip}`;
      options = { maxHops: 6 };
    } else if (cmd === "arp") {
      argsText = `arp -a ${terminal.ip}`;
    }

    setActiveDiagnostic({
      id: `diag-${Date.now()}`,
      command: cmd,
      target: terminal.ip,
      argsText,
      timestamp: new Date().toLocaleTimeString(),
      options,
    });
  };

  const handleRefreshUptime = async () => {
    if (!selectedPc || isRefreshingUptime) return;
    setIsRefreshingUptime(true);
    try {
      const res = await searchTerminalUnified(selectedPc);
      if (res.data) {
        setTerminal(res.data);
        toast.success("Tiempo de actividad actualizado", {
          description: `Uptime: ${res.data.uptimeText}`,
        });
      }
    } catch {
      toast.error("Error al actualizar uptime");
    } finally {
      setIsRefreshingUptime(false);
    }
  };

  const handleTogglePing = () => {
    if (isPinging) {
      setIsPinging(false);
    } else {
      handleStartPing("standard");
    }
  };

  const handleLaunchPingInfinite = () => {
    handleStartPing("infinite");
  };

  // Global Keyboard Shortcuts (F2 Smart Remote, F3 Ping, F4 MSRA)
  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        handleLaunchSmartRemote();
      } else if (e.key === "F3") {
        e.preventDefault();
        handleTogglePing();
      } else if (e.key === "F4") {
        e.preventDefault();
        handleLaunchMsra();
      }
    };
    window.addEventListener("keydown", handleGlobalShortcuts);
    return () => window.removeEventListener("keydown", handleGlobalShortcuts);
  }, [terminal, isPinging]);

  const handleSelectTerminal = (pc: string): void => {
    if (pc && pc.trim() === selectedPc?.trim() && terminal) {
      return;
    }
    setSelectedPc(pc);
    setActionFeedback(null);
    setRemoteProbe(null);
    setIsProbingRemote(false);
  };

  const handleAddAlert = (alert: {
    title: string;
    description: string;
    operator: string;
  }): void => {
    if (!terminal) return;
    try {
      const created = addAlertToTerminal(terminal.pc, alert);
      setTerminal((prev) =>
        prev ? { ...prev, alerts: [created, ...prev.alerts] } : null,
      );
    } catch {
      const newAlert = {
        id: `alt-${Date.now()}`,
        ...alert,
        date: new Date().toLocaleString("es-AR"),
        active: true,
      };
      setTerminal((prev) =>
        prev ? { ...prev, alerts: [newAlert, ...prev.alerts] } : null,
      );
    }
  };

  const handleCloseAlert = (alertId: string, resolution: string): void => {
    if (!terminal) return;
    closeAlertOnTerminal(terminal.pc, alertId, resolution);
    setTerminal((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        alerts: prev.alerts.map((a) =>
          a.id === alertId
            ? {
                ...a,
                active: false,
                resolutionText: resolution,
                resolutionDate: new Date().toLocaleString("es-AR"),
              }
            : a,
        ),
      };
    });
  };

  const handleLaunchSmartRemote = async (
    targetOverride?: string,
  ): Promise<void> => {
    const target = targetOverride || terminal?.ip || terminal?.pc;
    if (!target) return;

    const res = await launchSmartRemoteClient(target);
    if (res.probe) {
      setRemoteProbe(res.probe);
    }

    if (res.success) {
      if (res.methodUsed === "vnc") {
        toast.success(
          res.message ||
            `VNC Viewer iniciado correctamente hacia ${target}${res.portUsed ? `:${res.portUsed}` : ""}`,
        );
      } else if (res.methodUsed === "msra") {
        toast.info(
          res.message ||
            `VNC cerrado. Asistencia Remota (MSRA) iniciada para ${target}`,
        );
      } else {
        toast.success(res.message || `Conexión remota exitosa hacia ${target}`);
      }
    } else {
      toast.error(res.message || `Sin acceso remoto directo a ${target}`);
    }
  };

  const handleLaunchVnc = async (targetOverride?: string): Promise<void> => {
    const target = targetOverride || terminal?.ip || terminal?.pc;
    if (!target) return;

    const res = await launchVncClient(target);

    if (res.vncClosed) {
      toast.error(
        res.message || `Puertos VNC (5901/5900) cerrados en ${target}.`,
        {
          description: res.msraAvailable
            ? "Asistencia Remota (MSRA) está disponible como alternativa."
            : undefined,
          action: res.msraAvailable
            ? {
                label: "Conectar por MSRA",
                onClick: () => handleLaunchMsra(target),
              }
            : undefined,
        },
      );
    } else if (res.success) {
      toast.success(
        res.message ||
          `VNC Viewer iniciado correctamente hacia ${target}${res.portUsed ? `:${res.portUsed}` : ""}`,
      );
    } else {
      toast.error(
        res.message || `Error al intentar conectar por VNC a ${target}`,
      );
    }
  };

  const handleLaunchMsra = async (targetOverride?: string): Promise<void> => {
    const target = targetOverride || terminal?.ip || terminal?.pc;
    if (!target) return;

    const res = await launchMsraClient(target);
    if (res.success) {
      toast.success(res.message || `Asistencia Remota iniciada para ${target}`);
    } else {
      toast.error(
        res.message || `Error al iniciar Asistencia Remota para ${target}`,
      );
    }
  };

  const handleDirectPing = (pc: string) => {
    setSelectedPc(pc);
    setPingMode("standard");
    setIsPinging(true);
  };

  return (
    <ThemeProvider>
      <div
        onContextMenu={(e) => {
          e.preventDefault();
          setContextMenu({ x: e.clientX, y: e.clientY });
        }}
        className="h-screen w-screen overflow-hidden bg-background text-foreground flex flex-col font-sans select-none antialiased"
      >
        <Topbar
          onSelectTerminal={handleSelectTerminal}
          onDirectVnc={handleLaunchVnc}
          onDirectPing={handleDirectPing}
          selectedPc={terminal?.pc}
          backendMode={status.mode}
          serverName={status.server}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />

        {/* Barra de Comandos Fija (siempre debajo del header, sin contenido pasando por debajo) */}
        {terminal && (
          <section className="shrink-0 px-3.5 pt-2.5 pb-2 border-b border-border bg-card/40">
            <QuickActionsBar
              terminal={terminal}
              isPinging={isPinging}
              actionFeedback={actionFeedback}
              remoteProbe={remoteProbe}
              isProbingRemote={isProbingRemote}
              onLaunchSmartRemote={() => handleLaunchSmartRemote()}
              onReProbeRemote={() =>
                terminal.ip && handleProbeRemote(terminal.ip)
              }
              onLaunchVnc={() => handleLaunchVnc()}
              onLaunchMsra={() => handleLaunchMsra()}
              onTogglePing={handleTogglePing}
              onLaunchPingInfinite={handleLaunchPingInfinite}
              onRunDiagnostic={handleRunDiagnostic}
              onOpenSubnetScanner={() => setIsSubnetDrawerOpen(true)}
              onRefreshUptime={handleRefreshUptime}
              isRefreshingUptime={isRefreshingUptime}
            />
          </section>
        )}

        {/* Layout Unificado: El desplazamiento / scroll vertical es exclusivo sobre este contenedor <main> */}
        <main
          ref={mainRef}
          className={cn(
            "flex-1 p-3.5 overflow-y-auto space-y-4",
            !terminal || isLoading ? "flex flex-col" : "block",
          )}
        >
          {isLoading ? (
            <div className="flex-1 w-full min-h-80 flex flex-col items-center justify-center text-center p-6 space-y-3">
              <Loader2 className="h-7 w-7 text-primary animate-spin" />
              <p className="text-xs text-muted-foreground font-mono">
                Consultando base de datos técnica...
              </p>
            </div>
          ) : notFoundTerm ? (
            <div className="flex-1 w-full min-h-80 flex flex-col items-center justify-center text-center p-8 border border-dashed border-border rounded-lg bg-card/30 space-y-3">
              <div className="p-3 rounded-full bg-muted/70 text-muted-foreground">
                <SearchX className="h-8 w-8 text-amber-500/80 dark:text-amber-400/80" />
              </div>
              <div className="space-y-1 max-w-md">
                <h3 className="text-sm font-semibold font-heading text-foreground">
                  No se encontró la terminal &ldquo;
                  <span className="font-mono font-bold text-foreground">
                    {notFoundTerm}
                  </span>
                  &rdquo;
                </h3>
                <p className="text-xs text-muted-foreground">
                  No existe un registro técnico para este equipo o dirección IP
                  en la base corporativa. Verificá la ortografía del Hostname o
                  el alcance de red.
                </p>
              </div>
              <Button
                variant="outline"
                size="xs"
                onClick={handleClearSearch}
                aria-label="Limpiar búsqueda"
                className="text-xs font-sans gap-1.5 h-7 px-3 border-border bg-background/50 hover:bg-muted cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Limpiar búsqueda</span>
              </Button>
            </div>
          ) : !terminal ? (
            <div className="flex-1 w-full min-h-80 flex flex-col items-center justify-center text-center p-8 border border-dashed border-border rounded-lg bg-card/30 space-y-3">
              <div className="p-3 rounded-full bg-muted/70 text-muted-foreground">
                <Search className="h-8 w-8 text-primary/70" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold font-heading text-foreground">
                  Buscar una terminal para comenzar
                </h3>
                <p className="text-xs text-muted-foreground max-w-sm">
                  Ingresá el Hostname o IP en la barra superior (presioná{" "}
                  <Kbd>Ctrl</Kbd>+<Kbd>F</Kbd>) para consultar el inventario
                  técnico y monitoreo en vivo.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* 1° Card Unificada: Especificaciones Técnicas, Hardware, Red y Directorio Activo */}
              <TerminalTechnicalCard terminal={terminal} />

              {/* 2° Consola Interna de Diagnóstico: Estilo Terminal Windows con Historial */}
              <LivePingConsole
                ip={terminal.ip}
                isPinging={isPinging}
                pingMode={pingMode}
                activeCommand={activeDiagnostic}
                onTogglePing={handleTogglePing}
                onPingComplete={() => setIsPinging(false)}
                onStopCommand={() => {
                  setActiveDiagnostic(null);
                  stopDiagnosticCommand().catch(() => {});
                }}
              />

              {/* 3° Reseteo AD e Historial de Uptime */}
              <ResetUptimePanel terminal={terminal} />

              {/* 4° Alertas de Terminal (al final): Formato tabla compacta de una fila por alerta */}
              <AlertsPanel
                terminal={terminal}
                onAddAlert={handleAddAlert}
                onCloseAlert={handleCloseAlert}
              />
            </>
          )}
        </main>

        {/* Custom Operator Context Menu */}
        {contextMenu && (
          <OperatorContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            terminal={terminal}
            isPinging={isPinging}
            onClose={() => setContextMenu(null)}
            onLaunchVnc={() => handleLaunchVnc()}
            onTogglePing={handleTogglePing}
            onLaunchMsra={() => handleLaunchMsra()}
            onOpenPortalMda={() =>
              openExternalUrl("https://mda.correo.local/inventario-terminales")
            }
          />
        )}

        {/* Panel Deslizable de Escaneo Asíncrono de Subred */}
        {terminal && (
          <SubnetScannerDrawer
            isOpen={isSubnetDrawerOpen}
            onClose={() => setIsSubnetDrawerOpen(false)}
            targetIp={terminal.ip}
            onSelectTerminal={(pc) => {
              handleSelectTerminal(pc);
              setIsSubnetDrawerOpen(false);
            }}
            onLaunchVnc={(target) => {
              handleLaunchVnc(target);
            }}
          />
        )}

        {/* Modal de Ajustes y Actualizaciones */}
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          currentVersion="1.0.0"
          backendConnected={status.connected}
        />

        {/* Notificaciones animadas Sonner Toaster oficiales de Shadcn */}
        <Toaster />
      </div>
    </ThemeProvider>
  );
}
