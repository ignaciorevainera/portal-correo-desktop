import React, { useState } from "react";
import { TerminalData } from "../types/terminal";
import {
  Shield,
  Globe,
  Copy,
  Check,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function TerminalTechnicalCard({
  terminal,
}: {
  terminal: TerminalData;
  onOpenSubnetScanner?: () => void;
}): React.JSX.Element {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = async (key: string, text: string) => {
    if (!text || text.trim() === "") return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {}
  };

  return (
    <div className="space-y-2.5">
      {/* 4 Tarjetas sueltas mostradas en formato grilla */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        {/* Tarjeta 1: Conectividad & Red */}
        <Card size="sm" className="p-3 rounded-lg border-border bg-card shadow-xs space-y-2">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
            Conectividad & Red
          </span>

          {/* Hostname */}
          <div className="space-y-0.5">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-[11px] font-medium">
                Hostname / PC
              </span>
              {terminal.pc && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => handleCopy("pc", terminal.pc)}
                  aria-label="Copiar Hostname"
                  title="Copiar Hostname al portapapeles"
                  className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {copiedKey === "pc" ? (
                    <Check className="h-2.5 w-2.5 text-emerald-500" />
                  ) : (
                    <Copy className="h-2.5 w-2.5" />
                  )}
                </Button>
              )}
            </div>
            <p className="font-mono font-bold text-foreground text-xs truncate" title={terminal.pc}>
              {terminal.pc || "No identificado"}
            </p>
          </div>

          {/* IPv4 */}
          <div className="space-y-0.5">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-[11px] font-medium">
                Dirección IPv4
              </span>
              {terminal.ip && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => handleCopy("ip", terminal.ip)}
                  aria-label="Copiar Dirección IPv4"
                  title="Copiar IP al portapapeles"
                  className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {copiedKey === "ip" ? (
                    <Check className="h-2.5 w-2.5 text-emerald-500" />
                  ) : (
                    <Copy className="h-2.5 w-2.5" />
                  )}
                </Button>
              )}
            </div>
            <p className="font-mono font-bold text-foreground text-xs">
              {terminal.ip || "No asignada"}
            </p>
          </div>

          {/* MAC */}
          <div className="space-y-0.5">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-[11px] font-medium">
                Dirección MAC
              </span>
              {terminal.mac && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => handleCopy("mac", terminal.mac)}
                  aria-label="Copiar Dirección MAC"
                  title="Copiar MAC al portapapeles"
                  className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {copiedKey === "mac" ? (
                    <Check className="h-2.5 w-2.5 text-emerald-500" />
                  ) : (
                    <Copy className="h-2.5 w-2.5" />
                  )}
                </Button>
              )}
            </div>
            <p
              className={`text-xs truncate ${
                terminal.mac
                  ? "font-mono font-semibold text-foreground"
                  : "text-muted-foreground italic"
              }`}
            >
              {terminal.mac || "No especificada"}
            </p>
          </div>
        </Card>

        {/* Tarjeta 2: Sistema Operativo */}
        <Card size="sm" className="p-3 rounded-lg border-border bg-card shadow-xs space-y-2">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
            Sistema Operativo
          </span>

          <div className="space-y-0.5">
            <span className="text-muted-foreground text-[11px] font-medium">
              Sistema
            </span>
            <p className="font-semibold text-foreground text-xs">
              {terminal.os || "No detectado"}
            </p>
            {terminal.servicePack ? (
              <p
                className="font-mono text-[10px] text-muted-foreground truncate"
                title={terminal.servicePack}
              >
                Build: {terminal.servicePack}
              </p>
            ) : null}
          </div>

          <div className="space-y-0.5">
            <span className="text-muted-foreground text-[11px] font-medium">
              Último Relevamiento
            </span>
            <p className="font-mono text-xs text-foreground">
              {terminal.surveyDate || "Sin registro"}
            </p>
          </div>
        </Card>

        {/* Tarjeta 3: Hardware Principal */}
        <Card size="sm" className="p-3 rounded-lg border-border bg-card shadow-xs space-y-2">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
            Hardware Principal
          </span>

          <div className="space-y-0.5">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-[11px] font-medium">
                Procesador / CPU
              </span>
              {terminal.cpuModel && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => handleCopy("cpu", terminal.cpuModel)}
                  aria-label="Copiar Modelo y CPU"
                  title="Copiar CPU al portapapeles"
                  className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {copiedKey === "cpu" ? (
                    <Check className="h-2.5 w-2.5 text-emerald-500" />
                  ) : (
                    <Copy className="h-2.5 w-2.5" />
                  )}
                </Button>
              )}
            </div>
            <p
              className={`text-xs truncate ${
                terminal.cpuModel
                  ? "font-semibold text-foreground"
                  : "text-muted-foreground italic"
              }`}
              title={terminal.cpuModel || "No reportado"}
            >
              {terminal.cpuModel || "No reportado"}
            </p>
          </div>

          <div className="space-y-0.5">
            <span className="text-muted-foreground text-[11px] font-medium">
              Memoria RAM
            </span>
            <p
              className={`text-xs ${
                terminal.ram
                  ? "font-mono font-semibold text-foreground"
                  : "text-muted-foreground italic"
              }`}
            >
              {terminal.ram || "No especificada"}
            </p>
          </div>
        </Card>

        {/* Tarjeta 4: Active Directory & Sede */}
        <Card size="sm" className="p-3 rounded-lg border-border bg-card shadow-xs space-y-2">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
            Active Directory & Sede
          </span>

          <div className="space-y-0.5">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-[11px] font-medium">
                Usuario NT
              </span>
              {terminal.userNt && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => handleCopy("user", terminal.userNt)}
                  aria-label="Copiar Usuario NT"
                  title="Copiar Usuario NT al portapapeles"
                  className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {copiedKey === "user" ? (
                    <Check className="h-2.5 w-2.5 text-emerald-500" />
                  ) : (
                    <Copy className="h-2.5 w-2.5" />
                  )}
                </Button>
              )}
            </div>
            <p
              className={`text-xs truncate ${
                terminal.userNt
                  ? "font-mono font-semibold text-foreground"
                  : "text-muted-foreground italic"
              }`}
              title={terminal.userNt || "Sin sesión"}
            >
              {terminal.userNt || "Sin sesión"}
            </p>
          </div>

          <div className="space-y-0.5">
            <span className="text-muted-foreground text-[11px] font-medium">
              Ubicación
            </span>
            <p
              className={`text-xs truncate ${
                terminal.location
                  ? "font-medium text-foreground"
                  : "text-muted-foreground italic"
              }`}
              title={terminal.location || "Sede no especificada"}
            >
              {terminal.location || "Sede no especificada"}
            </p>
          </div>
        </Card>
      </div>

      {/* Fila secundaria de seguridad y explorador debajo de las 4 tarjetas */}
      <div className="px-3 py-2 rounded-lg border border-border/60 bg-muted/20 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-emerald-500" /> Antivirus:{" "}
            <strong className="text-foreground">
              {terminal.antivirusVersion || "No informado"}
            </strong>
          </span>
          <span className="flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5 text-blue-500" /> Navegador:{" "}
            <strong className="text-foreground">
              {terminal.ieVersion || "No informado"}
            </strong>
          </span>
        </div>
        {copiedKey && (
          <span className="text-emerald-500 font-mono text-[10px] font-semibold flex items-center gap-1">
            <Check className="h-3 w-3" /> ¡Copiado al portapapeles!
          </span>
        )}
      </div>
    </div>
  );
}
