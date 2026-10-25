import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Trash2, Copy, Check, Activity } from 'lucide-react';
import { subscribeToPing } from '../services/electronClient';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface LivePingConsoleProps {
  ip: string;
  isPinging: boolean;
  pingMode?: 'standard' | 'infinite';
  onTogglePing: () => void;
  onPingComplete?: () => void;
}

function sanitizePingText(text: string): string {
  if (!text) return '';
  return text
    .replace(/Estad[\ufffd\?s]?sticas/gi, 'Estadísticas')
    .replace(/M[\ufffd\?a]?ximo/gi, 'Máximo')
    .replace(/M[\ufffd\?i]?nimo/gi, 'Mínimo')
    .replace(/milise[\ufffd\?]?gundos/gi, 'milisegundos')
    .replace(/perdid[\ufffd\?]?s/gi, 'perdidos')
    .replace(/recibid[\ufffd\?]?s/gi, 'recibidos')
    .replace(/enviad[\ufffd\?]?s/gi, 'enviados')
    .replace(/aproximad[\ufffd\?]?s/gi, 'aproximados');
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
        const sanitized = sanitizePingText(text);
        const lines = sanitized.split(/\r?\n/).filter(Boolean);
        setLogs((prev) => [...prev, ...lines].slice(-200));
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
    <div className="rounded-lg border border-border bg-card shadow-xs overflow-hidden">
      {/* Barra de Controles Superior: Sin título textual, solo IP/Badge y los 3 CTAs */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/40">
        <div className="flex items-center gap-2">
          <Activity className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="font-mono text-xs font-bold text-foreground">{ip}</span>
          {pingMode === 'infinite' ? (
            <Badge
              variant="outline"
              className="px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] uppercase font-bold h-5"
            >
              Modo -t
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="px-1.5 py-0.2 rounded bg-muted text-muted-foreground border-border text-[10px] font-mono h-5"
            >
              4 Paquetes
            </Badge>
          )}
        </div>

        {/* Los 3 CTAs: Iniciar/Detener, Limpiar, Copiar Logs */}
        <div className="flex items-center gap-1.5">
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
        </div>
      </div>

      {/* Pantalla Contigua estilo Windows Terminal: bg-[#0C0C0C], altura generosa h-64, sin contenedor intermedio */}
      <div className="h-64 overflow-y-auto overflow-x-auto p-3.5 bg-[#0C0C0C] font-mono text-[11.5px] leading-relaxed text-[#CCCCCC] select-text scrollbar-thin">
        {logs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground font-sans text-xs">
            Presiona &quot;Iniciar&quot;, &quot;Ping&quot; o &quot;Ping -t&quot; para monitorear la latencia de red en tiempo real.
          </div>
        ) : (
          logs.map((line, idx) => (
            <div
              key={idx}
              className={`whitespace-pre font-mono ${
                line.includes('Iniciando') || line.includes('Ejecutando')
                  ? 'text-amber-400 font-semibold'
                  : line.includes('finalizado')
                  ? 'text-emerald-400 font-semibold'
                  : line.includes('Error') || line.includes('cerrado') || line.includes('inaccesible')
                  ? 'text-red-400 font-semibold'
                  : 'text-[#E5E5E5]'
              }`}
            >
              {line}
            </div>
          ))
        )}
        <div ref={consoleBottomRef} />
      </div>
    </div>
  );
}
