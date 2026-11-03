import React from "react";
import {
  Search,
  Monitor,
  Activity,
  Network,
  UserCheck,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Kbd } from "@/components/ui/kbd";
import logoIcon from "../assets/icon.png";

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  appVersion?: string;
}

export function InfoModal({
  isOpen,
  onClose,
  appVersion = "v1.0.0",
}: InfoModalProps): React.JSX.Element | null {
  const capabilities = [
    {
      icon: Search,
      label: "Búsqueda rápida de puestos de trabajo e IPs",
      shortcut: "Ctrl + F",
    },
    {
      icon: UserCheck,
      label: "Consulta de cuenta Active Directory (net user) por username",
    },
    {
      icon: Activity,
      label: "Diagnóstico ICMP en vivo (estándar y continuo -t)",
    },
    {
      icon: Monitor,
      label: "Asistencia remota integrada (VNC Viewer y MSRA)",
    },
    {
      icon: Network,
      label: "Escaneo inteligente de subred y enlaces de sucursal",
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-0 overflow-hidden border border-border/80">
        {/* Cabecera Minimalista con Identidad de Marca */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/60 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-link border border-primary/20 shrink-0">
              <img
                src={logoIcon}
                alt="Correo Argentino"
                className="h-6 w-6 object-contain"
              />
            </div>
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-2">
                <DialogTitle className="text-sm font-bold font-heading text-foreground tracking-tight">
                  Portal Correo Desktop
                </DialogTitle>
                <Badge
                  variant="secondary"
                  className="text-[10px] font-mono px-1.5 py-0 h-4 font-semibold"
                >
                  {appVersion}
                </Badge>
              </div>
              <DialogDescription className="text-xs text-muted-foreground truncate">
                Consola técnica de soporte y monitoreo corporativo
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Contenido / Capacidades Principales (sin márgenes verticales y con espaciado amplio entre items) */}
        <div className="px-6 py-0 text-xs">
          <div className="py-5 space-y-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
              Capacidades Principales
            </span>
            <Card className="space-y-3 gap-0 bg-muted/20 p-4">
              {capabilities.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className="flex items-center justify-between gap-3 text-foreground"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-xs text-foreground/90 leading-snug">
                        {item.label}
                      </span>
                    </div>
                    {item.shortcut && (
                      <Kbd className="text-[9px] px-1.5 py-0.5 h-4 shrink-0">
                        {item.shortcut}
                      </Kbd>
                    )}
                  </div>
                );
              })}
            </Card>
          </div>
        </div>

        {/* Footer Minimalista */}
        <DialogFooter className="px-6 py-4 border-t border-border/60 bg-muted/20 flex items-center justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs h-8 px-4 cursor-pointer"
          >
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
