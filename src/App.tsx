import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { Topbar } from './components/Topbar';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { HardwareCard } from './components/HardwareCard';
import { NetworkAdCard } from './components/NetworkAdCard';
import { QuickActionsBar, ActionFeedbackState } from './components/QuickActionsBar';
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
  checkBackendStatus,
  searchTerminalUnified,
  launchVncClient,
  launchMsraClient,
  checkSecurityGateStatus,
  unlockCorporateSecurity,
  BackendStatus,
  SecurityGateStatus,
} from './services/electronClient';
import { TerminalData } from './types/terminal';
import { AlertCircle, Loader2 } from 'lucide-react';

export default function App(): React.JSX.Element {
  const [selectedPc, setSelectedPc] = useState<string>('PC-DEMO-001');
  const [terminal, setTerminal] = useState<TerminalData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('inventory');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [isPinging, setIsPinging] = useState(false);
  const [status, setStatus] = useState<BackendStatus>({ connected: false, mode: 'mock' });
  const [actionFeedback, setActionFeedback] = useState<ActionFeedbackState | null>(null);
  const [securityStatus, setSecurityStatus] = useState<SecurityGateStatus | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);

  const allTerminals = getAllTerminals();

  const verifySecurity = async () => {
    try {
      const sec = await checkSecurityGateStatus();
      setSecurityStatus(sec);
      if (sec.authorized) {
        const backend = await checkBackendStatus();
        setStatus(backend);
      }
    } catch {
      setSecurityStatus({
        authorized: true,
        configured: true,
        domainMatched: true,
        networkReachable: true,
        detectedDomain: 'DEV-MODE',
        reason: 'AUTHORIZED',
        message: 'Modo desarrollo',
      });
    }
  };

  useEffect(() => {
    verifySecurity();
  }, []);

  useEffect(() => {
    if (!selectedPc || (securityStatus && !securityStatus.authorized)) return;
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

  // Global Keyboard Shortcuts (F2 VNC, F3 Ping, F4 MSRA)
  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        handleLaunchVnc();
      } else if (e.key === 'F3') {
        e.preventDefault();
        setIsPinging((prev) => !prev);
      } else if (e.key === 'F4') {
        e.preventDefault();
        handleLaunchMsra();
      }
    };
    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => window.removeEventListener('keydown', handleGlobalShortcuts);
  }, [terminal]);

  const handleUnlockSecurity = async (configPath: string, key: string) => {
    setIsUnlocking(true);
    try {
      const res = await unlockCorporateSecurity(configPath, key);
      setSecurityStatus(res);
      if (res.authorized) {
        const backend = await checkBackendStatus();
        setStatus(backend);
      }
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleRetrySecurity = async () => {
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
    setActionFeedback(null);
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

  const handleLaunchVnc = async (targetOverride?: string): Promise<void> => {
    const target = targetOverride || terminal?.ip || terminal?.pc;
    if (!target) return;

    const res = await launchVncClient(target);

    if (res.vncClosed) {
      setActionFeedback({
        type: 'error',
        message: res.message || `Puertos VNC (5901/5900) cerrados en ${target}.`,
        fallbackAction: res.msraAvailable
          ? {
              label: 'Conectar por Asistencia Remota (MSRA)',
              onClick: () => {
                handleLaunchMsra(target);
              },
            }
          : undefined,
      });
    } else if (res.success) {
      setActionFeedback({
        type: 'success',
        message: res.message || `VNC Viewer iniciado correctamente hacia ${target}${res.portUsed ? `:${res.portUsed}` : ''}`,
      });
      setTimeout(() => setActionFeedback(null), 4000);
    } else {
      setActionFeedback({
        type: 'error',
        message: res.message || `Error al intentar conectar por VNC a ${target}`,
      });
    }
  };

  const handleLaunchMsra = async (targetOverride?: string): Promise<void> => {
    const target = targetOverride || terminal?.ip || terminal?.pc;
    if (!target) return;

    const res = await launchMsraClient(target);
    if (res.success) {
      setActionFeedback({
        type: 'success',
        message: res.message || `Asistencia Remota iniciada para ${target}`,
      });
      setTimeout(() => setActionFeedback(null), 4000);
    } else {
      setActionFeedback({
        type: 'error',
        message: res.message || `Error al iniciar Asistencia Remota para ${target}`,
      });
    }
  };

  const handleDirectPing = (pc: string) => {
    setSelectedPc(pc);
    setIsPinging(true);
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
      <div className="h-screen w-screen overflow-hidden bg-background text-foreground flex flex-col font-sans select-none antialiased">
        <Topbar
          onSelectTerminal={handleSelectTerminal}
          onDirectVnc={handleLaunchVnc}
          onDirectPing={handleDirectPing}
          selectedPc={terminal?.pc || selectedPc}
          backendMode={status.mode}
          serverName={status.server}
        />

        <div className="flex-1 flex overflow-hidden">
          <Sidebar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
            activeAlertsCount={terminal?.alerts.filter((a) => a.active).length || 0}
          />

          <main className="flex-1 p-3.5 overflow-y-auto space-y-3">
            {isLoading ? (
              <div className="h-96 flex flex-col items-center justify-center text-center p-6 space-y-3">
                <Loader2 className="h-7 w-7 text-primary animate-spin" />
                <p className="text-xs text-muted-foreground font-mono">
                  Consultando base de datos técnica...
                </p>
              </div>
            ) : !terminal ? (
              <div className="h-96 flex flex-col items-center justify-center text-center p-6 border border-dashed border-border rounded-lg bg-card/40 space-y-3">
                <AlertCircle className="h-9 w-9 text-muted-foreground opacity-60" />
                <h3 className="text-sm font-semibold font-heading">No se encontró la terminal</h3>
                <p className="text-xs text-muted-foreground max-w-sm">
                  Utiliza la barra de búsqueda superior (Ctrl+F) o escribe un Hostname o IP (ej. PC-DEMO-001, WS-DEMO-002).
                </p>
                <div className="flex gap-2 pt-1 flex-wrap justify-center">
                  {allTerminals.map((t) => (
                    <button
                      key={t.pc}
                      type="button"
                      onClick={() => handleSelectTerminal(t.pc)}
                      className="px-2 py-0.5 text-xs font-mono rounded bg-muted hover:bg-accent/20 border border-border cursor-pointer"
                    >
                      {t.pc}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {/* Actions Bar */}
                <QuickActionsBar
                  terminal={terminal}
                  isPinging={isPinging}
                  actionFeedback={actionFeedback}
                  onLaunchVnc={() => handleLaunchVnc()}
                  onLaunchMsra={() => handleLaunchMsra()}
                  onTogglePing={() => setIsPinging((p) => !p)}
                />

                {/* Tab content */}
                {activeTab === 'inventory' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      <HardwareCard terminal={terminal} />
                      <NetworkAdCard terminal={terminal} />
                    </div>

                    {/* Consola Ping en vivo acoplada en la vista principal */}
                    {isPinging && (
                      <div className="animate-fade-in">
                        <LivePingConsole
                          ip={terminal.ip}
                          isPinging={isPinging}
                          onTogglePing={() => setIsPinging((p) => !p)}
                        />
                      </div>
                    )}
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
