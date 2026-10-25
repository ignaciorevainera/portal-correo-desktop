import React, { useState, useEffect, useRef } from 'react';
import { Terminal as TerminalIcon, Play, Square } from 'lucide-react';
import { subscribeToPing } from '../services/electronClient';

interface LivePingConsoleProps {
  ip: string;
  isPinging: boolean;
  onTogglePing: () => void;
}

export function LivePingConsole({
  ip,
  isPinging,
  onTogglePing,
}: LivePingConsoleProps): React.JSX.Element {
  const [logs, setLogs] = useState<string[]>([]);
  const consoleBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isPinging || !ip) return;

    setLogs((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] Ejecutando ping a ${ip}...`,
    ]);

    const unsubscribe = subscribeToPing(
      ip,
      (text: string) => {
        const lines = text.split(/\r?\n/).filter(Boolean);
        setLogs((prev) => [...prev, ...lines].slice(-100));
      },
      (code: number) => {
        setLogs((prev) => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] Proceso ping finalizado (código: ${code}).`,
        ]);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [isPinging, ip]);

  useEffect(() => {
    consoleBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleClear = (): void => {
    setLogs([]);
  };

  return (
    <div className="rounded-lg border border-border bg-slate-950 text-slate-100 p-4 space-y-3 font-mono text-xs shadow-inner">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2 text-slate-300">
          <TerminalIcon className="h-4 w-4 text-emerald-400" />
          <span className="font-semibold text-slate-200">Consola de Ping en Vivo:</span>
          <span className="text-emerald-400 font-bold">{ip}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onTogglePing}
            className={`px-2 py-1 rounded text-[11px] font-sans font-medium flex items-center gap-1 transition-colors ${
              isPinging
                ? 'bg-red-950 text-red-300 border border-red-800 hover:bg-red-900'
                : 'bg-emerald-950 text-emerald-300 border border-emerald-800 hover:bg-emerald-900'
            }`}
          >
            {isPinging ? <Square className="h-3 w-3" /> : <Play className="h-3 w-3" />}
            {isPinging ? 'Detener' : 'Iniciar'}
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="px-2 py-1 rounded text-[11px] font-sans text-slate-400 hover:text-slate-200 border border-slate-800 hover:bg-slate-900 transition-colors"
          >
            Limpiar
          </button>
        </div>
      </div>

      <div className="h-44 overflow-y-auto space-y-1 pr-2 scrollbar-thin scrollbar-thumb-slate-800">
        {logs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500 font-sans text-xs">
            Presiona &quot;Iniciar Ping&quot; para monitorear la latencia de red en tiempo real.
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
