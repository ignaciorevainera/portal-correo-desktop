import React, { useState, useEffect, useRef, useMemo } from "react";
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
import { currentPingLines, summarizePingLogs } from "@/lib/pingSummary";
import {
  groupConsoleLinesIntoBlocks,
  extractBlockText,
  ConsoleBlock,
} from "@/lib/consoleBlocks";
import {
  loadDefaultConsoleWrap,
  CONSOLE_WRAP_EVENT,
} from "@/lib/preferences";
import { sanitizePingText } from "@/lib/pingLog";
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
  /**
   * Ajuste de línea en la consola de resultados. Si no se provee, lee y
   * escucha automáticamente la preferencia global del operador.
   */
  wrap?: boolean;
}

export interface ConsoleLine {
  id: number;
  text: string;
  tone: string;
}

function classifyTone(line: string, insideGlobalGroupsRef: { current: boolean }): string {
  const isGroupHeader = /grupos globales|global group memberships/i.test(line);
  if (isGroupHeader) insideGlobalGroupsRef.current = true;

  const isGroupItem = insideGlobalGroupsRef.current && /^\s*\*/.test(line);
  if (insideGlobalGroupsRef.current && line.trim() === "") {
    insideGlobalGroupsRef.current = false;
  }

  if (isGroupHeader) return "text-console-info font-semibold";
  if (isGroupItem) return "text-console-info";
  if (line.startsWith("[") && line.includes(">")) return "text-console-info font-bold";
  if (line.includes("Iniciando") || line.includes("Ejecutando")) return "text-console-warning font-semibold";
  if (line.includes("finalizado")) return "text-console-success font-semibold";
  if (line.includes("Error") || line.includes("cerrado") || line.includes("inaccesible")) {
    return "text-console-destructive font-semibold";
  }
  return "text-console-fg";
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
  wrap: explicitWrap,
}: LivePingConsoleProps): React.JSX.Element {
  const [lines, setLines] = useState<ConsoleLine[]>([]);
  const nextLineIdRef = useRef(1);
  const insideGlobalGroupsRef = useRef(false);
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedLast, setCopiedLast] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const [isWrapActive, setIsWrapActive] = useState<boolean>(() => {
    return typeof explicitWrap === "boolean" ? explicitWrap : loadDefaultConsoleWrap();
  });

  useEffect(() => {
    if (typeof explicitWrap === "boolean") {
      setIsWrapActive(explicitWrap);
    }
  }, [explicitWrap]);

  useEffect(() => {
    if (typeof explicitWrap === "boolean") return;

    const handleWrapChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ consoleWrap?: boolean }>;
      if (typeof customEvent?.detail?.consoleWrap === "boolean") {
        setIsWrapActive(customEvent.detail.consoleWrap);
      } else {
        setIsWrapActive(loadDefaultConsoleWrap());
      }
    };

    window.addEventListener(CONSOLE_WRAP_EVENT, handleWrapChange);
    return () => {
      window.removeEventListener(CONSOLE_WRAP_EVENT, handleWrapChange);
    };
  }, [explicitWrap]);

  const onPingCompleteRef = useRef(onPingComplete);
  onPingCompleteRef.current = onPingComplete;
  const onDiagnosticCompleteRef = useRef(onDiagnosticComplete);
  onDiagnosticCompleteRef.current = onDiagnosticComplete;
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeCommandId = activeCommand?.id;
  // Señal ya procesada al montar: evita que un valor viejo reabra la consola
  // al montarse de nuevo tras una búsqueda.
  const handledOpenSignal = useRef(openSignal ?? 0);
  const wasPingingRef = useRef(false);
  const pingCompletedRef = useRef(false);

  const appendLines = React.useCallback((rawTexts: string[]) => {
    if (rawTexts.length === 0) return;
    setLines((prev) => {
      const newItems: ConsoleLine[] = rawTexts.map((text) => ({
        id: nextLineIdRef.current++,
        text,
        tone: classifyTone(text, insideGlobalGroupsRef),
      }));
      const combined = [...prev, ...newItems];
      return combined.length > 400 ? combined.slice(-400) : combined;
    });
  }, []);

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

  // Auto-desplazamiento exclusivo dentro del contenedor con requestAnimationFrame
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    let rafId: number;
    if (typeof requestAnimationFrame === "function") {
      rafId = requestAnimationFrame(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        }
      });
    }
    return () => {
      if (typeof cancelAnimationFrame === "function" && rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [lines, isOpen]);

  // Ping subscription (backward-compatible)
  useEffect(() => {
    if (!isPinging || !ip) return;

    pingCompletedRef.current = false;
    const isInfinite = pingMode === "infinite";
    // Append instead of wiping
    const prefixTag = linePrefix ? `${linePrefix} ` : "";
    const header = `[${new Date().toLocaleTimeString()}] > ${prefixTag}ping ${isInfinite ? "-t" : "-n 4"} ${ip}`;
    appendLines([header]);

    const unsubscribe = subscribeToPing(
      ip,
      (text: string) => {
        const sanitized = sanitizePingText(text);
        const rawLines = sanitized.split(/\r?\n/).filter(Boolean);
        // Mantener las líneas intermedias limpias (el prefijo solo va en la cabecera inicial)
        if (rawLines.length > 0) {
          appendLines(rawLines);
        }
      },
      (code: number) => {
        if (pingCompletedRef.current) return;
        pingCompletedRef.current = true;
        setLines((prev) => {
          const stringLines = prev.map((l) => l.text);
          const newEntries: ConsoleLine[] = [];

          if (isInfinite) {
            const summary = summarizePingLogs(currentPingLines(stringLines), ip);
            if (summary) {
              newEntries.push({
                id: nextLineIdRef.current++,
                text: summary,
                tone: classifyTone(summary, insideGlobalGroupsRef),
              });
            }
          }

          const completionMsg =
            code === null
              ? `[${new Date().toLocaleTimeString()}] Proceso ping detenido.\n`
              : `[${new Date().toLocaleTimeString()}] Proceso ping finalizado (código: ${code}).\n`;

          newEntries.push({
            id: nextLineIdRef.current++,
            text: completionMsg,
            tone: classifyTone(completionMsg, insideGlobalGroupsRef),
          });

          const combined = [...prev, ...newEntries];
          return combined.length > 400 ? combined.slice(-400) : combined;
        });
        onPingCompleteRef.current?.();
      },
      isInfinite,
    );

    return () => {
      unsubscribe();
    };
  }, [isPinging, ip, pingMode, linePrefix, appendLines]);

  // El operador puede detener el ping: el proceso se mata y no llega `ping-end`,
  // así que el resumen de un ping continuo se calcula al pasar isPinging a false.
  useEffect(() => {
    if (
      wasPingingRef.current &&
      !isPinging &&
      pingMode === "infinite" &&
      !pingCompletedRef.current
    ) {
      pingCompletedRef.current = true;
      setLines((prev) => {
        const stringLines = prev.map((l) => l.text);
        const summary = summarizePingLogs(currentPingLines(stringLines), ip);
        const newEntries: ConsoleLine[] = [];
        if (summary) {
          newEntries.push({
            id: nextLineIdRef.current++,
            text: summary,
            tone: classifyTone(summary, insideGlobalGroupsRef),
          });
        }
        const stopMsg = `[${new Date().toLocaleTimeString()}] Proceso ping detenido.\n`;
        newEntries.push({
          id: nextLineIdRef.current++,
          text: stopMsg,
          tone: classifyTone(stopMsg, insideGlobalGroupsRef),
        });
        const combined = [...prev, ...newEntries];
        return combined.length > 400 ? combined.slice(-400) : combined;
      });
    }
    wasPingingRef.current = isPinging;
  }, [isPinging, pingMode, ip]);

  // Generic diagnostic command subscription (nbtstat, tracert, arp)
  useEffect(() => {
    if (
      !activeCommand ||
      !activeCommand.command ||
      activeCommand.command === "ping"
    )
      return;

    const header = `[${activeCommand.timestamp || new Date().toLocaleTimeString()}] > ${activeCommand.argsText || `${activeCommand.command} ${activeCommand.target}`}`;
    appendLines([header]);

    const unsubscribe = subscribeToDiagnosticCommand(
      activeCommand.command,
      activeCommand.target,
      (text: string) => {
        const sanitized = sanitizePingText(text);
        const lines = sanitized.split(/\r?\n/).filter(Boolean);
        if (lines.length > 0) {
          appendLines(lines);
        }
      },
      (code: number) => {
        setLines((prev) => {
          const completionMsg = `[${new Date().toLocaleTimeString()}] Proceso ${activeCommand.command} finalizado (código: ${code}).\n`;
          const newEntries: ConsoleLine[] = [
            {
              id: nextLineIdRef.current++,
              text: completionMsg,
              tone: classifyTone(completionMsg, insideGlobalGroupsRef),
            },
          ];
          if (activeCommand.command === "netuser" && code !== 0) {
            const errLine = "[net user] No se pudo consultar la cuenta. Verificá que exista, que sea del dominio actual y que tu cuenta tenga permiso de lectura.\n";
            newEntries.push({
              id: nextLineIdRef.current++,
              text: errLine,
              tone: classifyTone(errLine, insideGlobalGroupsRef),
            });
          }
          const combined = [...prev, ...newEntries];
          return combined.length > 400 ? combined.slice(-400) : combined;
        });
        onDiagnosticCompleteRef.current?.();
      },
      activeCommand.options,
    );

    return () => {
      unsubscribe();
    };
  }, [activeCommand, appendLines]);

  const handleClear = (): void => {
    setLines([]);
    insideGlobalGroupsRef.current = false;
  };

  const handleCopyLogs = async (): Promise<void> => {
    if (lines.length === 0) return;
    const text = lines.map((l) => l.text).join("\n");
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
    if (lines.length === 0) return "";
    let lastCmdIdx = -1;
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].text.startsWith("[") && lines[i].text.includes(">")) {
        lastCmdIdx = i;
        break;
      }
    }
    if (lastCmdIdx === -1) {
      return lines.map((l) => l.text).join("\n");
    }
    return lines.slice(lastCmdIdx).map((l) => l.text).join("\n");
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

  const blocks = useMemo(() => groupConsoleLinesIntoBlocks(lines), [lines]);
  const [copiedBlockId, setCopiedBlockId] = useState<string | null>(null);
  const copiedBlockTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (copiedBlockTimerRef.current) {
        clearTimeout(copiedBlockTimerRef.current);
      }
    };
  }, []);

  const handleCopyBlock = async (block: ConsoleBlock, event?: React.SyntheticEvent): Promise<void> => {
    event?.stopPropagation();
    const text = extractBlockText(block);
    if (!text) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setCopiedBlockId(block.id);
        if (copiedBlockTimerRef.current) {
          clearTimeout(copiedBlockTimerRef.current);
        }
        copiedBlockTimerRef.current = setTimeout(() => {
          setCopiedBlockId(null);
        }, 2000);
      }
    } catch (err) {
      console.warn("Error al copiar bloque:", err);
    }
  };

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
          {copiedBlockId
            ? "Bloque copiado al portapapeles"
            : copiedLast
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
              <span className="font-mono text-xs font-bold text-foreground truncate hidden sm:inline">
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
              disabled={lines.length === 0}
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
              disabled={lines.length === 0}
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
          {/* Pantalla Contigua estilo Windows Terminal: bg-console-bg, altura fija al 50% del alto de la ventana, auto-scroll interno por línea */}
          <div
            ref={scrollContainerRef}
            data-testid="terminal-scroll-container"
            className={`${
              fill ? "flex-1 min-h-0" : "h-[50vh]"
            } overflow-y-auto ${
              isWrapActive ? "overflow-x-hidden" : "overflow-x-auto"
            } p-3 bg-console-bg font-mono text-micro leading-relaxed text-console-muted select-none`}
          >
            {lines.length === 0 ? (
              <div className="h-full flex items-center justify-center text-console-muted font-sans text-xs">
                {isAccountMode
                  ? "Consultá una cuenta para ver la salida de net user."
                  : "Selecciona una acción (Ping, Ping -t, Nbtstat, Tracert, ARP) en la barra superior para iniciar diagnóstico."}
              </div>
            ) : (
              blocks.map((block) => {
                const isCopied = copiedBlockId === block.id;
                return (
                  <div
                    key={block.id}
                    data-testid="console-block"
                    data-block-id={block.id}
                    role="button"
                    tabIndex={0}
                    onClick={(e) => handleCopyBlock(block, e)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleCopyBlock(block, e);
                      }
                    }}
                    aria-label={`Copiar bloque${block.commandText ? ` de ${block.commandText}` : ""}`}
                    title={isCopied ? "¡Bloque copiado al portapapeles!" : "Clic para copiar este bloque"}
                    className={`rounded-md p-1.5 -mx-1.5 mb-1.5 transition-colors cursor-pointer select-none ${
                      isCopied ? "bg-black/90" : "hover:bg-black/60"
                    } last:mb-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50`}
                  >
                    {block.lines.map((line) => (
                      <div
                        key={line.id}
                        data-line-id={line.id}
                        className={`${
                          isWrapActive
                            ? "whitespace-pre-wrap break-words [overflow-wrap:anywhere]"
                            : "whitespace-pre"
                        } font-mono ${line.tone}`}
                      >
                        {line.text}
                      </div>
                    ))}
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
