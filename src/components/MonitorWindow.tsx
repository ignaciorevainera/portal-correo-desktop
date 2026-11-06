import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  Check,
  Copy,
  MonitorPlay,
  Pin,
  PinOff,
  RotateCw,
  Square,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { classifyPingLine, sanitizePingText } from "@/lib/pingLog";
import type { MonitorContext } from "@/types/monitor";

const MAX_LINES = 500;

interface MonitorLine {
  id: number;
  text: string;
}

type MonitorStatus = "loading" | "starting" | "live" | "stopped" | "error";

const statusLabels: Record<MonitorStatus, string> = {
  loading: "Cargando monitor",
  starting: "Iniciando ping",
  live: "Ping en vivo",
  stopped: "Ping detenido",
  error: "Error de ping",
};

const statusDotClasses: Record<MonitorStatus, string> = {
  loading: "bg-muted-foreground",
  starting: "bg-warning animate-pulse",
  live: "bg-success",
  stopped: "bg-muted-foreground",
  error: "bg-destructive",
};

function toneClass(line: string): string {
  switch (classifyPingLine(line)) {
    case "info":
      return "text-console-info font-semibold";
    case "warning":
      return "text-console-warning";
    case "destructive":
      return "text-console-destructive font-semibold";
    default:
      return "text-console-fg";
  }
}

export function MonitorWindow(): React.JSX.Element {
  const api = window.monitorAPI;
  const [context, setContext] = useState<MonitorContext | null>(null);
  const [lines, setLines] = useState<MonitorLine[]>([]);
  const [status, setStatus] = useState<MonitorStatus>("loading");
  const [pinned, setPinned] = useState(true);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [remoteBusy, setRemoteBusy] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const bufferRef = useRef("");
  const frameRef = useRef<number | null>(null);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextLineIdRef = useRef(0);

  const appendLine = useCallback((text: string) => {
    const entry = { id: nextLineIdRef.current++, text };
    setLines((previous) => [...previous, entry].slice(-MAX_LINES));
  }, []);

  const appendLines = useCallback((texts: string[]) => {
    if (texts.length === 0) return;
    const entries = texts.map((text) => ({
      id: nextLineIdRef.current++,
      text,
    }));
    setLines((previous) => [...previous, ...entries].slice(-MAX_LINES));
  }, []);

  const resetWithHeader = useCallback((text: string) => {
    setLines([{ id: nextLineIdRef.current++, text }]);
  }, []);

  const flushBuffer = useCallback(() => {
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    const combined = bufferRef.current;
    const lastNewline = combined.lastIndexOf("\n");
    if (lastNewline === -1) return;
    const complete = combined.slice(0, lastNewline);
    bufferRef.current = combined.slice(lastNewline + 1);
    const nextLines = complete.split(/\r?\n/).filter(Boolean);
    if (nextLines.length === 0) return;
    appendLines(nextLines);
    setStatus((previous) =>
      previous === "stopped" || previous === "error" ? previous : "live",
    );
  }, [appendLines]);

  const scheduleFlush = useCallback(() => {
    if (frameRef.current !== null || flushTimerRef.current !== null) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      flushBuffer();
    });
    flushTimerRef.current = setTimeout(() => {
      flushTimerRef.current = null;
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      flushBuffer();
    }, 250);
  }, [flushBuffer]);

  useEffect(() => {
    if (!api) {
      setStatus("error");
      return;
    }

    let active = true;

    api
      .getContext()
      .then((nextContext) => {
        if (!active) return;
        if (!nextContext) {
          setStatus("error");
          return;
        }
        setContext(nextContext);
        setPinned(nextContext.pinned);
        resetWithHeader(`> ping -t ${nextContext.target}`);
        setStatus("starting");
        api.startPing();
      })
      .catch(() => {
        if (active) setStatus("error");
      });

    const unsubscribeData = api.onPingData((text) => {
      bufferRef.current += sanitizePingText(text);
      if (bufferRef.current.length > 200000) {
        bufferRef.current = bufferRef.current.slice(-200000);
      }
      scheduleFlush();
    });

    const unsubscribeEnd = api.onPingEnd((code) => {
      setStatus(code === 0 || code === null ? "stopped" : "error");
      appendLine(
        code === null
          ? "[proceso detenido]"
          : `[proceso finalizado: ${code}]`,
      );
    });

    return () => {
      active = false;
      unsubscribeData();
      unsubscribeEnd();
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      if (api) api.stopPing().catch(() => {});
    };
  }, [api, appendLine, resetWithHeader, scheduleFlush]);

  useEffect(() => {
    const applyTheme = () => {
      let theme = "dark";
      try {
        theme = localStorage.getItem("pcd-theme") || "dark";
      } catch {}
      document.documentElement.classList.toggle("dark", theme === "dark");
    };
    applyTheme();
    window.addEventListener("storage", applyTheme);
    return () => window.removeEventListener("storage", applyTheme);
  }, []);

  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (element && stickToBottomRef.current) {
      element.scrollTop = element.scrollHeight;
    }
  }, [lines]);

  const handleScroll = useCallback(() => {
    const element = scrollRef.current;
    if (!element) return;
    stickToBottomRef.current =
      element.scrollHeight - element.scrollTop - element.clientHeight < 24;
  }, []);

  const handleStopRestart = useCallback(() => {
    if (!api || !context) return;
    if (status === "starting" || status === "live") {
      api.stopPing().catch(() => {});
      setStatus("stopped");
      appendLine("[proceso detenido]");
      return;
    }
    setStatus("starting");
    resetWithHeader(`> ping -t ${context.target}`);
    api.startPing();
  }, [api, appendLine, context, resetWithHeader, status]);

  const handleCopy = useCallback(async () => {
    if (!api) return;
    try {
      const ok = await api.copyText(lines.map((line) => line.text).join("\n"));
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      setCopied(ok);
      setCopyError(!ok);
      copyTimerRef.current = setTimeout(() => {
        setCopied(false);
        setCopyError(false);
      }, 2000);
    } catch {
      setCopied(false);
      setCopyError(true);
      copyTimerRef.current = setTimeout(() => {
        setCopied(false);
        setCopyError(false);
      }, 2000);
    }
  }, [api, lines]);

  const handlePin = useCallback(async () => {
    if (!api) return;
    const nextPinned = !pinned;
    setPinned(nextPinned);
    try {
      const ok = await api.setPinned(nextPinned);
      if (!ok) setPinned(!nextPinned);
    } catch {
      setPinned(!nextPinned);
    }
  }, [api, pinned]);

  const handleRemote = useCallback(async () => {
    if (!api || !context || remoteBusy) return;
    setRemoteBusy(true);
    try {
      await api.connectRemote();
    } catch {
      // El main emite el toast de error; el botón solo se rehabilita.
    } finally {
      setRemoteBusy(false);
    }
  }, [api, context, remoteBusy]);

  const handleClose = useCallback(() => {
    if (!api) return;
    api.close().catch(() => {});
  }, [api]);

  const isRunning = status === "starting" || status === "live";
  const displayLabel = context
    ? context.label === context.target
      ? context.target
      : `${context.label} · ${context.target}`
    : "Monitor de ping";

  return (
    <div className="flex h-screen flex-col overflow-hidden border border-border bg-card">
      <header className="app-drag-region flex h-9 shrink-0 items-center justify-between gap-2 border-b border-border px-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={cn(
              "h-1.5 w-1.5 shrink-0 rounded-full",
              statusDotClasses[status],
            )}
            aria-hidden="true"
          />
          <span
            className="truncate font-mono text-xs font-semibold text-foreground"
            title={displayLabel}
          >
            {displayLabel}
          </span>
          <span className="sr-only" role="status">
            {statusLabels[status]}
          </span>
        </div>

        <div className="app-no-drag flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={handleRemote}
            disabled={remoteBusy || !context}
            aria-label={
              remoteBusy ? "Conectando remotamente…" : "Conectar remotamente"
            }
            title="Conectar remotamente (VNC o MSRA según puertos)"
            className="cursor-pointer text-muted-foreground hover:text-foreground"
          >
            {remoteBusy ? (
              <Spinner className="h-3.5 w-3.5" />
            ) : (
              <MonitorPlay className="h-3.5 w-3.5" />
            )}
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={handlePin}
            aria-label={
              pinned ? "Dejar de mantener visible" : "Mantener visible"
            }
            aria-pressed={pinned}
            title={pinned ? "Desanclar ventana" : "Mantener siempre visible"}
            className="cursor-pointer text-muted-foreground hover:text-foreground"
          >
            {pinned ? (
              <Pin className="h-3.5 w-3.5" />
            ) : (
              <PinOff className="h-3.5 w-3.5" />
            )}
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={handleCopy}
            disabled={lines.length === 0}
            aria-label="Copiar logs del monitor"
            title="Copiar logs del monitor"
            className="cursor-pointer text-muted-foreground hover:text-foreground"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-success" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={handleStopRestart}
            disabled={!context}
            aria-label={isRunning ? "Detener ping" : "Reiniciar ping"}
            title={isRunning ? "Detener ping" : "Reiniciar ping"}
            className="cursor-pointer text-muted-foreground hover:text-foreground"
          >
            {isRunning ? (
              <Square className="h-3.5 w-3.5" />
            ) : (
              <RotateCw className="h-3.5 w-3.5" />
            )}
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={handleClose}
            aria-label="Cerrar monitor"
            title="Cerrar monitor"
            className="cursor-pointer text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </header>

      <span role="status" className="sr-only">
        {copied ? "Logs copiados" : copyError ? "No se pudo copiar" : ""}
      </span>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        role="log"
        aria-live="off"
        aria-label={`Salida de ping de ${context?.label ?? ""}`}
        className="min-h-0 flex-1 overflow-y-auto overflow-x-auto bg-console-bg p-2.5 font-mono text-micro leading-relaxed text-console-fg select-text [color-scheme:dark]"
      >
        {status === "loading" && (
          <div className="text-console-muted">Cargando monitor…</div>
        )}
        {status === "error" && lines.length === 0 && (
          <div className="text-console-destructive">
            No se pudo iniciar el monitor de ping.
          </div>
        )}
        {lines.map((line) => (
          <div
            key={line.id}
            className={cn("whitespace-pre", toneClass(line.text))}
          >
            {line.text}
          </div>
        ))}
      </div>
    </div>
  );
}
