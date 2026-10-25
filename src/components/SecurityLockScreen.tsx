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
      <div className="w-full max-w-xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-border bg-muted/40 flex items-center gap-3.5">
          <div className="p-2.5 rounded-lg bg-destructive/15 text-destructive border border-destructive/30">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold font-heading tracking-tight text-foreground">
              Control de Acceso Corporativo — new CMDA
            </h1>
            <p className="text-xs text-muted-foreground">
              Uso exclusivo dentro de la red interna o VPN corporativa autorizada
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Status Banner */}
          <div className="p-3.5 rounded-lg bg-destructive/10 border border-destructive/25 flex items-start gap-3">
            <Lock className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-semibold text-foreground">
                Consola Bloqueada por Política de Seguridad
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed font-mono">
                {status.message}
              </p>
            </div>
          </div>

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
              <label
                htmlFor="unc-config-path"
                className="block text-xs font-medium text-foreground"
              >
                Ruta del archivo <code className="font-mono text-primary">cmda.config.json</code> en Red Interna (UNC):
              </label>
              <input
                id="unc-config-path"
                type="text"
                value={configPath}
                onChange={(e) => setConfigPath(e.target.value)}
                placeholder="\\SERVIDOR-INTERNO\Compartido\cmda.config.json"
                className="w-full h-9 px-3 text-xs font-mono rounded-md bg-muted/60 border border-input focus:bg-background focus:outline-none focus:ring-1 focus:ring-ring text-foreground"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="corporate-unlock-key"
                className="block text-xs font-medium text-foreground"
              >
                Clave de Activación Corporativa:
              </label>
              <div className="relative flex items-center">
                <KeyRound className="absolute left-3 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <input
                  id="corporate-unlock-key"
                  type="password"
                  value={corporateKey}
                  onChange={(e) => setCorporateKey(e.target.value)}
                  placeholder="Ingrese la clave corporativa..."
                  className="w-full h-9 pl-9 pr-3 text-xs font-mono rounded-md bg-muted/60 border border-input focus:bg-background focus:outline-none focus:ring-1 focus:ring-ring text-foreground"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
              <button
                type="submit"
                disabled={isLoading || !configPath.trim()}
                className="w-full sm:flex-1 h-9 px-4 rounded-md bg-primary text-primary-foreground font-medium text-xs hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <KeyRound className="h-3.5 w-3.5" />
                <span>Desbloquear y Verificar Entorno</span>
              </button>

              <button
                type="button"
                onClick={onRetry}
                disabled={isLoading}
                className="w-full sm:w-auto h-9 px-3.5 rounded-md bg-muted hover:bg-muted/80 text-foreground border border-border font-medium text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Reintentar Red / VPN</span>
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border bg-muted/20 text-[11px] text-muted-foreground font-mono flex items-center justify-between">
          <span>Protección Zero-Secrets (AES-256-GCM)</span>
          <span>Candado Dual AD + VPN</span>
        </div>
      </div>
    </div>
  );
}
