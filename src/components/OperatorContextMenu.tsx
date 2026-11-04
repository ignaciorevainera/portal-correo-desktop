import React from "react";
import { TerminalData } from "../types/terminal";
import {
  MonitorPlay,
  Activity,
  HelpCircle,
  Copy,
  ExternalLink,
  Users,
} from "lucide-react";
import { splitUsernames } from "@/lib/usernames";
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
} from "@/components/ui/context-menu";

interface OperatorContextMenuProps {
  terminal?: TerminalData | null;
  isPinging: boolean;
  onLaunchVnc: () => void;
  onTogglePing: () => void;
  onLaunchMsra: () => void;
  onOpenPortalMda: () => void;
  onQueryAccount?: () => void;
}

export function OperatorContextMenu({
  terminal,
  isPinging,
  onLaunchVnc,
  onTogglePing,
  onLaunchMsra,
  onOpenPortalMda,
  onQueryAccount,
}: OperatorContextMenuProps): React.JSX.Element {
  const copyText = async (text: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // sin portapapeles disponible: el menú se cierra igual
    }
  };

  if (!terminal) {
    return (
      <ContextMenuContent className="w-56" aria-label="Acciones del operador">
        <ContextMenuItem onSelect={onOpenPortalMda} aria-label="Abrir Portal MDA">
          <ExternalLink className="h-3.5 w-3.5 text-link" />
          Abrir Portal MDA
        </ContextMenuItem>
      </ContextMenuContent>
    );
  }

  const accountCount = splitUsernames(terminal.userNt).length;

  return (
    <ContextMenuContent className="w-56" aria-label="Acciones del operador">
      <ContextMenuLabel>Acciones · {terminal.pc}</ContextMenuLabel>
      <ContextMenuSeparator />

      <ContextMenuItem onSelect={onLaunchVnc} aria-label="Conectar VNC Viewer">
        <MonitorPlay className="h-3.5 w-3.5 text-link" />
        Conectar VNC
        <ContextMenuShortcut>F2</ContextMenuShortcut>
      </ContextMenuItem>
      <ContextMenuItem onSelect={onLaunchMsra} aria-label="Asistencia MSRA">
        <HelpCircle className="h-3.5 w-3.5 text-link" />
        Asistencia MSRA
        <ContextMenuShortcut>F3</ContextMenuShortcut>
      </ContextMenuItem>
      <ContextMenuItem
        onSelect={onTogglePing}
        aria-label={isPinging ? "Detener Ping" : "Iniciar Ping"}
      >
        <Activity
          className={`h-3.5 w-3.5 ${isPinging ? "text-destructive" : "text-success"}`}
        />
        {isPinging ? "Detener Ping" : "Iniciar Ping"}
        <ContextMenuShortcut>F4</ContextMenuShortcut>
      </ContextMenuItem>

      <ContextMenuSeparator />
      <ContextMenuItem
        onSelect={() => void copyText(terminal.ip)}
        aria-label="Copiar IP"
      >
        <Copy className="h-3.5 w-3.5 text-muted-foreground" />
        Copiar IP
      </ContextMenuItem>
      <ContextMenuItem
        onSelect={() => void copyText(terminal.pc)}
        aria-label="Copiar Hostname"
      >
        <Copy className="h-3.5 w-3.5 text-muted-foreground" />
        Copiar Hostname
      </ContextMenuItem>
      {accountCount > 0 && onQueryAccount && (
        <ContextMenuItem onSelect={onQueryAccount} aria-label="Ver cuenta AD">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          Ver cuenta AD
        </ContextMenuItem>
      )}

      <ContextMenuSeparator />
      <ContextMenuItem onSelect={onOpenPortalMda} aria-label="Abrir Portal MDA">
        <ExternalLink className="h-3.5 w-3.5 text-link" />
        Abrir Portal MDA
      </ContextMenuItem>
    </ContextMenuContent>
  );
}
