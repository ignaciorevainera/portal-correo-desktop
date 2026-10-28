import React, { useState, useEffect, useRef } from "react";
import logoIcon from "../assets/icon.png";
import {
  Search,
  Monitor,
  Terminal as TerminalIcon,
  Database,
  HelpCircle,
  ExternalLink,
  Minus,
  Power,
  Play,
  MonitorPlay,
  Settings,
  History,
  X,
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { InfoModal } from "./InfoModal";
import {
  minimizeWindow,
  hideToTray,
  openExternalUrl,
} from "../services/electronClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Kbd } from "@/components/ui/kbd";

interface TopbarProps {
  onSelectTerminal: (pc: string) => void;
  onDirectVnc?: (pc: string) => void;
  onDirectPing?: (pc: string) => void;
  backendMode?: "sql" | "mock";
  serverName?: string;
  onOpenSettings?: () => void;
}

const PORTAL_MDA_URL = "https://mda.correo.local/inventario-terminales";
const RECENT_SEARCHES_KEY = "cmda_recent_searches";

export function Topbar({
  onSelectTerminal,
  onDirectVnc,
  onDirectPing,
  backendMode = "mock",
  serverName,
  onOpenSettings,
}: TopbarProps): React.JSX.Element {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cargar historial de las últimas 5 terminales desde localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setRecentSearches(parsed.slice(0, 5));
        }
      }
    } catch {
      // Ignorar error al acceder a localStorage
    }
  }, []);

  const saveRecentSearch = (pc: string) => {
    if (!pc || !pc.trim()) return;
    const cleanPc = pc.trim().toUpperCase();
    setRecentSearches((prev) => {
      const filtered = prev.filter((item) => item.toUpperCase() !== cleanPc);
      const next = [cleanPc, ...filtered].slice(0, 5);
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const removeRecentSearch = (e: React.MouseEvent, pc: string) => {
    e.stopPropagation();
    setRecentSearches((prev) => {
      const next = prev.filter((item) => item !== pc);
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  useEffect(() => {
    const handleAutofocusSearch = (e: any) => {
      const payload = e.detail;
      if (inputRef.current) {
        inputRef.current.focus();
        if (payload && payload.query) {
          setQuery(payload.query);
          if (payload.autoSearch) {
            handleSelect(payload.query);
          } else {
            inputRef.current.select();
          }
        } else {
          inputRef.current.select();
        }
      }
    };
    window.addEventListener("cmda:app-autofocus-search", handleAutofocusSearch);
    return () =>
      window.removeEventListener(
        "cmda:app-autofocus-search",
        handleAutofocusSearch,
      );
  }, []);

  // Coincidencias basadas en el historial de búsquedas reales (hasta 5)
  const filteredMatches = query.trim()
    ? recentSearches
        .filter((item) =>
          item.toLowerCase().includes(query.trim().toLowerCase()),
        )
        .slice(0, 5)
    : recentSearches.slice(0, 5);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
      if (e.key === "F10") {
        e.preventDefault();
        onOpenSettings?.();
      }
      if (e.key === "Escape") {
        setIsOpen(false);
        setIsInfoOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (pc: string): void => {
    saveRecentSearch(pc);
    onSelectTerminal(pc);
    setQuery("");
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  const handleKeyDownInput = (
    e: React.KeyboardEvent<HTMLInputElement>,
  ): void => {
    if (isOpen && filteredMatches.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredMatches.length - 1 ? prev + 1 : 0,
        );
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredMatches.length - 1,
        );
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < filteredMatches.length) {
          handleSelect(filteredMatches[selectedIndex]);
          return;
        }
        if (query.trim()) {
          handleSelect(query.trim());
        }
        return;
      }
    } else if (e.key === "Enter" && query.trim()) {
      handleSelect(query.trim());
    }
  };

  const handleOpenPortalMda = async (): Promise<void> => {
    await openExternalUrl(PORTAL_MDA_URL);
  };

  return (
    <>
      <header className="h-14 border-b border-border bg-card/90 backdrop-blur px-4 flex items-center justify-between gap-3 sticky top-0 z-30 app-drag-region select-none">
        {/* Identidad / Brand (Arrastrable junto al header para mover la ventana con el mouse) */}
        <div className="flex items-center gap-2.5 shrink-0 cursor-default select-none">
          <div className="p-1.5 rounded-md bg-primary/10 text-primary pointer-events-none">
            <img
              src={logoIcon}
              alt="Correo Argentino"
              className="h-5 w-5 object-contain"
            />
          </div>
          <h1 className="text-sm font-bold font-heading tracking-tight text-foreground whitespace-nowrap pointer-events-none">
            Portal Correo Desktop
          </h1>
        </div>

        {/* Buscador Rápido Centralizado */}
        <div className="relative flex-1 max-w-md app-no-drag">
          <div className="relative flex items-center">
            <Input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsOpen(true);
                setSelectedIndex(-1);
              }}
              onKeyDown={handleKeyDownInput}
              onFocus={() => {
                if (recentSearches.length > 0 || query.trim()) {
                  setIsOpen(true);
                  setSelectedIndex(-1);
                }
              }}
              placeholder="Buscar terminal o IP"
              className="w-full h-10 pl-3.5 pr-20 text-xs rounded-md bg-muted/70 border-input focus-visible:bg-background text-foreground font-mono transition-colors md:text-sm"
            />
            <div className="absolute right-1.5 flex items-center gap-1.5">
              <div className="pointer-events-none text-[10px] hidden md:block">
                <Kbd>Ctrl</Kbd>+<Kbd>F</Kbd>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => query.trim() && handleSelect(query.trim())}
                disabled={!query.trim()}
                aria-label="Buscar terminal"
                title="Buscar terminal (o Enter)"
                className="h-7 w-7 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-muted/80 cursor-pointer disabled:opacity-30 rounded-md shrink-0"
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Menú de resultados de búsqueda: Historial de las últimas terminales y coincidencias */}
          {isOpen && filteredMatches.length > 0 && (
            <div
              ref={dropdownRef}
              className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg overflow-hidden z-50 animate-fade-in"
            >
              <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border bg-muted/40 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                  {query.trim()
                    ? `Coincidencias (${filteredMatches.length})`
                    : "Terminales recientes"}
                </span>
                <span className="text-[9px] text-muted-foreground lowercase flex items-center gap-1">
                  <Kbd className="text-[9px] px-1 py-0 h-4">↓</Kbd>
                  <Kbd className="text-[9px] px-1 py-0 h-4">↑</Kbd>
                  <span>navegar</span>
                  <Kbd className="text-[9px] px-1 py-0 h-4 ml-0.5">↵</Kbd>
                </span>
              </div>
              <ul className="max-h-60 overflow-y-auto divide-y divide-border/40">
                {filteredMatches.map((pcName, index) => {
                  const isSelected = index === selectedIndex;
                  return (
                    <li
                      key={pcName}
                      className={`flex items-center justify-between px-2.5 py-1.5 transition-colors group cursor-pointer ${
                        isSelected
                          ? "text-accent-foreground bg:text-inherit dark:bg-muted/80"
                          : "hover:bg-accent/10"
                      }`}
                      onMouseEnter={() => setSelectedIndex(index)}
                    >
                      <button
                        type="button"
                        onClick={() => handleSelect(pcName)}
                        className="flex-1 text-left flex items-center gap-2 cursor-pointer py-0.5 outline-none"
                      >
                        <Monitor
                          className={`h-3.5 w-3.5 shrink-0 transition-colors ${
                            isSelected
                              ? "text-blue-600 dark:text-blue-400"
                              : "text-muted-foreground group-hover:text-primary"
                          }`}
                        />
                        <span
                          className={`font-mono text-xs font-semibold ${
                            isSelected
                              ? "text-primary font-bold"
                              : "text-foreground"
                          }`}
                        >
                          {pcName}
                        </span>
                      </button>

                      {/* Acciones directas en 1 clic y botón para quitar del historial */}
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelect(pcName);
                            onDirectVnc?.(pcName);
                          }}
                          aria-label={`Conectar VNC a ${pcName}`}
                          title={`Lanzar VNC Viewer a ${pcName}`}
                          className="bg-primary/10 hover:bg-primary/20 text-primary cursor-pointer"
                        >
                          <MonitorPlay className="h-3 w-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelect(pcName);
                            onDirectPing?.(pcName);
                          }}
                          aria-label={`Ping a ${pcName}`}
                          title={`Lanzar Ping a ${pcName}`}
                          className="bg-muted hover:bg-accent/20 text-foreground cursor-pointer"
                        >
                          <Play className="h-3 w-3 text-emerald-500" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={(e) => removeRecentSearch(e, pcName)}
                          aria-label={`Quitar ${pcName} del historial`}
                          title="Quitar del historial"
                          className="h-5 w-5 text-muted-foreground hover:text-destructive cursor-pointer opacity-60 hover:opacity-100"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        {/* Indicadores de Estado y Acciones Rápidas */}
        <div className="flex items-center gap-2 app-no-drag">
          {/* Badge de Conexión */}
          <Badge
            variant="outline"
            className="hidden lg:flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-md bg-muted text-foreground border-border h-8"
            title={serverName || "Modo actual"}
          >
            <Database
              className={`h-3.5 w-3.5 ${backendMode === "sql" ? "text-emerald-500" : "text-amber-500"}`}
            />
            <span
              className={`h-2 w-2 rounded-full ${backendMode === "sql" ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`}
            />
            <span>
              {backendMode === "sql" ? "SQL Online" : "Offline / Mock"}
            </span>
          </Badge>

          {/* Grupo de botones compacto para acciones de Topbar */}
          <div
            role="group"
            data-slot="button-group"
            className="inline-flex items-center rounded-md border border-border/60 bg-muted/20 p-0.5 -space-x-px"
          >
            {/* Botón Portal MDA */}
            <Button
              type="button"
              variant="ghost"
              size="default"
              onClick={handleOpenPortalMda}
              aria-label="Abrir Portal MDA"
              title="Ir a Portal MDA (Inventario de Terminales en la red corporativa)"
              className="text-xs font-semibold gap-1.5 cursor-pointer text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
            >
              <ExternalLink className="h-4 w-4" />
              <span>Portal MDA</span>
            </Button>

            {/* Settings Modal Trigger */}
            <Button
              type="button"
              variant="ghost"
              size="default"
              onClick={() => onOpenSettings?.()}
              aria-label="Abrir ajustes y configuración"
              title="Configuración y Actualizaciones (Atajo F10)"
              className="text-muted-foreground hover:text-foreground cursor-pointer px-2"
            >
              <Settings className="h-4 w-4" />
            </Button>

            {/* Info Modal Trigger */}
            <Button
              type="button"
              variant="ghost"
              size="default"
              onClick={() => setIsInfoOpen(true)}
              aria-label="Abrir información del sistema"
              title="Información y características del aplicativo"
              className="text-muted-foreground hover:text-foreground cursor-pointer px-2"
            >
              <HelpCircle className="h-4 w-4" />
            </Button>

            <ThemeToggle />

            {/* Separador vertical de ventana dentro del buttongroup */}
            <Separator orientation="vertical" className="h-5 mx-1" />

            {/* Minimizar ventana */}
            <Button
              type="button"
              variant="ghost"
              size="default"
              onClick={minimizeWindow}
              aria-label="Minimizar ventana"
              title="Minimizar a barra de tareas"
              className="text-muted-foreground hover:text-foreground cursor-pointer px-2"
            >
              <Minus className="h-4 w-4" />
            </Button>

            {/* Apagado / Minimizar a bandeja del sistema */}
            <Button
              type="button"
              variant="ghost"
              size="default"
              onClick={hideToTray}
              aria-label="Minimizar a bandeja del sistema"
              title="Ocultar en bandeja del sistema (Turn Off)"
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer px-2"
            >
              <Power className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Info Modal Component */}
      <InfoModal
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
        appVersion="v1.0.0"
      />
    </>
  );
}
