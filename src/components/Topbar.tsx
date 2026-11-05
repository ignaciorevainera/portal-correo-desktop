import React, { useCallback, useState, useEffect, useRef } from "react";
import logoIcon from "../assets/icon.png";
import {
  Search,
  Monitor,
  UserRound,
  Database,
  HelpCircle,
  Minus,
  Power,
  MonitorPlay,
  Settings,
  X,
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { IconWell } from "./IconWell";
import { InfoModal } from "./InfoModal";
import { APP_VERSION_LABEL } from "@/lib/appVersion";
import {
  minimizeWindow,
  hideToTray,
} from "../services/electronClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Kbd } from "@/components/ui/kbd";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { classifySearch } from "@/lib/usernames";
import {
  loadRecentSearches,
  removeRecentSearch,
  saveRecentSearch,
  subscribeToRecentSearches,
  type RecentSearch,
} from "@/lib/recentSearches";

interface TopbarProps {
  onSelectTerminal: (pc: string) => void;
  onSelectAccount?: (user: string) => void;
  onDirectVnc?: (pc: string) => void;
  backendMode?: "sql" | "mock";
  serverName?: string;
  onOpenSettings?: () => void;
}

// cmdk selecciona el primer ítem cuando su `value` es vacío; usar un valor
// centinela conserva el estado "sin opción activa" hasta que el usuario navega.
const NO_ACTIVE_VALUE = "__sin_seleccion__";

// El id de la opción alimenta `aria-activedescendant`: se deriva del índice
// para que dos valores que normalizan al mismo texto no colisionen.
const toOptionId = (index: number): string =>
  `terminal-search-option-${index}`;

export function Topbar({
  onSelectTerminal,
  onSelectAccount,
  onDirectVnc,
  backendMode = "mock",
  serverName,
  onOpenSettings,
}: TopbarProps): React.JSX.Element {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeValue, setActiveValue] = useState<string>("");
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>(() =>
    loadRecentSearches(),
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const searchGroupRef = useRef<HTMLDivElement>(null);

  // cmdk sobrescribe el id de la lista con el suyo; el `aria-controls` del
  // input necesita un id estable, así que lo fijamos al montarse la lista.
  const assignListId = useCallback((node: HTMLDivElement | null) => {
    node?.setAttribute("id", "terminal-search-list");
  }, []);

  useEffect(
    () =>
      subscribeToRecentSearches(() =>
        setRecentSearches(loadRecentSearches()),
      ),
    [],
  );

  useEffect(() => {
    const handleAutofocusSearch = (e: any) => {
      const payload = e.detail;
      if (inputRef.current) {
        inputRef.current.focus();
        if (payload && payload.query) {
          setQuery(payload.query);
          if (payload.autoSearch) {
            handleSubmit(payload.query);
          } else {
            inputRef.current.select();
          }
        } else {
          inputRef.current.select();
        }
      }
    };
    window.addEventListener("pcd:app-autofocus-search", handleAutofocusSearch);
    return () =>
      window.removeEventListener(
        "pcd:app-autofocus-search",
        handleAutofocusSearch,
      );
  }, []);

  // Coincidencias sobre el historial de búsquedas (hasta 5)
  const normalizedQuery = query.trim().toLowerCase();
  const filteredMatches = (
    normalizedQuery
      ? recentSearches.filter((item) =>
          item.value.toLowerCase().includes(normalizedQuery),
        )
      : recentSearches
  ).slice(0, 5);

  const activeIndex = filteredMatches.findIndex(
    (item) => item.value === activeValue,
  );

  // Sin coincidencias no hay panel: no se renderiza ni encabezado ni estado
  // vacío; sólo las filas que coinciden con lo escrito.
  const showResults = isOpen && filteredMatches.length > 0;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
      if (e.key === "F10" && !e.shiftKey) {
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

  const commitSearch = (value: string, kind: RecentSearch["kind"]): void => {
    const clean = value.trim();
    if (!clean) return;

    setRecentSearches(saveRecentSearch(clean, kind));
    if (kind === "account") {
      onSelectAccount?.(clean);
    } else {
      onSelectTerminal(clean);
    }
    setQuery("");
    setActiveValue("");
    setIsOpen(false);
  };

  const handleSubmit = (value: string): void => {
    commitSearch(value, classifySearch(value));
  };

  const handleActivate = (item: RecentSearch): void => {
    commitSearch(item.value, item.kind);
  };

  const handleKeyDownInput = (
    event: React.KeyboardEvent<HTMLInputElement>,
  ): void => {
    if (!isOpen) {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        if (filteredMatches.length > 0) {
          event.preventDefault();
          const index =
            event.key === "ArrowDown" ? 0 : filteredMatches.length - 1;
          setActiveValue(filteredMatches[index].value);
          setIsOpen(true);
        }
        return;
      }
      if (event.key === "Enter" && query.trim()) {
        event.preventDefault();
        handleSubmit(query.trim());
      }
      return;
    }

    if (filteredMatches.length === 0) {
      if (event.key === "Enter" && query.trim()) {
        event.preventDefault();
        handleSubmit(query.trim());
      }
      return;
    }

    const currentIndex = filteredMatches.findIndex(
      (item) => item.value === activeValue,
    );
    const activeItem = filteredMatches.find(
      (item) => item.value === activeValue,
    );

    if (event.key === "Delete") {
      if (activeItem) {
        event.preventDefault();
        setRecentSearches(removeRecentSearch(activeItem.value));
        setActiveValue("");
      }
      return;
    }

    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      if (activeItem?.kind === "terminal" && onDirectVnc) {
        event.preventDefault();
        setRecentSearches(saveRecentSearch(activeItem.value, "terminal"));
        onSelectTerminal(activeItem.value);
        onDirectVnc(activeItem.value);
        setQuery("");
        setActiveValue("");
        setIsOpen(false);
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      const next = (currentIndex + 1) % filteredMatches.length;
      setActiveValue(filteredMatches[next].value);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      const previous =
        currentIndex <= 0 ? filteredMatches.length - 1 : currentIndex - 1;
      setActiveValue(filteredMatches[previous].value);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      if (activeItem) {
        handleActivate(activeItem);
      } else if (query.trim()) {
        handleSubmit(query.trim());
      }
    }
  };

  return (
    <>
      <header className="h-14 bg-card/90 backdrop-blur px-3.5 flex items-center justify-between gap-3 sticky top-0 z-30 app-drag-region select-none">
        {/* Identidad / Brand (Arrastrable junto al header para mover la ventana con el mouse) */}
        <div className="flex items-center gap-2.5 shrink-0 cursor-default select-none">
          <IconWell size="sm" className="p-1.5 pointer-events-none">
            <img
              src={logoIcon}
              alt="Correo Argentino"
              className="h-5 w-5 object-contain"
            />
          </IconWell>
          <h1 className="text-sm font-bold font-heading tracking-tight text-foreground whitespace-nowrap pointer-events-none max-sm:sr-only">
            Portal Correo Desktop
          </h1>
        </div>

        {/* Buscador Rápido Centralizado */}
        <div className="relative flex-1 min-w-0 max-w-md app-no-drag">
          <Popover open={showResults} onOpenChange={setIsOpen}>
            <PopoverAnchor>
              <InputGroup ref={searchGroupRef} className="h-10 border-input bg-muted/70">
                <InputGroupAddon>
                  <Search
                    className="h-4 w-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                </InputGroupAddon>
                <InputGroupInput
                  ref={inputRef}
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setActiveValue("");
                    setIsOpen(true);
                  }}
                  onFocus={() => {
                    if (recentSearches.length > 0 || query.trim()) {
                      setActiveValue("");
                      setIsOpen(true);
                    }
                  }}
                  onClick={() => {
                    if (
                      !isOpen &&
                      (recentSearches.length > 0 || query.trim())
                    ) {
                      setActiveValue("");
                      setIsOpen(true);
                    }
                  }}
                  onKeyDown={handleKeyDownInput}
                  placeholder="Buscar terminal, IP o usuario"
                  aria-label="Buscar terminal, IP o usuario"
                  role="combobox"
                  aria-expanded={showResults}
                  aria-controls={showResults ? "terminal-search-list" : undefined}
                  aria-activedescendant={
                    showResults && activeIndex >= 0
                      ? toOptionId(activeIndex)
                      : undefined
                  }
                  aria-autocomplete="list"
                  aria-keyshortcuts="Delete Control+Enter"
                  className="font-mono text-xs md:text-sm"
                />
                <InputGroupAddon align="inline-end">
                  <span className="hidden items-center gap-1 md:flex">
                    <Kbd>Ctrl</Kbd>+<Kbd>F</Kbd>
                  </span>
                  <InputGroupButton
                    size="icon-xs"
                    onClick={() => query.trim() && handleSubmit(query.trim())}
                    disabled={!query.trim()}
                    aria-label="Buscar terminal, IP o usuario"
                  >
                    <Search className="h-4 w-4" />
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
            </PopoverAnchor>

            <PopoverContent
              align="start"
              sideOffset={4}
              aria-label="Resultados de búsqueda"
              className="w-[var(--radix-popover-trigger-width)] p-0 data-open:animate-none data-closed:animate-none"
              onOpenAutoFocus={(event) => event.preventDefault()}
              onFocusOutside={(event) => {
                // El panel se abre con el foco en el buscador (que vive fuera del
                // contenido); Radix interpreta ese mismo foco como "focus outside"
                // y cerraría el panel recién abierto. Sólo se ignora ese caso: si el
                // foco se va a otro control, el panel se cierra normalmente.
                const target = event.target as Node | null;
                if (target && searchGroupRef.current?.contains(target)) {
                  event.preventDefault();
                }
              }}
              onPointerDownOutside={(event) => {
                const target = event.target as Node | null;
                if (target && searchGroupRef.current?.contains(target)) {
                  event.preventDefault();
                }
              }}
            >
              <Command
                key={query}
                shouldFilter={false}
                value={activeValue || NO_ACTIVE_VALUE}
                onValueChange={setActiveValue}
                className="rounded-none! bg-transparent p-1"
              >
                <CommandList ref={assignListId} label="Resultados de búsqueda">
                  <CommandGroup
                    heading={
                      query.trim() ? undefined : "Búsquedas recientes"
                    }
                  >
                    {filteredMatches.map((item, index) => {
                      const isAccount = item.kind === "account";
                      return (
                        <div
                          key={item.value}
                          className="flex items-center gap-1 rounded-sm px-1"
                        >
                          <CommandItem
                            ref={(node) => {
                              node?.setAttribute("id", toOptionId(index));
                            }}
                            value={item.value}
                            onSelect={() => handleActivate(item)}
                            className="flex min-w-0 flex-1 items-center gap-2 px-1.5 py-1.5 data-[selected=true]:bg-muted"
                          >
                            {isAccount ? (
                              <UserRound className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            ) : (
                              <Monitor className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            )}
                            <span className="truncate font-mono text-xs font-semibold">
                              {item.value}
                            </span>
                          </CommandItem>

                          <div className="flex shrink-0 items-center gap-1">
                            {!isAccount && onDirectVnc && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-xs"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  commitSearch(item.value, "terminal");
                                  onDirectVnc(item.value);
                                }}
                                aria-label={`Conectar VNC a ${item.value}`}
                                title={`Lanzar VNC Viewer a ${item.value}`}
                                className="bg-primary/10 text-link hover:bg-primary/20"
                              >
                                <MonitorPlay className="h-3 w-3" />
                              </Button>
                            )}
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              onClick={(event) => {
                                event.stopPropagation();
                                setRecentSearches(
                                  removeRecentSearch(item.value),
                                );
                                setActiveValue("");
                              }}
                              aria-label={`Quitar ${item.value} del historial`}
                              title="Quitar del historial"
                              className="h-5 w-5 text-muted-foreground opacity-60 hover:text-destructive hover:opacity-100"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Indicadores de Estado y Acciones Rápidas */}
        <div className="flex items-center gap-2 app-no-drag">
          {/* Badge de Conexión */}
          <Badge
            variant="outline"
            className="hidden lg:flex h-10 items-center gap-2 rounded-md border-border bg-muted px-3 text-xs font-medium text-foreground"
            title={serverName || "Modo actual"}
          >
            <Database
              className={`h-3.5 w-3.5 ${backendMode === "sql" ? "text-success" : "text-warning"}`}
            />
            <span
              className={`h-2 w-2 rounded-full ${backendMode === "sql" ? "bg-success animate-pulse" : "bg-warning"}`}
            />
            <span>
              {backendMode === "sql" ? "Conectado" : "Sin conexión"}
            </span>
          </Badge>

          {/* Grupo de botones compacto para acciones de Topbar */}
          <div
            role="group"
            data-slot="button-group"
            className="inline-flex items-center rounded-md border border-border/60 bg-muted/20 p-0.5 -space-x-px"
          >
            {/* Settings Modal Trigger */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
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
              size="sm"
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
              size="sm"
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
              size="sm"
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
        appVersion={APP_VERSION_LABEL}
      />
    </>
  );
}
