import React from 'react';
import {
  Search,
  Monitor,
  Activity,
  AlertTriangle,
  History,
  Sparkles,
  Info,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Kbd } from '@/components/ui/kbd';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  appVersion?: string;
}

export function InfoModal({
  isOpen,
  onClose,
  appVersion = 'v1.0.0-rc',
}: InfoModalProps): React.JSX.Element | null {
  const features = [
    {
      icon: Search,
      title: 'Búsqueda Inteligente',
      desc: 'Encontrá cualquier estación escribiendo su nombre (ej. PC-DEMO-001) o su dirección IP directamente.',
      badge: 'Ctrl + F',
      badgeSlot: 'kbd',
      color: 'text-sky-500 bg-sky-500/10 border-sky-500/20',
    },
    {
      icon: Monitor,
      title: 'Inventario y Ficha Técnica',
      desc: 'Visualizá sistema operativo, procesador, memoria RAM, versión de antivirus y usuario conectado.',
      badge: 'Ficha Automática',
      color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    },
    {
      icon: Activity,
      title: 'Soporte y Asistencia Remota',
      desc: 'Accedé al equipo de forma inmediata con VNC Viewer nativo, Asistencia Remota (MSRA) o probá su conexión en tiempo real.',
      badge: '1-Click',
      color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20',
    },
    {
      icon: AlertTriangle,
      title: 'Gestión de Alertas',
      desc: 'Marcá advertencias o notas de mantenimiento sobre un equipo para que todo el equipo operativo esté al tanto.',
      badge: 'Colaborativo',
      color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    },
    {
      icon: History,
      title: 'Historial y Tiempos de Conexión',
      desc: 'Consultá cuántos días lleva encendida la máquina y el registro histórico de reseteos de usuario.',
      badge: 'Auditoría',
      color: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        {/* Header Modal */}
        <DialogHeader className="px-6 py-4 border-b border-border bg-muted/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle id="info-modal-title" className="text-base font-bold font-heading text-foreground">
                  Acerca de Portal Correo Desktop
                </DialogTitle>
                <Badge variant="outline" className="text-[11px] font-mono font-medium rounded-full bg-primary/15 text-primary border-primary/25">
                  {appVersion}
                </Badge>
              </div>
              <DialogDescription className="text-xs text-muted-foreground">
                Consola moderna para soporte, diagnóstico e inventario en la red postal.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          <Alert variant="default" className="bg-primary/5 border-primary/15 p-3.5">
            <Info className="h-5 w-5 text-primary shrink-0" />
            <AlertDescription className="text-xs text-foreground/90 leading-relaxed font-sans">
              <strong>¿Para qué sirve esta herramienta?</strong> Reemplaza y moderniza el aplicativo tradicional
              de monitoreo. Te permite buscar cualquier puesto de trabajo de la organización, inspeccionar su
              estado y resolver incidentes con un solo clic.
            </AlertDescription>
          </Alert>

          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-1">
            ¿Qué podés hacer con Portal Correo Desktop?
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {features.map((feat) => {
              const Icon = feat.icon;
              return (
                <Card
                  key={feat.title}
                  size="sm"
                  className="p-3.5 rounded-lg border-border bg-card/60 hover:bg-muted/30 transition-colors space-y-2 flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-md border ${feat.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-semibold text-foreground font-heading">
                        {feat.title}
                      </span>
                    </div>
                    {feat.badgeSlot === 'kbd' ? (
                      <Kbd>{feat.badge}</Kbd>
                    ) : (
                      <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground border-border shrink-0">
                        {feat.badge}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {feat.desc}
                  </p>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-3 border-t border-border bg-muted/20 flex items-center justify-between text-xs text-muted-foreground sm:justify-between">
          <span className="font-mono text-[11px]">
            Conectividad: <strong>SQL Server Corporativo</strong> + Herramientas Win32
          </span>
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={onClose}
            className="cursor-pointer"
          >
            Entendido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
