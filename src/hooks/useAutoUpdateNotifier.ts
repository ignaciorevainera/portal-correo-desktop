import { useState, useEffect, useRef, useCallback } from "react";
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
}: UseAutoUpdateNotifierOptions = {}): UseAutoUpdateNotifierReturn {
  const [status, setStatus] = useState<AutoUpdateStatus>("idle");
  const [updateData, setUpdateData] = useState<UpdateCheckResult | null>(null);
  const [downloadProgress, setDownloadProgress] =
    useState<UpdateDownloadProgress | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cleanupDownloadRef = useRef<(() => void) | null>(null);
  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    if (!isGateReady || hasTriggeredRef.current) return;

    const timer = setTimeout(async () => {
      hasTriggeredRef.current = true;
      setStatus("checking");
      try {
        const res = await checkAppUpdates();
        setUpdateData(res);

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
  }, [isGateReady, delayMs]);

  const dismissUpdate = useCallback(() => {
    if (updateData?.latestVersion) {
      sessionStorage.setItem(
        `${AUTO_UPDATE_DISMISSED_KEY_PREFIX}${updateData.latestVersion}`,
        "true"
      );
    }
    setIsDismissed(true);
    setStatus("dismissed");
  }, [updateData?.latestVersion]);

  const startDownload = useCallback(() => {
    const url = updateData?.downloadUrl || updateData?.portableDownloadUrl;
    if (!url) return;

    setStatus("downloading");
    const cleanup = startDownloadUpdate(
      url,
      (progress) => {
        setDownloadProgress(progress);
      },
      () => {
        setStatus("ready");
      }
    );
    cleanupDownloadRef.current = cleanup;
  }, [updateData]);

  const applyUpdate = useCallback(async () => {
    await installUpdateNow();
  }, []);

  useEffect(() => {
    return () => {
      if (cleanupDownloadRef.current) {
        cleanupDownloadRef.current();
      }
    };
  }, []);

  const hasUpdate = Boolean(updateData?.hasUpdate);
  const latestVersion = updateData?.latestVersion || null;
  const downloadUrl =
    updateData?.downloadUrl || updateData?.portableDownloadUrl || null;
  const isNotificationVisible = hasUpdate && !isDismissed && status === "available";

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
