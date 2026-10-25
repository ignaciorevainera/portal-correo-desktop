import React, { useState, useEffect, useRef } from 'react';
import { Terminal as TerminalIcon, Play, Square, Trash2, Copy, Check } from 'lucide-react';
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
    <div className="rounded-lg border border-border bg-slate-950 text-slate-100 p-3 sm:p-4 space-y-2.5 font-mono text-xs shadow-inner">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2 flex-wrap gap-2">
        <div className="flex items-center gap-2 text-slate-300">
          <TerminalIcon className={`h-4 w-4 text-emerald-400 ${isPinging ? 'animate-pulse' : ''}`} />
          <span className="font-semibold text-slate-200">Consola de Ping en Vivo:</span>
          <span className="text-emerald-400 font-bold">{ip}</span>
          {pingMode === 'infinite' && (
            <Badge
              variant="outline"
              className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px] uppercase font-bold h-5"
            >
              Modo -t
            </Badge>
          )}
        </div>

        {/* Acciones de Consola en la Esquina Superior Derecha: Detener/Iniciar, Limpiar, Copiar Logs */}
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={onTogglePing}
            aria-label={isPinging ? 'Detener ping en vivo' : 'Iniciar ping'}
            className={`h-7 px-2.5 rounded text-[11px] font-sans font-medium flex items-center gap-1 transition-colors cursor-pointer ${
              isPinging
                ? 'bg-red-950 text-red-300 border-red-800 hover:bg-red-900 hover:text-red-200'
                : 'bg-emerald-950 text-emerald-300 border-emerald-800 hover:bg-emerald-900 hover:text-emerald-200'
            }`}
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
            className="h-7 px-2 rounded text-[11px] font-sans bg-transparent text-slate-400 hover:text-slate-200 border-slate-800 hover:bg-slate-900 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Trash2 className="h-3 w-3" />
            <span>Limpiar</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={handleCopyLogs}
            disabled={logs.length === 0}
            aria-label="Copiar logs de ping"
            title="Copiar logs completos al portapapeles"
            className={`h-7 min-w-[105px] px-2.5 rounded text-[11px] font-sans transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
              copied
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700 hover:bg-emerald-950'
                : 'bg-transparent text-slate-300 border-slate-800 hover:bg-slate-900 hover:text-white'
            }`}
          >
            {copied ? (
              <Check className="h-3 w-3 text-emerald-400" />
            ) : (
              <Copy className="h-3 w-3 text-slate-400" />
            )}
            <span>{copied ? 'Logs copiados' : 'Copiar Logs'}</span>
          </Button>
        </div>
      </div>

      <div className="h-44 overflow-y-auto space-y-1 pr-2 scrollbar-thin scrollbar-thumb-slate-800">
        {logs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500 font-sans text-xs">
            Presiona &quot;Iniciar&quot;, &quot;Ping&quot; o &quot;Ping -t&quot; para monitorear la latencia de red en tiempo real.
          </div>
        ) : (
          logs.map((line, idx) => (
            <div
              key={idx}
              className={`leading-relaxed ${
                line.includes('Iniciando') || line.includes('Ejecutando')
                  ? 'text-amber-300 font-semibold'
                  : line.includes('finalizado')
                  ? 'text-emerald-400 font-semibold'
                  : 'text-slate-300'
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
