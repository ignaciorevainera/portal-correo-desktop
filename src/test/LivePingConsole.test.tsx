import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LivePingConsole } from '../components/LivePingConsole';
import * as electronClient from '../services/electronClient';

describe('LivePingConsole Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders target IP and controls: Detener (when active), Limpiar, Copiar Último, and Copiar Logs without Iniciar button', () => {
    const { rerender } = render(
      <LivePingConsole
        ip="192.0.2.100"
        isPinging={false}
        onTogglePing={vi.fn()}
      />
    );

    expect(screen.getByText('192.0.2.100')).toBeInTheDocument();
    // Redundant Iniciar button must NOT exist when idle
    expect(screen.queryByRole('button', { name: /^iniciar$/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /limpiar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /copiar último/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /copiar logs/i })).toBeInTheDocument();

    // When running, Detener button is present
    rerender(
      <LivePingConsole
        ip="192.0.2.100"
        isPinging={true}
        onTogglePing={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: /detener/i })).toBeInTheDocument();
  });

  it('appends multiple command executions sequentially without wiping previous history', () => {
    let capturedCallback: ((text: string) => void) | null = null;
    vi.spyOn(electronClient, 'subscribeToPing').mockImplementation((_target, onData) => {
      capturedCallback = onData;
      return () => {};
    });

    const { rerender } = render(
      <LivePingConsole
        ip="192.0.2.100"
        isPinging={true}
        pingMode="standard"
        onTogglePing={vi.fn()}
      />
    );

    act(() => {
      capturedCallback?.('Respuesta desde 192.0.2.100: bytes=32 tiempo=1ms');
    });

    expect(screen.getByText(/Respuesta desde 192.0.2.100: bytes=32 tiempo=1ms/i)).toBeInTheDocument();

    // Trigger another command / ping session
    rerender(
      <LivePingConsole
        ip="192.0.2.100"
        isPinging={false}
        onTogglePing={vi.fn()}
      />
    );

    rerender(
      <LivePingConsole
        ip="192.0.2.100"
        isPinging={true}
        pingMode="infinite"
        onTogglePing={vi.fn()}
      />
    );

    act(() => {
      capturedCallback?.('Respuesta continua desde 192.0.2.100: bytes=32 tiempo=5ms');
    });

    // Both previous and new command logs must be present in history!
    expect(screen.getByText(/Respuesta desde 192.0.2.100: bytes=32 tiempo=1ms/i)).toBeInTheDocument();
    expect(screen.getByText(/Respuesta continua desde 192.0.2.100: bytes=32 tiempo=5ms/i)).toBeInTheDocument();
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

  it('copies only the last command output block when clicking "Copiar Último"', async () => {
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

    const { rerender } = render(
      <LivePingConsole
        ip="192.0.2.100"
        isPinging={true}
        pingMode="standard"
        onTogglePing={vi.fn()}
      />
    );

    // Command 1 output
    act(() => {
      dataHandler?.('Respuesta comando 1: bytes=32');
    });

    // End command 1, start command 2
    rerender(
      <LivePingConsole
        ip="192.0.2.100"
        isPinging={false}
        onTogglePing={vi.fn()}
      />
    );

    rerender(
      <LivePingConsole
        ip="192.0.2.100"
        isPinging={true}
        pingMode="standard"
        onTogglePing={vi.fn()}
      />
    );

    // Command 2 output
    act(() => {
      dataHandler?.('Respuesta comando 2: bytes=32 tiempo=10ms');
    });

    const copyLastBtn = screen.getByRole('button', { name: /copiar último bloque/i });
    fireEvent.click(copyLastBtn);

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalled();
    });

    const lastCopiedText = writeTextMock.mock.calls[0][0];
    expect(lastCopiedText).toContain('Respuesta comando 2');
    expect(lastCopiedText).not.toContain('Respuesta comando 1');
    expect(screen.getByText(/bloque copiado/i)).toBeInTheDocument();
  });

  it('auto-scrolls strictly inside the terminal element when new lines arrive', () => {
    let dataHandler: ((t: string) => void) | null = null;
    vi.spyOn(electronClient, 'subscribeToPing').mockImplementation((_target, onData) => {
      dataHandler = onData;
      return () => {};
    });

    const { container } = render(
      <LivePingConsole
        ip="192.0.2.100"
        isPinging={true}
        onTogglePing={vi.fn()}
      />
    );

    const scrollBox = container.querySelector('[data-testid="terminal-scroll-container"]') as HTMLDivElement;
    expect(scrollBox).not.toBeNull();

    // Mock scrollHeight
    Object.defineProperty(scrollBox, 'scrollHeight', {
      value: 1200,
      configurable: true,
      writable: true,
    });

    act(() => {
      dataHandler?.('Línea 1 en ejecución...');
    });

    // Internal scrollTop must equal scrollHeight
    expect(scrollBox.scrollTop).toBe(1200);
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

    // Redundant Iniciar is removed; Limpiar and Copiar Logs remain
    expect(screen.queryByRole('button', { name: /^iniciar$/i })).not.toBeInTheDocument();
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

  it('renders account mode header and highlights global groups', () => {
    let push: ((text: string) => void) | null = null;

    vi.spyOn(electronClient, 'subscribeToDiagnosticCommand').mockImplementation(
      (_command, _target, onData) => {
        push = onData;
        return () => {};
      },
    );

    render(
      <LivePingConsole
        mode="account"
        targetLabel="jperez"
        ip=""
        isPinging={false}
        activeCommand={{
          id: 'diag-1',
          command: 'netuser',
          target: 'jperez',
          argsText: 'net user jperez /domain',
          timestamp: '10:00:00',
        }}
        onTogglePing={vi.fn()}
      />,
    );

    expect(screen.getByText(/Cuenta AD · jperez/)).toBeInTheDocument();

    act(() => {
      push?.('Miembro de grupos globales  *GRUPO-SOPORTE  *GRUPO-OPERADORES\n');
    });

    expect(
      screen.getByText(/Miembro de grupos globales/),
    ).toHaveClass('text-cyan-300');
  });
});
