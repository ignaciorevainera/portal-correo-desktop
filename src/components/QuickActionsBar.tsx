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
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

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
  onLaunchPingInfinite?: () => void;
}

export function QuickActionsBar({
  terminal,
  isPinging,
  actionFeedback,
  onLaunchVnc,
  onLaunchMsra,
  onTogglePing,
  onLaunchPingInfinite,
}: QuickActionsBarProps): React.JSX.Element {
  const [localFeedback, setLocalFeedback] = useState<string | null>(null);

  const handleAction = (label: string, callback: () => void): void => {
    callback();
    setLocalFeedback(`Acción disparada: ${label} para ${terminal.pc}`);
    setTimeout(() => setLocalFeedback(null), 3000);
  };

  const currentFeedback = actionFeedback || (localFeedback ? { type: 'success' as const, message: localFeedback } : null);

  return (
    <Card size="sm" className="rounded-lg border border-border bg-card p-3 space-y-2.5 shadow-xs gap-0 py-3">
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
              <Button
                type="button"
                variant="destructive"
                size="xs"
                onClick={currentFeedback.fallbackAction.onClick}
                aria-label={currentFeedback.fallbackAction.label}
                className="inline-flex items-center gap-1 ml-1.5 px-2 py-0.2 h-5 rounded bg-destructive text-white hover:bg-destructive/90 text-[10px] font-bold cursor-pointer"
              >
                <span>{currentFeedback.fallbackAction.label}</span>
                <ArrowRight className="h-2.5 w-2.5" />
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Button
          type="button"
          variant="default"
          size="sm"
          onClick={() => handleAction('VNC Viewer', onLaunchVnc)}
          aria-label="Conectar por VNC Viewer"
          title="Conectar por VNC (Atajo F2)"
          className="text-xs font-semibold shadow-xs cursor-pointer"
        >
          <MonitorPlay className="h-4 w-4" />
          <span>VNC Viewer</span>
          <kbd className="hidden md:inline-block ml-1 px-1 text-[9px] rounded bg-white/20 font-mono">F2</kbd>
        </Button>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => handleAction('Asistencia Remota MSRA', onLaunchMsra)}
          aria-label="Iniciar Asistencia MSRA"
          title="Iniciar Asistencia MSRA (Atajo F4)"
          className="text-xs font-semibold border border-border cursor-pointer"
        >
          <HelpCircle className="h-4 w-4 text-blue-500" />
          <span>Asistencia MSRA</span>
          <kbd className="hidden md:inline-block ml-1 px-1 text-[9px] rounded bg-muted-foreground/20 font-mono">F4</kbd>
        </Button>

        {/* Grupo Ping 2:1 (Ping 4 paquetes + Ping -t continuo) */}
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant={isPinging ? 'destructive' : 'outline'}
            size="sm"
            onClick={onTogglePing}
            aria-label={isPinging ? 'Detener Ping en vivo' : 'Iniciar Ping'}
            title="Iniciar Ping estándar (4 paquetes) (Atajo F3)"
            className={`flex-[2] text-xs font-semibold cursor-pointer ${
              isPinging
                ? 'bg-destructive text-white border-destructive hover:bg-destructive/90 animate-pulse'
                : 'bg-muted text-foreground border-border hover:bg-muted/80'
            }`}
          >
            <Activity className={`h-3.5 w-3.5 ${isPinging ? 'animate-pulse' : 'text-emerald-500'}`} />
            <span>{isPinging ? 'Detener' : 'Ping'}</span>
            <kbd className="hidden md:inline-block ml-0.5 px-1 text-[9px] rounded bg-background/60 font-mono">F3</kbd>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onLaunchPingInfinite?.()}
            aria-label="Iniciar Ping continuo -t"
            title="Ejecutar Ping infinito / continuo (-t)"
            className="flex-1 px-1.5 text-xs font-semibold bg-muted text-foreground border-border hover:bg-muted/80 cursor-pointer"
          >
            <span className="font-mono text-[11px] font-bold">-t</span>
          </Button>
        </div>

        <div className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-muted/60 border border-border text-xs h-8">
          <span className="text-muted-foreground flex items-center gap-1 text-[11px] font-medium">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" /> Uptime
          </span>
          <span className="font-mono font-semibold text-foreground truncate max-w-[120px] text-[11px]" title={terminal.uptimeText}>
            {terminal.uptimeText}
          </span>
        </div>
      </div>
    </Card>
  );
}
