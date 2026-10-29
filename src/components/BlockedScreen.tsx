import { ShieldAlert, RefreshCw, WifiOff, FileWarning } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { GateStatus } from '../services/electronClient';

interface BlockedScreenProps {
  gate: GateStatus;
  onRetry: () => void;
  isRetrying: boolean;
}

const TITULOS: Record<string, string> = {
  NO_CONFIG: 'Falta la configuración corporativa',
  BAD_CONFIG: 'La configuración corporativa no es válida',
};

export function BlockedScreen({ gate, onRetry, isRetrying }: BlockedScreenProps) {
  const esConfig = gate.status === 'NO_CONFIG';
  const Icono = esConfig ? FileWarning : gate.code === 'NO_PERMISSION' ? ShieldAlert : WifiOff;
  const titulo = TITULOS[gate.status] || 'Sin acceso a la red corporativa';

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-6 bg-background p-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <Icono className="h-8 w-8" aria-hidden="true" />
      </div>

      <div className="max-w-md space-y-2">
        <h1 className="font-heading text-xl font-bold text-foreground">{titulo}</h1>
        <p className="text-sm text-muted-foreground">{gate.message}</p>
      </div>

      <div className="w-full max-w-md rounded-md border border-border/70 bg-muted/30 p-3 text-left font-mono text-[11px] text-muted-foreground">
        <div>
          <span className="font-semibold">Código:</span> {gate.code}
        </div>
        <div>
          <span className="font-semibold">Origen:</span> {gate.source}
        </div>
        {gate.configPath ? (
          <div className="break-all">
            <span className="font-semibold">Ruta:</span> {gate.configPath}
          </div>
        ) : null}
      </div>

      <Button onClick={onRetry} disabled={isRetrying} className="gap-2">
        <RefreshCw className={`h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
        {isRetrying ? 'Verificando…' : 'Reintentar'}
      </Button>

      <p className="max-w-md text-xs text-muted-foreground">
        Si estás fuera de la red corporativa, conectate por cable o Wi-Fi corporativo y reintentá.
      </p>
    </div>
  );
}
