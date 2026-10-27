import React, { useState, useEffect, useRef } from "react";
import { Square, Trash2, Copy, Check, Activity, UserRound } from "lucide-react";
import {
  subscribeToPing,
  subscribeToDiagnosticCommand,
} from "../services/electronClient";
import { Button } from "@/components/ui/button";

export interface DiagnosticCommandEvent {
  id: string;
  command: "ping" | "nbtstat" | "tracert" | "arp";
  target: string;
  argsText: string;
  timestamp: string;
  options?: any;
}

interface LivePingConsoleProps {
  ip: string;
  isPinging: boolean;
  pingMode?: "standard" | "infinite";
  activeCommand?: DiagnosticCommandEvent | null;
  onTogglePing: () => void;
  onPingComplete?: () => void;
  onStopCommand?: () => void;
  mode?: "terminal" | "account";
  targetLabel?: string;
}

function sanitizePingText(text: string): string {
  if (!text) return "";
  return text
    .replace(/Estad[\ufffd\?s]?sticas/gi, "Estadísticas")
    .replace(/M[\ufffd\?a]?ximo/gi, "Máximo")
    .replace(/M[\ufffd\?i]?nimo/gi, "Mínimo")
    .replace(/milise[\ufffd\?]?gundos/gi, "milisegundos")
    .replace(/perdid[\ufffd\?]?s/gi, "perdidos")
    .replace(/recibid[\ufffd\?]?s/gi, "recibidos")
    .replace(/enviad[\ufffd\?]?s/gi, "enviados")
    .replace(/aproximad[\ufffd\?]?s/gi, "aproximados");
}

export function LivePingConsole({
  ip,
  isPinging,
  pingMode = "standard",
  activeCommand,
  onTogglePing,
  onPingComplete,
  onStopCommand,
  mode = "terminal",
  targetLabel,
}: LivePingConsoleProps): React.JSX.Element {
  const [logs, setLogs] = useState<string[]>([]);
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedLast, setCopiedLast] = useState(false);
  const onPingCompleteRef = useRef(onPingComplete);
  onPingCompleteRef.current = onPingComplete;
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-desplazamiento exclusivo dentro del contenedor de la terminal ante nuevas líneas
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // Ping subscription (backward-compatible)
  useEffect(() => {
    if (!isPinging || !ip) return;

    const isInfinite = pingMode === "infinite";
    // Append instead of wiping
    const header = `[${new Date().toLocaleTimeString()}] > ping ${isInfinite ? "-t" : "-n 4"} ${ip}`;
    setLogs((prev) => [...prev, header]);

    const unsubscribe = subscribeToPing(
      ip,
      (text: string) => {
        const sanitized = sanitizePingText(text);
        const lines = sanitized.split(/\r?\n/).filter(Boolean);
        if (lines.length > 0) {
          setLogs((prev) => [...prev, ...lines].slice(-400));
        }
      },
      (code: number) => {
        setLogs((prev) => [
          ...prev,
          code === null
            ? `[${new Date().toLocaleTimeString()}] Proceso ping detenido.\n`
            : `[${new Date().toLocaleTimeString()}] Proceso ping finalizado (código: ${code}).\n`,
        ]);
        onPingCompleteRef.current?.();
      },
      isInfinite,
    );

    return () => {
      unsubscribe();
    };
  }, [isPinging, ip, pingMode]);

  // Generic diagnostic command subscription (nbtstat, tracert, arp)
  useEffect(() => {
    if (
      !activeCommand ||
      !activeCommand.command ||
      activeCommand.command === "ping"
    )
      return;

    const header = `[${activeCommand.timestamp || new Date().toLocaleTimeString()}] > ${activeCommand.argsText || `${activeCommand.command} ${activeCommand.target}`}`;
    setLogs((prev) => [...prev, header]);

    const unsubscribe = subscribeToDiagnosticCommand(
      activeCommand.command,
      activeCommand.target,
      (text: string) => {
        const sanitized = sanitizePingText(text);
        const lines = sanitized.split(/\r?\n/).filter(Boolean);
        if (lines.length > 0) {
          setLogs((prev) => [...prev, ...lines].slice(-400));
        }
      },
      (code: number) => {
        setLogs((prev) => {
          const next = [
            ...prev,
            `[${new Date().toLocaleTimeString()}] Proceso ${activeCommand.command} finalizado (código: ${code}).\n`,
          ];
          if (activeCommand.command === "netuser" && code !== 0) {
            next.push(
              "[net user] No se pudo consultar la cuenta. Verificá que exista, que sea del dominio actual y que tu cuenta tenga permiso de lectura.\n",
            );
          }
          return next;
        });
      },
      activeCommand.options,
    );

    return () => {
      unsubscribe();
    };
  }, [activeCommand]);

  const handleClear = (): void => {
    setLogs([]);
  };

  const handleCopyLogs = async (): Promise<void> => {
    if (logs.length === 0) return;
    const text = logs.join("\n");
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setCopiedAll(true);
        setTimeout(() => setCopiedAll(false), 2000);
      }
    } catch (err) {
      console.warn("Error al copiar logs:", err);
    }
  };

  const getLastOutputBlock = (): string => {
    if (logs.length === 0) return "";
    let lastCmdIdx = -1;
    for (let i = logs.length - 1; i >= 0; i--) {
      if (logs[i].startsWith("[") && logs[i].includes(">")) {
        lastCmdIdx = i;
        break;
      }
    }
    if (lastCmdIdx === -1) {
      return logs.join("\n");
    }
    return logs.slice(lastCmdIdx).join("\n");
  };

  const handleCopyLastBlock = async (): Promise<void> => {
    const text = getLastOutputBlock();
    if (!text) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setCopiedLast(true);
        setTimeout(() => setCopiedLast(false), 2000);
      }
    } catch (err) {
      console.warn("Error al copiar último bloque:", err);
    }
  };

  const isAnyRunning =
    isPinging || (Boolean(activeCommand) && activeCommand?.command !== "ping");

  const handleStop = () => {
    if (isPinging) {
      onTogglePing();
    } else if (onStopCommand) {
      onStopCommand();
    }
  };

  const isAccountMode = mode === "account";
  const HeaderIcon = isAccountMode ? UserRound : Activity;
  const headerLabel = isAccountMode ? `Cuenta AD · ${targetLabel ?? ""}` : ip;
  let insideGlobalGroups = false;

  return (
    <div className="w-full shrink-0 rounded-lg border border-border bg-card shadow-xs overflow-hidden">
      {/* Barra de Controles Superior: Sin botón Iniciar redundante */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/40">
        <div className="flex items-center gap-2">
          <HeaderIcon className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
          <span className="font-mono text-xs font-bold text-foreground dark:text-zinc-100">
            {headerLabel}
          </span>
        </div>

        {/* Controles: Detener (solo cuando activo), Limpiar, Copiar Último Bloque y Copiar Todos los Logs */}
        <div className="flex items-center gap-1.5">
          {isAnyRunning && (
            <Button
              type="button"
              variant="destructive"
              size="xs"
              onClick={handleStop}
              aria-label="Detener ping en vivo"
              className="h-7 px-2.5 text-[11px] font-sans font-medium flex items-center gap-1 cursor-pointer"
            >
              <Square className="h-3 w-3" />
              <span>Detener</span>
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={handleClear}
            aria-label="Limpiar logs de ping"
            title="Limpiar pantalla de logs"
            className="h-7 px-2 text-[11px] font-sans flex items-center gap-1 cursor-pointer"
          >
            <Trash2 className="h-3 w-3" />
            <span>Limpiar</span>
          </Button>

          {/* Copiar Último Bloque */}
          <Button
            type="button"
            variant={copiedLast ? "secondary" : "outline"}
            size="xs"
            onClick={handleCopyLastBlock}
            disabled={logs.length === 0}
            aria-label="Copiar último bloque de logs"
            title="Copiar únicamente el último comando y su respuesta al portapapeles"
            className="h-7 px-2.5 text-[11px] font-sans flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
          >
            {copiedLast ? (
              <Check className="h-3 w-3 text-emerald-500" />
            ) : (
              <Copy className="h-3 w-3 text-muted-foreground" />
            )}
            <span>{copiedLast ? "Bloque copiado" : "Copiar Último"}</span>
          </Button>

          {/* Copiar Todos los Logs */}
          <Button
            type="button"
            variant={copiedAll ? "secondary" : "outline"}
            size="xs"
            onClick={handleCopyLogs}
            disabled={logs.length === 0}
            aria-label="Copiar logs de ping"
            title="Copiar logs completos al portapapeles"
            className="h-7 px-2.5 text-[11px] font-sans flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
          >
            {copiedAll ? (
              <Check className="h-3 w-3 text-emerald-500" />
            ) : (
              <Copy className="h-3 w-3 text-muted-foreground" />
            )}
            <span>{copiedAll ? "Logs copiados" : "Copiar Logs"}</span>
          </Button>
        </div>
      </div>

      {/* Pantalla Contigua estilo Windows Terminal: bg-[#0C0C0C], altura generosa h-64, auto-scroll interno por línea */}
      <div
        ref={scrollContainerRef}
        data-testid="terminal-scroll-container"
        className="h-64 min-h-[16rem] overflow-y-auto overflow-x-auto p-3.5 bg-[#0C0C0C] font-mono text-[11.5px] leading-relaxed text-[#CCCCCC] select-text scrollbar-thin"
      >
        {logs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground font-sans text-xs">
            {isAccountMode
              ? "Consultá una cuenta para ver la salida de net user."
              : "Selecciona una acción (Ping, Ping -t, Nbtstat, Tracert, ARP) en la barra superior para iniciar diagnóstico."}
          </div>
        ) : (
          logs.map((line, idx) => {
            const isGroupHeader = /grupos globales|global group memberships/i.test(
              line,
            );
            if (isGroupHeader) insideGlobalGroups = true;

            const isGroupItem = insideGlobalGroups && /^\s*\*/.test(line);
            if (insideGlobalGroups && line.trim() === "") {
              insideGlobalGroups = false;
            }

            const tone = isGroupHeader
              ? "text-cyan-300 font-semibold"
              : isGroupItem
                ? "text-cyan-300"
                : line.startsWith("[") && line.includes(">")
                  ? "text-cyan-400 font-bold"
                  : line.includes("Iniciando") || line.includes("Ejecutando")
                    ? "text-amber-400 font-semibold"
                    : line.includes("finalizado")
                      ? "text-emerald-400 font-semibold"
                      : line.includes("Error") ||
                          line.includes("cerrado") ||
                          line.includes("inaccesible")
                        ? "text-red-400 font-semibold"
                        : "text-[#E5E5E5]";

            return (
              <div key={idx} className={`whitespace-pre font-mono ${tone}`}>
                {line}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
