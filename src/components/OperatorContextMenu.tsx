import React, { useEffect, useRef } from "react";
import { TerminalData } from "../types/terminal";
import {
  MonitorPlay,
  Activity,
  HelpCircle,
  Copy,
  ExternalLink,
  Search,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Kbd } from "@/components/ui/kbd";
import { splitUsernames } from "@/lib/usernames";

interface OperatorContextMenuProps {
  x: number;
  y: number;
  terminal?: TerminalData | null;
  isPinging: boolean;
  onClose: () => void;
  onLaunchVnc: () => void;
  onTogglePing: () => void;
  onLaunchMsra: () => void;
  onOpenPortalMda: () => void;
  onFocusSearch?: () => void;
  onQueryAccount?: () => void;
}

export function OperatorContextMenu({
  x,
  y,
  terminal,
  isPinging,
  onClose,
  onLaunchVnc,
  onTogglePing,
  onLaunchMsra,
  onOpenPortalMda,
  onFocusSearch,
  onQueryAccount,
}: OperatorContextMenuProps): React.JSX.Element {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("keydown", handleEsc);
    return () => {
      window.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("keydown", handleEsc);
    };
  }, [onClose]);

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      onClose();
    } catch {}
  };

  // Adjust bounds to avoid overflowing viewport
  const adjustedX = Math.min(x, window.innerWidth - 240);
  const adjustedY = Math.min(y, window.innerHeight - 300);

  return (
    <div
      ref={menuRef}
      style={{ top: `${adjustedY}px`, left: `${adjustedX}px` }}
      className="fixed z-50 w-56 rounded-lg border border-border bg-popover/95 backdrop-blur p-1 text-popover-foreground shadow-xl font-sans text-xs select-none animate-fade-in"
    >
      {terminal ? (
        <>
          <div className="px-2.5 py-1.5 border-b border-border/60 text-[11px] font-bold text-muted-foreground flex items-center justify-between">
            <span className="truncate">Acciones</span>
          </div>

          <div className="py-1 space-y-0.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                onLaunchVnc();
                onClose();
              }}
              aria-label="Conectar VNC Viewer"
              className="w-full justify-between px-2.5 h-8 text-xs font-medium cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <MonitorPlay className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" /> Conectar VNC
              </span>
              <Kbd>F2</Kbd>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                onLaunchMsra();
                onClose();
              }}
              aria-label="Asistencia MSRA"
              className="w-full justify-between px-2.5 h-8 text-xs font-medium cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <HelpCircle className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" /> Asistencia MSRA
              </span>
              <Kbd>F3</Kbd>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                onTogglePing();
                onClose();
              }}
              aria-label={isPinging ? "Detener Ping" : "Iniciar Ping"}
              className="w-full justify-between px-2.5 h-8 text-xs font-medium cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Activity
                  className={`h-3.5 w-3.5 ${isPinging ? "text-destructive" : "text-emerald-600 dark:text-emerald-400 font-bold"}`}
                />
                {isPinging ? "Detener Ping" : "Iniciar Ping"}
              </span>
              <Kbd>F4</Kbd>
            </Button>
          </div>

          <Separator className="my-1" />
          <div className="py-0.5 space-y-0.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => copyText(terminal.ip)}
              aria-label="Copiar IP"
              className="w-full justify-start gap-2 px-2.5 h-8 text-xs font-medium cursor-pointer"
            >
              <Copy className="h-3.5 w-3.5 text-muted-foreground" /> Copiar IP
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => copyText(terminal.pc)}
              aria-label="Copiar Hostname"
              className="w-full justify-start gap-2 px-2.5 h-8 text-xs font-medium cursor-pointer"
            >
              <Copy className="h-3.5 w-3.5 text-muted-foreground" /> Copiar
              Hostname
            </Button>

            {splitUsernames(terminal.userNt).length > 0 && onQueryAccount && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  onQueryAccount();
                  onClose();
                }}
                aria-label="Ver cuenta AD"
                className="w-full justify-start gap-2 px-2.5 h-8 text-xs font-medium cursor-pointer"
              >
                <Users className="h-3.5 w-3.5 text-muted-foreground" /> Ver cuenta AD
              </Button>
            )}
          </div>

          <Separator className="my-1" />
          <div className="py-0.5 space-y-0.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                onOpenPortalMda();
                onClose();
              }}
              aria-label="Abrir Portal MDA"
              className="w-full justify-start gap-2 px-2.5 h-8 text-xs font-medium cursor-pointer"
            >
              <ExternalLink className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" /> Abrir Portal MDA
            </Button>

            {onFocusSearch && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  onFocusSearch();
                  onClose();
                }}
                aria-label="Buscar otra terminal"
                className="w-full justify-between px-2.5 h-8 text-xs font-medium cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Search className="h-3.5 w-3.5 text-muted-foreground" /> Buscar
                  Terminal
                </span>
                <Kbd>Ctrl+F</Kbd>
              </Button>
            )}
          </div>
        </>
      ) : (
        /* Empty State: Sin terminal ubicada, únicamente acceso a Portal MDA */
        <div className="py-0.5 space-y-0.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              onOpenPortalMda();
              onClose();
            }}
            aria-label="Abrir Portal MDA"
            className="w-full justify-start gap-2 px-2.5 h-8 text-xs font-medium cursor-pointer"
          >
            <ExternalLink className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" /> Abrir Portal MDA
          </Button>
        </div>
      )}
    </div>
  );
}
