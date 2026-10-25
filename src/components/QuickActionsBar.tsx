import React, { useState } from 'react';
import { TerminalData } from '../types/terminal';
import {
  MonitorPlay,
  HelpCircle,
  Activity,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
} from 'lucide-react';

export interface ActionFeedbackState {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  fallbackAction?: {
    label: string;
    onClick: () => void;
  };
}

interface QuickActionsBarProps {
  terminal: TerminalData;
  isPinging: boolean;
  actionFeedback?: ActionFeedbackState | null;
  onLaunchVnc: () => void;
  onLaunchMsra: () => void;
  onTogglePing: () => void;
}

export function QuickActionsBar({
  terminal,
  isPinging,
  actionFeedback,
  onLaunchVnc,
  onLaunchMsra,
  onTogglePing,
}: QuickActionsBarProps): React.JSX.Element {
  const [localFeedback, setLocalFeedback] = useState<string | null>(null);

  const handleAction = (label: string, callback: () => void): void => {
    callback();
    setLocalFeedback(`Acción disparada: ${label} para ${terminal.pc}`);
    setTimeout(() => setLocalFeedback(null), 3000);
  };

  const currentFeedback = actionFeedback || (localFeedback ? { type: 'success' as const, message: localFeedback } : null);

  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-2.5 shadow-xs">
      <div className="flex items-center justify-between min-h-6 flex-wrap gap-2">
        <h2 className="text-xs font-bold font-heading uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5 text-primary" />
          Herramientas y Acciones Remotas
        </h2>

        {/* Feedback Inline Sustitutivo */}
        {currentFeedback && (
          <div
            className={`flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-md transition-colors animate-fade-in ${
              currentFeedback.type === 'error'
                ? 'bg-destructive/15 text-destructive border border-destructive/30'
                : currentFeedback.type === 'warning'
                ? 'bg-amber-500/15 text-amber-500 dark:text-amber-300 border border-amber-500/30'
                : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
            }`}
          >
            {currentFeedback.type === 'error' ? (
              <XCircle className="h-3.5 w-3.5 shrink-0 text-destructive" />
            ) : currentFeedback.type === 'warning' ? (
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
            )}
            <span className="font-mono text-[11px] font-semibold">{currentFeedback.message}</span>

            {/* Acción de Fallback Inline (ej. pasar a MSRA si VNC está cerrado) */}
            {currentFeedback.fallbackAction && (
              <button
                type="button"
                onClick={currentFeedback.fallbackAction.onClick}
                aria-label={currentFeedback.fallbackAction.label}
                className="inline-flex items-center gap-1 ml-1.5 px-2 py-0.2 rounded bg-destructive text-white hover:bg-destructive/90 text-[10px] font-bold transition-colors cursor-pointer"
              >
                <span>{currentFeedback.fallbackAction.label}</span>
                <ArrowRight className="h-2.5 w-2.5" />
              </button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <button
          type="button"
          onClick={() => handleAction('VNC Viewer', onLaunchVnc)}
          aria-label="Conectar por VNC Viewer"
          title="Conectar por VNC (Atajo F2)"
          className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-all shadow-xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <MonitorPlay className="h-4 w-4" />
          <span>VNC Viewer</span>
          <kbd className="hidden md:inline-block ml-1 px-1 text-[9px] rounded bg-white/20 font-mono">F2</kbd>
        </button>

        <button
          type="button"
          onClick={() => handleAction('Asistencia Remota MSRA', onLaunchMsra)}
          aria-label="Iniciar Asistencia MSRA"
          title="Iniciar Asistencia MSRA (Atajo F4)"
          className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-md bg-secondary text-secondary-foreground hover:bg-muted transition-colors border border-border cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <HelpCircle className="h-4 w-4 text-blue-500" />
          <span>Asistencia MSRA</span>
          <kbd className="hidden md:inline-block ml-1 px-1 text-[9px] rounded bg-muted-foreground/20 font-mono">F4</kbd>
        </button>

        <button
          type="button"
          onClick={onTogglePing}
          aria-label={isPinging ? 'Detener Ping en vivo' : 'Iniciar Ping continuo'}
          title="Iniciar / Detener Ping continuo (Atajo F3)"
          className={`flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-md transition-colors border cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring ${
            isPinging
              ? 'bg-destructive text-white border-destructive'
              : 'bg-muted text-foreground border-border hover:bg-muted/80'
          }`}
        >
          <Activity className={`h-4 w-4 ${isPinging ? 'animate-spin' : 'text-emerald-500'}`} />
          <span>{isPinging ? 'Detener Ping' : 'Iniciar Ping'}</span>
          <kbd className="hidden md:inline-block ml-1 px-1 text-[9px] rounded bg-background/60 font-mono">F3</kbd>
        </button>

        <div className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-muted/60 border border-border text-xs">
          <span className="text-muted-foreground flex items-center gap-1 text-[11px] font-medium">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" /> Uptime
          </span>
          <span className="font-mono font-semibold text-foreground truncate max-w-[120px] text-[11px]" title={terminal.uptimeText}>
            {terminal.uptimeText}
          </span>
        </div>
      </div>
    </div>
  );
}
