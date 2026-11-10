import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import {
  checkAppUpdates,
  startDownloadUpdate,
  installUpdateNow,
  UpdateCheckResult,
  UpdateDownloadProgress,
} from "../services/electronClient";

export const AUTO_UPDATE_DISMISSED_KEY_PREFIX = "pcd_dismissed_update_";

export interface UseAutoUpdateNotifierOptions {
  isGateReady?: boolean;
  delayMs?: number;
  enableToast?: boolean;
}

export type AutoUpdateStatus =
  | "idle"
  | "checking"
  | "available"
  | "downloading"
  | "ready"
  | "dismissed"
  | "error";

export interface UseAutoUpdateNotifierReturn {
  status: AutoUpdateStatus;
  hasUpdate: boolean;
  latestVersion: string | null;
  downloadUrl: string | null;
  downloadProgress: UpdateDownloadProgress | null;
  isNotificationVisible: boolean;
  isDismissed: boolean;
  error: string | null;
  dismissUpdate: () => void;
  startDownload: () => void;
  applyUpdate: () => Promise<void>;
}

export function useAutoUpdateNotifier({
  isGateReady = true,
  delayMs = 4000,
  enableToast = false,
}: UseAutoUpdateNotifierOptions = {}): UseAutoUpdateNotifierReturn {
  const [status, setStatus] = useState<AutoUpdateStatus>("idle");
  const [updateData, setUpdateData] = useState<UpdateCheckResult | null>(null);
  const [downloadProgress, setDownloadProgress] =
    useState<UpdateDownloadProgress | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cleanupDownloadRef = useRef<(() => void) | null>(null);
  const hasTriggeredRef = useRef(false);
  const activeToastIdRef = useRef<string | number | null>(null);
  const updateDataRef = useRef<UpdateCheckResult | null>(null);
  updateDataRef.current = updateData;

  const dismissUpdate = useCallback(() => {
    const data = updateDataRef.current;
    if (data?.latestVersion) {
      sessionStorage.setItem(
        `${AUTO_UPDATE_DISMISSED_KEY_PREFIX}${data.latestVersion}`,
        "true"
      );
    }
    if (activeToastIdRef.current !== null) {
      toast.dismiss(activeToastIdRef.current);
      activeToastIdRef.current = null;
    }
    setIsDismissed(true);
    setStatus("dismissed");
  }, []);

  const applyUpdate = useCallback(async () => {
    if (activeToastIdRef.current !== null) {
      toast.dismiss(activeToastIdRef.current);
      activeToastIdRef.current = null;
    }
    await installUpdateNow();
  }, []);

  const startDownload = useCallback(() => {
    const data = updateDataRef.current;
    const url = data?.downloadUrl || data?.portableDownloadUrl;
    if (!url) return;

    if (activeToastIdRef.current !== null) {
      toast.dismiss(activeToastIdRef.current);
      activeToastIdRef.current = null;
    }

    setStatus("downloading");

    let progressToastId: string | number | null = null;
    if (enableToast) {
      progressToastId = toast.info("Descargando actualización...", {
        description: "Podés seguir utilizando el aplicativo con normalidad.",
        duration: Infinity,
      });
    }

    const cleanup = startDownloadUpdate(
      url,
      (progress) => {
        setDownloadProgress(progress);
        if (enableToast && progressToastId !== null) {
          toast.info(`Descargando actualización (${progress.percent}%)...`, {
            id: progressToastId,
            description: "Podés seguir utilizando el aplicativo con normalidad.",
            duration: Infinity,
          });
        }
      },
      () => {
        setStatus("ready");
        if (progressToastId !== null) {
          toast.dismiss(progressToastId);
        }

        if (enableToast) {
          activeToastIdRef.current = toast.success(
            "Actualización lista para instalar",
            {
              description: `Se descargó la versión v${data?.latestVersion}. ¿Deseas reiniciar el aplicativo ahora para aplicar los cambios?`,
              duration: Infinity,
              action: {
                label: "Instalar y reiniciar",
                onClick: () => {
                  void applyUpdate();
                },
              },
              cancel: {
                label: "Ahora no",
                onClick: () => {
                  if (activeToastIdRef.current !== null) {
                    toast.dismiss(activeToastIdRef.current);
                    activeToastIdRef.current = null;
                  }
                },
              },
            }
          );
        }
      }
    );
    cleanupDownloadRef.current = cleanup;
  }, [enableToast, applyUpdate]);

  useEffect(() => {
    if (!isGateReady || hasTriggeredRef.current) return;

    const timer = setTimeout(async () => {
      hasTriggeredRef.current = true;
      setStatus("checking");
      try {
        const res = await checkAppUpdates();
        setUpdateData(res);
        updateDataRef.current = res;

        if (res.hasUpdate && res.latestVersion) {
          const dismissedInSession =
            sessionStorage.getItem(
              `${AUTO_UPDATE_DISMISSED_KEY_PREFIX}${res.latestVersion}`
            ) === "true";

          if (dismissedInSession) {
            setIsDismissed(true);
            setStatus("dismissed");
          } else {
            setIsDismissed(false);
            setStatus("available");

            if (enableToast) {
              activeToastIdRef.current = toast.info(
                `Nueva versión disponible (v${res.latestVersion})`,
                {
                  description:
                    "Hay una actualización lista para descargar con mejoras de sistema.",
                  duration: Infinity,
                  action: {
                    label: "Descargar",
                    onClick: () => {
                      startDownload();
                    },
                  },
                  cancel: {
                    label: "Ahora no",
                    onClick: () => {
                      dismissUpdate();
                    },
                  },
                }
              );
            }
          }
        } else {
          setStatus("idle");
        }
      } catch (err: any) {
        setError(err?.message || "Error al verificar actualizaciones");
        setStatus("error");
      }
    }, delayMs);

    return () => {
      clearTimeout(timer);
    };
  }, [isGateReady, delayMs, enableToast, startDownload, dismissUpdate]);

  useEffect(() => {
    return () => {
      if (cleanupDownloadRef.current) {
        cleanupDownloadRef.current();
      }
      if (activeToastIdRef.current !== null) {
        toast.dismiss(activeToastIdRef.current);
      }
    };
  }, []);

  const hasUpdate = Boolean(updateData?.hasUpdate);
  const latestVersion = updateData?.latestVersion || null;
  const downloadUrl =
    updateData?.downloadUrl || updateData?.portableDownloadUrl || null;
  const isNotificationVisible =
    hasUpdate && !isDismissed && status === "available";

  return {
    status,
    hasUpdate,
    latestVersion,
    downloadUrl,
    downloadProgress,
    isNotificationVisible,
    isDismissed,
    error,
    dismissUpdate,
    startDownload,
    applyUpdate,
  };
}
