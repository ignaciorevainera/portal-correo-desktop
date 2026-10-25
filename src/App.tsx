import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { Topbar } from './components/Topbar';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { HardwareCard } from './components/HardwareCard';
import { NetworkAdCard } from './components/NetworkAdCard';
import { QuickActionsBar } from './components/QuickActionsBar';
import { LivePingConsole } from './components/LivePingConsole';
import { AlertsPanel } from './components/AlertsPanel';
import { ResetUptimePanel } from './components/ResetUptimePanel';
import { SecurityLockScreen } from './components/SecurityLockScreen';
import {
  getAllTerminals,
  addAlertToTerminal,
  closeAlertOnTerminal,
} from './services/terminalService';
import {
  checkSecurityGateStatus,
  unlockCorporateSecurity,
  checkBackendStatus,
  searchTerminalUnified,
  launchVncClient,
  launchMsraClient,
  BackendStatus,
  SecurityGateStatus,
} from './services/electronClient';
import { TerminalData } from './types/terminal';
import { AlertCircle, AlertTriangle, CheckCircle2, XCircle, Info, X, ArrowRight, Loader2 } from 'lucide-react';

interface BannerNotification {
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function App(): React.JSX.Element {
  const [securityStatus, setSecurityStatus] = useState<SecurityGateStatus | null>(null);
  const [isUnlocking, setIsUnlocking] = useState<boolean>(false);
  const [selectedPc, setSelectedPc] = useState<string>('PC-DEMO-001');
  const [terminal, setTerminal] = useState<TerminalData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('inventory');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isPinging, setIsPinging] = useState(false);
  const [status, setStatus] = useState<BackendStatus>({ connected: false, mode: 'mock' });
  const [banner, setBanner] = useState<BannerNotification | null>(null);

  const allTerminals = getAllTerminals();

  useEffect(() => {
    let isMounted = true;
    checkSecurityGateStatus()
      .then((sec) => {
        if (isMounted) {
          setSecurityStatus(sec);
          if (sec.authorized) {
            checkBackendStatus().then(setStatus).catch(() => {});
          }
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!securityStatus || !securityStatus.authorized || !selectedPc) return;
    let isMounted = true;
    setIsLoading(true);

    searchTerminalUnified(selectedPc)
      .then((res) => {
        if (isMounted) {
          setTerminal(res.data);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedPc, securityStatus]);

  const handleUnlockSecurity = async (configPath: string, corporateKey: string): Promise<void> => {
    setIsUnlocking(true);
    try {
      const updated = await unlockCorporateSecurity(configPath, corporateKey);
      setSecurityStatus(updated);
      if (updated.authorized) {
        const backend = await checkBackendStatus();
        setStatus(backend);
      }
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleRetrySecurity = async (): Promise<void> => {
    setIsUnlocking(true);
    try {
      const updated = await checkSecurityGateStatus();
      setSecurityStatus(updated);
      if (updated.authorized) {
        const backend = await checkBackendStatus();
        setStatus(backend);
      }
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleSelectTerminal = (pc: string): void => {
    setSelectedPc(pc);
    setIsPinging(false);
  };

  const handleAddAlert = (alert: { title: string; description: string; operator: string }): void => {
    if (!terminal) return;
    try {
      const created = addAlertToTerminal(terminal.pc, alert);
      setTerminal((prev) => (prev ? { ...prev, alerts: [created, ...prev.alerts] } : null));
    } catch {
      const newAlert = {
        id: `alt-${Date.now()}`,
        ...alert,
        date: new Date().toLocaleString('es-AR'),
        active: true,
      };
      setTerminal((prev) => (prev ? { ...prev, alerts: [newAlert, ...prev.alerts] } : null));
    }
  };

  const handleCloseAlert = (alertId: string, resolution: string): void => {
    if (!terminal) return;
    closeAlertOnTerminal(terminal.pc, alertId, resolution);
    setTerminal((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        alerts: prev.alerts.map((a) =>
          a.id === alertId
            ? { ...a, active: false, resolutionText: resolution, resolutionDate: new Date().toLocaleString('es-AR') }
            : a
        ),
      };
    });
  };

  const handleLaunchVnc = async (): Promise<void> => {
    if (!terminal) return;
    const target = terminal.ip || terminal.pc;
    const res = await launchVncClient(target);

    if (res.vncClosed) {
      setBanner({
        type: 'warning',
        message: res.message || `Puertos VNC (5901/5900) cerrados en ${target}.`,
        action: res.msraAvailable
          ? {
              label: 'Conectar por Asistencia Remota (MSRA)',
              onClick: () => {
                handleLaunchMsra();
              },
            }
          : undefined,
      });
    } else if (res.success) {
      setBanner({
        type: 'success',
        message: res.message || `VNC Viewer iniciado correctamente hacia ${target}${res.portUsed ? `:${res.portUsed}` : ''}`,
      });
      setTimeout(() => setBanner(null), 5000);
    } else {
      setBanner({
        type: 'error',
        message: res.message || `Error al intentar conectar por VNC a ${target}`,
      });
    }
  };

  const handleLaunchMsra = async (): Promise<void> => {
    if (!terminal) return;
    const target = terminal.ip || terminal.pc;
    const res = await launchMsraClient(target);
    if (res.success) {
      setBanner({
        type: 'success',
        message: res.message || `Asistencia Remota (MSRA) iniciada para ${target}`,
      });
      setTimeout(() => setBanner(null), 5000);
    } else {
      setBanner({
        type: 'error',
        message: res.message || `Error al iniciar Asistencia Remota para ${target}`,
      });
    }
  };

  if (securityStatus && !securityStatus.authorized) {
    return (
      <ThemeProvider>
        <SecurityLockScreen
          status={securityStatus}
          onUnlock={handleUnlockSecurity}
          onRetry={handleRetrySecurity}
          isLoading={isUnlocking}
        />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-background text-foreground flex flex-col font-sans select-none antialiased">
        <Topbar
          onSelectTerminal={handleSelectTerminal}
          selectedPc={terminal?.pc || selectedPc}
          backendMode={status.mode}
          serverName={status.server}
        />

        {banner && (
          <div
            className={`border-b text-xs py-2 px-4 flex items-center justify-between gap-3 font-mono animate-fade-in transition-colors ${
              banner.type === 'warning'
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-200'
                : banner.type === 'error'
                ? 'bg-destructive/15 border-destructive/30 text-destructive'
                : banner.type === 'success'
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                : 'bg-primary/10 border-primary/20 text-primary'
            }`}
          >
            <div className="flex items-center gap-2 flex-wrap">
              {banner.type === 'warning' && <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />}
              {banner.type === 'error' && <XCircle className="h-4 w-4 text-destructive shrink-0" />}
              {banner.type === 'success' && <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />}
              {banner.type === 'info' && <Info className="h-4 w-4 text-primary shrink-0" />}
              <span>{banner.message}</span>
              {banner.action && (
                <button
                  type="button"
                  onClick={banner.action.onClick}
                  aria-label={banner.action.label}
                  className="inline-flex items-center gap-1.5 ml-2 px-2.5 py-0.5 rounded bg-amber-500 text-black font-semibold text-xs hover:bg-amber-400 transition-colors shadow-sm cursor-pointer"
                >
                  {banner.action.label}
                  <ArrowRight className="h-3 w-3" />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setBanner(null)}
              aria-label="Cerrar notificación"
              className="p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <div className="flex-1 flex overflow-hidden">
          <Sidebar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
            activeAlertsCount={terminal?.alerts.filter((a) => a.active).length || 0}
          />

          <main className="flex-1 p-5 overflow-y-auto space-y-4">
            {isLoading ? (
              <div className="h-96 flex flex-col items-center justify-center text-center p-6 space-y-3">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
                <p className="text-xs text-muted-foreground font-mono">
                  Consultando servidor de base de datos corporativo...
                </p>
              </div>
            ) : !terminal ? (
              <div className="h-96 flex flex-col items-center justify-center text-center p-6 border border-dashed border-border rounded-lg bg-card/40 space-y-3">
                <AlertCircle className="h-10 w-10 text-muted-foreground opacity-60" />
                <h3 className="text-base font-semibold font-heading">No se encontró la terminal</h3>
                <p className="text-xs text-muted-foreground max-w-sm">
                  Utiliza la barra de búsqueda superior (Ctrl+F) o escribe un Hostname o IP (ej. PC-DEMO-001, WS-DEMO-002, TERM-DEMO-003).
                </p>
                <div className="flex gap-2 pt-2">
                  {allTerminals.map((t) => (
                    <button
                      key={t.pc}
                      type="button"
                      onClick={() => handleSelectTerminal(t.pc)}
                      className="px-2.5 py-1 text-xs font-mono rounded bg-muted hover:bg-accent/20 border border-border"
                    >
                      {t.pc}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <QuickActionsBar
                  terminal={terminal}
                  isPinging={isPinging}
                  onLaunchVnc={handleLaunchVnc}
                  onLaunchMsra={handleLaunchMsra}
                  onTogglePing={() => setIsPinging((p) => !p)}
                />

                {activeTab === 'inventory' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <HardwareCard terminal={terminal} />
                    <NetworkAdCard terminal={terminal} />
                  </div>
                )}

                {activeTab === 'network' && (
                  <div className="space-y-4">
                    <NetworkAdCard terminal={terminal} />
                    <LivePingConsole
                      ip={terminal.ip}
                      isPinging={isPinging}
                      onTogglePing={() => setIsPinging((p) => !p)}
                    />
                  </div>
                )}

                {activeTab === 'alerts' && (
                  <AlertsPanel
                    terminal={terminal}
                    onAddAlert={handleAddAlert}
                    onCloseAlert={handleCloseAlert}
                  />
                )}

                {activeTab === 'reset-uptime' && (
                  <ResetUptimePanel terminal={terminal} />
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </ThemeProvider>
  );
}
