import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';

const terminal = {
  pc: 'WS-CORP-100',
  ip: '192.0.2.100',
  mac: '00:00:5E:00:53:99',
  os: 'Windows 11 Enterprise',
  servicePack: '22631.3007',
  cpuModel: 'Intel Core i7',
  ram: '16.384 MB',
  antivirusVersion: 'Endpoint Protection 14.3',
  ieVersion: 'N/A (Edge)',
  userNt: 'soportecentral',
  architecture: 'x64-based PC',
  surveyDate: '25/10/2026',
  uptimeText: '3 day(s), 2 hour(s)',
  location: 'Sede Central',
  costCenter: 'CC 100',
  alerts: [],
  resetHistory: [],
};

let noticeCallback: ((notice: any) => void) | null = null;
let remoteCallback: ((result: any) => void) | null = null;

function installApi(overrides: any = {}) {
  const api = {
    checkStatus: vi.fn().mockResolvedValue({ connected: true, mode: 'sql' }),
    searchTerminal: vi.fn().mockResolvedValue({ source: 'sql', data: terminal }),
    ping: vi.fn(),
    stopPing: vi.fn(),
    onPingData: vi.fn().mockReturnValue(() => {}),
    onPingEnd: vi.fn().mockReturnValue(() => {}),
    setMonitorTarget: vi.fn(),
    openMonitorCurrent: vi.fn().mockResolvedValue({ ok: true }),
    isMonitorShortcutRegistered: vi.fn().mockResolvedValue(false),
    onMonitorNotice: vi.fn((callback: (notice: any) => void) => {
      noticeCallback = callback;
      return () => {};
    }),
    onMonitorRemoteResult: vi.fn((callback: (result: any) => void) => {
      remoteCallback = callback;
      return () => {};
    }),
    ...overrides,
  };
  (window as any).electronAPI = api;
  return api;
}

async function loadTerminal() {
  render(<App />);
  const input = screen.getByPlaceholderText(/buscar terminal/i);
  fireEvent.change(input, { target: { value: 'WS-CORP-100' } });
  fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
  await waitFor(() =>
    expect(screen.getByTestId('terminal-identity')).toBeInTheDocument(),
  );
}

describe('App monitor integration', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    noticeCallback = null;
    remoteCallback = null;
  });

  it('avisa el target al cargar la terminal', async () => {
    const api = installApi();

    await loadTerminal();

    await waitFor(() =>
      expect(api.setMonitorTarget).toHaveBeenCalledWith({
        target: '192.0.2.100',
        label: 'WS-CORP-100',
      }),
    );
  });

  it('limpia el target cuando no encuentra la terminal', async () => {
    const api = installApi({
      searchTerminal: vi.fn().mockResolvedValue({ source: 'mock', data: null }),
    });

    render(<App />);
    const input = screen.getByPlaceholderText(/buscar terminal/i);
    fireEvent.change(input, { target: { value: 'NO-EXISTE' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    await waitFor(() =>
      expect(api.setMonitorTarget).toHaveBeenLastCalledWith(null),
    );
  });

  it('muestra el aviso de tope como toast', async () => {
    installApi();
    render(<App />);
    await waitFor(() => expect(noticeCallback).toBeTypeOf('function'));

    noticeCallback?.({ kind: 'limit', message: 'Máximo de 4 monitores' });

    expect(
      await screen.findByText('Máximo de monitores alcanzado'),
    ).toBeInTheDocument();
  });

  it('muestra el resultado remoto como toast', async () => {
    installApi();
    render(<App />);
    await waitFor(() => expect(remoteCallback).toBeTypeOf('function'));

    remoteCallback?.({
      success: true,
      methodUsed: 'vnc',
      message: 'VNC iniciado en 192.0.2.100:5901',
      target: '192.0.2.100',
    });

    expect(
      await screen.findByText('VNC iniciado en 192.0.2.100:5901'),
    ).toBeInTheDocument();
  });

  it('dispara la apertura local con Ctrl+Alt+Espacio', async () => {
    const api = installApi();
    render(<App />);

    fireEvent.keyDown(window, {
      key: ' ',
      code: 'Space',
      ctrlKey: true,
      altKey: true,
    });

    await waitFor(() =>
      expect(api.openMonitorCurrent).toHaveBeenCalledTimes(1),
    );
  });

  it('no abre el monitor local cuando el atajo global ya está registrado', async () => {
    const api = installApi({
      isMonitorShortcutRegistered: vi.fn().mockResolvedValue(true),
    });
    render(<App />);

    fireEvent.keyDown(window, {
      key: ' ',
      code: 'Space',
      ctrlKey: true,
      altKey: true,
    });

    await waitFor(() =>
      expect(api.isMonitorShortcutRegistered).toHaveBeenCalledTimes(1),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(api.openMonitorCurrent).not.toHaveBeenCalled();
  });
});
