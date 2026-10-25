import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LivePingConsole } from '../components/LivePingConsole';
import * as electronClient from '../services/electronClient';

describe('LivePingConsole Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders target IP and controls: Iniciar/Detener, Limpiar, and Copiar Logs', () => {
    render(
      <LivePingConsole
        ip="192.0.2.100"
        isPinging={false}
        onTogglePing={vi.fn()}
      />
    );

    expect(screen.getByText('192.0.2.100')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /iniciar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /limpiar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /copiar logs de ping/i })).toBeInTheDocument();
  });

  it('replaces logs on new ping start and subscribes to ping output', () => {
    let capturedCallback: ((text: string) => void) | null = null;
    vi.spyOn(electronClient, 'subscribeToPing').mockImplementation((_target, onData) => {
      capturedCallback = onData;
      return () => {};
    });

    const { rerender } = render(
      <LivePingConsole
        ip="192.0.2.100"
        isPinging={false}
        onTogglePing={vi.fn()}
      />
    );

    // Start ping
    rerender(
      <LivePingConsole
        ip="192.0.2.100"
        isPinging={true}
        pingMode="infinite"
        onTogglePing={vi.fn()}
      />
    );

    expect(screen.getByText(/ejecutando ping/i)).toBeInTheDocument();

    // Emit live data
    act(() => {
      capturedCallback?.('Respuesta desde 192.0.2.100: bytes=32 tiempo=1ms TTL=128');
    });

    expect(screen.getByText(/Respuesta desde 192.0.2.100/i)).toBeInTheDocument();
  });

  it('allows stopping active ping, clearing logs and copying complete logs with feedback', async () => {
    const onTogglePing = vi.fn();
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    let dataHandler: ((t: string) => void) | null = null;
    vi.spyOn(electronClient, 'subscribeToPing').mockImplementation((_target, onData) => {
      dataHandler = onData;
      return () => {};
    });

    render(
      <LivePingConsole
        ip="192.0.2.100"
        isPinging={true}
        onTogglePing={onTogglePing}
      />
    );

    // Simulate arriving logs
    act(() => {
      dataHandler?.('Respuesta 1: bytes=32 tiempo=2ms');
      dataHandler?.('Respuesta 2: bytes=32 tiempo=3ms');
    });

    // Click Stop button
    const stopBtn = screen.getByRole('button', { name: /detener/i });
    fireEvent.click(stopBtn);
    expect(onTogglePing).toHaveBeenCalledTimes(1);

    // Click Copy Logs button
    const copyBtn = screen.getByRole('button', { name: /copiar logs de ping/i });
    fireEvent.click(copyBtn);

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalled();
    });
    expect(screen.getByText(/logs copiados/i)).toBeInTheDocument();

    // Click Clear button
    const clearBtn = screen.getByRole('button', { name: /limpiar/i });
    fireEvent.click(clearBtn);

    expect(screen.queryByText(/Respuesta 1/i)).not.toBeInTheDocument();
  });

  it('calls onPingComplete when the ping process finishes (onDone callback)', () => {
    const onPingComplete = vi.fn();
    let doneHandler: ((code: number) => void) | null = null;

    vi.spyOn(electronClient, 'subscribeToPing').mockImplementation((_target, _onData, onDone) => {
      doneHandler = onDone || null;
      return () => {};
    });

    render(
      <LivePingConsole
        ip="192.0.2.100"
        isPinging={true}
        onTogglePing={vi.fn()}
        onPingComplete={onPingComplete}
      />
    );

    act(() => {
      doneHandler?.(0);
    });

    expect(onPingComplete).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/Proceso ping finalizado/i)).toBeInTheDocument();
  });

  it('renders windows console aesthetic with bg-[#0C0C0C], whitespace-pre, horizontal overflow and sanitizes corrupt ping accents', () => {
    let capturedCallback: ((text: string) => void) | null = null;
    vi.spyOn(electronClient, 'subscribeToPing').mockImplementation((_target, onData) => {
      capturedCallback = onData;
      return () => {};
    });

    const { container } = render(
      <LivePingConsole
        ip="192.0.2.100"
        isPinging={true}
        onTogglePing={vi.fn()}
      />
    );

    // Feed raw Windows ping text with CP850/CP1252 corrupted characters
    act(() => {
      capturedCallback?.('Estadsticas de ping para 192.0.2.100:\r\n    Paquetes: enviados = 4, recibidos = 4, perdidos = 0\r\n    (0% perdidos),\r\nTiempos aproximados de ida y vuelta en milisegundos:\r\n    Mnimo = 14ms, Mximo = 14ms, Media = 14ms');
    });

    // Sanitized output check
    expect(screen.getByText(/Estadísticas de ping/i)).toBeInTheDocument();
    expect(screen.getByText(/Mínimo = 14ms/i)).toBeInTheDocument();
    expect(screen.getByText(/Máximo = 14ms/i)).toBeInTheDocument();

    // Check terminal styling
    const terminalBox = container.querySelector('.bg-\\[\\#0C0C0C\\]');
    expect(terminalBox).not.toBeNull();
    expect(terminalBox?.className).toContain('overflow-x-auto');
  });

  it('renders contiguous console without section title and with height h-64', () => {
    const { container } = render(
      <LivePingConsole
        ip="192.0.2.100"
        isPinging={false}
        onTogglePing={vi.fn()}
      />
    );

    // Section title is omitted (no "Consola de Ping en Vivo:")
    expect(screen.queryByText(/Consola de Ping en Vivo:/i)).toBeNull();

    // The 3 CTAs are present
    expect(screen.getByRole('button', { name: /iniciar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /limpiar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /copiar logs/i })).toBeInTheDocument();

    // Console terminal has height class h-64
    const terminalBox = container.querySelector('.bg-\\[\\#0C0C0C\\]');
    expect(terminalBox?.className).toContain('h-64');
  });

  it('never calls scrollIntoView when ping data arrives, ping finishes, or logs are cleared', () => {
    const scrollMock = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollMock;

    let dataCallback: ((text: string) => void) | null = null;
    let doneCallback: ((code: number) => void) | null = null;
    vi.spyOn(electronClient, 'subscribeToPing').mockImplementation((_target, onData, onDone) => {
      dataCallback = onData;
      doneCallback = onDone || null;
      return () => {};
    });

    render(
      <LivePingConsole
        ip="192.0.2.100"
        isPinging={true}
        onTogglePing={vi.fn()}
      />
    );

    // Initial mount and log replacement
    scrollMock.mockClear();

    // Data arrives
    act(() => {
      dataCallback?.('Respuesta desde 192.0.2.100: bytes=32 tiempo=1ms');
    });

    expect(scrollMock).not.toHaveBeenCalled();

    // Ping finishes
    act(() => {
      doneCallback?.(0);
    });

    expect(scrollMock).not.toHaveBeenCalled();

    // Logs cleared
    const clearBtn = screen.getByRole('button', { name: /limpiar/i });
    fireEvent.click(clearBtn);

    expect(scrollMock).not.toHaveBeenCalled();
  });
});
