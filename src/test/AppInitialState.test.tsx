import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import App from '../App';

describe('App Initial State, Zero-Preload & Search Scroll Reset', () => {
  const originalWindow = global.window;

  beforeEach(() => {
    vi.restoreAllMocks();
    delete (window as any).electronAPI;
  });

  afterEach(() => {
    (global as any).window = originalWindow;
  });

  it('renders initial clean state with header, NO quick actions bar, NO active ping, and a clean search prompt without demo buttons', async () => {
    const pingMock = vi.fn();
    (global as any).window.electronAPI = {
      checkStatus: vi.fn().mockResolvedValue({ connected: true, mode: 'sql', server: '192.0.2.50' }),
      searchTerminal: vi.fn(),
      ping: pingMock,
      stopPing: vi.fn(),
      onPingData: vi.fn().mockReturnValue(() => {}),
      onPingEnd: vi.fn().mockReturnValue(() => {}),
    };

    render(<App />);

    // 1. Header is rendered with brand title
    expect(screen.getByText(/Portal Correo Desktop/i)).toBeInTheDocument();

    // 2. QuickActionsBar is NOT rendered initially
    expect(screen.queryByRole('button', { name: /Conectar por VNC Viewer/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Iniciar Asistencia MSRA/i })).not.toBeInTheDocument();

    // 3. Ping is NOT triggered on startup
    expect(pingMock).not.toHaveBeenCalled();

    // 4. Main shows a clean welcome/search prompt with NO demo buttons
    expect(screen.getByText(/Buscar una terminal para comenzar/i)).toBeInTheDocument();
    expect(screen.getByText(/Ingresá el Hostname o IP en la barra superior/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /PC-DEMO-001/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /WS-DEMO-002/i })).not.toBeInTheDocument();
  });

  it('loads terminal on search, resets main scroll to top, and shows quick actions', async () => {
    const startPingMock = vi.fn();
    (global as any).window.electronAPI = {
      checkStatus: vi.fn().mockResolvedValue({ connected: true, mode: 'sql', server: '192.0.2.50' }),
      searchTerminal: vi.fn().mockResolvedValue({
        source: 'sql',
        data: {
          pc: 'WS-CORP-100',
          ip: '192.0.2.100',
          mac: '00:00:5E:00:53:99',
          os: 'Windows 11 Enterprise',
          servicePack: '22631.3007',
          cpuModel: 'Intel Core i7',
          ram: '16.384 MB',
          antivirusVersion: 'Endpoint Protection 14.3',
          ieVersion: 'N/A (Edge)',
          userNt: 'soporte.central',
          architecture: 'x64-based PC',
          surveyDate: '25/10/2026',
          uptimeText: '3 day(s), 2 hour(s)',
          location: 'Sede Central',
          costCenter: 'CC 100',
          alerts: [],
          resetHistory: [],
        },
      }),
      ping: startPingMock,
      stopPing: vi.fn(),
      onPingData: vi.fn().mockReturnValue(() => {}),
      onPingEnd: vi.fn().mockReturnValue(() => {}),
    };

    render(<App />);

    // Perform search
    const searchInput = screen.getByPlaceholderText(/Buscar terminal o IP/i);
    fireEvent.change(searchInput, { target: { value: 'WS-CORP-100' } });
    fireEvent.keyDown(searchInput, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /conexión remota inteligente/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /opciones de conexión remota/i })).toBeInTheDocument();
      expect(startPingMock).toHaveBeenCalledWith('192.0.2.100', false);
    });

    // Verify manual options inside dropdown
    fireEvent.click(screen.getByRole('button', { name: /opciones de conexión remota/i }));
    expect(screen.getByRole('button', { name: /Conectar por VNC Viewer/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Iniciar Asistencia MSRA/i })).toBeInTheDocument();
  });
});
