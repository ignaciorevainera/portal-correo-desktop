import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  checkAppUpdates,
  startDownloadUpdate,
  installUpdateNow,
  UpdateCheckResult,
  UpdateDownloadProgress,
} from '@/services/electronClient';
import {
  Settings,
  RefreshCw,
  Download,
  CheckCircle2,
  AlertCircle,
  HardDrive,
  Keyboard,
  Activity,
  Sliders,
  Server,
  Sparkles,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentVersion?: string;
  backendConnected?: boolean;
}

export function SettingsModal({
  isOpen,
  onClose,
  currentVersion = '1.0.0',
  backendConnected = false,
}: SettingsModalProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<'updates' | 'preferences' | 'diagnostics'>('updates');
  const [isChecking, setIsChecking] = useState(false);
  const [updateResult, setUpdateResult] = useState<UpdateCheckResult | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<UpdateDownloadProgress | null>(null);
  const [downloadedFilePath, setDownloadedFilePath] = useState<string | null>(null);

  // User Preferences
  const [minimizeToTray, setMinimizeToTray] = useState<boolean>(() => {
    const saved = localStorage.getItem('cmda_pref_tray');
    return saved !== null ? saved === 'true' : true;
  });

  const [globalHotkeyEnabled, setGlobalHotkeyEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('cmda_pref_hotkey');
    return saved !== null ? saved === 'true' : true;
  });

  const [defaultPingMode, setDefaultPingMode] = useState<'standard' | 'infinite'>(() => {
    const saved = localStorage.getItem('cmda_pref_ping_mode');
    return (saved as 'standard' | 'infinite') || 'standard';
  });

  useEffect(() => {
    localStorage.setItem('cmda_pref_tray', String(minimizeToTray));
  }, [minimizeToTray]);

  useEffect(() => {
    localStorage.setItem('cmda_pref_hotkey', String(globalHotkeyEnabled));
  }, [globalHotkeyEnabled]);

  useEffect(() => {
    localStorage.setItem('cmda_pref_ping_mode', defaultPingMode);
  }, [defaultPingMode]);

  const handleCheckUpdates = async () => {
    setIsChecking(true);
    setDownloadedFilePath(null);
    setDownloadProgress(null);
    try {
      const res = await checkAppUpdates();
      setUpdateResult(res);
    } finally {
      setIsChecking(false);
    }
  };

  const handleStartDownload = () => {
    if (!updateResult?.downloadUrl && !updateResult?.portableDownloadUrl) return;
    const url = updateResult.downloadUrl || updateResult.portableDownloadUrl || '';
    setIsDownloading(true);

    startDownloadUpdate(
      url,
      (progress) => {
        setDownloadProgress(progress);
      },
      (filePath) => {
        setIsDownloading(false);
        setDownloadedFilePath(filePath);
      }
    );
  };

  const handleInstallNow = async () => {
    await installUpdateNow();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[560px] bg-card text-card-foreground border-border p-0 gap-0 overflow-hidden shadow-2xl">
        <DialogHeader className="p-4 bg-muted/40 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Settings className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  Ajustes y Configuración
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Preferencias operativas y actualizaciones del sistema
                </DialogDescription>
              </div>
            </div>
            <Badge variant="outline" className="font-mono text-[11px] bg-muted/60">
              v{currentVersion}
            </Badge>
          </div>

          {/* Selector de Pestañas */}
          <div className="flex items-center gap-1 mt-4 pt-1" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'updates'}
              onClick={() => setActiveTab('updates')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'updates'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Actualizaciones
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'preferences'}
              onClick={() => setActiveTab('preferences')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'preferences'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Sliders className="h-3.5 w-3.5" />
              Preferencias
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'diagnostics'}
              onClick={() => setActiveTab('diagnostics')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'diagnostics'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Server className="h-3.5 w-3.5" />
              Diagnóstico
            </button>
          </div>
        </DialogHeader>

        <div className="p-5 space-y-4 max-h-[460px] overflow-y-auto">
          {/* TAB 1: ACTUALIZACIONES */}
          {activeTab === 'updates' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-xs font-medium text-foreground">
                      Versión actual: v{currentVersion}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Canal de versiones estables de GitHub Releases
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleCheckUpdates}
                    disabled={isChecking || isDownloading}
                    className="h-8 text-xs font-semibold gap-1.5"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isChecking ? 'animate-spin' : ''}`} />
                    {isChecking ? 'Buscando...' : 'Buscar actualizaciones'}
                  </Button>
                </div>
              </div>

              {/* Estado: Al día */}
              {updateResult && !updateResult.hasUpdate && !updateResult.error && (
                <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-emerald-400">
                      Estás utilizando la última versión disponible
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      No hay actualizaciones pendientes para tu instalación.
                    </div>
                  </div>
                </div>
              )}

              {/* Estado: Error de red/chequeo */}
              {updateResult?.error && (
                <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/10 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-amber-400">
                      Aviso de comprobación
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {updateResult.error}
                    </div>
                  </div>
                </div>
              )}

              {/* Estado: Nueva versión disponible */}
              {updateResult?.hasUpdate && (
                <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <span className="text-xs font-bold text-primary">
                        ¡Nueva versión disponible!
                      </span>
                    </div>
                    <Badge variant="default" className="text-xs font-mono">
                      v{updateResult.latestVersion}
                    </Badge>
                  </div>

                  {updateResult.releaseNotes && (
                    <div className="text-[11px] p-2.5 rounded-lg bg-background/80 border border-border text-foreground font-sans whitespace-pre-line leading-relaxed max-h-32 overflow-y-auto">
                      {updateResult.releaseNotes}
                    </div>
                  )}

                  {/* Acciones de Descarga e Instalación */}
                  {!isDownloading && !downloadedFilePath && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleStartDownload}
                      className="w-full text-xs font-semibold gap-2 h-9"
                    >
                      <Download className="h-4 w-4" />
                      Descargar actualización
                    </Button>
                  )}

                  {isDownloading && (
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                        <span>Descargando en segundo plano: {downloadProgress?.percent || 0}%</span>
                        <span className="text-[11px] text-muted-foreground font-mono">
                          {downloadProgress
                            ? `${(downloadProgress.receivedBytes / 1048576).toFixed(1)}MB / ${(
                                downloadProgress.totalBytes / 1048576
                              ).toFixed(1)}MB`
                            : 'Iniciando...'}
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 overflow-hidden border border-border">
                        <div
                          className="bg-primary h-full transition-all duration-300"
                          style={{ width: `${downloadProgress?.percent || 5}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {downloadedFilePath && (
                    <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        Actualización lista para instalar
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        La actualización fue descargada. Se instalará al cerrar la aplicación o puedes reiniciar ahora.
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleInstallNow}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold gap-2 h-9"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Reiniciar e instalar ahora
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PREFERENCIAS OPERATIVAS */}
          {activeTab === 'preferences' && (
            <div className="space-y-4">
              {/* Minimizar a bandeja */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-muted/20">
                <div className="flex items-start gap-3">
                  <HardDrive className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="space-y-0.5">
                    <label
                      htmlFor="pref-tray"
                      className="text-xs font-semibold text-foreground cursor-pointer"
                    >
                      Minimizar a la bandeja al cerrar
                    </label>
                    <div className="text-[11px] text-muted-foreground">
                      Al presionar la 'X', la app se mantiene oculta en la barra de tareas
                    </div>
                  </div>
                </div>
                <input
                  id="pref-tray"
                  type="checkbox"
                  checked={minimizeToTray}
                  onChange={(e) => setMinimizeToTray(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                />
              </div>

              {/* Atajo global */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-muted/20">
                <div className="flex items-start gap-3">
                  <Keyboard className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="space-y-0.5">
                    <label
                      htmlFor="pref-hotkey"
                      className="text-xs font-semibold text-foreground cursor-pointer"
                    >
                      Atajo global Ctrl + Espacio
                    </label>
                    <div className="text-[11px] text-muted-foreground">
                      Restaura la app y busca automáticamente la IP o PC en el portapapeles
                    </div>
                  </div>
                </div>
                <input
                  id="pref-hotkey"
                  type="checkbox"
                  checked={globalHotkeyEnabled}
                  onChange={(e) => setGlobalHotkeyEnabled(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                />
              </div>

              {/* Modo de Ping predeterminado */}
              <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-2">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-semibold text-foreground">
                    Ping inicial predeterminado
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Tipo de ping enviado automáticamente al cargar una terminal
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    type="button"
                    size="sm"
                    variant={defaultPingMode === 'standard' ? 'default' : 'outline'}
                    onClick={() => setDefaultPingMode('standard')}
                    className="text-xs font-semibold h-8"
                  >
                    Estándar (4 paquetes)
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={defaultPingMode === 'infinite' ? 'default' : 'outline'}
                    onClick={() => setDefaultPingMode('infinite')}
                    className="text-xs font-semibold h-8"
                  >
                    Continuo (-t)
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DIAGNÓSTICO */}
          {activeTab === 'diagnostics' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-3">
                <div className="text-xs font-bold text-foreground">
                  Estado de Infraestructura y Conexión
                </div>

                <div className="flex items-center justify-between text-xs py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Base de Datos SQL:</span>
                  <Badge variant={backendConnected ? 'default' : 'secondary'} className="text-[11px]">
                    {backendConnected ? 'Conectado a Red Corporativa' : 'Modo Seguro / Offline (Mocks)'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between text-xs py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Política Zero-Secrets:</span>
                  <Badge variant="outline" className="text-[11px] text-emerald-400 border-emerald-500/30">
                    Activa (Cero credenciales en código)
                  </Badge>
                </div>

                <div className="flex items-center justify-between text-xs py-1">
                  <span className="text-muted-foreground">Entorno de Ejecución:</span>
                  <span className="font-mono text-[11px] text-foreground">
                    Electron {typeof process !== 'undefined' ? process.versions?.electron || 'Desktop' : 'Desktop'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <Separator />
        <div className="p-3 bg-muted/30 flex justify-end">
          <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs h-8">
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
