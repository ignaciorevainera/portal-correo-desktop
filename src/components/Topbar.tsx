import React, { useState, useEffect, useRef } from 'react';
import { Search, Monitor, Terminal as TerminalIcon, Database, HelpCircle } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { InfoModal } from './InfoModal';
import { getAllTerminals } from '../services/terminalService';

interface TopbarProps {
  onSelectTerminal: (pc: string) => void;
  selectedPc?: string;
  backendMode?: 'sql' | 'mock';
  serverName?: string;
}

export function Topbar({
  onSelectTerminal,
  selectedPc,
  backendMode = 'mock',
  serverName,
}: TopbarProps): React.JSX.Element {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
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

  return (
    <>
      <header className="h-14 border-b border-border bg-card/60 backdrop-blur px-4 flex items-center justify-between gap-4 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <TerminalIcon className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold font-heading tracking-tight text-foreground">new CMDA</h1>
          </div>
        </div>

        <div className="relative flex-1 max-w-md">
          <div className="relative flex items-center">
            <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
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
              className="w-full h-9 pl-9 pr-14 text-sm rounded-md bg-muted/60 border border-input focus:bg-background focus:outline-none focus:ring-1 focus:ring-ring text-foreground font-mono transition-colors"
            />
            <kbd className="absolute right-2 px-1.5 py-0.5 text-[10px] uppercase font-mono tracking-wider bg-background/80 text-muted-foreground rounded border border-border">
              Ctrl+F
            </kbd>
          </div>

          {isOpen && filtered.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg overflow-hidden z-50">
              <div className="px-3 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border bg-muted/30">
                Terminales Coincidentes ({filtered.length})
              </div>
              <ul className="max-h-60 overflow-y-auto divide-y divide-border/50">
                {filtered.map((term) => (
                  <li key={term.pc}>
                    <button
                      type="button"
                      onClick={() => handleSelect(term.pc)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-accent/10 hover:text-accent flex items-center justify-between transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Monitor className="h-4 w-4 text-primary" />
                        <span className="font-mono font-medium">{term.pc}</span>
                        <span className="text-xs text-muted-foreground">({term.os})</span>
                      </div>
                      <span className="font-mono text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {term.ip}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Backend Status Badge */}
          <div className="hidden md:flex items-center gap-1.5 text-xs font-mono px-2 py-1 rounded bg-muted text-foreground border border-border" title={serverName || 'Modo actual'}>
            <Database className={`h-3.5 w-3.5 ${backendMode === 'sql' ? 'text-emerald-500' : 'text-amber-500'}`} />
            <span className={`h-2 w-2 rounded-full ${backendMode === 'sql' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <span>{backendMode === 'sql' ? 'SQL Online' : 'Offline / Mock'}</span>
          </div>

          {selectedPc && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono px-2 py-1 rounded bg-muted text-foreground border border-border">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>Terminal: <strong>{selectedPc}</strong></span>
            </div>
          )}

          {/* Info Button */}
          <button
            type="button"
            onClick={() => setIsInfoOpen(true)}
            aria-label="Abrir información del sistema"
            title="Información y características del aplicativo"
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-muted/80 hover:bg-muted text-foreground border border-border hover:border-primary/40 transition-colors"
          >
            <HelpCircle className="h-4 w-4 text-primary" />
            <span className="hidden sm:inline">Info</span>
          </button>

          <ThemeToggle />
        </div>
      </header>

      {/* Info Modal Component */}
      <InfoModal isOpen={isInfoOpen} onClose={() => setIsInfoOpen(false)} appVersion="v1.0.0" />
    </>
  );
}
