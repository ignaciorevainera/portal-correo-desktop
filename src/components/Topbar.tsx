import React, { useState, useEffect, useRef } from 'react';
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
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { InfoModal } from './InfoModal';
import { getAllTerminals } from '../services/terminalService';
import {
  minimizeWindow,
  hideToTray,
  openExternalUrl,
} from '../services/electronClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Kbd } from '@/components/ui/kbd';

interface TopbarProps {
  onSelectTerminal: (pc: string) => void;
  onDirectVnc?: (pc: string) => void;
  onDirectPing?: (pc: string) => void;
  selectedPc?: string;
  backendMode?: 'sql' | 'mock';
  serverName?: string;
  onOpenSettings?: () => void;
}

const PORTAL_MDA_URL = 'https://mda.corporativo.internal/inventario-terminales';

export function Topbar({
  onSelectTerminal,
  onDirectVnc,
  onDirectPing,
  selectedPc,
  backendMode = 'mock',
  serverName,
  onOpenSettings,
}: TopbarProps): React.JSX.Element {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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
    window.addEventListener('cmda:app-autofocus-search', handleAutofocusSearch);
    return () => window.removeEventListener('cmda:app-autofocus-search', handleAutofocusSearch);
  }, []);
  const terminals = getAllTerminals();

  const filtered = query.trim()
    ? terminals.filter(
        (t) =>
          t.pc.toLowerCase().includes(query.toLowerCase()) ||
          t.ip.includes(query.trim())
      )
    : [];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
      if (e.key === 'F10') {
        e.preventDefault();
        onOpenSettings?.();
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
        setIsInfoOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSelect = (pc: string): void => {
    onSelectTerminal(pc);
    setQuery('');
    setIsOpen(false);
  };

  const handleKeyDownInput = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' && query.trim()) {
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
            <img src="/correo-argentino-logo.svg" alt="Correo Argentino" className="h-5 w-5 object-contain" />
          </div>
          <h1 className="text-sm font-bold font-heading tracking-tight text-foreground whitespace-nowrap pointer-events-none">
            Portal Correo Desktop
          </h1>
        </div>

        {/* Buscador Rápido Centralizado */}
        <div className="relative flex-1 max-w-md app-no-drag">
          <div className="relative flex items-center">
            <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
            <Input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsOpen(true);
              }}
              onKeyDown={handleKeyDownInput}
              onFocus={() => query.trim() && setIsOpen(true)}
              placeholder="Buscar terminal o IP (Ctrl+F)..."
              className="w-full h-10 pl-9 pr-16 text-xs rounded-md bg-muted/70 border-input focus-visible:bg-background text-foreground font-mono transition-colors md:text-sm"
            />
            <Kbd className="absolute right-2 pointer-events-none text-[10px]">
              Ctrl+F
            </Kbd>
          </div>

          {/* Menú de resultados de búsqueda */}
          {isOpen && filtered.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg overflow-hidden z-50 animate-fade-in">
              <div className="px-3 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border bg-muted/40 flex justify-between">
                <span>Coincidencias ({filtered.length})</span>
                <span className="text-[9px] text-muted-foreground lowercase">enter o clic</span>
              </div>
              <ul className="max-h-60 overflow-y-auto divide-y divide-border/40">
                {filtered.map((term) => (
                  <li key={term.pc} className="flex items-center justify-between hover:bg-accent/10 px-2 py-1.5 transition-colors">
                    <button
                      type="button"
                      onClick={() => handleSelect(term.pc)}
                      className="flex-1 text-left flex items-center gap-2 cursor-pointer"
                    >
                      <Monitor className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="font-mono text-xs font-semibold text-foreground">{term.pc}</span>
                      <span className="text-[10px] text-muted-foreground">({term.os})</span>
                      <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1 rounded ml-auto mr-2">
                        {term.ip}
                      </span>
                    </button>

                    {/* Acciones directas en 1 clic */}
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectTerminal(term.pc);
                          onDirectVnc?.(term.pc);
                        }}
                        aria-label={`Conectar VNC a ${term.pc}`}
                        title={`Lanzar VNC Viewer a ${term.pc}`}
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
                          onSelectTerminal(term.pc);
                          onDirectPing?.(term.pc);
                        }}
                        aria-label={`Ping a ${term.pc}`}
                        title={`Lanzar Ping a ${term.pc}`}
                        className="bg-muted hover:bg-accent/20 text-foreground cursor-pointer"
                      >
                        <Play className="h-3 w-3 text-emerald-500" />
                      </Button>
                    </div>
                  </li>
                ))}
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
            title={serverName || 'Modo actual'}
          >
            <Database className={`h-3.5 w-3.5 ${backendMode === 'sql' ? 'text-emerald-500' : 'text-amber-500'}`} />
            <span className={`h-2 w-2 rounded-full ${backendMode === 'sql' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <span>{backendMode === 'sql' ? 'SQL Online' : 'Offline / Mock'}</span>
          </Badge>

          {/* Terminal seleccionada */}
          {selectedPc && (
            <Badge
              variant="outline"
              className="hidden md:flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-md bg-muted text-foreground border-border h-8"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span><strong>{selectedPc}</strong></span>
            </Badge>
          )}

          {/* Botón Portal MDA */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleOpenPortalMda}
            aria-label="Abrir Portal MDA"
            title="Ir a Portal MDA (Inventario de Terminales en la red corporativa)"
            className="h-10 px-3 bg-primary/15 hover:bg-primary/25 text-primary border-primary/30 dark:bg-primary/20 dark:hover:bg-primary/30 dark:text-primary-foreground font-semibold text-xs cursor-pointer shadow-xs gap-1.5"
          >
            <ExternalLink className="h-4 w-4" />
            <span>Portal MDA</span>
          </Button>

          {/* Settings Modal Trigger */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onOpenSettings?.()}
            aria-label="Abrir ajustes y configuración"
            title="Configuración y Actualizaciones (Atajo F10)"
            className="h-10 w-10 text-muted-foreground hover:text-foreground cursor-pointer rounded-md"
          >
            <Settings className="h-4 w-4" />
          </Button>

          {/* Info Modal Trigger */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setIsInfoOpen(true)}
            aria-label="Abrir información del sistema"
            title="Información y características del aplicativo"
            className="h-10 w-10 text-muted-foreground hover:text-foreground cursor-pointer rounded-md"
          >
            <HelpCircle className="h-4 w-4" />
          </Button>

          <ThemeToggle />

          {/* Separador vertical de ventana */}
          <Separator orientation="vertical" className="h-6 mx-0.5" />

          {/* Botones de Ventana (Minimizar a barra de tareas y Apagado a Bandeja del Sistema) */}
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={minimizeWindow}
              aria-label="Minimizar ventana"
              title="Minimizar a barra de tareas"
              className="h-10 w-10 text-muted-foreground hover:text-foreground cursor-pointer rounded-md"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={hideToTray}
              aria-label="Minimizar a bandeja del sistema"
              title="Ocultar en bandeja del sistema (Turn Off)"
              className="h-10 w-10 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer rounded-md"
            >
              <Power className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Info Modal Component */}
      <InfoModal isOpen={isInfoOpen} onClose={() => setIsInfoOpen(false)} appVersion="v1.0.0" />
    </>
  );
}

