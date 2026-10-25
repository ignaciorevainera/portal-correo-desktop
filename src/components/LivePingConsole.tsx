import React, { useState, useEffect, useRef } from 'react';
import { Terminal as TerminalIcon, Play, Square, Trash2, Copy, Check } from 'lucide-react';
import { subscribeToPing } from '../services/electronClient';
import { Card, CardHeader, CardTitle, CardAction, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface LivePingConsoleProps {
  ip: string;
  isPinging: boolean;
  pingMode?: 'standard' | 'infinite';
  onTogglePing: () => void;
  onPingComplete?: () => void;
}

export function LivePingConsole({
  ip,
  isPinging,
  pingMode = 'standard',
  onTogglePing,
  onPingComplete,
}: LivePingConsoleProps): React.JSX.Element {
  const [logs, setLogs] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const consoleBottomRef = useRef<HTMLDivElement>(null);
  const onPingCompleteRef = useRef(onPingComplete);
  onPingCompleteRef.current = onPingComplete;

  useEffect(() => {
    if (!isPinging || !ip) return;

    const isInfinite = pingMode === 'infinite';
    // Reemplaza los logs anteriores al iniciar un nuevo ping
    setLogs([
      `[${new Date().toLocaleTimeString()}] Ejecutando ping ${isInfinite ? 'continuo (-t)' : 'estándar (4 paquetes)'} a ${ip}...`,
    ]);

    const unsubscribe = subscribeToPing(
      ip,
      (text: string) => {
        const lines = text.split(/\r?\n/).filter(Boolean);
        setLogs((prev) => [...prev, ...lines].slice(-150));
      },
      (code: number) => {
        setLogs((prev) => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] Proceso ping finalizado (código: ${code}).`,
        ]);
        onPingCompleteRef.current?.();
      },
      isInfinite
    );

    return () => {
      unsubscribe();
    };
  }, [isPinging, ip, pingMode]);

  useEffect(() => {
    if (typeof consoleBottomRef.current?.scrollIntoView === 'function') {
      consoleBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const handleClear = (): void => {
    setLogs([]);
  };

  const handleCopyLogs = async (): Promise<void> => {
    if (logs.length === 0) return;
    const text = logs.join('\n');
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      console.warn('Error al copiar logs:', err);
    }
  };

  return (
    <Card size="sm" className="rounded-lg border-border bg-card shadow-xs">
      <CardHeader className="border-b border-border/60 pb-2 flex-row items-center justify-between">
        <CardTitle className="text-xs font-semibold flex items-center gap-2">
          <TerminalIcon className={`h-4 w-4 text-emerald-500 ${isPinging ? 'animate-pulse' : ''}`} />
          <span className="text-muted-foreground">Consola de Ping en Vivo:</span>
          <span className="font-mono font-bold text-foreground">{ip}</span>
          {pingMode === 'infinite' && (
            <Badge
              variant="outline"
              className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-500 dark:text-amber-300 border-amber-500/40 text-[10px] uppercase font-bold h-5 ml-1"
            >
              Modo -t
            </Badge>
          )}
        </CardTitle>

        {/* Acciones de Consola en la Esquina Superior Derecha: Detener/Iniciar, Limpiar, Copiar Logs */}
        <CardAction className="flex items-center gap-1.5">
          <Button
            type="button"
            variant={isPinging ? 'destructive' : 'default'}
            size="xs"
            onClick={onTogglePing}
            aria-label={isPinging ? 'Detener ping en vivo' : 'Iniciar ping'}
            className="h-7 px-2.5 text-[11px] font-sans font-medium flex items-center gap-1 cursor-pointer"
          >
            {isPinging ? <Square className="h-3 w-3" /> : <Play className="h-3 w-3" />}
            <span>{isPinging ? 'Detener' : 'Iniciar'}</span>
          </Button>

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
            variant={copied ? 'secondary' : 'outline'}
            size="xs"
            onClick={handleCopyLogs}
            disabled={logs.length === 0}
            aria-label="Copiar logs de ping"
            title="Copiar logs completos al portapapeles"
            className="h-7 min-w-[105px] px-2.5 text-[11px] font-sans flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
          >
            {copied ? (
              <Check className="h-3 w-3 text-emerald-500" />
            ) : (
              <Copy className="h-3 w-3 text-muted-foreground" />
            )}
            <span>{copied ? 'Logs copiados' : 'Copiar Logs'}</span>
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent className="pt-2">
        <div className="h-44 overflow-y-auto space-y-1 p-3 rounded-md bg-muted/40 border border-border/70 font-mono text-xs text-foreground scrollbar-thin">
          {logs.length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground font-sans text-xs">
              Presiona &quot;Iniciar&quot;, &quot;Ping&quot; o &quot;Ping -t&quot; para monitorear la latencia de red en tiempo real.
            </div>
          ) : (
            logs.map((line, idx) => (
              <div
                key={idx}
                className={`leading-relaxed ${
                  line.includes('Iniciando') || line.includes('Ejecutando')
                    ? 'text-amber-500 dark:text-amber-400 font-semibold'
                    : line.includes('finalizado')
                    ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                    : 'text-foreground/90'
                }`}
              >
                {line}
              </div>
            ))
          )}
          <div ref={consoleBottomRef} />
        </div>
      </CardContent>
    </Card>
  );
}
