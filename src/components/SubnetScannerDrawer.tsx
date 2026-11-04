import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Network,
  Search,
  CheckCircle2,
  Laptop,
  Loader2,
  Monitor,
  Pause,
  Play,
  RotateCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IconWell } from './IconWell';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
    <Sheet
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent
        side="right"
        showCloseButton={false}
        className="gap-0 p-0 data-[side=right]:w-80 data-[side=right]:md:w-96 data-[side=right]:sm:max-w-none"
      >
        <SheetHeader className="h-12 shrink-0 flex-row items-center justify-between gap-2 border-b border-border bg-muted/40 p-0 px-3.5">
          <div className="flex items-center gap-2">
            <IconWell size="sm">
              <Network className="h-3.5 w-3.5" aria-hidden="true" />
            </IconWell>
            <div>
              <SheetTitle className="text-xs font-bold tracking-tight">
                Escáner de Subred
              </SheetTitle>
              <SheetDescription className="font-mono text-micro text-muted-foreground">
                {subnetPrefix}
              </SheetDescription>
            </div>
          </div>
          <SheetClose asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="Cerrar panel de escáner"
              className="h-6 w-6 rounded-md text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </SheetClose>
        </SheetHeader>

        {/* Progreso del escaneo */}
        <div className="shrink-0 space-y-2 border-b border-border/80 bg-muted/20 p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-micro font-medium text-foreground">
              {isScanning ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin text-link" />
                  Escaneando hosts...
                </>
              ) : isPaused ? (
                <span className="flex items-center gap-1 font-medium text-warning">
                  <Pause className="h-3 w-3" /> Escaneo en pausa
                </span>
              ) : (
                <span className="flex items-center gap-1 font-medium text-success">
                  <CheckCircle2 className="h-3 w-3" /> Escaneo finalizado
                </span>
              )}
            </span>
            <span className="font-mono text-micro font-semibold text-muted-foreground">
              {progress.scanned} / {progress.total} ({percentage}%)
            </span>
          </div>

          <Progress
            value={percentage}
            aria-label="Progreso del escaneo de subred"
            className={`h-1.5 [&_[data-slot=progress-indicator]]:transition-all ${
              isScanning
                ? ''
                : isPaused
                  ? '[&_[data-slot=progress-indicator]]:bg-warning'
                  : '[&_[data-slot=progress-indicator]]:bg-success'
            }`}
          />

          <div className="relative pt-1">
            <Search
              className="pointer-events-none absolute left-2.5 top-3.5 h-3.5 w-3.5 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="text"
              value={filterQuery}
              onChange={(event) => setFilterQuery(event.target.value)}
              placeholder="Filtrar equipos detectados..."
              aria-label="Filtrar equipos detectados"
              className="h-8 bg-muted/60 pl-8 pr-3 font-mono text-xs"
            />
          </div>
        </div>

        {/* Lista de equipos detectados */}
        <div className="flex-1 space-y-1.5 overflow-y-auto p-3">
          {filteredHosts.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-center p-4 text-muted-foreground">
              {isScanning ? (
                <div className="w-full space-y-2" aria-hidden="true">
                  {[0, 1, 2].map((row) => (
                    <div
                      key={row}
                      className="flex items-center gap-2 rounded-md border border-border/60 p-3"
                    >
                      <Skeleton className="h-2 w-2 rounded-full" />
                      <Skeleton className="h-3 w-28" />
                      <Skeleton className="ml-auto h-3 w-12" />
                    </div>
                  ))}
                  <p role="status" className="sr-only">
                    Detectando respuestas ICMP/SMB...
                  </p>
                </div>
              ) : isPaused ? (
                <>
                  <Pause className="h-8 w-8 text-warning/40 mb-2" />
                  <p className="text-xs font-medium text-foreground">Escaneo en pausa</p>
                  <p className="text-micro text-muted-foreground mt-1">
                    Presiona Reanudar para continuar detectando equipos
                  </p>
                </>
              ) : (
                <>
                  <Laptop className="h-8 w-8 text-muted-foreground/30 mb-2" />
                  <p className="text-xs font-medium">No se encontraron equipos activos</p>
                  <p className="text-micro text-muted-foreground mt-1">
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
                <Card
                  key={host.ip}
                  className="flex-row items-stretch gap-0 border-border/80 p-0 hover:border-border hover:bg-muted/30 transition-all overflow-hidden group"
                >
                  {/* Porción principal: Información y selección de terminal */}
                  <button
                    type="button"
                    onClick={() => onSelectTerminal(lookupTarget)}
                    aria-label={`Consultar terminal ${displayName}`}
                    title={`Consultar terminal ${displayName}`}
                    className="flex-1 min-w-0 p-2.5 text-left flex flex-col justify-center cursor-pointer hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-success shrink-0" />
                      <span className="text-xs font-bold text-foreground font-mono truncate transition-colors">
                        {displayName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-micro font-mono text-muted-foreground">
                      {hostname && <span>{host.ip}</span>}
                      {host.latency !== null && (
                        <span className="text-muted-foreground">{host.latency}ms</span>
                      )}
                    </div>
                  </button>

                  {/* Divisor vertical sutil entre porciones */}
                  <div className="w-px bg-border/60 self-stretch my-1" />

                  {/* Última porción reservada exclusivamente para el botón de conexión remota */}
                  <button
                    type="button"
                    onClick={(e) => handleRemoteClick(e, lookupTarget)}
                    disabled={isConnectingThis}
                    aria-label={`Conexión remota rápida con ${displayName}`}
                    title="Conexión remota rápida (VNC / MSRA)"
                    className="w-10 flex items-center justify-center shrink-0 cursor-pointer text-muted-foreground hover:text-foreground hover:bg-muted/60 disabled:opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {isConnectingThis ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : (
                      <Monitor className="h-4 w-4" />
                    )}
                  </button>
                </Card>
              );
            })
          )}
        </div>

        {/* Footer con controles del escaneo */}
        <div className="flex shrink-0 items-center justify-between border-t border-border/80 bg-muted/20 p-2.5 text-micro text-muted-foreground">
          <span className="text-micro font-mono">
            {hosts.length} {hosts.length === 1 ? 'equipo' : 'equipos'}
          </span>
          <div className="flex items-center gap-1.5">
            {isScanning ? (
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2.5 text-xs text-warning border-warning/30 hover:bg-warning/10 cursor-pointer"
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
      </SheetContent>
    </Sheet>
  );
}
