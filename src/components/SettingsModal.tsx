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
import {
  checkAppUpdates,
  startDownloadUpdate,
  installUpdateNow,
  testSqlConnection,
  getDiagnostics,
  DiagnosticsInfo,
  UpdateCheckResult,
  UpdateDownloadProgress,
  BackendStatus,
} from "@/services/electronClient";
import {
  Settings,
  RefreshCw,
  Download,
  CheckCircle2,
  HardDrive,
  Keyboard,
  Activity,
  Sliders,
  Server,
  Sparkles,
  Database,
} from "lucide-react";
import { toast } from "sonner";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentVersion?: string;
  backendConnected?: boolean;
}

export function SettingsModal({
  isOpen,
  onClose,
  currentVersion = "1.0.0",
  backendConnected = false,
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
  const [diagnostics, setDiagnostics] = useState<DiagnosticsInfo | null>(null);
  const [isTestingConn, setIsTestingConn] = useState(false);
  const [connTestResult, setConnTestResult] = useState<BackendStatus | null>(
    null,
  );

  // User Preferences
  const [minimizeToTray, setMinimizeToTray] = useState<boolean>(() => {
    const saved = localStorage.getItem("cmda_pref_tray");
    return saved !== null ? saved === "true" : true;
  });

  const [globalHotkeyEnabled, setGlobalHotkeyEnabled] = useState<boolean>(
    () => {
      const saved = localStorage.getItem("cmda_pref_hotkey");
      return saved !== null ? saved === "true" : true;
    },
  );

  const [defaultPingMode, setDefaultPingMode] = useState<
    "standard" | "infinite"
  >(() => {
    const saved = localStorage.getItem("cmda_pref_ping_mode");
    return (saved as "standard" | "infinite") || "standard";
  });

  useEffect(() => {
    localStorage.setItem("cmda_pref_tray", String(minimizeToTray));
  }, [minimizeToTray]);

  useEffect(() => {
    localStorage.setItem("cmda_pref_hotkey", String(globalHotkeyEnabled));
  }, [globalHotkeyEnabled]);

  useEffect(() => {
    localStorage.setItem("cmda_pref_ping_mode", defaultPingMode);
  }, [defaultPingMode]);

  useEffect(() => {
    if (isOpen) {
      getDiagnostics()
        .then(setDiagnostics)
        .catch(() => setDiagnostics(null));
    }
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
      setConnTestResult(status);
      if (status.connected) {
        toast.success("Conexión con SQL Server establecida exitosamente.");
      } else {
        toast.error(
          `No se pudo conectar: ${status.error || "Host o credenciales inaccesibles"}`,
        );
      }
    } finally {
      setIsTestingConn(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-155 max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden bg-card text-card-foreground border-border shadow-2xl">
        <DialogHeader className="p-4 bg-muted/40 border-b border-border shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Settings className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
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
              <RefreshCw className="h-4 w-4 text-primary" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Actualizaciones del Sistema
              </h3>
            </div>

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
                  disabled={isChecking}
                  className="text-xs font-semibold cursor-pointer gap-1.5 h-8"
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
              <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 flex items-start gap-2.5 text-xs">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                <div>
                  <div className="font-semibold">
                    Estás utilizando la última versión disponible
                  </div>
                  <div className="text-[11px] opacity-80">
                    No hay actualizaciones pendientes para Portal Correo
                    Desktop.
                  </div>
                </div>
              </div>
            )}

            {updateResult && updateResult.hasUpdate && (
              <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-primary text-xs font-bold">
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
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${downloadProgress.percent}%` }}
                      />
                    </div>
                  </div>
                )}

                {downloadedFilePath && (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <span>Actualización lista para instalar</span>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleInstallNow}
                      className="w-full text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 h-9 cursor-pointer"
                    >
                      <RefreshCw className="h-4 w-4" />
                      <span>Reiniciar e instalar ahora</span>
                    </Button>
                    <p className="text-[11px] text-muted-foreground text-center">
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
              <Database className="h-4 w-4 text-primary" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Conexión Corporativa SQL Server
              </h3>
            </div>

            <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-primary" />
                  <span className="text-xs font-bold text-foreground">
                    Estado de Conexión SQL
                  </span>
                </div>
                <Badge
                  variant={
                    backendConnected || connTestResult?.connected
                      ? "default"
                      : "secondary"
                  }
                  className="text-[11px] font-mono"
                >
                  {backendConnected || connTestResult?.connected
                    ? "SQL Online"
                    : "Modo Offline / Local"}
                </Badge>
              </div>

              <div className="text-xs text-muted-foreground space-y-1">
                <p>
                  La configuración se lee de la red corporativa en cada arranque.
                  No se guarda en este equipo.
                </p>
                <div className="mt-2 p-2.5 rounded-md bg-background/60 border border-border/60 font-mono text-[11px] space-y-1">
                  <div>
                    <span className="text-muted-foreground">Estado:</span>{" "}
                    <strong>{diagnostics?.gate.status || "desconocido"}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Código:</span>{" "}
                    {diagnostics?.gate.code || "—"}
                  </div>
                  <div className="break-all">
                    <span className="text-muted-foreground">Origen:</span>{" "}
                    {diagnostics?.gate.configPath || "—"}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Bootstrap:</span>{" "}
                    {diagnostics?.bootstrap.found ? "encontrado" : "no encontrado"}
                  </div>
                  <div className="break-all">
                    <span className="text-muted-foreground">Ruta bootstrap:</span>{" "}
                    {diagnostics?.bootstrap.path || "—"}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={isTestingConn || diagnostics?.gate.status !== "READY"}
                  className="text-xs font-semibold gap-1.5 h-8 cursor-pointer"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${isTestingConn ? "animate-spin" : ""}`}
                  />
                  <span>{isTestingConn ? "Probando..." : "Probar conexión"}</span>
                </Button>
              </div>
            </div>
          </section>

          {/* SECCIÓN 3: PREFERENCIAS DE LA APLICACIÓN */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 border-b border-border/60 pb-2">
              <Sliders className="h-4 w-4 text-primary" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Preferencias de la Aplicación
              </h3>
            </div>

            <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20 space-y-3">
              <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <HardDrive className="h-3.5 w-3.5 text-primary" />
                <span>Comportamiento de Ventana y Bandeja</span>
              </div>
              <label className="flex items-start gap-2.5 text-xs cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={minimizeToTray}
                  onChange={(e) => setMinimizeToTray(e.target.checked)}
                  className="mt-0.5 rounded border-border text-primary focus:ring-primary h-4 w-4"
                />
                <div>
                  <span className="font-medium text-foreground">
                    Minimizar a la bandeja al cerrar
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    Mantiene la aplicación en segundo plano en el área de
                    notificación de Windows para reapertura instantánea.
                  </p>
                </div>
              </label>
            </div>

            <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20 space-y-3">
              <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Keyboard className="h-3.5 w-3.5 text-primary" />
                <span>Atajo Global de Teclado</span>
              </div>
              <label className="flex items-start gap-2.5 text-xs cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={globalHotkeyEnabled}
                  onChange={(e) => setGlobalHotkeyEnabled(e.target.checked)}
                  className="mt-0.5 rounded border-border text-primary focus:ring-primary h-4 w-4"
                />
                <div>
                  <span className="font-medium text-foreground">
                    Atajo Global Ctrl + Espacio
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    Trae el aplicativo al frente y enfoca el buscador pegando
                    automáticamente el texto seleccionado del portapapeles.
                  </p>
                </div>
              </label>
            </div>

            <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20 space-y-2">
              <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-primary" />
                <span>Modo de Ping Predeterminado</span>
              </div>
              <div className="text-[11px] text-muted-foreground">
                Tipo de ping enviado automáticamente al cargar una terminal
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Button
                  type="button"
                  size="sm"
                  variant={
                    defaultPingMode === "standard" ? "default" : "outline"
                  }
                  onClick={() => setDefaultPingMode("standard")}
                  className="text-xs font-semibold h-8 cursor-pointer"
                >
                  Estándar (4 paquetes)
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={
                    defaultPingMode === "infinite" ? "default" : "outline"
                  }
                  onClick={() => setDefaultPingMode("infinite")}
                  className="text-xs font-semibold h-8 cursor-pointer"
                >
                  Continuo (-t)
                </Button>
              </div>
            </div>
          </section>

          {/* SECCIÓN 4: DIAGNÓSTICO Y ENTORNO */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 border-b border-border/60 pb-2">
              <Server className="h-4 w-4 text-primary" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Diagnóstico y Entorno
              </h3>
            </div>

            <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-3">
              <div className="text-xs font-bold text-foreground">
                Estado de Infraestructura y Conexión
              </div>

              <div className="flex items-center justify-between text-xs py-1 border-b border-border/50">
                <span className="text-muted-foreground">
                  Base de Datos SQL:
                </span>
                <Badge
                  variant={backendConnected ? "default" : "secondary"}
                  className="text-[11px]"
                >
                  {backendConnected
                    ? "Conectado a Red Corporativa"
                    : "Modo Seguro / Offline (Mocks)"}
                </Badge>
              </div>

              <div className="flex items-center justify-between text-xs py-1 border-b border-border/50">
                <span className="text-muted-foreground">
                  Política Zero-Secrets:
                </span>
                <Badge
                  variant="outline"
                  className="text-[11px] text-emerald-400 border-emerald-500/30"
                >
                  Activa (Cero credenciales en código)
                </Badge>
              </div>

              <div className="flex items-center justify-between text-xs py-1">
                <span className="text-muted-foreground">
                  Entorno de Ejecución:
                </span>
                <span className="font-mono text-[11px] text-foreground">
                  Electron{" "}
                  {typeof process !== "undefined"
                    ? process.versions?.electron || "Desktop"
                    : "Desktop"}
                </span>
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
