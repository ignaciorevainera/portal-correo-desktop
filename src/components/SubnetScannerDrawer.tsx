import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Network,
  Search,
  Radio,
  CheckCircle2,
  Laptop,
  Loader2,
  Monitor,
  Pause,
  Play,
  RotateCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  onSmartRemote?: (target: string) => void | Promise<void>;
  onLaunchRemote?: (target: string) => void | Promise<void>;
  onLaunchVnc?: (target: string) => void | Promise<void>;
}

export function SubnetScannerDrawer({
  isOpen,
  onClose,
  targetIp,
  onSelectTerminal,
  onSmartRemote,
  onLaunchRemote,
  onLaunchVnc,
}: SubnetScannerDrawerProps): React.JSX.Element | null {
  const [hosts, setHosts] = useState<SubnetDiscoveredHost[]>([]);
  const [progress, setProgress] = useState<SubnetScanProgress>({ scanned: 0, total: 254 });
  const [isScanning, setIsScanning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');
  const [connectingIp, setConnectingIp] = useState<string | null>(null);

  const cleanupRef = useRef<(() => void) | null>(null);

  const parts = targetIp.split('.');
  const subnetPrefix = parts.length === 4 ? `${parts[0]}.${parts[1]}.${parts[2]}.0/24` : targetIp;

  const runScan = (fromIndex: number = 0) => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    setIsScanning(true);
    setIsPaused(false);

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
        if (summary.aborted) {
          setIsPaused(true);
        }
      },
      fromIndex
    );

    cleanupRef.current = cleanup;
  };

  useEffect(() => {
    if (!isOpen || !targetIp) return;

    setHosts([]);
    setProgress({ scanned: 0, total: 254 });
    setIsPaused(false);
    runScan(0);

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
      setIsScanning(false);
      setIsPaused(false);
    };
  }, [isOpen, targetIp]);

  const handlePause = () => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
    setIsScanning(false);
    setIsPaused(true);
  };

  const handleResume = () => {
    runScan(progress.scanned);
  };

  const handleRestart = () => {
    setHosts([]);
    setProgress({ scanned: 0, total: 254 });
    runScan(0);
  };

  const handleRemoteClick = async (e: React.MouseEvent, target: string) => {
    e.stopPropagation();
    setConnectingIp(target);
    try {
      if (onSmartRemote) {
        await onSmartRemote(target);
      } else if (onLaunchRemote) {
        await onLaunchRemote(target);
      } else if (onLaunchVnc) {
        await onLaunchVnc(target);
      }
    } finally {
      setConnectingIp(null);
    }
  };

  if (!isOpen) return null;

  const percentage = progress.total > 0 ? Math.round((progress.scanned / progress.total) * 100) : 0;

  const filteredHosts = hosts.filter((h) => {
    const name = h.hostname || h.ip;
    const query = filterQuery.toLowerCase();
    return name.toLowerCase().includes(query) || h.ip.includes(filterQuery.trim());
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end select-none">
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Drawer Panel */}
      <aside
        aria-label="Escáner de Subred"
        className="relative z-10 w-80 md:w-96 h-full bg-card border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-200"
      >
        {/* Header */}
        <div className="h-12 border-b border-border px-3.5 flex items-center justify-between shrink-0 bg-muted/40">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-md bg-primary/10 text-primary">
              <Network className="h-3.5 w-3.5" />

            </div>
            <div>
              <h3 className="text-xs font-bold text-foreground tracking-tight">Escáner de Subred</h3>
              <p className="text-[10px] text-muted-foreground font-mono">{subnetPrefix}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onClose}
            aria-label="Cerrar panel de escáner"
            className="h-6 w-6 text-muted-foreground hover:text-foreground cursor-pointer rounded-md"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Progress Bar & Status */}
        <div className="p-3 border-b border-border/80 bg-muted/20 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[11px] font-medium text-foreground flex items-center gap-1.5">
              {isScanning ? (
                <>
                  <Loader2 className="h-3 w-3 text-primary animate-spin" />
                  Escaneando hosts...
                </>
              ) : isPaused ? (
                <span className="text-amber-500 font-medium flex items-center gap-1">
                  <Pause className="h-3 w-3" /> Escaneo en pausa
                </span>
              ) : (
                <span className="text-emerald-500 font-medium flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Escaneo finalizado
                </span>
              )}
            </span>
            <span className="font-mono text-[11px] text-muted-foreground font-semibold">
              {progress.scanned} / {progress.total} ({percentage}%)
            </span>
          </div>

          {/* Progress track */}
          <div className="w-full bg-muted/80 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 rounded-full ${
                isScanning ? 'bg-primary' : isPaused ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>

          {/* Search Filter Inside Drawer */}
          <div className="relative pt-1">
            <Search className="absolute left-2.5 top-3.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
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
              ) : isPaused ? (
                <>
                  <Pause className="h-8 w-8 text-amber-500/40 mb-2" />
                  <p className="text-xs font-medium text-foreground">Escaneo en pausa</p>
                  <p className="text-[10px] text-muted-foreground/80 mt-1">
                    Presiona Reanudar para continuar detectando equipos
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
            filteredHosts.map((host) => {
              const hostname = host.hostname ? host.hostname.trim() : null;
              const displayName = hostname || host.ip;
              const lookupTarget = hostname || host.ip;
              const isConnectingThis = connectingIp === lookupTarget || connectingIp === host.ip;

              return (
                <div
                  key={host.ip}
                  onClick={() => onSelectTerminal(lookupTarget)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectTerminal(lookupTarget);
                    }
                  }}
                  aria-label={`Consultar terminal ${displayName}`}
                  title={`Consultar terminal ${displayName}`}
                  className="p-2.5 rounded-lg border border-border/80 bg-card hover:bg-accent/20 hover:border-primary/40 transition-all flex items-center justify-between gap-2.5 group cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                      <span className="text-xs font-bold text-foreground font-mono truncate group-hover:text-primary transition-colors">
                        {displayName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] font-mono text-muted-foreground">
                      {hostname && <span>{host.ip}</span>}
                      {host.latency !== null && (
                        <span className="text-muted-foreground/70">{host.latency}ms</span>
                      )}
                    </div>
                  </div>

                  {/* Quick Remote Action Button (Monitor Icon) */}
                  <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer rounded-md"
                      onClick={(e) => handleRemoteClick(e, lookupTarget)}
                      disabled={isConnectingThis}
                      aria-label={`Conexión remota rápida con ${displayName}`}
                      title="Conexión remota rápida (VNC / MSRA)"
                    >
                      {isConnectingThis ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                      ) : (
                        <Monitor className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Info & Controls */}
        <div className="p-2.5 border-t border-border/80 bg-muted/20 flex items-center justify-between text-[11px] text-muted-foreground shrink-0">
          <span className="text-[10px] font-mono">
            {hosts.length} {hosts.length === 1 ? 'equipo' : 'equipos'}
          </span>
          <div className="flex items-center gap-1.5">
            {isScanning ? (
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2.5 text-xs text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10 cursor-pointer"
                onClick={handlePause}
                aria-label="Pausar escaneo"
                title="Pausar escaneo de subred"
              >
                <Pause className="h-3 w-3 mr-1" /> Pausar
              </Button>
            ) : isPaused ? (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                  onClick={handleRestart}
                  aria-label="Reiniciar escaneo"
                  title="Reiniciar escaneo desde el inicio"
                >
                  <RotateCw className="h-3 w-3 mr-1" /> Reiniciar
                </Button>
                <Button
                  size="sm"
                  variant="default"
                  className="h-7 px-2.5 text-xs font-medium cursor-pointer"
                  onClick={handleResume}
                  aria-label="Reanudar escaneo"
                  title="Reanudar escaneo de subred"
                >
                  <Play className="h-3 w-3 mr-1" /> Reanudar
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                onClick={handleRestart}
                aria-label="Escanear nuevamente"
                title="Volver a escanear toda la subred"
              >
                <RotateCw className="h-3 w-3 mr-1" /> Escanear de nuevo
              </Button>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
