import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAutoUpdateNotifier, AUTO_UPDATE_DISMISSED_KEY_PREFIX } from "../hooks/useAutoUpdateNotifier";
import * as electronClient from "../services/electronClient";
import { toast } from "sonner";

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    dismiss: vi.fn(),
  }),
}));

describe("useAutoUpdateNotifier Toast Integration (TDD)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useFakeTimers();
    sessionStorage.clear();
    vi.mocked(toast).mockClear();
    vi.mocked(toast.info).mockClear();
    vi.mocked(toast.success).mockClear();
    vi.mocked(toast.error).mockClear();
    vi.mocked(toast.dismiss).mockClear();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("shows an interactive toast with 'Descargar' and 'Ahora no' buttons when an update is available", async () => {
    vi.spyOn(electronClient, "checkAppUpdates").mockResolvedValue({
      hasUpdate: true,
      currentVersion: "1.2.0",
      latestVersion: "1.3.0",
      downloadUrl: "https://example.com/setup.exe",
      error: null,
    });

    renderHook(() => useAutoUpdateNotifier({ isGateReady: true, delayMs: 4000, enableToast: true }));

    await act(async () => {
      vi.advanceTimersByTime(4000);
    });

    expect(toast.info).toHaveBeenCalledWith(
      "Nueva versión disponible (v1.3.0)",
      expect.objectContaining({
        description: expect.stringContaining("actualización"),
        action: expect.objectContaining({
          label: "Descargar",
          onClick: expect.any(Function),
        }),
        cancel: expect.objectContaining({
          label: "Ahora no",
          onClick: expect.any(Function),
        }),
      })
    );
  });

  it("triggers download and progress toast when 'Descargar' is clicked", async () => {
    let progressCallback: any = null;
    let completeCallback: any = null;

    vi.spyOn(electronClient, "checkAppUpdates").mockResolvedValue({
      hasUpdate: true,
      currentVersion: "1.2.0",
      latestVersion: "1.3.0",
      downloadUrl: "https://example.com/setup.exe",
      error: null,
    });

    vi.spyOn(electronClient, "startDownloadUpdate").mockImplementation(
      (url, onProgress, onDone) => {
        progressCallback = onProgress;
        completeCallback = onDone;
        return () => {};
      }
    );

    renderHook(() => useAutoUpdateNotifier({ isGateReady: true, delayMs: 4000, enableToast: true }));

    await act(async () => {
      vi.advanceTimersByTime(4000);
    });

    const callArgs = vi.mocked(toast.info).mock.calls[0];
    const toastConfig = callArgs[1] as any;

    act(() => {
      toastConfig.action.onClick();
    });

    expect(electronClient.startDownloadUpdate).toHaveBeenCalled();

    // Simular progreso
    act(() => {
      progressCallback({ receivedBytes: 5000000, totalBytes: 10000000, percent: 50 });
    });

    // Simular finalización
    act(() => {
      completeCallback("C:\\temp\\PortalCorreoDesktop-Update.exe");
    });

    expect(toast.success).toHaveBeenCalledWith(
      "Actualización lista para instalar",
      expect.objectContaining({
        description: expect.stringContaining("v1.3.0"),
        action: expect.objectContaining({
          label: "Instalar y reiniciar",
          onClick: expect.any(Function),
        }),
        cancel: expect.objectContaining({
          label: "Ahora no",
        }),
      })
    );
  });

  it("calls installUpdateNow when 'Instalar y reiniciar' is clicked", async () => {
    let completeCallback: any = null;
    const installSpy = vi.spyOn(electronClient, "installUpdateNow").mockResolvedValue({ success: true });

    vi.spyOn(electronClient, "checkAppUpdates").mockResolvedValue({
      hasUpdate: true,
      currentVersion: "1.2.0",
      latestVersion: "1.3.0",
      downloadUrl: "https://example.com/setup.exe",
      error: null,
    });

    vi.spyOn(electronClient, "startDownloadUpdate").mockImplementation(
      (url, onProgress, onDone) => {
        completeCallback = onDone;
        return () => {};
      }
    );

    renderHook(() => useAutoUpdateNotifier({ isGateReady: true, delayMs: 4000, enableToast: true }));

    await act(async () => {
      vi.advanceTimersByTime(4000);
    });

    const infoCallArgs = vi.mocked(toast.info).mock.calls[0];
    act(() => {
      (infoCallArgs[1] as any).action.onClick();
    });

    act(() => {
      completeCallback("C:\\temp\\PortalCorreoDesktop-Update.exe");
    });

    const successCallArgs = vi.mocked(toast.success).mock.calls[0];
    const restartConfig = successCallArgs[1] as any;

    await act(async () => {
      await restartConfig.action.onClick();
    });

    expect(installSpy).toHaveBeenCalled();
  });

  it("stores session dismissal when 'Ahora no' is clicked", async () => {
    vi.spyOn(electronClient, "checkAppUpdates").mockResolvedValue({
      hasUpdate: true,
      currentVersion: "1.2.0",
      latestVersion: "1.3.0",
      downloadUrl: "https://example.com/setup.exe",
      error: null,
    });

    renderHook(() => useAutoUpdateNotifier({ isGateReady: true, delayMs: 4000, enableToast: true }));

    await act(async () => {
      vi.advanceTimersByTime(4000);
    });

    const infoCallArgs = vi.mocked(toast.info).mock.calls[0];
    act(() => {
      (infoCallArgs[1] as any).cancel.onClick();
    });

    expect(sessionStorage.getItem(`${AUTO_UPDATE_DISMISSED_KEY_PREFIX}1.3.0`)).toBe("true");
  });
});
