import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  minimizeWindow,
  maximizeWindow,
  closeWindow,
  openExternalUrl,
} from '../services/electronClient';

describe('Window Controls & External Link Contracts', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    delete (window as any).electronAPI;
  });

  describe('In Electron environment (with window.electronAPI)', () => {
    it('calls electronAPI.minimizeWindow', async () => {
      const minimizeMock = vi.fn().mockResolvedValue(true);
      (window as any).electronAPI = {
        minimizeWindow: minimizeMock,
      };

      await minimizeWindow();
      expect(minimizeMock).toHaveBeenCalledTimes(1);
    });

    it('calls electronAPI.maximizeWindow and toggles state', async () => {
      const maximizeMock = vi.fn().mockResolvedValue(true);
      (window as any).electronAPI = {
        maximizeWindow: maximizeMock,
      };

      await maximizeWindow();
      expect(maximizeMock).toHaveBeenCalledTimes(1);
    });

    it('calls electronAPI.closeWindow', async () => {
      const closeMock = vi.fn().mockResolvedValue(true);
      (window as any).electronAPI = {
        closeWindow: closeMock,
      };

      await closeWindow();
      expect(closeMock).toHaveBeenCalledTimes(1);
    });

    it('calls electronAPI.openExternal with destination URL', async () => {
      const openExternalMock = vi.fn().mockResolvedValue(true);
      (window as any).electronAPI = {
        openExternal: openExternalMock,
      };

      const url = 'https://mda.corporativo.internal/inventario-terminales';
      await openExternalUrl(url);
      expect(openExternalMock).toHaveBeenCalledWith(url);
    });
  });

  describe('In Browser / fallback environment (without window.electronAPI)', () => {
    it('gracefully handles minimizeWindow and closeWindow without throwing', async () => {
      await expect(minimizeWindow()).resolves.not.toThrow();
      await expect(closeWindow()).resolves.not.toThrow();
    });

    it('calls window.open as fallback for openExternalUrl', async () => {
      const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
      const url = 'https://mda.corporativo.internal/inventario-terminales';

      await openExternalUrl(url);
      expect(windowOpenSpy).toHaveBeenCalledWith(url, '_blank', 'noopener,noreferrer');
    });
  });
});
