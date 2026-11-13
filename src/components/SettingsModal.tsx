import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import {
  checkAppUpdates,
  startDownloadUpdate,
  installUpdateNow,
  testSqlConnection,
  checkBackendStatus,
  loadUiPreferences,
  saveUiPreferences,
  UpdateCheckResult,
  UpdateDownloadProgress,
  BackendStatus,
} from "@/services/electronClient";
import {
  Settings,
  RefreshCw,
  Download,
  CheckCircle2,
  Sliders,
  Sparkles,
  Database,
  Eye,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
import { IconWell } from "./IconWell";
import { Kbd } from "@/components/ui/kbd";
import {
  loadDefaultPingMode,
  saveDefaultPingMode,
  type PingMode,
  type TextScale,
  loadDefaultTextScale,
  saveDefaultTextScale,
  loadDefaultHighContrast,
  saveDefaultHighContrast,
  loadDefaultConsoleWrap,
  saveDefaultConsoleWrap,
} from "@/lib/preferences";
import { applyHighContrastClass } from "@/lib/highContrast";
import { applyTextScale } from "@/lib/textScale";
import { APP_VERSION } from "@/lib/appVersion";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentVersion?: string;
}

export function SettingsModal({
  isOpen,
  onClose,
  currentVersion = APP_VERSION,
}: SettingsModalProps): React.JSX.Element {
  const [isChecking, setIsChecking] = useState(false);
  const [updateResult, setUpdateResult] = useState<UpdateCheckResult | null>(
    null,
  );
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] =
    useState<UpdateDownloadProgress | null>(null);
  const [downloadedFilePath, setDownloadedFilePath] = useState<string | null>(
    null,
  );

  // Corporate Config State
  const [connectionStatus, setConnectionStatus] =
    useState<BackendStatus | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [isTestingConn, setIsTestingConn] = useState(false);

  // User Preferences
  const [minimizeToTray, setMinimizeToTray] = useState<boolean>(() => {
    const saved = localStorage.getItem("pcd_pref_tray");
    return saved !== null ? saved === "true" : true;
  });

  const [globalHotkeyEnabled, setGlobalHotkeyEnabled] = useState<boolean>(
    () => {
      const saved = localStorage.getItem("pcd_pref_hotkey");
      return saved !== null ? saved === "true" : true;
    },
  );

  const [defaultPingMode, setDefaultPingMode] =
    useState<PingMode>(loadDefaultPingMode);

  const [textScale, setTextScale] = useState<TextScale>(loadDefaultTextScale);
  const [highContrast, setHighContrast] = useState<boolean>(loadDefaultHighContrast);
  const [consoleWrap, setConsoleWrap] = useState<boolean>(loadDefaultConsoleWrap);

  useEffect(() => {
    localStorage.setItem("pcd_pref_tray", String(minimizeToTray));
  }, [minimizeToTray]);

  useEffect(() => {
    localStorage.setItem("pcd_pref_hotkey", String(globalHotkeyEnabled));
  }, [globalHotkeyEnabled]);

  useEffect(() => {
    saveDefaultPingMode(defaultPingMode);
  }, [defaultPingMode]);

  useEffect(() => {
    saveDefaultTextScale(textScale);
    applyTextScale(textScale);
  }, [textScale]);

  useEffect(() => {
    saveDefaultHighContrast(highContrast);
    applyHighContrastClass(highContrast);
  }, [highContrast]);

  useEffect(() => {
    saveDefaultConsoleWrap(consoleWrap);
  }, [consoleWrap]);

  const handleTextScaleChange = (scale: TextScale) => {
    setTextScale(scale);
    void saveUiPreferences({ textScale: scale });
  };

  const handleHighContrastChange = (enabled: boolean) => {
    setHighContrast(enabled);
    void saveUiPreferences({ highContrast: enabled });
  };

  const handleConsoleWrapChange = (enabled: boolean) => {
    setConsoleWrap(enabled);
    void saveUiPreferences({ consoleWrap: enabled });
  };

  // El proceso principal aplica estas preferencias (atajo global y cierre de
  // ventana), así que se leen al abrir el diálogo y se le notifican al cambiar.
  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    loadUiPreferences()
      .then((prefs) => {
        if (cancelled || !prefs) return;

        if (prefs.stored) {
          setMinimizeToTray(prefs.minimizeToTray);
          setGlobalHotkeyEnabled(prefs.globalHotkeyEnabled);
          if (prefs.textScale) setTextScale(prefs.textScale);
          if (typeof prefs.highContrast === 'boolean') setHighContrast(prefs.highContrast);
          if (typeof prefs.consoleWrap === 'boolean') setConsoleWrap(prefs.consoleWrap);
          return;
        }

        // Migración: versiones anteriores solo guardaban en localStorage.
        void saveUiPreferences({
          minimizeToTray,
          globalHotkeyEnabled,
        });
      })
      .catch(() => {
        // Sin proceso principal quedan los valores locales.
      });

    return () => {
      cancelled = true;
    };
    // Solo al abrir el diálogo: los cambios posteriores se guardan en los handlers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleMinimizeToTrayChange = (value: boolean) => {
    setMinimizeToTray(value);
    void saveUiPreferences({ minimizeToTray: value });
  };

  const handleGlobalHotkeyChange = (value: boolean) => {
    setGlobalHotkeyEnabled(value);
    void saveUiPreferences({ globalHotkeyEnabled: value });
  };

  // El estado de conexión se consulta al abrir el diálogo para no mostrar un
  // resultado viejo; el usuario puede reintentarlo desde la misma sección.
  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    setConnectionStatus(null);
    setIsCheckingStatus(true);

    checkBackendStatus()
      .then((status) => {
        if (!cancelled) setConnectionStatus(status);
      })
      .catch(() => {
        if (!cancelled) setConnectionStatus({ connected: false, mode: "mock" });
      })
      .finally(() => {
        if (!cancelled) setIsCheckingStatus(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

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
    if (!updateResult?.downloadUrl && !updateResult?.portableDownloadUrl)
      return;
    const url =
      updateResult.downloadUrl || updateResult.portableDownloadUrl || "";
    setIsDownloading(true);

    startDownloadUpdate(
      url,
      (progress) => {
        setDownloadProgress(progress);
      },
      (filePath) => {
        setIsDownloading(false);
        setDownloadedFilePath(filePath);
      },
    );
  };

  const handleInstallNow = async () => {
    await installUpdateNow();
  };

  const handleTestConnection = async () => {
    setIsTestingConn(true);
    try {
      const status = await testSqlConnection();
      setConnectionStatus(status);
      if (status.connected) {
        toast.success("Conexión con SQL Server establecida exitosamente.");
      } else {
        toast.error(
          `No se pudo conectar: ${status.error || "Host o credenciales inaccesibles"}`,
        );
      }
    } catch {
      setConnectionStatus({ connected: false, mode: "mock" });
      toast.error(
        "No se pudo reintentar la conexión. Verificá la configuración corporativa.",
      );
    } finally {
      setIsTestingConn(false);
    }
  };

  const isConnected = connectionStatus?.connected === true;
  const isConnectionKnown = connectionStatus !== null;
  const connectionLabel = !isConnectionKnown
    ? "Verificando…"
    : isConnected
      ? "SQL Online"
      : "Modo Offline / Local";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-155 max-sm:max-w-[calc(100vw-1.5rem)] max-h-[calc(100vh-2rem)] flex flex-col p-0 gap-0 overflow-hidden bg-card text-card-foreground border-border">
        <DialogHeader className="p-4 bg-muted/40 border-b border-border shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IconWell>
                <Settings className="h-5 w-5" />
              </IconWell>
              <div>
                <DialogTitle className="text-lg font-bold text-foreground">
                  Ajustes y Configuración
                </DialogTitle>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Vista única con scroll vertical interno para todos los ajustes */}
        <div className="p-5 space-y-6 overflow-y-auto flex-1">
          {/* SECCIÓN 1: ACTUALIZACIONES DEL SISTEMA */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 border-b border-border/60 pb-2">
              <RefreshCw className="h-4 w-4 text-link" />
              <h3 className="overline-label text-foreground">
                Actualizaciones del Sistema
              </h3>
            </div>

            <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-medium text-foreground">
                    Versión actual: v{currentVersion}
                  </div>
                  <div className="text-micro text-muted-foreground">
                    Canal de versiones estables de GitHub Releases
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleCheckUpdates}
                  disabled={isChecking}
                  className="text-xs font-semibold cursor-pointer gap-1.5 h-8 w-full sm:w-auto shrink-0"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${isChecking ? "animate-spin" : ""}`}
                  />
                  <span>
                    {isChecking ? "Buscando..." : "Buscar actualizaciones"}
                  </span>
                </Button>
              </div>
            </div>

            {updateResult && !updateResult.hasUpdate && (
              <div className="p-3.5 rounded-xl border border-success/20 bg-success/10 text-success flex items-start gap-2.5 text-xs">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-success mt-0.5" />
                <div>
                  <div className="font-semibold">
                    Estás utilizando la última versión disponible
                  </div>
                  <div className="text-micro opacity-80">
                    No hay actualizaciones pendientes para Portal Correo
                    Desktop.
                  </div>
                </div>
              </div>
            )}

            {updateResult && updateResult.hasUpdate && (
              <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-link text-xs font-bold">
                    <Sparkles className="h-4 w-4" />
                    <span>¡Nueva versión disponible!</span>
                  </div>
                  <Badge
                    variant="default"
                    className="text-xs font-mono font-bold"
                  >
                    v{updateResult.latestVersion}
                  </Badge>
                </div>

                {updateResult.releaseNotes && (
                  <div className="text-xs text-muted-foreground bg-background/60 p-2.5 rounded-md border border-border/60 max-h-32 overflow-y-auto whitespace-pre-wrap font-sans">
                    {updateResult.releaseNotes}
                  </div>
                )}

                {!isDownloading && !downloadedFilePath && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleStartDownload}
                    className="w-full text-xs font-semibold gap-1.5 h-9 cursor-pointer"
                  >
                    <Download className="h-4 w-4" />
                    <span>Descargar e instalar en segundo plano</span>
                  </Button>
                )}

                {isDownloading && downloadProgress && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-xs text-muted-foreground font-mono">
                      <span>
                        Descargando en segundo plano: {downloadProgress.percent}
                        %
                      </span>
                      <span>
                        {(downloadProgress.receivedBytes / 1024 / 1024).toFixed(
                          1,
                        )}{" "}
                        MB /{" "}
                        {(downloadProgress.totalBytes / 1024 / 1024).toFixed(1)}{" "}
                        MB
                      </span>
                    </div>
                    <Progress
                      value={downloadProgress.percent}
                      aria-label="Progreso de la descarga de la actualización"
                      className="h-2"
                    />
                  </div>
                )}

                {downloadedFilePath && (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center gap-2 text-xs font-medium text-success">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <span>Actualización lista para instalar</span>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleInstallNow}
                      className="w-full text-xs font-semibold bg-success hover:bg-success/90 text-success-foreground gap-1.5 h-9 cursor-pointer"
                    >
                      <RefreshCw className="h-4 w-4" />
                      <span>Reiniciar e instalar ahora</span>
                    </Button>
                    <p className="text-micro text-muted-foreground text-center">
                      Si preferís no reiniciar ahora, la actualización se
                      aplicará automáticamente en el próximo arranque.
                    </p>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* SECCIÓN 2: CONEXIÓN CORPORATIVA SQL SERVER */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 border-b border-border/60 pb-2">
              <Database className="h-4 w-4 text-link" />
              <h3 className="overline-label text-foreground">
                Conexión Corporativa SQL Server
              </h3>
            </div>

            <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-xs font-bold text-foreground">
                  {!isConnectionKnown ? (
                    <RefreshCw
                      className="h-4 w-4 shrink-0 animate-spin text-muted-foreground"
                      aria-hidden="true"
                    />
                  ) : isConnected ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                  ) : (
                    <TriangleAlert className="h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
                  )}
                  Estado de Conexión SQL
                </span>
                <Badge
                  variant={isConnected ? "default" : "secondary"}
                  className="text-micro font-mono"
                >
                  {connectionLabel}
                </Badge>
              </div>

              <div className="text-xs text-muted-foreground space-y-1">
                <p role="status" aria-live="polite">
                  {isConnected
                    ? "Conexión establecida con el inventario corporativo."
                    : isConnectionKnown
                      ? "Sin conexión con el inventario corporativo; la aplicación opera en modo local."
                      : "Consultando el estado de la conexión…"}
                </p>
                <p>
                  La configuración se lee de la red corporativa en cada arranque.
                  No se guarda en este equipo.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={isTestingConn || isCheckingStatus}
                  className="text-xs font-semibold gap-1.5 h-8 cursor-pointer"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${isTestingConn ? "animate-spin" : ""}`}
                  />
                  <span>
                    {isTestingConn ? "Reintentando..." : "Reintentar conexión"}
                  </span>
                </Button>
              </div>
            </div>
          </section>

          {/* SECCIÓN 3: PREFERENCIAS DE LA APLICACIÓN */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 border-b border-border/60 pb-2">
              <Sliders className="h-4 w-4 text-link" />
              <h3 className="overline-label text-foreground">
                Preferencias de la Aplicación
              </h3>
            </div>

            <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20 space-y-3">
              <div className="text-xs font-bold text-foreground">
                Comportamiento de Ventana y Bandeja
              </div>
              <div className="flex items-start justify-between gap-3">
                <div className="cursor-pointer space-y-0.5">
                  <Label htmlFor="minimize-to-tray" className="text-xs font-medium text-foreground">
                    Minimizar a la bandeja al cerrar
                  </Label>
                  <p className="text-micro text-muted-foreground">
                    Mantiene la aplicación en segundo plano en el área de
                    notificación de Windows para reapertura instantánea.
                  </p>
                </div>
                <Switch
                  id="minimize-to-tray"
                  checked={minimizeToTray}
                  onCheckedChange={handleMinimizeToTrayChange}
                  aria-label="Minimizar a la bandeja al cerrar"
                />
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20 space-y-3">
              <div className="text-xs font-bold text-foreground">
                Atajo Global de Teclado
              </div>
              <div className="flex items-start justify-between gap-3">
                <div className="cursor-pointer space-y-0.5">
                  <Label htmlFor="global-hotkey" className="text-xs font-medium text-foreground">
                    Atajo Global Ctrl + Espacio
                  </Label>
                  <p className="text-micro text-muted-foreground">
                    Trae el aplicativo al frente y enfoca el buscador pegando
                    automáticamente el texto seleccionado del portapapeles.
                  </p>
                </div>
                <Switch
                  id="global-hotkey"
                  checked={globalHotkeyEnabled}
                  onCheckedChange={handleGlobalHotkeyChange}
                  aria-label="Atajo Global Ctrl + Espacio"
                />
              </div>
              <p className="text-micro text-muted-foreground border-t border-border/60 pt-2">
                Monitor flotante:{" "}
                <span className="font-mono text-foreground">
                  Ctrl + Shift + Espacio
                </span>{" "}
                abre el monitor del último equipo consultado.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20 space-y-2">
              <div className="text-xs font-bold text-foreground">
                Modo de Ping Predeterminado
              </div>
              <div className="text-micro text-muted-foreground">
                Tipo de ping enviado automáticamente al cargar una terminal
              </div>
              <ToggleGroup
                type="single"
                value={defaultPingMode}
                onValueChange={(value) => {
                  if (value === "standard" || value === "infinite")
                    setDefaultPingMode(value);
                }}
                variant="outline"
                size="sm"
                aria-label="Modo de ping predeterminado"
                className="pt-1 justify-start flex-wrap gap-1.5"
              >
                <ToggleGroupItem
                  value="standard"
                  aria-label="Estándar (4 paquetes)"
                  className="cursor-pointer text-micro h-7 px-2.5 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                >
                  Estándar (4 paquetes)
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="infinite"
                  aria-label="Continuo (-t)"
                  className="cursor-pointer text-micro h-7 px-2.5 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                >
                  Continuo (-t)
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </section>

          {/* SECCIÓN 4: ACCESIBILIDAD Y VISUALIZACIÓN */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 border-b border-border/60 pb-2">
              <Eye className="h-4 w-4 text-link" />
              <h3 className="overline-label text-foreground">
                Accesibilidad y Visualización
              </h3>
            </div>

            <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20 space-y-2">
              <div className="text-xs font-bold text-foreground">
                Tamaño de Texto e Interfaz
              </div>
              <div className="text-micro text-muted-foreground">
                Escalado armónico de textos y controles (atajos: <Kbd>Ctrl</Kbd>+<Kbd>+</Kbd> / <Kbd>Ctrl</Kbd>+<Kbd>-</Kbd> / <Kbd>Ctrl</Kbd>+<Kbd>0</Kbd>)
              </div>
              <ToggleGroup
                type="single"
                value={textScale}
                onValueChange={(value) => {
                  if (value === "100" || value === "110" || value === "120" || value === "130") {
                    handleTextScaleChange(value);
                  }
                }}
                variant="outline"
                size="sm"
                aria-label="Tamaño de texto e interfaz"
                className="pt-1 justify-start flex-wrap gap-1.5"
              >
                <ToggleGroupItem
                  value="100"
                  aria-label="100% Estándar"
                  className="cursor-pointer text-micro h-7 px-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                >
                  100%
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="110"
                  aria-label="110% Mediano"
                  className="cursor-pointer text-micro h-7 px-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                >
                  110%
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="120"
                  aria-label="120% Grande"
                  className="cursor-pointer text-micro h-7 px-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                >
                  120%
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="130"
                  aria-label="130% Extra grande"
                  className="cursor-pointer text-micro h-7 px-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                >
                  130%
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20 space-y-3">
              <div className="text-xs font-bold text-foreground">
                Alto Contraste Visual
              </div>
              <div className="flex items-start justify-between gap-3">
                <div className="cursor-pointer space-y-0.5">
                  <Label htmlFor="high-contrast" className="text-xs font-medium text-foreground">
                    Modo de Alto Contraste
                  </Label>
                  <p className="text-micro text-muted-foreground">
                    Intensifica bordes, elimina transparencias y eleva el contraste para monitores de baja resolución o visibilidad reducida.
                  </p>
                </div>
                <Switch
                  id="high-contrast"
                  checked={highContrast}
                  onCheckedChange={handleHighContrastChange}
                  aria-label="Modo de Alto Contraste"
                />
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20 space-y-3">
              <div className="text-xs font-bold text-foreground">
                Ajuste de Línea en Consola
              </div>
              <div className="flex items-start justify-between gap-3">
                <div className="cursor-pointer space-y-0.5">
                  <Label htmlFor="console-wrap" className="text-xs font-medium text-foreground">
                    Ajuste de línea en consola
                  </Label>
                  <p className="text-micro text-muted-foreground">
                    Ajusta automáticamente las líneas de resultados de diagnóstico y ping con saltos de línea suaves para evitar el desplazamiento horizontal.
                  </p>
                </div>
                <Switch
                  id="console-wrap"
                  checked={consoleWrap}
                  onCheckedChange={handleConsoleWrapChange}
                  aria-label="Ajuste de línea en consola"
                />
              </div>
            </div>
          </section>

        </div>

        <DialogFooter className="p-3 bg-muted/30 border-t border-border flex justify-end shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs h-8 cursor-pointer"
          >
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
