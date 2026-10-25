import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import App from './App';

describe('App Smoke, Security Gatekeeper & Remote Tools Feedback Test', () => {
  const originalWindow = global.window;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    (global as any).window = originalWindow;
  });

  it('renders the application header with new CMDA title when authorized', async () => {
    render(<App />);
    expect(screen.getByText(/new CMDA/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/PC-DEMO-001/i)).toBeInTheDocument();
    });
  });

  it('blocks the console and shows SecurityLockScreen when outside corporate network/domain', async () => {
    (global as any).window.electronAPI = {
      getSecurityStatus: vi.fn().mockResolvedValue({
        authorized: false,
        configured: true,
        domainMatched: false,
        networkReachable: false,
        detectedDomain: 'HOME-PC',
        reason: 'OUTSIDE_CORPORATE_NETWORK',
        message: 'Acceso denegado: El equipo se encuentra fuera del dominio corporativo y sin VPN.',
      }),
    };

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Control de Acceso Corporativo/i)).toBeInTheDocument();
      expect(screen.getByText(/Consola Bloqueada por Política de Seguridad/i)).toBeInTheDocument();
    });

    expect(screen.queryByText(/PC-DEMO-001/i)).not.toBeInTheDocument();
  });

  it('shows diagnostic warning banner and MSRA suggestion button when VNC is closed and MSRA is available', async () => {
    const launchVncMock = vi.fn().mockResolvedValue({
      success: false,
      vncClosed: true,
      msraAvailable: true,
      message: 'Puertos VNC (5901/5900) cerrados en 192.0.2.102. Asistencia Remota (MSRA / 3389) está disponible.',
    });
    const launchMsraMock = vi.fn().mockResolvedValue({
      success: true,
      message: 'Asistencia Remota iniciada para 192.0.2.102',
    });

    (global as any).window.electronAPI = {
      getSecurityStatus: vi.fn().mockResolvedValue({
        authorized: true,
        configured: true,
        domainMatched: true,
        networkReachable: true,
        detectedDomain: 'CORP.LOCAL',
        reason: 'AUTHORIZED',
        message: 'Autorizado',
      }),
      checkStatus: vi.fn().mockResolvedValue({ connected: true, mode: 'sql', server: '192.0.2.50' }),
      searchTerminal: vi.fn().mockResolvedValue({
        source: 'sql',
        data: {
          pc: 'WS-DEMO-002',
          ip: '192.0.2.102',
          os: 'W-10',
          alerts: [],
          memoryHistory: [],
          drives: [],
        },
      }),
      launchVnc: launchVncMock,
      launchMsra: launchMsraMock,
    };

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/WS-DEMO-002/i)).toBeInTheDocument();
    });

    const vncButton = screen.getByRole('button', { name: /Conectar por VNC Viewer/i });
    fireEvent.click(vncButton);

    await waitFor(() => {
      expect(screen.getByText(/Puertos VNC \(5901\/5900\) cerrados/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Conectar por Asistencia Remota \(MSRA\)/i })).toBeInTheDocument();
    });

    const msraSuggestButton = screen.getByRole('button', { name: /Conectar por Asistencia Remota \(MSRA\)/i });
    fireEvent.click(msraSuggestButton);

    await waitFor(() => {
      expect(launchMsraMock).toHaveBeenCalledWith('192.0.2.102');
      expect(screen.getByText(/Asistencia Remota iniciada/i)).toBeInTheDocument();
    });
  });
});
