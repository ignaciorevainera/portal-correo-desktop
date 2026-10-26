import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { SettingsModal } from '../components/SettingsModal';
import * as electronClient from '../services/electronClient';

describe('SettingsModal Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('renders settings dialog when open with tabs and system version', () => {
    render(
      <SettingsModal
        isOpen={true}
        onClose={vi.fn()}
        currentVersion="1.0.0"
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/ajustes y configuración/i)).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /actualizaciones/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /preferencias/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /diagnóstico/i })).toBeInTheDocument();
    expect(screen.getByText(/versión actual: v1.0.0/i)).toBeInTheDocument();
  });

  it('checks for updates and shows up-to-date state when no new version', async () => {
    vi.spyOn(electronClient, 'checkAppUpdates').mockResolvedValue({
      hasUpdate: false,
      currentVersion: '1.0.0',
      latestVersion: '1.0.0',
      error: null,
    });

    render(
      <SettingsModal
        isOpen={true}
        onClose={vi.fn()}
        currentVersion="1.0.0"
      />
    );

    const checkBtn = screen.getByRole('button', { name: /buscar actualizaciones/i });
    fireEvent.click(checkBtn);

    await waitFor(() => {
      expect(screen.getByText(/estás utilizando la última versión disponible/i)).toBeInTheDocument();
    });
  });

  it('shows update available with changelog and permits triggering background download', async () => {
    vi.spyOn(electronClient, 'checkAppUpdates').mockResolvedValue({
      hasUpdate: true,
      currentVersion: '1.0.0',
      latestVersion: '1.1.0',
      releaseName: 'Portal Correo Desktop v1.1.0',
      releaseNotes: 'Soporte para escaneo visual de subred',
      downloadUrl: 'https://github.com/mock/setup.exe',
      portableDownloadUrl: 'https://github.com/mock/portable.exe',
      downloadSize: 45000000,
      error: null,
    });

    let mockProgressCb: any;
    let mockDownloadedCb: any;
    vi.spyOn(electronClient, 'startDownloadUpdate').mockImplementation(
      (_url, onProgress, onDownloaded) => {
        mockProgressCb = onProgress;
        mockDownloadedCb = onDownloaded;
        return () => {};
      }
    );

    render(
      <SettingsModal
        isOpen={true}
        onClose={vi.fn()}
        currentVersion="1.0.0"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /buscar actualizaciones/i }));

    await waitFor(() => {
      expect(screen.getByText(/¡nueva versión disponible!/i)).toBeInTheDocument();
      expect(screen.getByText(/v1.1.0/i)).toBeInTheDocument();
      expect(screen.getByText(/soporte para escaneo visual de subred/i)).toBeInTheDocument();
    });

    const updateNowBtn = screen.getByRole('button', { name: /descargar e instalar en segundo plano/i });
    expect(updateNowBtn).toBeInTheDocument();
    fireEvent.click(updateNowBtn);

    // Simulate progress
    mockProgressCb({ receivedBytes: 25000000, totalBytes: 50000000, percent: 50 });

    await waitFor(() => {
      expect(screen.getByText(/descargando en segundo plano: 50%/i)).toBeInTheDocument();
    });

    // Simulate completion
    mockDownloadedCb('C:\\Temp\\PortalCorreoDesktop-Update.exe');

    await waitFor(() => {
      expect(screen.getByText(/actualización lista para instalar/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reiniciar e instalar ahora/i })).toBeInTheDocument();
    });
  });

  it('renders preferences tab and toggles local preferences', () => {
    render(
      <SettingsModal
        isOpen={true}
        onClose={vi.fn()}
        currentVersion="1.0.0"
      />
    );

    fireEvent.click(screen.getByRole('tab', { name: /preferencias/i }));

    expect(screen.getByText(/minimizar a la bandeja al cerrar/i)).toBeInTheDocument();
    expect(screen.getByText(/atajo global ctrl \+ espacio/i)).toBeInTheDocument();
    expect(screen.getByText(/modo de ping predeterminado/i)).toBeInTheDocument();

    const trayCheckbox = screen.getByLabelText(/minimizar a la bandeja al cerrar/i);
    expect(trayCheckbox).toBeChecked();
    fireEvent.click(trayCheckbox);
    expect(trayCheckbox).not.toBeChecked();
  });

  it('renders corporate connection tab and allows importing, testing, and clearing configuration', async () => {
    vi.spyOn(electronClient, 'getCorporateConfig').mockResolvedValue({
      isConfigured: true,
      dbServer: 'sql.correo.internal',
      dbDatabase: 'PortalDB',
      dbUser: 'operador_corp',
      dbPort: 1433,
    });

    const importSpy = vi.spyOn(electronClient, 'importCorporateConfigDialog').mockResolvedValue({
      success: true,
      config: {
        isConfigured: true,
        dbServer: 'imported.correo.internal',
        dbDatabase: 'ImportedDB',
        dbUser: 'operador_imported',
        dbPort: 1433,
      },
      status: { connected: true, mode: 'sql', server: 'imported.correo.internal' },
    });

    const clearSpy = vi.spyOn(electronClient, 'clearCorporateConfig').mockResolvedValue({ success: true });
    const testSqlSpy = vi.spyOn(electronClient, 'testSqlConnection').mockResolvedValue({
      connected: true,
      mode: 'sql',
      server: 'sql.correo.internal',
    });

    render(
      <SettingsModal
        isOpen={true}
        onClose={vi.fn()}
        currentVersion="1.0.0"
      />
    );

    const connTab = screen.getByRole('tab', { name: /conexión/i });
    expect(connTab).toBeInTheDocument();
    fireEvent.click(connTab);

    await waitFor(() => {
      expect(screen.getByText(/sql.correo.internal/i)).toBeInTheDocument();
    });

    const importBtn = screen.getByRole('button', { name: /importar archivo/i });
    expect(importBtn).toBeInTheDocument();
    fireEvent.click(importBtn);
    expect(importSpy).toHaveBeenCalledTimes(1);

    const testBtn = screen.getByRole('button', { name: /probar conexión/i });
    expect(testBtn).toBeInTheDocument();
    fireEvent.click(testBtn);
    expect(testSqlSpy).toHaveBeenCalledTimes(1);

    const clearBtn = screen.getByRole('button', { name: /eliminar configuración/i });
    expect(clearBtn).toBeInTheDocument();
    fireEvent.click(clearBtn);
    expect(clearSpy).toHaveBeenCalledTimes(1);
  });
});