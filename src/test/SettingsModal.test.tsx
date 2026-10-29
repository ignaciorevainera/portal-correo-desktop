import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { SettingsModal } from '../components/SettingsModal';
import * as electronClient from '../services/electronClient';

describe('SettingsModal Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    delete (window as any).electronAPI;
  });

  it('renders settings dialog when open with single-scroll sections and system version', () => {
    render(
      <SettingsModal
        isOpen={true}
        onClose={vi.fn()}
        currentVersion="1.0.0"
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/ajustes y configuración/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /actualizaciones del sistema/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /conexión corporativa sql server/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /preferencias de la aplicación/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /diagnóstico y entorno/i })).toBeInTheDocument();
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

  it('renders preferences section and toggles local preferences', () => {
    render(
      <SettingsModal
        isOpen={true}
        onClose={vi.fn()}
        currentVersion="1.0.0"
      />
    );

    expect(screen.getByText(/minimizar a la bandeja al cerrar/i)).toBeInTheDocument();
    expect(screen.getByText(/atajo global ctrl \+ espacio/i)).toBeInTheDocument();
    expect(screen.getByText(/modo de ping predeterminado/i)).toBeInTheDocument();

    const trayCheckbox = screen.getByLabelText(/minimizar a la bandeja al cerrar/i);
    expect(trayCheckbox).toBeChecked();
    fireEvent.click(trayCheckbox);
    expect(trayCheckbox).not.toBeChecked();
  });

  it('renders corporate diagnostics panel with gate status, code and bootstrap info', async () => {
    (window as any).electronAPI = {
      getDiagnostics: vi.fn().mockResolvedValue({
        gate: {
          status: 'READY',
          code: 'AUTHORIZED',
          message: 'ok',
          source: 'unc',
          configPath: '\\\\host\\share\\portal-correo-desktop.config.json',
        },
        bootstrap: {
          found: true,
          path: 'C:\\ProgramData\\portal-correo-desktop\\bootstrap.json',
          configSource: 'unc',
          retryIntervalMs: 15000,
        },
        environment: {
          detectedDomain: 'dominio.interno',
          isDomainJoined: true,
          note: '',
        },
        packaged: true,
      }),
    };

    const testSqlSpy = vi.spyOn(electronClient, 'testSqlConnection').mockResolvedValue({
      connected: true,
      mode: 'sql',
      server: 'sql.example.corp',
    });

    render(
      <SettingsModal
        isOpen={true}
        onClose={vi.fn()}
        currentVersion="1.0.0"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Estado:')).toBeInTheDocument();
    });

    expect(screen.getByText('Código:')).toBeInTheDocument();
    expect(screen.getByText('Bootstrap:')).toBeInTheDocument();
    expect(screen.getByText('READY')).toBeInTheDocument();
    expect(screen.getByText('AUTHORIZED')).toBeInTheDocument();
    expect(screen.getByText('encontrado')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /importar archivo/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /eliminar configuración/i })).not.toBeInTheDocument();

    const testBtn = screen.getByRole('button', { name: /probar conexión/i });
    expect(testBtn).toBeInTheDocument();
    fireEvent.click(testBtn);
    expect(testSqlSpy).toHaveBeenCalledTimes(1);
  });
});
