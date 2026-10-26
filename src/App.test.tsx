import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import App from './App';

describe('App Smoke, Direct Console & Remote Tools Feedback Test', () => {
  const originalWindow = global.window;

  beforeEach(() => {
    vi.restoreAllMocks();
    delete (window as any).electronAPI;
  });

  afterEach(() => {
    (global as any).window = originalWindow;
  });

  it('renders the application header with Portal Correo Desktop title directly for any user and clean search prompt', async () => {
    render(<App />);
    expect(screen.getByText(/Portal Correo Desktop/i)).toBeInTheDocument();
    expect(screen.getByText(/Buscar una terminal para comenzar/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Conectar por VNC Viewer/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /conexión remota inteligente/i })).not.toBeInTheDocument();
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
      checkStatus: vi.fn().mockResolvedValue({ connected: true, mode: 'sql', server: '192.0.2.50' }),
      searchTerminal: vi.fn().mockResolvedValue({
        source: 'sql',
        data: {
          pc: 'WS-DEMO-002',
          ip: '192.0.2.102',
          os: 'W-10',
          alerts: [],
          resetHistory: [],
          memoryHistory: [],
          drives: [],
        },
      }),
      launchVnc: launchVncMock,
      launchMsra: launchMsraMock,
    };

    render(<App />);

    const searchInput = screen.getByPlaceholderText(/Buscar terminal o IP/i);
    fireEvent.change(searchInput, { target: { value: 'WS-DEMO-002' } });
    fireEvent.keyDown(searchInput, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(screen.getAllByText(/WS-DEMO-002/i).length).toBeGreaterThan(0);
    });

    const dropdownTrigger = screen.getByRole('button', { name: /opciones de conexión remota/i });
    fireEvent.click(dropdownTrigger);
    const vncButton = screen.getByRole('button', { name: /Conectar por VNC Viewer/i });
    fireEvent.click(vncButton);

    await waitFor(() => {
      expect(screen.getByText(/Puertos VNC \(5901\/5900\) cerrados/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Conectar por MSRA/i })).toBeInTheDocument();
    });

    const msraSuggestButton = screen.getByRole('button', { name: /Conectar por MSRA/i });
    fireEvent.click(msraSuggestButton);

    await waitFor(() => {
      expect(launchMsraMock).toHaveBeenCalledWith('192.0.2.102');
      expect(screen.getByText(/Asistencia Remota iniciada/i)).toBeInTheDocument();
    });
  });

  it('renders dedicated not found empty state when searching for a non-existent terminal and allows clearing search', async () => {
    (global as any).window.electronAPI = {
      checkStatus: vi.fn().mockResolvedValue({ connected: true, mode: 'sql', server: '192.0.2.50' }),
      searchTerminal: vi.fn().mockResolvedValue({
        source: 'sql',
        data: null,
      }),
      ping: vi.fn(),
      stopPing: vi.fn(),
      onPingData: vi.fn().mockReturnValue(() => {}),
      onPingEnd: vi.fn().mockReturnValue(() => {}),
    };

    render(<App />);

    // Initial state check
    expect(screen.getByText(/Buscar una terminal para comenzar/i)).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText(/Buscar terminal o IP/i);
    fireEvent.change(searchInput, { target: { value: 'PC-NOEXISTE-999' } });
    fireEvent.keyDown(searchInput, { key: 'Enter', code: 'Enter' });

    // Wait for search result
    await waitFor(() => {
      expect(screen.getByText(/No se encontró la terminal/i)).toBeInTheDocument();
      expect(screen.getAllByText(/PC-NOEXISTE-999/i).length).toBeGreaterThan(0);
    });

    // Should NOT show the generic initial prompt
    expect(screen.queryByText(/Buscar una terminal para comenzar/i)).not.toBeInTheDocument();

    // Verify reset/clear button returns to initial state
    const clearButton = screen.getByRole('button', { name: /Limpiar búsqueda/i });
    fireEvent.click(clearButton);

    await waitFor(() => {
      expect(screen.getByText(/Buscar una terminal para comenzar/i)).toBeInTheDocument();
      expect(screen.queryByText(/No se encontró la terminal/i)).not.toBeInTheDocument();
    });
  });

  it('renders single-scroll layout without Sidebar, auto-triggers 4-packet ping on terminal load, and never scrolls main to ping section', async () => {
    const scrollMock = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollMock;

    let doneCallback: ((code: number) => void) | null = null;
    const startPingMock = vi.fn();

    (global as any).window.electronAPI = {
      checkStatus: vi.fn().mockResolvedValue({ connected: true, mode: 'sql', server: '192.0.2.50' }),
      searchTerminal: vi.fn().mockResolvedValue({
        source: 'sql',
        data: {
          pc: 'PC-DEMO-001',
          ip: '192.0.2.101',
          mac: '00:00:5E:00:53:01',
          os: 'Windows 10 Pro',
          servicePack: '19045.4046',
          cpuModel: 'Intel Core i5 ~2400 Mhz',
          ram: '8.192 MB',
          antivirusVersion: 'Endpoint Protection 12.0',
          ieVersion: '11.0.19041.1',
          userNt: 'operador.demo01',
          architecture: 'x64-based PC',
          surveyDate: '01/01/2026',
          uptimeText: '12 day(s), 4 hour(s), 18 minute(s)',
          location: 'Sede Central Demo',
          costCenter: 'CC 0001',
          alerts: [],
          resetHistory: [],
        },
      }),
      ping: startPingMock,
      stopPing: vi.fn(),
      onPingData: vi.fn().mockReturnValue(() => {}),
      onPingEnd: vi.fn().mockImplementation((cb: (code: number) => void) => {
        doneCallback = cb;
        return () => {};
      }),
    };

    render(<App />);

    const searchInput = screen.getByPlaceholderText(/Buscar terminal o IP/i);
    fireEvent.change(searchInput, { target: { value: 'PC-DEMO-001' } });
    fireEvent.keyDown(searchInput, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /conexión remota inteligente/i })).toBeInTheDocument();
      // Technical card title removed in 3f9768b
      expect(screen.getByRole('button', { name: /iniciar ping/i })).toBeInTheDocument();
      expect(screen.getByText(/Alertas de Terminal/i)).toBeInTheDocument();
      expect(screen.getByText(/Reseteo de Cuentas & Historial de Uptime/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    // Verify Sidebar is completely absent
    expect(screen.queryByRole('navigation', { name: /barra lateral/i })).not.toBeInTheDocument();

    // 1. Verify 4-packet standard ping started automatically upon terminal search/load
    await waitFor(() => {
      expect(startPingMock).toHaveBeenCalledWith('192.0.2.101', false);
      expect(screen.getAllByRole('button', { name: /detener ping en vivo/i }).length).toBeGreaterThan(0);
    });

    // 2. Verify when the 4-packet ping completes, isPinging turns off automatically
    (doneCallback as ((code: number) => void) | null)?.(0);

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /^iniciar ping$/i }).length).toBeGreaterThan(0);
    });

    // 3. Verify clicking Ping or Ping -t does NOT scroll the main container to pingConsoleRef
    scrollMock.mockClear();
    const pingBtn = screen.getAllByRole('button', { name: /^iniciar ping$/i })[0];
    fireEvent.click(pingBtn);

    // Wait 100ms to ensure no delayed scrollIntoView is triggered on ping section
    await new Promise((r) => setTimeout(r, 100));
    expect(scrollMock).not.toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
  });
});
