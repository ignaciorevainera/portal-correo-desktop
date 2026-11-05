import React, { useState, useEffect, useRef } from "react";
import {
  Square,
  Trash2,
  Copy,
  Check,
  ClipboardList,
  CheckCheck,
  Activity,
  UserRound,
  RefreshCw,
  ChevronRight,
} from "lucide-react";
import {
  subscribeToPing,
  subscribeToDiagnosticCommand,
} from "../services/electronClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export interface DiagnosticCommandEvent {
  id: string;
  command: "ping" | "nbtstat" | "tracert" | "arp" | "netuser";
  target: string;
  argsText: string;
  timestamp: string;
  options?: any;
}

interface LivePingConsoleProps {
  ip: string;
  isPinging: boolean;
  pingMode?: "standard" | "infinite";
  linePrefix?: string;
  activeCommand?: DiagnosticCommandEvent | null;
  /** Se incrementa sólo ante acciones iniciadas por el operador; abre la consola. */
  openSignal?: number;
  onTogglePing: () => void;
  onPingComplete?: () => void;
  onStopCommand?: () => void;
  onDiagnosticComplete?: () => void;
  mode?: "terminal" | "account";
  targetLabel?: string;
  fill?: boolean;
  onRerun?: () => void;
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

/**
 * Consola de ping/diagnóstico colapsable. Arranca abierta; el operador puede
 * colapsarla desde la cabecera. Una acción posterior (`openSignal`) o un comando
 * de diagnóstico (`activeCommand`) la vuelven a abrir.
 */
export function LivePingConsole({
  ip,
  isPinging,
  pingMode = "standard",
  linePrefix,
  activeCommand,
  openSignal,
  onTogglePing,
  onPingComplete,
  onStopCommand,
  onDiagnosticComplete,
  mode = "terminal",
  targetLabel,
  fill = false,
  onRerun,
}: LivePingConsoleProps): React.JSX.Element {
  const [logs, setLogs] = useState<string[]>([]);
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedLast, setCopiedLast] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const onPingCompleteRef = useRef(onPingComplete);
  onPingCompleteRef.current = onPingComplete;
  const onDiagnosticCompleteRef = useRef(onDiagnosticComplete);
  onDiagnosticCompleteRef.current = onDiagnosticComplete;
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeCommandId = activeCommand?.id;
  // Señal ya procesada al montar: evita que un valor viejo reabra la consola
  // al montarse de nuevo tras una búsqueda.
  const handledOpenSignal = useRef(openSignal ?? 0);

  // Los diagnósticos siempre son iniciados por el operador: abren la consola.
  useEffect(() => {
    if (activeCommandId) setIsOpen(true);
  }, [activeCommandId]);

  // Sólo un incremento de la señal (acción del operador mientras la consola
  // está montada) la abre; el ping automático de carga no incrementa nada.
  useEffect(() => {
    if ((openSignal ?? 0) > handledOpenSignal.current) {
      handledOpenSignal.current = openSignal ?? 0;
      setIsOpen(true);
    }
  }, [openSignal]);

  // Auto-desplazamiento exclusivo dentro del contenedor de la terminal ante nuevas líneas
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [logs, isOpen]);

  // Ping subscription (backward-compatible)
  useEffect(() => {
    if (!isPinging || !ip) return;

    const isInfinite = pingMode === "infinite";
    // Append instead of wiping
    const prefixTag = linePrefix ? `${linePrefix} ` : "";
    const header = `[${new Date().toLocaleTimeString()}] > ${prefixTag}ping ${isInfinite ? "-t" : "-n 4"} ${ip}`;
    setLogs((prev) => [...prev, header]);

    const unsubscribe = subscribeToPing(
      ip,
      (text: string) => {
        const sanitized = sanitizePingText(text);
        const rawLines = sanitized.split(/\r?\n/).filter(Boolean);
        // Mantener las líneas intermedias limpias (el prefijo solo va en la cabecera inicial)
        if (rawLines.length > 0) {
          setLogs((prev) => [...prev, ...rawLines].slice(-400));
        }
      },
      (code: number) => {
        // Línea final limpia sin prefijo repetido
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
  }, [isPinging, ip, pingMode, linePrefix]);

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
        onDiagnosticCompleteRef.current?.();
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
    <Collapsible asChild open={isOpen} onOpenChange={setIsOpen}>
      <Card
        data-testid="live-ping-console"
        data-slot="card"
        className={`w-full gap-0 overflow-hidden py-0 ${
          fill && isOpen ? "flex h-full min-h-0 flex-col" : "shrink-0"
        }`}
      >
        <span role="status" aria-live="polite" className="sr-only">
          {copiedLast
            ? "Bloque copiado al portapapeles"
            : copiedAll
              ? "Logs copiados al portapapeles"
              : ""}
        </span>

        {/* Barra de Controles Superior: cabecera colapsable y acciones */}
        <div
          data-testid="console-header"
          className="flex items-center justify-between border-b border-border px-3 py-2.5"
        >
          <CollapsibleTrigger asChild>
            <button
              type="button"
              aria-label={`Consola de ${headerLabel}`}
              className="flex min-w-0 items-center gap-2 cursor-pointer focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <ChevronRight
                className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ${
                  isOpen ? "rotate-90" : ""
                }`}
              />
              <HeaderIcon className="h-3.5 w-3.5 text-link shrink-0" />
              <span className="font-mono text-xs font-bold text-foreground truncate">
                {headerLabel}
              </span>
            </button>
          </CollapsibleTrigger>

          {/* Controles: Detener (solo cuando activo), Limpiar, Copiar Último Bloque y Copiar Todos los Logs */}
          <div className="flex items-center gap-1.5 shrink-0">
            {isAnyRunning && (
              <Button
                type="button"
                variant="destructive"
                size="xs"
                onClick={(event) => {
                  event.stopPropagation();
                  handleStop();
                }}
                aria-label="Detener ping en vivo"
                className="h-7 px-2.5 text-micro font-sans font-medium flex items-center gap-1 cursor-pointer bg-destructive text-destructive-foreground hover:bg-destructive/90 dark:bg-destructive dark:hover:bg-destructive/90"
              >
                <Square className="h-3 w-3" />
                <span className="max-sm:hidden">Detener</span>
              </Button>
            )}

            {onRerun && (
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={(event) => {
                  event.stopPropagation();
                  onRerun?.();
                }}
                disabled={isAnyRunning}
                aria-label="Re-ejecutar consulta"
                title="Volver a ejecutar net user"
                className="h-7 px-2.5 text-micro font-sans font-medium flex items-center gap-1 cursor-pointer disabled:opacity-40"
              >
                <RefreshCw className="h-3 w-3" />
                <span className="max-sm:hidden">Re-ejecutar</span>
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={(event) => {
                event.stopPropagation();
                handleClear();
              }}
              aria-label="Limpiar logs de ping"
              title="Limpiar pantalla de logs"
              className="h-7 px-2 text-micro font-sans flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="h-3 w-3" />
              <span className="max-sm:hidden">Limpiar</span>
            </Button>

            {/* Copiar Último Bloque */}
            <Button
              type="button"
              variant={copiedLast ? "secondary" : "outline"}
              size="xs"
              onClick={(event) => {
                event.stopPropagation();
                handleCopyLastBlock();
              }}
              disabled={logs.length === 0}
              aria-label="Copiar último bloque de logs"
              title="Copiar únicamente el último comando y su respuesta al portapapeles"
              className="h-7 px-2.5 text-micro font-sans flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
            >
              {copiedLast ? (
                <Check className="h-3 w-3 text-success" />
              ) : (
                <Copy className="h-3 w-3 text-muted-foreground" />
              )}
              <span className="max-sm:hidden">{copiedLast ? "Bloque copiado" : "Copiar Último"}</span>
            </Button>

            {/* Copiar Todos los Logs */}
            <Button
              type="button"
              variant={copiedAll ? "secondary" : "outline"}
              size="xs"
              onClick={(event) => {
                event.stopPropagation();
                handleCopyLogs();
              }}
              disabled={logs.length === 0}
              aria-label="Copiar logs de ping"
              title="Copiar logs completos al portapapeles"
              className="h-7 px-2.5 text-micro font-sans flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
            >
              {copiedAll ? (
                <CheckCheck className="h-3 w-3 text-success" />
              ) : (
                <ClipboardList className="h-3 w-3 text-muted-foreground" />
              )}
              <span className="max-sm:hidden">{copiedAll ? "Logs copiados" : "Copiar Logs"}</span>
            </Button>
          </div>
        </div>

        <CollapsibleContent
          className={fill ? "flex min-h-0 flex-1 flex-col" : undefined}
        >
          {/* Pantalla Contigua estilo Windows Terminal: bg-console-bg, altura adaptable (9rem–40rem, ~30vh), auto-scroll interno por línea */}
          <div
            ref={scrollContainerRef}
            data-testid="terminal-scroll-container"
            className={`${
              fill ? "flex-1 min-h-0" : "h-[clamp(9rem,30vh,40rem)]"
            } overflow-y-auto overflow-x-auto p-3 bg-console-bg font-mono text-micro leading-relaxed text-console-muted select-text`}
          >
            {logs.length === 0 ? (
              <div className="h-full flex items-center justify-center text-console-muted font-sans text-xs">
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
                  ? "text-console-info font-semibold"
                  : isGroupItem
                    ? "text-console-info"
                    : line.startsWith("[") && line.includes(">")
                      ? "text-console-info font-bold"
                      : line.includes("Iniciando") || line.includes("Ejecutando")
                        ? "text-console-warning font-semibold"
                        : line.includes("finalizado")
                          ? "text-console-success font-semibold"
                          : line.includes("Error") ||
                              line.includes("cerrado") ||
                              line.includes("inaccesible")
                            ? "text-console-destructive font-semibold"
                            : "text-console-fg";

                return (
                  <div key={idx} className={`whitespace-pre font-mono ${tone}`}>
                    {line}
                  </div>
                );
              })
            )}
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
