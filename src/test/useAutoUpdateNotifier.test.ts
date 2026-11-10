import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAutoUpdateNotifier, AUTO_UPDATE_DISMISSED_KEY_PREFIX } from '../hooks/useAutoUpdateNotifier';
import * as electronClient from '../services/electronClient';

describe('useAutoUpdateNotifier (TDD)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useFakeTimers();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('does not check updates immediately before delay elapsed', () => {
    const checkSpy = vi.spyOn(electronClient, 'checkAppUpdates').mockResolvedValue({
      hasUpdate: true,
      currentVersion: '1.2.0',
      latestVersion: '1.3.0',
      downloadUrl: 'https://example.com/update.exe',
      error: null,
    });

    renderHook(() => useAutoUpdateNotifier({ isGateReady: true, delayMs: 4000 }));

    expect(checkSpy).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(checkSpy).not.toHaveBeenCalled();
  });

  it('triggers check after delay when isGateReady is true', async () => {
    const checkSpy = vi.spyOn(electronClient, 'checkAppUpdates').mockResolvedValue({
      hasUpdate: true,
      currentVersion: '1.2.0',
      latestVersion: '1.3.0',
      downloadUrl: 'https://example.com/update.exe',
      error: null,
    });

    const { result } = renderHook(() => useAutoUpdateNotifier({ isGateReady: true, delayMs: 4000 }));

    await act(async () => {
      vi.advanceTimersByTime(4000);
    });

    expect(checkSpy).toHaveBeenCalledTimes(1);
    expect(result.current.hasUpdate).toBe(true);
    expect(result.current.latestVersion).toBe('1.3.0');
    expect(result.current.isDismissed).toBe(false);
  });

  it('does not check if isGateReady is false', async () => {
    const checkSpy = vi.spyOn(electronClient, 'checkAppUpdates').mockResolvedValue({
      hasUpdate: true,
      currentVersion: '1.2.0',
      latestVersion: '1.3.0',
      error: null,
    });

    renderHook(() => useAutoUpdateNotifier({ isGateReady: false, delayMs: 4000 }));

    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    expect(checkSpy).not.toHaveBeenCalled();
  });

  it('ignores notification when hasUpdate is false or on error', async () => {
    vi.spyOn(electronClient, 'checkAppUpdates').mockResolvedValue({
      hasUpdate: false,
      currentVersion: '1.2.0',
      latestVersion: '1.2.0',
      error: null,
    });

    const { result } = renderHook(() => useAutoUpdateNotifier({ isGateReady: true, delayMs: 4000 }));

    await act(async () => {
      vi.advanceTimersByTime(4000);
    });

    expect(result.current.hasUpdate).toBe(false);
    expect(result.current.isNotificationVisible).toBe(false);
  });

  it('dismisses notification for current session when dismissUpdate is called', async () => {
    vi.spyOn(electronClient, 'checkAppUpdates').mockResolvedValue({
      hasUpdate: true,
      currentVersion: '1.2.0',
      latestVersion: '1.3.0',
      downloadUrl: 'https://example.com/update.exe',
      error: null,
    });

    const { result } = renderHook(() => useAutoUpdateNotifier({ isGateReady: true, delayMs: 4000 }));

    await act(async () => {
      vi.advanceTimersByTime(4000);
    });

    expect(result.current.isNotificationVisible).toBe(true);

    act(() => {
      result.current.dismissUpdate();
    });

    expect(result.current.isDismissed).toBe(true);
    expect(result.current.isNotificationVisible).toBe(false);
    expect(sessionStorage.getItem(`${AUTO_UPDATE_DISMISSED_KEY_PREFIX}1.3.0`)).toBe('true');
  });

  it('skips notification if already dismissed in sessionStorage for that version', async () => {
    sessionStorage.setItem(`${AUTO_UPDATE_DISMISSED_KEY_PREFIX}1.3.0`, 'true');

    vi.spyOn(electronClient, 'checkAppUpdates').mockResolvedValue({
      hasUpdate: true,
      currentVersion: '1.2.0',
      latestVersion: '1.3.0',
      downloadUrl: 'https://example.com/update.exe',
      error: null,
    });

    const { result } = renderHook(() => useAutoUpdateNotifier({ isGateReady: true, delayMs: 4000 }));

    await act(async () => {
      vi.advanceTimersByTime(4000);
    });

    expect(result.current.hasUpdate).toBe(true);
    expect(result.current.isDismissed).toBe(true);
    expect(result.current.isNotificationVisible).toBe(false);
  });
});
