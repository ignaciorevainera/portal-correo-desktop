import React, { useState, useEffect } from 'react';
import {
  X,
  Network,
  Search,
  Radio,
  CheckCircle2,
  StopCircle,
  ExternalLink,
  Laptop,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  startSubnetScanner,
  SubnetDiscoveredHost,
  SubnetScanProgress,
} from '../services/electronClient';

interface SubnetScannerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  targetIp: string;
  onSelectTerminal: (pcOrIp: string) => void;
  onLaunchVnc: (target: string) => void;
}

export function SubnetScannerDrawer({
  isOpen,
  onClose,
  targetIp,
  onSelectTerminal,
  onLaunchVnc,
}: SubnetScannerDrawerProps): React.JSX.Element | null {
  const [hosts, setHosts] = useState<SubnetDiscoveredHost[]>([]);
  const [progress, setProgress] = useState<SubnetScanProgress>({ scanned: 0, total: 254 });
  const [isScanning, setIsScanning] = useState(false);
  const [isAborted, setIsAborted] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');

  const parts = targetIp.split('.');
  const subnetPrefix = parts.length === 4 ? `${parts[0]}.${parts[1]}.${parts[2]}.0/24` : targetIp;

  useEffect(() => {
    if (!isOpen || !targetIp) return;

    setHosts([]);
    setProgress({ scanned: 0, total: 254 });
    setIsScanning(true);
    setIsAborted(false);

    const cleanup = startSubnetScanner(
      targetIp,
      (newHost) => {
        setHosts((prev) => {
          if (prev.some((h) => h.ip === newHost.ip)) return prev;
          return [...prev, newHost];
        });
      },
      (p) => setProgress(p),
      (summary) => {
        setIsScanning(false);
        if (summary.aborted) setIsAborted(true);
      }
    );

    return () => {
      cleanup();
    };
  }, [isOpen, targetIp]);

  if (!isOpen) return null;

  const percentage = progress.total > 0 ? Math.round((progress.scanned / progress.total) * 100) : 0;

  const filteredHosts = hosts.filter((h) =>
    h.hostname.toLowerCase().includes(filterQuery.toLowerCase()) ||
    h.ip.includes(filterQuery.trim())
  );

  return (
    <aside
      aria-label="Escáner de Subred"
      className="fixed inset-y-0 right-0 w-80 md:w-96 bg-card/95 border-l border-border shadow-2xl z-40 flex flex-col backdrop-blur animate-in slide-in-from-right duration-200 select-none"
    >
      {/* Header */}
      <div className="h-14 border-b border-border px-4 flex items-center justify-between shrink-0 bg-muted/30">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-primary/10 text-primary">
            <Network className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-foreground tracking-tight">Escáner de Subred</h3>
            <p className="text-[10px] text-muted-foreground font-mono">{subnetPrefix}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={onClose}
          aria-label="Cerrar escáner"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Progress & Stats Bar */}
      <div className="px-4 py-2.5 border-b border-border/60 bg-muted/15 space-y-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            {isScanning ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin text-primary" />
                <span>Barriendo segmento...</span>
              </>
            ) : isAborted ? (
              <span className="text-amber-500">Escaneo detenido</span>
            ) : (
              <span className="text-emerald-500 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Finalizado
              </span>
            )}
          </span>
          <span className="font-bold text-foreground">{percentage}%</span>
        </div>

        {/* Progress Bar */}
        <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-150"
            style={{ width: `${percentage}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>{progress.scanned} de {progress.total} IPs sondeadas</span>
          <Badge variant="outline" className="text-[10px] h-5 bg-background font-mono">
            {hosts.length} {hosts.length === 1 ? 'equipo activo' : 'equipos activos'}
          </Badge>
        </div>
      </div>

      {/* Search Filter Inside Drawer */}
      <div className="p-3 border-b border-border/40">
        <div className="relative flex items-center">
          <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Filtrar equipos detectados..."
            className="w-full h-8 pl-8 pr-3 text-xs rounded-md bg-muted/60 border border-input text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>

      {/* List of Discovered Hosts */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {filteredHosts.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-center p-4 text-muted-foreground">
            {isScanning ? (
              <>
                <Radio className="h-8 w-8 text-primary/40 animate-pulse mb-2" />
                <p className="text-xs font-medium">Detectando respuestas ICMP/SMB...</p>
                <p className="text-[10px] text-muted-foreground/80 mt-1">
                  Los equipos activos irán apareciendo en tiempo real
                </p>
              </>
            ) : (
              <>
                <Laptop className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-xs font-medium">No se encontraron equipos activos</p>
                <p className="text-[10px] text-muted-foreground/80 mt-1">
                  Verifica conectividad o segmento de red
                </p>
              </>
            )}
          </div>
        ) : (
          filteredHosts.map((host) => (
            <div
              key={host.ip}
              className="p-2.5 rounded-lg border border-border/80 bg-card hover:bg-accent/10 transition-colors flex items-center justify-between gap-2 group"
            >
              <div
                className="flex-1 min-w-0 cursor-pointer"
                onClick={() => {
                  onSelectTerminal(host.hostname);
                }}
              >
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-xs font-bold text-foreground font-mono truncate">
                    {host.hostname}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-[10px] font-mono text-muted-foreground">
                  <span>{host.ip}</span>
                  {host.latency !== null && (
                    <span className="text-muted-foreground/70">{host.latency}ms</span>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-[10px] font-medium"
                  onClick={() => onSelectTerminal(host.hostname)}
                  title="Consultar ficha de terminal"
                >
                  Consultar
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-7 px-2 text-[10px] font-medium"
                  onClick={() => onLaunchVnc(host.ip)}
                  title="Conectar por VNC Viewer directo"
                >
                  VNC
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer Info */}
      <div className="p-2.5 border-t border-border/80 bg-muted/20 flex items-center justify-between text-[11px] text-muted-foreground shrink-0">
        <span className="text-[10px]">Portal Correo Desktop</span>
        {isScanning && (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 text-[10px] text-destructive hover:text-destructive"
            onClick={onClose}
          >
            <StopCircle className="h-3 w-3 mr-1" /> Detener
          </Button>
        )}
      </div>
    </aside>
  );
}
