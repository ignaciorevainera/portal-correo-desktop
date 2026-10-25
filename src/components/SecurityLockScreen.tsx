import React, { useState } from 'react';
import {
  ShieldAlert,
  Lock,
  KeyRound,
  FolderSync,
  Network,
  Building2,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import { SecurityGateStatus } from '../services/electronClient';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface SecurityLockScreenProps {
  status: SecurityGateStatus;
  onUnlock: (configPath: string, corporateKey: string) => Promise<void>;
  onRetry: () => Promise<void>;
  isLoading?: boolean;
}

export function SecurityLockScreen({
  status,
  onUnlock,
  onRetry,
  isLoading = false,
}: SecurityLockScreenProps): React.JSX.Element {
  const [configPath, setConfigPath] = useState('');
  const [corporateKey, setCorporateKey] = useState('');

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!configPath.trim()) return;
    await onUnlock(configPath.trim(), corporateKey);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6 font-sans select-none antialiased">
      <Card className="w-full max-w-xl border-border rounded-xl shadow-2xl overflow-hidden p-0 gap-0">
        {/* Header */}
        <CardHeader className="px-6 py-5 border-b border-border bg-muted/40 flex flex-row items-center gap-3.5 space-y-0">
          <div className="p-2.5 rounded-lg bg-destructive/15 text-destructive border border-destructive/30 shrink-0">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <CardTitle className="text-lg font-bold font-heading tracking-tight text-foreground">
              Control de Acceso Corporativo — new CMDA
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Uso exclusivo dentro de la red interna o VPN corporativa autorizada
            </CardDescription>
          </div>
        </CardHeader>

        {/* Body */}
        <CardContent className="p-6 space-y-5">
          {/* Status Alert Banner */}
          <Alert variant="destructive" className="items-start gap-3">
            <Lock className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <AlertTitle className="text-xs font-semibold text-foreground">
                Consola Bloqueada por Política de Seguridad
              </AlertTitle>
              <AlertDescription className="text-xs text-muted-foreground leading-relaxed font-mono">
                {status.message}
              </AlertDescription>
            </div>
          </Alert>

          {/* Environment Diagnostic Indicators */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5 font-medium">
                  <FolderSync className="h-3.5 w-3.5 text-primary" />
                  Configuración
                </span>
                {status.configured ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-amber-500" />
                )}
              </div>
              <p className="text-xs font-mono font-semibold text-foreground">
                {status.configured ? 'Cargada' : 'Sin vincular'}
              </p>
            </div>

            <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5 font-medium">
                  <Building2 className="h-3.5 w-3.5 text-primary" />
                  Dominio AD
                </span>
                {status.domainMatched ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-amber-500" />
                )}
              </div>
              <p className="text-xs font-mono font-semibold text-foreground truncate" title={status.detectedDomain}>
                {status.domainMatched ? `Verificado (${status.detectedDomain})` : `Externo (${status.detectedDomain})`}
              </p>
            </div>

            <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5 font-medium">
                  <Network className="h-3.5 w-3.5 text-primary" />
                  Red / VPN
                </span>
                {status.networkReachable ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-destructive" />
                )}
              </div>
              <p className="text-xs font-mono font-semibold text-foreground">
                {status.networkReachable ? 'Conectado' : 'Sin alcance'}
              </p>
            </div>
          </div>

          {/* Unlock Form */}
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label
                htmlFor="unc-config-path"
                className="block text-xs font-medium text-foreground"
              >
                Ruta del archivo <code className="font-mono text-primary">cmda.config.json</code> en Red Interna (UNC):
              </Label>
              <Input
                id="unc-config-path"
                type="text"
                value={configPath}
                onChange={(e) => setConfigPath(e.target.value)}
                placeholder="\\SERVIDOR-INTERNO\Compartido\cmda.config.json"
                className="w-full h-9 px-3 text-xs font-mono rounded-md bg-muted/60"
              />
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="corporate-unlock-key"
                className="block text-xs font-medium text-foreground"
              >
                Clave de Activación Corporativa:
              </Label>
              <div className="relative flex items-center">
                <KeyRound className="absolute left-3 h-3.5 w-3.5 text-muted-foreground pointer-events-none z-10" />
                <Input
                  id="corporate-unlock-key"
                  type="password"
                  value={corporateKey}
                  onChange={(e) => setCorporateKey(e.target.value)}
                  placeholder="Ingrese la clave corporativa..."
                  className="w-full h-9 pl-9 pr-3 text-xs font-mono rounded-md bg-muted/60"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
              <Button
                type="submit"
                variant="default"
                disabled={isLoading || !configPath.trim()}
                className="w-full sm:flex-1 h-9 text-xs font-medium cursor-pointer"
              >
                <KeyRound className="h-3.5 w-3.5" />
                <span>Desbloquear y Verificar Entorno</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={onRetry}
                disabled={isLoading}
                className="w-full sm:w-auto h-9 text-xs font-medium cursor-pointer"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Reintentar Red / VPN</span>
              </Button>
            </div>
          </form>
        </CardContent>

        {/* Footer */}
        <CardFooter className="px-6 py-3 border-t border-border bg-muted/20 text-[11px] text-muted-foreground font-mono flex items-center justify-between">
          <span>Protección Zero-Secrets (AES-256-GCM)</span>
          <span>Candado Dual AD + VPN</span>
        </CardFooter>
      </Card>
    </div>
  );
}
