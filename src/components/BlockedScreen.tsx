import { ShieldAlert, RefreshCw, WifiOff, FileWarning } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getStartupErrorContent } from '@/lib/startupErrors';
import type { GateStatus } from '../services/electronClient';

interface BlockedScreenProps {
  gate: GateStatus;
  onRetry: () => void;
  isRetrying: boolean;
}

export function BlockedScreen({ gate, onRetry, isRetrying }: BlockedScreenProps) {
  const content = getStartupErrorContent(gate);
  const Icono =
    gate.code === 'NO_PERMISSION'
      ? ShieldAlert
      : gate.code === 'NO_CONFIG' || gate.code === 'BAD_CONFIG'
        ? FileWarning
        : WifiOff;

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-5 sm:p-8">
      <section className="flex w-full max-w-lg flex-col items-center gap-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <Icono className="h-8 w-8" aria-hidden="true" />
        </div>

        <div className="space-y-2">
          <h1 className="font-heading text-lg font-bold text-balance text-foreground">
            {content.title}
          </h1>
          <p className="text-sm leading-relaxed text-pretty text-muted-foreground">
            {content.description}
          </p>
        </div>

        <div className="w-full space-y-2 rounded-lg border border-border/70 bg-muted/30 p-4 text-left">
          <h2 className="text-xs font-semibold text-foreground">
            Qué podés hacer
          </h2>
          <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-pretty text-muted-foreground">
            {content.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>
        </div>

        <Button onClick={onRetry} disabled={isRetrying} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
          {isRetrying ? 'Verificando…' : 'Reintentar'}
        </Button>

        <p className="font-mono text-micro text-muted-foreground break-words">
          Código para soporte: {gate.code}
        </p>
      </section>
    </div>
  );
}
