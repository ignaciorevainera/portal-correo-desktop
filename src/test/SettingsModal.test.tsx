import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
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
    expect(screen.queryByRole('heading', { name: /diagnóstico y entorno/i })).not.toBeInTheDocument();
    expect(screen.getByText(/versión actual: v1.0.0/i)).toBeInTheDocument();
    expect(screen.getByRole("dialog").className).toContain(
      "max-sm:max-w-[calc(100vw-1.5rem)]",
    );
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

  function renderSettings(): void {
    render(<SettingsModal isOpen onClose={vi.fn()} currentVersion="1.0.0" />);
  }

  it('renders preferences section and toggles local preferences', () => {
    renderSettings();

    expect(screen.getByText(/minimizar a la bandeja al cerrar/i)).toBeInTheDocument();
    expect(screen.getByText(/atajo global ctrl \+ espacio/i)).toBeInTheDocument();
    expect(screen.getByText(/modo de ping predeterminado/i)).toBeInTheDocument();

    const traySwitch = screen.getByRole('switch', {
      name: /minimizar a la bandeja al cerrar/i,
    });
    expect(traySwitch).toBeChecked();
    fireEvent.click(traySwitch);
    expect(traySwitch).not.toBeChecked();
  });

  it('las preferencias booleanas usan switches accesibles', () => {
    renderSettings();

    const minimize = screen.getByRole('switch', {
      name: /minimizar a la bandeja al cerrar/i,
    });
    expect(minimize).toHaveAttribute('data-state', 'checked');

    const hotkey = screen.getByRole('switch', {
      name: /atajo global ctrl \+ espacio/i,
    });
    fireEvent.click(hotkey);
    expect(hotkey).toHaveAttribute('data-state', 'unchecked');
  });

  it('envía al proceso principal los cambios de bandeja y atajo', () => {
    const saveSpy = vi
      .spyOn(electronClient, 'saveUiPreferences')
      .mockResolvedValue(null);

    renderSettings();

    fireEvent.click(
      screen.getByRole('switch', { name: /minimizar a la bandeja al cerrar/i })
    );
    expect(saveSpy).toHaveBeenCalledWith({ minimizeToTray: false });

    fireEvent.click(
      screen.getByRole('switch', { name: /atajo global ctrl \+ espacio/i })
    );
    expect(saveSpy).toHaveBeenCalledWith({ globalHotkeyEnabled: false });
  });

  it('adopta las preferencias persistidas por el proceso principal al abrir', async () => {
    vi.spyOn(electronClient, 'loadUiPreferences').mockResolvedValue({
      minimizeToTray: false,
      globalHotkeyEnabled: false,
      stored: true,
    });

    renderSettings();

    await waitFor(() => {
      expect(
        screen.getByRole('switch', { name: /minimizar a la bandeja al cerrar/i })
      ).not.toBeChecked();
    });
    expect(
      screen.getByRole('switch', { name: /atajo global ctrl \+ espacio/i })
    ).not.toBeChecked();
  });

  it('migra a disco las preferencias locales cuando no hay archivo principal', async () => {
    const saveSpy = vi
      .spyOn(electronClient, 'saveUiPreferences')
      .mockResolvedValue(null);
    vi.spyOn(electronClient, 'loadUiPreferences').mockResolvedValue({
      minimizeToTray: true,
      globalHotkeyEnabled: true,
      stored: false,
    });

    localStorage.setItem('pcd_pref_tray', 'false');
    localStorage.setItem('pcd_pref_hotkey', 'false');

    renderSettings();

    await waitFor(() => {
      expect(saveSpy).toHaveBeenCalledWith({
        minimizeToTray: false,
        globalHotkeyEnabled: false,
      });
    });
  });

  it('el modo de ping es un grupo de opciones excluyentes', () => {
    renderSettings();

    const group = screen.getByRole('radiogroup', {
      name: /modo de ping predeterminado/i,
    });
    const standard = within(group).getByRole('radio', {
      name: /estándar \(4 paquetes\)/i,
    });
    const infinite = within(group).getByRole('radio', {
      name: /continuo \(-t\)/i,
    });

    expect(standard).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(infinite);
    expect(infinite).toHaveAttribute('aria-checked', 'true');
    expect(standard).toHaveAttribute('aria-checked', 'false');
  });

  it('mantiene la opción de ping seleccionada al volver a clickearla', () => {
    renderSettings();

    const group = screen.getByRole('radiogroup', {
      name: /modo de ping predeterminado/i,
    });
    const standard = within(group).getByRole('radio', {
      name: /estándar \(4 paquetes\)/i,
    });
    const infinite = within(group).getByRole('radio', {
      name: /continuo \(-t\)/i,
    });

    fireEvent.click(standard);

    expect(standard).toHaveAttribute('aria-checked', 'true');
    expect(infinite).toHaveAttribute('aria-checked', 'false');
    expect(localStorage.getItem('pcd_pref_ping_mode')).toBe('standard');
    expect(localStorage.getItem('pcd_pref_ping_mode')).not.toBe('');
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

    // Las rutas y orígenes de red/disco no deben exponerse en el diálogo
    expect(screen.queryByText(/Origen:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Ruta bootstrap:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/\\\\host\\share/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/ProgramData/i)).not.toBeInTheDocument();

    const testBtn = screen.getByRole('button', { name: /probar conexión/i });
    expect(testBtn).toBeInTheDocument();
    fireEvent.click(testBtn);
    expect(testSqlSpy).toHaveBeenCalledTimes(1);
  });
  it('permite seleccionar escala de texto y activar modo de alto contraste', async () => {
    const savePrefsSpy = vi.spyOn(electronClient, 'saveUiPreferences').mockResolvedValue({
      minimizeToTray: true,
      globalHotkeyEnabled: true,
      textScale: '120',
      highContrast: true,
      stored: true,
    });

    render(
      <SettingsModal
        isOpen={true}
        onClose={vi.fn()}
        currentVersion="1.0.0"
      />
    );

    expect(screen.getByRole('heading', { name: /accesibilidad y visualización/i })).toBeInTheDocument();
    expect(screen.getByText(/tamaño de texto e interfaz/i)).toBeInTheDocument();
    expect(screen.getByText(/modo de alto contraste/i)).toBeInTheDocument();

    const scale120Btn = screen.getByRole('radio', { name: /120%/i });
    expect(scale120Btn).toBeInTheDocument();
    fireEvent.click(scale120Btn);

    const highContrastSwitch = screen.getByRole('switch', { name: /modo de alto contraste/i });
    expect(highContrastSwitch).toBeInTheDocument();
    fireEvent.click(highContrastSwitch);

    expect(savePrefsSpy).toHaveBeenCalledWith(expect.objectContaining({ textScale: '120' }));
    expect(savePrefsSpy).toHaveBeenCalledWith(expect.objectContaining({ highContrast: true }));
  });
});
