import React, { useState, useEffect, useRef } from "react";
import { Square, Trash2, Copy, Check, Activity } from "lucide-react";
import {
  subscribeToPing,
  subscribeToDiagnosticCommand,
} from "../services/electronClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
}: LivePingConsoleProps): React.JSX.Element {
  const [logs, setLogs] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const onPingCompleteRef = useRef(onPingComplete);
  onPingCompleteRef.current = onPingComplete;
  const terminalEndRef = useRef<HTMLDivElement>(null);

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
        setLogs((prev) => [...prev, ...lines].slice(-400));
      },
      (code: number) => {
        setLogs((prev) => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] Proceso ping finalizado (código: ${code}).\n`,
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
        const lines = text.split(/\r?\n/).filter(Boolean);
        setLogs((prev) => [...prev, ...lines].slice(-400));
      },
      (code: number) => {
        setLogs((prev) => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] Proceso ${activeCommand.command} finalizado (código: ${code}).\n`,
        ]);
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
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      console.warn("Error al copiar logs:", err);
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

  return (
    <div className="rounded-lg border border-border bg-card shadow-xs overflow-hidden">
      {/* Barra de Controles Superior: Sin botón Iniciar redundante */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/40">
        <div className="flex items-center gap-2">
          <Activity className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="font-mono text-xs font-bold text-foreground">
            {ip}
          </span>
        </div>

        {/* Controles: Detener (solo cuando activo), Limpiar, Copiar Logs */}
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

          <Button
            type="button"
            variant={copied ? "secondary" : "outline"}
            size="xs"
            onClick={handleCopyLogs}
            disabled={logs.length === 0}
            aria-label="Copiar logs de ping"
            title="Copiar logs completos al portapapeles"
            className="h-7 min-w-26.25 px-2.5 text-[11px] font-sans flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
          >
            {copied ? (
              <Check className="h-3 w-3 text-emerald-500" />
            ) : (
              <Copy className="h-3 w-3 text-muted-foreground" />
            )}
            <span>{copied ? "Logs copiados" : "Copiar Logs"}</span>
          </Button>
        </div>
      </div>

      {/* Pantalla Contigua estilo Windows Terminal: bg-[#0C0C0C], altura generosa h-64, sin contenedor intermedio */}
      <div className="h-64 overflow-y-auto overflow-x-auto p-3.5 bg-[#0C0C0C] font-mono text-[11.5px] leading-relaxed text-[#CCCCCC] select-text scrollbar-thin">
        {logs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground font-sans text-xs">
            Selecciona una acción (Ping, Ping -t, Nbtstat, Tracert, ARP) en la
            barra superior para iniciar diagnóstico.
          </div>
        ) : (
          logs.map((line, idx) => (
            <div
              key={idx}
              className={`whitespace-pre font-mono ${
                line.startsWith("[") && line.includes(">")
                  ? "text-cyan-400 font-bold"
                  : line.includes("Iniciando") || line.includes("Ejecutando")
                    ? "text-amber-400 font-semibold"
                    : line.includes("finalizado")
                      ? "text-emerald-400 font-semibold"
                      : line.includes("Error") ||
                          line.includes("cerrado") ||
                          line.includes("inaccesible")
                        ? "text-red-400 font-semibold"
                        : "text-[#E5E5E5]"
              }`}
            >
              {line}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
