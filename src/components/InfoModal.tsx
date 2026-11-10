import React from "react";
import {
  Search,
  Monitor,
  Activity,
  Network,
  UserCheck,
  ExternalLink,
  Layers,
  Sliders,
  Eye,
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
import { IconWell } from "./IconWell";
import logoIcon from "../assets/icon.png";
import { openExternalUrl } from "../services/electronClient";
import { PORTAL_MDA_URL } from "@/lib/constants";
import { APP_VERSION_LABEL } from "@/lib/appVersion";

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  appVersion?: string;
}

export function InfoModal({
  isOpen,
  onClose,
  appVersion = APP_VERSION_LABEL,
}: InfoModalProps): React.JSX.Element | null {
  const capabilities = [
    {
      icon: Search,
      label: "Búsqueda rápida de puestos de trabajo e IPs",
      shortcut: "Ctrl + F",
    },
    {
      icon: Layers,
      label:
        "Monitores flotantes independientes de diagnóstico (hasta 4 ventanas)",
      shortcut: "Ctrl + Shift + Espacio",
    },
    {
      icon: UserCheck,
      label: "Consulta de cuenta Active Directory (net user) por username",
    },
    {
      icon: Activity,
      label:
        "Diagnóstico ICMP en vivo (estándar, continuo -t y enlaces de sucursal)",
    },
    {
      icon: Monitor,
      label: "Asistencia remota integrada (VNC Viewer y MSRA)",
    },
    {
      icon: Network,
      label: "Escaneo inteligente de subred y enlaces de sucursal",
    },
    {
      icon: Eye,
      label: "Accesibilidad y visualización (Alto Contraste y escala de texto)",
      shortcut: "Ctrl + / -",
    },
    {
      icon: Sliders,
      label: "Ajustes del aplicativo y diagnóstico corporativo",
      shortcut: "F10",
    },
  ];

  const handleOpenPortalMda = async (): Promise<void> => {
    await openExternalUrl(PORTAL_MDA_URL);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[calc(100vw-1.5rem)] sm:w-full max-w-md max-h-[calc(100vh-2rem)] flex flex-col p-0 overflow-hidden border border-border/80">
        {/* Cabecera Minimalista con Identidad de Marca */}
        <DialogHeader className="px-4 sm:px-6 pt-5 sm:pt-6 pb-3.5 sm:pb-4 border-b border-border/60 bg-muted/20 shrink-0">
          <div className="flex items-center gap-3 pr-6">
            <IconWell className="border border-primary/20 shrink-0">
              <img
                src={logoIcon}
                alt="Correo Argentino"
                className="h-5 w-5 sm:h-6 sm:w-6 object-contain"
              />
            </IconWell>
            <div className="space-y-0.5 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="text-sm font-bold font-heading text-foreground tracking-tight">
                  Portal Correo Desktop
                </DialogTitle>
                <Badge
                  variant="secondary"
                  className="text-micro font-mono px-1.5 py-0 h-4 font-semibold shrink-0"
                >
                  {appVersion}
                </Badge>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Contenido / Capacidades Principales con Scroll Adaptativo */}
        <div className="px-4 sm:px-6 py-0 text-xs overflow-y-auto flex-1">
          <div className="py-4 sm:py-5 space-y-2.5 sm:space-y-3">
            <span className="text-micro font-semibold text-muted-foreground block">
              Capacidades Principales
            </span>
            <Card className="divide-y divide-border/40 gap-0 bg-muted/20 p-3 sm:p-4">
              {capabilities.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className="flex flex-col sm:flex-row sm:items-start justify-between gap-1.5 sm:gap-3 py-2 first:pt-0 last:pb-0 text-foreground"
                  >
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <Icon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <span className="text-xs text-foreground/90 leading-snug wrap-break-word">
                        {item.label}
                      </span>
                    </div>
                    {item.shortcut && (
                      <div className="pl-6.5 sm:pl-0 shrink-0">
                        <Kbd className="text-micro px-1.5 py-0.5 h-4 whitespace-nowrap">
                          {item.shortcut}
                        </Kbd>
                      </div>
                    )}
                  </div>
                );
              })}
            </Card>
          </div>

          <div className="pb-4 sm:pb-5 space-y-2 sm:space-y-3">
            <span className="text-micro font-semibold text-muted-foreground block">
              Acceso Directo
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenPortalMda}
              aria-label="Abrir Portal MDA"
              title="Ir a Portal MDA (Inventario de Terminales en la red corporativa)"
              className="w-full justify-between text-xs h-auto py-2 sm:h-9 sm:py-0 cursor-pointer gap-2"
            >
              <span className="flex items-center gap-2 min-w-0">
                <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="font-medium truncate">Portal MDA</span>
              </span>
              <span className="text-micro text-muted-foreground shrink-0 text-right">
                Inventario de terminales
              </span>
            </Button>
          </div>
        </div>

        {/* Footer Minimalista */}
        <DialogFooter className="px-4 sm:px-6 py-3.5 sm:py-4 border-t border-border/60 bg-muted/20 flex items-center justify-end shrink-0">
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
