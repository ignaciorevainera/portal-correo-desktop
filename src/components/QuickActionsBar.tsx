import React, { useState } from 'react';
import { TerminalData } from '../types/terminal';
import { MonitorPlay, HelpCircle, Activity, Clock, CheckCircle2 } from 'lucide-react';

interface QuickActionsBarProps {
  terminal: TerminalData;
  isPinging: boolean;
  onLaunchVnc: () => void;
  onLaunchMsra: () => void;
  onTogglePing: () => void;
}

export function QuickActionsBar({
  terminal,
  isPinging,
  onLaunchVnc,
  onLaunchMsra,
  onTogglePing,
}: QuickActionsBarProps): React.JSX.Element {
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleAction = (label: string, callback: () => void): void => {
    callback();
    setFeedback(`Acción disparada: ${label} para ${terminal.pc}`);
    setTimeout(() => setFeedback(null), 3000);
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold font-heading text-foreground flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          Herramientas y Acciones Remotas
        </h2>
        {feedback && (
          <span className="text-xs text-primary font-medium flex items-center gap-1 animate-fade-in">
            <CheckCircle2 className="h-3.5 w-3.5" /> {feedback}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <button
          type="button"
          onClick={() => handleAction('VNC Viewer', onLaunchVnc)}
          aria-label="Conectar por VNC Viewer"
          className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <MonitorPlay className="h-4 w-4" />
          VNC Viewer
        </button>

        <button
          type="button"
          onClick={() => handleAction('Asistencia Remota MSRA', onLaunchMsra)}
          aria-label="Iniciar Asistencia MSRA"
          className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-md bg-secondary text-secondary-foreground hover:bg-muted transition-colors border border-border focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <HelpCircle className="h-4 w-4 text-blue-500" />
          Asistencia MSRA
        </button>

        <button
          type="button"
          onClick={onTogglePing}
          aria-label={isPinging ? 'Detener Ping en vivo' : 'Iniciar Ping continuo'}
          className={`flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-md transition-colors border focus:outline-none focus:ring-2 focus:ring-ring ${
            isPinging
              ? 'bg-destructive text-white border-destructive'
              : 'bg-muted text-foreground border-border hover:bg-muted/80'
          }`}
        >
          <Activity className={`h-4 w-4 ${isPinging ? 'animate-spin' : 'text-emerald-500'}`} />
          {isPinging ? 'Detener Ping' : 'Iniciar Ping'}
        </button>

        <div className="flex items-center justify-between px-3 py-2 rounded-md bg-muted/60 border border-border text-xs">
          <span className="text-muted-foreground flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" /> Uptime
          </span>
          <span className="font-mono font-medium text-foreground truncate max-w-[120px]" title={terminal.uptimeText}>
            {terminal.uptimeText}
          </span>
        </div>
      </div>
    </div>
  );
}
